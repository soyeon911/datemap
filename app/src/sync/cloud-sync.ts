import { decode as decodeBase64 } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';
import type { SQLiteDatabase } from 'expo-sqlite';

import { supabase } from '@/lib/supabase';
import {
  copyGroups,
  mergeSyncedFields,
  parseSyncedFields,
  type FieldGroup,
  type SyncedFields,
} from '@/sync/date-place-merge';
import { buildSearchText } from '@/utils/search-text';

const PHOTO_BUCKET = 'date-photos';
const UNIQUE_VIOLATION = '23505';

// Each retry means another device saved in the moments since the last read, so a
// handful is plenty. Anything beyond that surfaces as a failed push.
const MAX_MERGE_ATTEMPTS = 3;

type LocalDatePlaceRow = {
  id: string;
  dateEntryId: string;
  placeId: string | null;
  placeName: string;
  address: string | null;
  latitude: number;
  longitude: number;
  oneLineDiary: string | null;
  hashtagsJson: string;
  coverPhotoUri: string | null;
  normalizedSearchText: string | null;
  coupleId: string | null;
  date: string;
  year: number;
  month: number;
  weekOfYear: number;
  yearMonth: string;
  summary: string | null;
  serverVersion: number | null;
  syncedFieldsJson: string | null;
};

type LocalPhotoRow = {
  id: string;
  localUri: string;
  remoteUrl: string | null;
  sortOrder: number;
};

export type DatePlaceConflict = {
  userId: string;
  datePlaceId: string;
  groups: FieldGroup[];
  merged: SyncedFields;
  theirs: SyncedFields;
  serverVersion: number;
};

export type PushResult =
  | { status: 'synced' }
  | { status: 'failed' }
  | { status: 'conflict'; conflict: DatePlaceConflict };

let syncQueue: Promise<unknown> = Promise.resolve();

// Pulls and pushes share one SQLite connection, and overlapping withTransactionAsync
// calls break each other: the second BEGIN fails, and its ROLLBACK cancels the first
// call's open transaction. A push overlapping another push would also read the same
// version and report this device's own edit as a conflict. So each call waits its
// turn, and reads the server itself rather than sharing a running call, so a pull
// made right after a couple link sees the new rows.
function enqueueSync<T>(task: () => Promise<T>) {
  const result = syncQueue.then(task);

  syncQueue = result.catch(() => undefined);

  return result;
}

export function pushDatePlace(db: SQLiteDatabase, userId: string, datePlaceId: string) {
  return enqueueSync(() => runPush(db, userId, datePlaceId));
}

