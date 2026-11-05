import type { SQLiteDatabase } from 'expo-sqlite';

import { supabase } from '@/lib/supabase';
import { pullRemoteChanges, pushDatePlace, resolveDatePlaceConflict, type PushResult } from '@/sync/cloud-sync';
import type { SyncedFields } from '@/sync/date-place-merge';

jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///documents/',
  EncodingType: { Base64: 'base64' },
  makeDirectoryAsync: jest.fn(),
  downloadAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
}));

const nextTick = () => new Promise<void>((resolve) => setImmediate(resolve));

// Follows expo-sqlite's withTransactionAsync, including the part that causes the bug:
// every call shares one connection, so a failed BEGIN still runs ROLLBACK against
// whatever transaction another caller has open.
function createFakeDb() {
  const statements: string[] = [];
  let inTransaction = false;

  async function execAsync(sql: string) {
    await nextTick();
    statements.push(sql);

    if (sql === 'BEGIN') {
      if (inTransaction) {
        throw new Error('cannot start a transaction within a transaction');
      }

      inTransaction = true;
      return;
    }

    if (!inTransaction) {
      throw new Error(
        sql === 'COMMIT' ? 'cannot commit - no transaction is active' : 'cannot rollback - no transaction is active'
      );
    }

    inTransaction = false;
  }

  const db = {
    execAsync,
    async withTransactionAsync(task: () => Promise<void>) {
      try {
        await execAsync('BEGIN');
        await task();
        await execAsync('COMMIT');
      } catch (error) {
        await execAsync('ROLLBACK');
        throw error;
      }
    },
    runAsync: jest.fn(async () => {
      await nextTick();
    }),
    getFirstAsync: jest.fn(async () => null),
    getAllAsync: jest.fn(async () => []),
  };

  return { db: db as unknown as SQLiteDatabase, statements };
}

function mockRemoteTables(onSelect: () => void = () => {}) {
  jest.mocked(supabase.from).mockImplementation(
    () =>
      ({
        select: async () => {
          onSelect();
          await nextTick();

          return { data: [{ id: 'row-1' }], error: null };
        },
      }) as unknown as ReturnType<typeof supabase.from>
  );
}

describe('pullRemoteChanges', () => {
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
    jest.mocked(supabase.from).mockReset();
  });

  it('runs overlapping calls one after another', async () => {
    mockRemoteTables();
    const { db, statements } = createFakeDb();

    await Promise.all([pullRemoteChanges(db), pullRemoteChanges(db)]);

    expect(statements).toEqual(['BEGIN', 'COMMIT', 'BEGIN', 'COMMIT']);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('reads the server again for a call that had to wait', async () => {
    const { db, statements } = createFakeDb();
    const committedAtSelect: boolean[] = [];

    mockRemoteTables(() => committedAtSelect.push(statements.includes('COMMIT')));

    await Promise.all([pullRemoteChanges(db), pullRemoteChanges(db)]);

    // Three tables per pull: the waiting call must not reuse the first call's data.
    expect(committedAtSelect).toEqual([false, false, false, true, true, true]);
  });

  it('leaves an edit that has not uploaded yet alone', async () => {
    mockRemoteTables();
    const { db } = createFakeDb();

    await pullRemoteChanges(db);

    const placeUpsert = jest
      .mocked(db.runAsync)
      .mock.calls.map(([sql]) => String(sql))
      .find((sql) => sql.startsWith('INSERT INTO date_places'));

    expect(placeUpsert).toContain("WHERE date_places.sync_status = 'synced'");
  });

  it('still runs a waiting call after the previous one fails', async () => {
    const { db, statements } = createFakeDb();

    jest
      .mocked(supabase.from)
      .mockImplementationOnce(
        () =>
          ({
            select: async () => ({ data: null, error: new Error('offline') }),
          }) as unknown as ReturnType<typeof supabase.from>
      );

    const firstPull = pullRemoteChanges(db);

    mockRemoteTables();

    await Promise.all([firstPull, pullRemoteChanges(db)]);

    expect(statements).toEqual(['BEGIN', 'COMMIT']);
    expect(consoleError).toHaveBeenCalledTimes(1);
  });
});

const syncedFields: SyncedFields = {
  dateEntryId: 'entry_2026-11-01',
  placeId: 'naver-1',
  placeName: '성수 카페',
  address: '서울 성동구',
  latitude: 37.54,
  longitude: 127.05,
  oneLineDiary: '처음 일기',
  hashtags: ['카페'],
};

