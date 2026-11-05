import type { SQLiteDatabase } from 'expo-sqlite';

import { supabase } from '@/lib/supabase';
import { pullRemoteChanges } from '@/sync/cloud-sync';

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