async function runPush(db: SQLiteDatabase, userId: string, datePlaceId: string, attempt = 0): Promise<PushResult> {
  try {
    const place = await db.getFirstAsync<LocalDatePlaceRow>(
      `SELECT
        date_places.id,
        date_places.date_entry_id AS dateEntryId,
        date_places.place_id AS placeId,
        date_places.place_name AS placeName,
        date_places.address,
        date_places.latitude,
        date_places.longitude,
        date_places.one_line_diary AS oneLineDiary,
        date_places.hashtags_json AS hashtagsJson,
        date_places.cover_photo_uri AS coverPhotoUri,
        date_places.normalized_search_text AS normalizedSearchText,
        date_places.couple_id AS coupleId,
        date_places.server_version AS serverVersion,
        date_places.synced_fields_json AS syncedFieldsJson,
        date_entries.date,
        date_entries.year,
        date_entries.month,
        date_entries.week_of_year AS weekOfYear,
        date_entries.year_month AS yearMonth,
        date_entries.summary
      FROM date_places
      INNER JOIN date_entries ON date_entries.id = date_places.date_entry_id
      WHERE date_places.id = ?`,
      [datePlaceId]
    );

    if (!place) {
      return { status: 'failed' };
    }

    const photos = await db.getAllAsync<LocalPhotoRow>(
      `SELECT id, local_uri AS localUri, remote_url AS remoteUrl, sort_order AS sortOrder
       FROM date_photos WHERE date_place_id = ? ORDER BY sort_order ASC`,
      [datePlaceId]
    );

    const uploadResults = await Promise.allSettled(
      photos.map((photo) => ensurePhotoUploaded(db, userId, datePlaceId, photo))
    );

    // A flaky network shouldn't stop the place/entry text data from syncing — skip
    // whichever photo failed (it stays remote_url=null and retries on the next push).
    const uploadedPhotos: LocalPhotoRow[] = [];

    uploadResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        uploadedPhotos.push(result.value);
      } else {
        console.error('[cloud-sync] photo upload failed:', photos[index]?.id, result.reason);
      }
    });

    const coverPhoto = uploadedPhotos.find((photo) => photo.localUri === place.coverPhotoUri);
    const nowIso = new Date().toISOString();

    const { error: entryError } = await supabase.from('date_entries').upsert({
      id: place.dateEntryId,
      user_id: userId,
      couple_id: place.coupleId,
      date: place.date,
      year: place.year,
      month: place.month,
      week_of_year: place.weekOfYear,
      year_month: place.yearMonth,
      summary: place.summary,
      updated_at: nowIso,
    });

    if (entryError) {
      throw entryError;
    }

    const placeFields = {
      couple_id: place.coupleId,
      date_entry_id: place.dateEntryId,
      place_id: place.placeId,
      place_name: place.placeName,
      address: place.address,
      latitude: place.latitude,
      longitude: place.longitude,
      one_line_diary: place.oneLineDiary,
      hashtags: parseHashtags(place.hashtagsJson),
      cover_photo_path: coverPhoto?.remoteUrl ?? null,
      normalized_search_text: place.normalizedSearchText,
      updated_at: nowIso,
    };

    const serverVersion =
      place.serverVersion === null
        ? await insertRemotePlace(userId, datePlaceId, placeFields)
        : await updateRemotePlace(userId, datePlaceId, place.serverVersion, placeFields);

    if (serverVersion === null) {
      return await mergeWithServer(db, userId, place, attempt);
    }

    if (uploadedPhotos.length > 0) {
      const { error: photosError } = await supabase.from('date_photos').upsert(
        uploadedPhotos.map((photo) => ({
          id: photo.id,
          user_id: userId,
          couple_id: place.coupleId,
          date_place_id: datePlaceId,
          storage_path: photo.remoteUrl,
          sort_order: photo.sortOrder,
        }))
      );

      if (photosError) {
        throw photosError;
      }
    }

    await db.runAsync(
      `UPDATE date_places SET sync_status = 'synced', server_version = ?, synced_fields_json = ? WHERE id = ?`,
      [serverVersion, JSON.stringify(toLocalSyncedFields(place)), datePlaceId]
    );

    return { status: 'synced' };
  } catch (error) {
    console.error('[cloud-sync] pushDatePlace failed:', error);

    return { status: 'failed' };
  }
}

// Matches no row when another device saved after this one last read, which is the
// whole check: comparing and writing in one UPDATE leaves no gap between the two.
async function updateRemotePlace(
  userId: string,
  datePlaceId: string,
  expectedVersion: number,
  fields: Record<string, unknown>
) {
  const { data, error } = await supabase
    .from('date_places')
    .update(fields)
    .eq('user_id', userId)
    .eq('id', datePlaceId)
    .eq('version', expectedVersion)
    .select('version');

  if (error) {
    throw error;
  }

  return (data?.[0]?.version as number | undefined) ?? null;
}

async function insertRemotePlace(userId: string, datePlaceId: string, fields: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('date_places')
    .insert({ id: datePlaceId, user_id: userId, ...fields })
    .select('version')
    .single();

  if (error?.code === UNIQUE_VIOLATION) {
    return null;
  }

  if (error) {
    throw error;
  }

  return data.version as number;
}