function toRemote(fields: SyncedFields, version: number) {
  return {
    id: 'place-1',
    user_id: 'user-1',
    date_entry_id: fields.dateEntryId,
    place_id: fields.placeId,
    place_name: fields.placeName,
    address: fields.address,
    latitude: fields.latitude,
    longitude: fields.longitude,
    one_line_diary: fields.oneLineDiary,
    hashtags: fields.hashtags,
    version,
  };
}

// Applies the same rule as the server: an update only lands on the expected version.
function createFakeServer(fields: SyncedFields | null, version = 5) {
  const server = { row: fields ? toRemote(fields, version) : null, updateCount: 0 };

  jest.mocked(supabase.from).mockImplementation((table: string) => {
    if (table !== 'date_places') {
      return { upsert: async () => ({ error: null }) } as unknown as ReturnType<typeof supabase.from>;
    }

    return {
      update: (next: Record<string, unknown>) => {
        const filters: Record<string, unknown> = {};
        const chain = {
          eq(column: string, value: unknown) {
            filters[column] = value;
            return chain;
          },
          async select() {
            if (!server.row || server.row.version !== filters.version) {
              return { data: [], error: null };
            }

            server.updateCount += 1;
            server.row = { ...server.row, ...next, version: server.row.version + 1 };

            return { data: [{ version: server.row.version }], error: null };
          },
        };

        return chain;
      },
      insert: (next: Record<string, unknown>) => ({
        select: () => ({
          async single() {
            if (server.row) {
              return { data: null, error: { code: '23505' } };
            }

            server.row = { ...toRemote(syncedFields, 1), ...next, version: 1 };

            return { data: { version: 1 }, error: null };
          },
        }),
      }),
      select: () => {
        const chain = {
          eq: () => chain,
          maybeSingle: async () => ({ data: server.row, error: null }),
        };

        return chain;
      },
    } as unknown as ReturnType<typeof supabase.from>;
  });

  return server;
}

// Holds one local row and follows the UPDATE statements the push code sends.
function createLocalPlace(mine: SyncedFields, base: SyncedFields | null, serverVersion: number | null) {
  const local = {
    fields: mine,
    base,
    serverVersion,
    syncStatus: 'local_only',
  };

  const db = {
    getFirstAsync: async (sql: string) => {
      if (sql.includes('FROM date_entries WHERE')) {
        return { id: 'entry' };
      }

      return {
        id: 'place-1',
        ...local.fields,
        hashtagsJson: JSON.stringify(local.fields.hashtags),
        coverPhotoUri: null,
        normalizedSearchText: '',
        coupleId: null,
        date: '2026-11-01',
        year: 2026,
        month: 11,
        weekOfYear: 44,
        yearMonth: '2026-11',
        summary: null,
        serverVersion: local.serverVersion,
        syncedFieldsJson: local.base ? JSON.stringify(local.base) : null,
      };
    },
    getAllAsync: async () => [],
    runAsync: async (sql: string, params: unknown[]) => {
      if (sql.includes('server_version = NULL')) {
        local.serverVersion = null;
        local.base = null;
      } else if (sql.includes("sync_status = 'synced'")) {
        local.syncStatus = 'synced';
        local.serverVersion = params[0] as number;
        local.base = JSON.parse(params[1] as string);
      } else if (sql.includes('one_line_diary = ?')) {
        local.fields = {
          dateEntryId: params[0] as string,
          placeId: params[1] as string,
          placeName: params[2] as string,
          address: params[3] as string,
          latitude: params[4] as number,
          longitude: params[5] as number,
          oneLineDiary: params[6] as string,
          hashtags: JSON.parse(params[7] as string),
        };
        local.serverVersion = params[9] as number;
        local.base = JSON.parse(params[10] as string);
      }
    },
  };

  return { db: db as unknown as SQLiteDatabase, local };
}

function expectConflict(result: PushResult) {
  if (result.status !== 'conflict') {
    throw new Error(`expected a conflict, got ${result.status}`);
  }

  return result.conflict;
}

