import type { SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_NAME = 'datemap.db';
export const DATABASE_VERSION = 2;

export async function migrateDatabase(db: SQLiteDatabase) {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = row?.user_version ?? 0;

  if (currentVersion >= DATABASE_VERSION) {
    return;
  }

  if (currentVersion < 1) {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;

      CREATE TABLE IF NOT EXISTS date_cards (
        id TEXT PRIMARY KEY,
        owner_user_id TEXT,
        couple_id TEXT,
        place_id TEXT,
        place_name TEXT NOT NULL,
        address TEXT,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        date TEXT NOT NULL,
        year INTEGER NOT NULL,
        month INTEGER NOT NULL,
        week_of_year INTEGER NOT NULL,
        memo TEXT,
        keywords_json TEXT NOT NULL DEFAULT '[]',
        cover_photo_uri TEXT,
        normalized_search_text TEXT,
        year_month TEXT NOT NULL,
        sync_status TEXT NOT NULL DEFAULT 'local_only',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_date_cards_year_month
        ON date_cards(year_month);

      CREATE INDEX IF NOT EXISTS idx_date_cards_place_name
        ON date_cards(place_name);

      CREATE INDEX IF NOT EXISTS idx_date_cards_sync_status
        ON date_cards(sync_status);
    `);
  }

  if (currentVersion < 2) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS date_entries (
        id TEXT PRIMARY KEY,
        owner_user_id TEXT,
        couple_id TEXT,
        date TEXT NOT NULL,
        year INTEGER NOT NULL,
        month INTEGER NOT NULL,
        week_of_year INTEGER NOT NULL,
        year_month TEXT NOT NULL,
        summary TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS date_places (
        id TEXT PRIMARY KEY,
        date_entry_id TEXT NOT NULL,
        place_id TEXT,
        place_name TEXT NOT NULL,
        address TEXT,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        one_line_diary TEXT,
        hashtags_json TEXT NOT NULL DEFAULT '[]',
        cover_photo_uri TEXT,
        normalized_search_text TEXT,
        sync_status TEXT NOT NULL DEFAULT 'local_only',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (date_entry_id) REFERENCES date_entries(id)
      );

      CREATE TABLE IF NOT EXISTS date_photos (
        id TEXT PRIMARY KEY,
        date_place_id TEXT NOT NULL,
        local_uri TEXT NOT NULL,
        remote_url TEXT,
        sort_order INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (date_place_id) REFERENCES date_places(id)
      );

      CREATE INDEX IF NOT EXISTS idx_date_entries_year_month
        ON date_entries(year_month);

      CREATE INDEX IF NOT EXISTS idx_date_entries_date
        ON date_entries(date);

      CREATE INDEX IF NOT EXISTS idx_date_places_entry
        ON date_places(date_entry_id);

      CREATE INDEX IF NOT EXISTS idx_date_places_name
        ON date_places(place_name);

      CREATE INDEX IF NOT EXISTS idx_date_places_sync_status
        ON date_places(sync_status);
    `);
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}