async function mergeWithServer(
  db: SQLiteDatabase,
  userId: string,
  place: LocalDatePlaceRow,
  attempt: number
): Promise<PushResult> {
  if (attempt >= MAX_MERGE_ATTEMPTS) {
    throw new Error(`gave up merging ${place.id} after ${attempt} attempts`);
  }

  const { data: remote, error } = await supabase
    .from('date_places')
    .select('*')
    .eq('user_id', userId)
    .eq('id', place.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  // Deleted on another device: uploading it again matches what the old upsert did.
  if (!remote) {
    await db.runAsync('UPDATE date_places SET server_version = NULL, synced_fields_json = NULL WHERE id = ?', [
      place.id,
    ]);

    return runPush(db, userId, place.id, attempt + 1);
  }

  const theirs = toSyncedFields(remote);
  const { merged, conflicts } = mergeSyncedFields(
    parseSyncedFields(place.syncedFieldsJson),
    toLocalSyncedFields(place),
    theirs
  );

  if (conflicts.length > 0) {
    return {
      status: 'conflict',
      conflict: {
        userId,
        datePlaceId: place.id,
        groups: conflicts,
        merged,
        theirs,
        serverVersion: remote.version,
      },
    };
  }

  await saveMergedFields(db, userId, place.id, merged, remote.version, theirs);

  return runPush(db, userId, place.id, attempt + 1);
}

export function resolveDatePlaceConflict(db: SQLiteDatabase, conflict: DatePlaceConflict, keep: 'mine' | 'theirs') {
  return enqueueSync(async (): Promise<PushResult> => {
    const { userId, datePlaceId, groups, merged, theirs, serverVersion } = conflict;

    try {
      const fields = keep === 'mine' ? merged : copyGroups(merged, theirs, groups);

      await saveMergedFields(db, userId, datePlaceId, fields, serverVersion, theirs);

      return await runPush(db, userId, datePlaceId);
    } catch (error) {
      console.error('[cloud-sync] resolveDatePlaceConflict failed:', error);

      return { status: 'failed' };
    }
  });
}

// Records the server state as the new base, so the upload that follows expects the
// version just read and later merges compare against it.
async function saveMergedFields(
  db: SQLiteDatabase,
  userId: string,
  datePlaceId: string,
  fields: SyncedFields,
  serverVersion: number,
  serverFields: SyncedFields
) {
  await ensureLocalEntry(db, userId, fields.dateEntryId);

  await db.runAsync(
    `UPDATE date_places
     SET date_entry_id = ?, place_id = ?, place_name = ?, address = ?, latitude = ?, longitude = ?,
       one_line_diary = ?, hashtags_json = ?, normalized_search_text = ?, server_version = ?, synced_fields_json = ?
     WHERE id = ?`,
    [
      fields.dateEntryId,
      fields.placeId,
      fields.placeName,
      fields.address,
      fields.latitude,
      fields.longitude,
      fields.oneLineDiary,
      JSON.stringify(fields.hashtags),
      buildSearchText(fields),
      serverVersion,
      JSON.stringify(serverFields),
      datePlaceId,
    ]
  );
}

// Taking the other device's date can point at an entry this device has never pulled.
async function ensureLocalEntry(db: SQLiteDatabase, userId: string, dateEntryId: string) {
  const existing = await db.getFirstAsync<{ id: string }>('SELECT id FROM date_entries WHERE id = ?', [dateEntryId]);

  if (existing) {
    return;
  }

  const { data: entry, error } = await supabase
    .from('date_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('id', dateEntryId)
    .single();

  if (error) {
    throw error;
  }

  await db.runAsync(
    `INSERT OR IGNORE INTO date_entries (id, owner_user_id, couple_id, date, year, month, week_of_year, year_month, summary, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.id,
      entry.user_id,
      entry.couple_id,
      entry.date,
      entry.year,
      entry.month,
      entry.week_of_year,
      entry.year_month,
      entry.summary,
      entry.created_at,
      entry.updated_at,
    ]
  );
}

export async function deleteRemoteDatePlace(userId: string, datePlaceId: string) {
  try {
    const { data: photos } = await supabase
      .from('date_photos')
      .select('storage_path')
      .eq('user_id', userId)
      .eq('date_place_id', datePlaceId);

    if (photos && photos.length > 0) {
      await supabase.storage.from(PHOTO_BUCKET).remove(photos.map((photo) => photo.storage_path));
    }

    await supabase.from('date_places').delete().eq('user_id', userId).eq('id', datePlaceId);
  } catch (error) {
    console.error('[cloud-sync] deleteRemoteDatePlace failed:', error);
  }
}

// Called right after a couple link is created or joined, so records made before
// the link existed become visible to the partner too (couple_id is normally only
// set at save time, per pushDatePlace above).
export async function backfillCoupleId(db: SQLiteDatabase, userId: string, coupleId: string) {
  try {
    await supabase.from('date_entries').update({ couple_id: coupleId }).eq('user_id', userId);
    await supabase.from('date_places').update({ couple_id: coupleId }).eq('user_id', userId);
    await supabase.from('date_photos').update({ couple_id: coupleId }).eq('user_id', userId);

    await db.runAsync('UPDATE date_entries SET couple_id = ? WHERE owner_user_id = ? OR owner_user_id IS NULL', [
      coupleId,
      userId,
    ]);
    await db.runAsync(
      'UPDATE date_places SET couple_id = ?, owner_user_id = ? WHERE owner_user_id = ? OR owner_user_id IS NULL',
      [coupleId, userId, userId]
    );
  } catch (error) {
    console.error('[cloud-sync] backfillCoupleId failed:', error);
  }
}

export function pullRemoteChanges(db: SQLiteDatabase) {
  return enqueueSync(() => runPull(db));
}

async function runPull(db: SQLiteDatabase) {
  try {
    // No .eq('user_id', ...) filter here: RLS already scopes these selects to rows
    // the caller owns or shares a couple with, so whatever comes back is visible.
    const { data: entries, error: entriesError } = await supabase.from('date_entries').select('*');

    if (entriesError) {
      throw entriesError;
    }

    const { data: places, error: placesError } = await supabase.from('date_places').select('*');

    if (placesError) {
      throw placesError;
    }

    const { data: photos, error: photosError } = await supabase.from('date_photos').select('*');

    if (photosError) {
      throw photosError;
    }

    await db.withTransactionAsync(async () => {
      for (const entry of entries ?? []) {
        await db.runAsync(
          `INSERT INTO date_entries (id, owner_user_id, couple_id, date, year, month, week_of_year, year_month, summary, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             owner_user_id = excluded.owner_user_id, couple_id = excluded.couple_id,
             date = excluded.date, year = excluded.year, month = excluded.month,
             week_of_year = excluded.week_of_year, year_month = excluded.year_month,
             summary = excluded.summary, updated_at = excluded.updated_at`,
          [
            entry.id,
            entry.user_id,
            entry.couple_id,
            entry.date,
            entry.year,
            entry.month,
            entry.week_of_year,
            entry.year_month,
            entry.summary,
            entry.created_at,
            entry.updated_at,
          ]
        );
      }

      for (const place of places ?? []) {
        await db.runAsync(
          // The WHERE keeps an edit that has not uploaded yet: it would otherwise be
          // replaced by the older server copy and marked as synced.
          `INSERT INTO date_places (id, date_entry_id, place_id, place_name, address, latitude, longitude, one_line_diary, hashtags_json, cover_photo_uri, normalized_search_text, sync_status, owner_user_id, couple_id, created_at, updated_at, server_version, synced_fields_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, 'synced', ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             date_entry_id = excluded.date_entry_id, place_id = excluded.place_id, place_name = excluded.place_name,
             address = excluded.address, latitude = excluded.latitude, longitude = excluded.longitude,
             one_line_diary = excluded.one_line_diary, hashtags_json = excluded.hashtags_json,
             normalized_search_text = excluded.normalized_search_text, sync_status = 'synced',
             owner_user_id = excluded.owner_user_id, couple_id = excluded.couple_id, updated_at = excluded.updated_at,
             server_version = excluded.server_version, synced_fields_json = excluded.synced_fields_json
           WHERE date_places.sync_status = 'synced'`,
          [
            place.id,
            place.date_entry_id,
            place.place_id,
            place.place_name,
            place.address,
            place.latitude,
            place.longitude,
            place.one_line_diary,
            JSON.stringify(place.hashtags ?? []),
            place.normalized_search_text,
            place.user_id,
            place.couple_id,
            place.created_at,
            place.updated_at,
            place.version ?? null,
            JSON.stringify(toSyncedFields(place)),
          ]
        );
      }

      for (const photo of photos ?? []) {
        const existing = await db.getFirstAsync<{ id: string }>('SELECT id FROM date_photos WHERE id = ?', [
          photo.id,
        ]);

        if (existing) {
          continue;
        }

        await db.runAsync(
          `INSERT INTO date_photos (id, date_place_id, local_uri, remote_url, sort_order, created_at)
           VALUES (?, ?, '', ?, ?, ?)`,
          [photo.id, photo.date_place_id, photo.storage_path, photo.sort_order, photo.created_at]
        );
      }
    });

    await downloadMissingPhotos(db);

    for (const place of places ?? []) {
      if (!place.cover_photo_path) {
        continue;
      }

      const coverPhoto = await db.getFirstAsync<{ localUri: string }>(
        'SELECT local_uri AS localUri FROM date_photos WHERE remote_url = ?',
        [place.cover_photo_path]
      );

      if (coverPhoto?.localUri) {
        await db.runAsync(`UPDATE date_places SET cover_photo_uri = ? WHERE id = ? AND sync_status = 'synced'`, [
          coverPhoto.localUri,
          place.id,
        ]);
      }
    }
  } catch (error) {
    console.error('[cloud-sync] pullRemoteChanges failed:', error);
  }
}

async function ensurePhotoUploaded(
  db: SQLiteDatabase,
  userId: string,
  datePlaceId: string,
  photo: LocalPhotoRow
): Promise<LocalPhotoRow> {
  if (photo.remoteUrl) {
    return photo;
  }

  const extension = photo.localUri.split('.').pop()?.toLowerCase() || 'jpg';
  const storagePath = `${userId}/${datePlaceId}/${photo.id}.${extension}`;

  // React Native's fetch/Blob polyfill can't turn a file:// response into a Blob
  // here, so read the file as base64 and upload the decoded ArrayBuffer instead
  // (the approach Supabase's own React Native docs recommend).
  const base64 = await FileSystem.readAsStringAsync(photo.localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(storagePath, decodeBase64(base64), {
    contentType: guessContentType(extension),
    upsert: true,
  });

  if (error) {
    throw error;
  }

  await db.runAsync('UPDATE date_photos SET remote_url = ? WHERE id = ?', [storagePath, photo.id]);

  return { ...photo, remoteUrl: storagePath };
}

async function downloadMissingPhotos(db: SQLiteDatabase) {
  const missingPhotos = await db.getAllAsync<{ id: string; storagePath: string }>(
    `SELECT id, remote_url AS storagePath FROM date_photos WHERE local_uri = ''`
  );

  if (missingPhotos.length === 0) {
    return;
  }

  const photoDirectory = `${FileSystem.documentDirectory}date-photos/`;

  try {
    await FileSystem.makeDirectoryAsync(photoDirectory, { intermediates: true });
  } catch {
    // Directory may already exist.
  }

  for (const photo of missingPhotos) {
    const { data: signed, error: signedError } = await supabase.storage
      .from(PHOTO_BUCKET)
      .createSignedUrl(photo.storagePath, 60 * 5);

    if (signedError || !signed) {
      continue;
    }

    const extension = photo.storagePath.split('.').pop() || 'jpg';
    const destinationUri = `${photoDirectory}${photo.id}.${extension}`;

    await FileSystem.downloadAsync(signed.signedUrl, destinationUri);
    await db.runAsync('UPDATE date_photos SET local_uri = ? WHERE id = ?', [destinationUri, photo.id]);
  }
}

type RemoteDatePlace = {
  date_entry_id: string;
  place_id: string | null;
  place_name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  one_line_diary: string | null;
  hashtags: string[] | null;
};

function toSyncedFields(place: RemoteDatePlace): SyncedFields {
  return {
    dateEntryId: place.date_entry_id,
    placeId: place.place_id,
    placeName: place.place_name,
    address: place.address,
    latitude: place.latitude,
    longitude: place.longitude,
    oneLineDiary: place.one_line_diary,
    hashtags: place.hashtags ?? [],
  };
}

function toLocalSyncedFields(place: LocalDatePlaceRow): SyncedFields {
  return {
    dateEntryId: place.dateEntryId,
    placeId: place.placeId,
    placeName: place.placeName,
    address: place.address,
    latitude: place.latitude,
    longitude: place.longitude,
    oneLineDiary: place.oneLineDiary,
    hashtags: parseHashtags(place.hashtagsJson),
  };
}

function guessContentType(extension: string) {
  if (extension === 'png') {
    return 'image/png';
  }

  if (extension === 'heic' || extension === 'heif') {
    return 'image/heic';
  }

  return 'image/jpeg';
}

function parseHashtags(hashtagsJson: string): string[] {
  try {
    const parsed = JSON.parse(hashtagsJson);

    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}
