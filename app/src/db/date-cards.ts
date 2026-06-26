import type { SQLiteDatabase } from 'expo-sqlite';

export type SyncStatus = 'local_only' | 'pending_upload' | 'synced';

export type DatePlace = {
  id: string;
  dateEntryId: string;
  placeId: string | null;
  placeName: string;
  address: string | null;
  latitude: number;
  longitude: number;
  date: string;
  oneLineDiary: string | null;
  hashtags: string[];
  coverPhotoUri: string | null;
  normalizedSearchText: string | null;
  yearMonth: string;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
};

export type CreateDateCardInput = {
  placeName: string;
  placeId?: string | null;
  address?: string | null;
  latitude: number;
  longitude: number;
  date: string;
  oneLineDiary?: string | null;
  hashtags?: string[];
  photoUris?: string[];
  coverPhotoUri?: string | null;
};

export type SavedDatePlace = {
  id: string;
  placeName: string;
  address: string | null;
  latitude: number;
  longitude: number;
  date: string;
  oneLineDiary: string | null;
  hashtags: string[];
  coverPhotoUri: string | null;
  photoCount: number;
  yearMonth: string;
};

export async function countDateCards(db: SQLiteDatabase) {
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM date_places'
  );

  return row?.count ?? 0;
}

export async function createDateCard(db: SQLiteDatabase, input: CreateDateCardInput) {
  const now = new Date().toISOString();
  const date = new Date(`${input.date}T00:00:00`);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const weekOfYear = getWeekOfYear(date);
  const yearMonth = `${year}-${String(month).padStart(2, '0')}`;
  const dateEntryId = `entry_${input.date}`;
  const datePlaceId = `place_${Date.now()}`;
  const hashtags = input.hashtags ?? [];
  const normalizedSearchText = [
    input.placeName,
    input.address,
    input.oneLineDiary,
    ...hashtags,
  ]
    .filter(Boolean)
    .join(' ')
    .trim()
    .toLowerCase();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT OR IGNORE INTO date_entries (
      id,
      owner_user_id,
      couple_id,
      date,
      year,
      month,
      week_of_year,
      year_month,
      summary,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        dateEntryId,
        null,
        null,
        input.date,
        year,
        month,
        weekOfYear,
        yearMonth,
        null,
        now,
        now,
      ]
    );

    await db.runAsync(
      `INSERT INTO date_places (
      id,
      date_entry_id,
      place_id,
      place_name,
      address,
      latitude,
      longitude,
      one_line_diary,
      hashtags_json,
      cover_photo_uri,
      normalized_search_text,
      sync_status,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        datePlaceId,
        dateEntryId,
        input.placeId ?? null,
        input.placeName,
        input.address ?? null,
        input.latitude,
        input.longitude,
        input.oneLineDiary ?? null,
        JSON.stringify(hashtags),
        input.coverPhotoUri ?? input.photoUris?.[0] ?? null,
        normalizedSearchText,
        'local_only',
        now,
        now,
      ]
    );

    for (const [index, localUri] of (input.photoUris ?? []).entries()) {
      await db.runAsync(
        `INSERT INTO date_photos (
          id,
          date_place_id,
          local_uri,
          remote_url,
          sort_order,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [`photo_${Date.now()}_${index}`, datePlaceId, localUri, null, index + 1, now]
      );
    }
  });

  return datePlaceId;
}

export async function getLatestDateCards(db: SQLiteDatabase, limit = 10) {
  return db.getAllAsync<Pick<DatePlace, 'id' | 'placeName' | 'date' | 'yearMonth' | 'syncStatus'>>(
    `SELECT
      date_places.id,
      date_places.place_name AS placeName,
      date_entries.date,
      date_entries.year_month AS yearMonth,
      date_places.sync_status AS syncStatus
    FROM date_places
    INNER JOIN date_entries ON date_entries.id = date_places.date_entry_id
    ORDER BY date_entries.date DESC, date_places.created_at DESC
    LIMIT ?`,
    [limit]
  );
}

export async function getSavedDatePlaces(db: SQLiteDatabase, limit = 30) {
  const rows = await db.getAllAsync<{
    id: string;
    placeName: string;
    address: string | null;
    latitude: number;
    longitude: number;
    date: string;
    oneLineDiary: string | null;
    hashtagsJson: string;
    coverPhotoUri: string | null;
    photoCount: number;
    yearMonth: string;
  }>(
    `SELECT
      date_places.id,
      date_places.place_name AS placeName,
      date_places.address,
      date_places.latitude,
      date_places.longitude,
      date_entries.date,
      date_places.one_line_diary AS oneLineDiary,
      date_places.hashtags_json AS hashtagsJson,
      date_places.cover_photo_uri AS coverPhotoUri,
      COUNT(date_photos.id) AS photoCount,
      date_entries.year_month AS yearMonth
    FROM date_places
    INNER JOIN date_entries ON date_entries.id = date_places.date_entry_id
    LEFT JOIN date_photos ON date_photos.date_place_id = date_places.id
    GROUP BY date_places.id
    ORDER BY date_entries.date DESC, date_places.created_at DESC
    LIMIT ?`,
    [limit]
  );

  return rows.map((row) => ({
    ...row,
    hashtags: parseJsonArray(row.hashtagsJson),
  }));
}

export async function deleteDatePlace(db: SQLiteDatabase, datePlaceId: string) {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM date_photos WHERE date_place_id = ?', [datePlaceId]);
    await db.runAsync('DELETE FROM date_places WHERE id = ?', [datePlaceId]);
  });
}

function parseJsonArray(value: string) {
  try {
    const parsed = JSON.parse(value);

    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function getWeekOfYear(date: Date) {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;

  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}