describe('pushDatePlace', () => {
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
    jest.mocked(supabase.from).mockReset();
  });

  it('uploads when nobody else saved first', async () => {
    const mine = { ...syncedFields, oneLineDiary: '수정한 일기' };
    const server = createFakeServer(syncedFields);
    const { db, local } = createLocalPlace(mine, syncedFields, 5);

    await expect(pushDatePlace(db, 'user-1', 'place-1')).resolves.toEqual({ status: 'synced' });

    expect(server.row?.one_line_diary).toBe('수정한 일기');
    expect(local).toMatchObject({ syncStatus: 'synced', serverVersion: 6, base: mine });
  });

  // The scenario reproduced on two simulators: A saved a diary, then B saved hashtags
  // without refreshing, and the diary A wrote disappeared.
  it('keeps both edits when two devices changed different fields', async () => {
    const server = createFakeServer({ ...syncedFields, oneLineDiary: 'A 일기' }, 6);
    const { db, local } = createLocalPlace({ ...syncedFields, hashtags: ['카페', 'B 태그'] }, syncedFields, 5);

    await expect(pushDatePlace(db, 'user-1', 'place-1')).resolves.toEqual({ status: 'synced' });

    expect(server.row).toMatchObject({ one_line_diary: 'A 일기', hashtags: ['카페', 'B 태그'], version: 7 });
    expect(local.fields).toMatchObject({ oneLineDiary: 'A 일기', hashtags: ['카페', 'B 태그'] });
    expect(local).toMatchObject({ syncStatus: 'synced', serverVersion: 7 });
  });

  it('leaves the server alone when both devices changed the same field', async () => {
    const theirs = { ...syncedFields, oneLineDiary: 'A 일기' };
    const server = createFakeServer(theirs, 6);
    const { db, local } = createLocalPlace({ ...syncedFields, oneLineDiary: 'B 일기' }, syncedFields, 5);

    const conflict = expectConflict(await pushDatePlace(db, 'user-1', 'place-1'));

    expect(conflict).toMatchObject({ groups: ['diary'], serverVersion: 6 });
    expect(conflict.theirs.oneLineDiary).toBe('A 일기');
    expect(server.updateCount).toBe(0);
    expect(local.syncStatus).toBe('local_only');
  });

  it.each([
    ['mine', 'B 일기'],
    ['theirs', 'A 일기'],
  ] as const)('applies the choice to keep %s on both sides', async (keep, expectedDiary) => {
    const server = createFakeServer({ ...syncedFields, oneLineDiary: 'A 일기' }, 6);
    const { db, local } = createLocalPlace({ ...syncedFields, oneLineDiary: 'B 일기' }, syncedFields, 5);

    const conflict = expectConflict(await pushDatePlace(db, 'user-1', 'place-1'));

    await expect(resolveDatePlaceConflict(db, conflict, keep)).resolves.toEqual({ status: 'synced' });

    expect(server.row?.one_line_diary).toBe(expectedDiary);
    expect(local.fields.oneLineDiary).toBe(expectedDiary);
    expect(local.syncStatus).toBe('synced');
  });

  it('asks again if another device saves while the choice is open', async () => {
    const server = createFakeServer({ ...syncedFields, oneLineDiary: 'A 일기' }, 6);
    const { db } = createLocalPlace({ ...syncedFields, oneLineDiary: 'B 일기' }, syncedFields, 5);

    const conflict = expectConflict(await pushDatePlace(db, 'user-1', 'place-1'));

    server.row = toRemote({ ...syncedFields, oneLineDiary: 'A 일기 2' }, 7);

    const again = expectConflict(await resolveDatePlaceConflict(db, conflict, 'mine'));

    expect(again.theirs.oneLineDiary).toBe('A 일기 2');
  });

  it('inserts a record the server has not seen', async () => {
    const server = createFakeServer(null);
    const { db, local } = createLocalPlace(syncedFields, null, null);

    await expect(pushDatePlace(db, 'user-1', 'place-1')).resolves.toEqual({ status: 'synced' });

    expect(server.row?.id).toBe('place-1');
    expect(local).toMatchObject({ syncStatus: 'synced', serverVersion: 1 });
  });

  it('asks instead of guessing when an unversioned record already exists on the server', async () => {
    createFakeServer({ ...syncedFields, oneLineDiary: '서버 일기' });
    const { db } = createLocalPlace(syncedFields, null, null);

    expect(expectConflict(await pushDatePlace(db, 'user-1', 'place-1')).groups).toEqual(['diary']);
  });

  it('uploads again when the record was deleted on another device', async () => {
    const server = createFakeServer(null);
    const { db } = createLocalPlace(syncedFields, syncedFields, 5);

    await expect(pushDatePlace(db, 'user-1', 'place-1')).resolves.toEqual({ status: 'synced' });

    expect(server.row?.id).toBe('place-1');
  });
});
