import { decode as decodeBase64 } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';
import type { SQLiteDatabase } from 'expo-sqlite';

import { supabase } from '@/lib/supabase';

const PHOTO_BUCKET = 'date-photos';

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
};

type LocalPhotoRow = {
  id: string;
  localUri: string;
  remoteUrl: string | null;
  sortOrder: number;
};

export async function pushDatePlace(db: SQLiteDatabase, userId: string, datePlaceId: string) {
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
      return;
    }

    const photos = await db.getAllAsync<LocalPhotoRow>(
      `SELECT id, local_uri AS localUri, remote_url AS remoteUrl, sort_order AS sortOrder
       FROM date_photos WHERE date_place_id = ? ORDER BY sort_order ASC`,
      [datePlaceId]
    );

    const uploadedPhotos = await Promise.all(
      photos.map((photo) => ensurePhotoUploaded(db, userId, datePlaceId, photo))
    );

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

    const { error: placeError } = await supabase.from('date_places').upsert({
      id: place.id,
      user_id: userId,
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
    });

    if (placeError) {
      throw placeError;
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

    await db.runAsync(`UPDATE date_places SET sync_status = 'synced' WHERE id = ?`, [datePlaceId]);
  } catch (error) {
    console.error('[cloud-sync] pushDatePlace failed:', error);
  }
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

export async function pullRemoteChanges(db: SQLiteDatabase) {
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
          `INSERT INTO date_places (id, date_entry_id, place_id, place_name, address, latitude, longitude, one_line_diary, hashtags_json, cover_photo_uri, normalized_search_text, sync_status, owner_user_id, couple_id, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, 'synced', ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             date_entry_id = excluded.date_entry_id, place_id = excluded.place_id, place_name = excluded.place_name,
             address = excluded.address, latitude = excluded.latitude, longitude = excluded.longitude,
             one_line_diary = excluded.one_line_diary, hashtags_json = excluded.hashtags_json,
             normalized_search_text = excluded.normalized_search_text, sync_status = 'synced',
             owner_user_id = excluded.owner_user_id, couple_id = excluded.couple_id, updated_at = excluded.updated_at`,
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
        await db.runAsync('UPDATE date_places SET cover_photo_uri = ? WHERE id = ?', [
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
