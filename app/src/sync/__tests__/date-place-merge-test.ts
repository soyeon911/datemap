import { copyGroups, describeConflict, mergeSyncedFields, parseSyncedFields, type SyncedFields } from '@/sync/date-place-merge';

const base: SyncedFields = {
  dateEntryId: 'entry_2026-11-01',
  placeId: 'naver-1',
  placeName: '성수 카페',
  address: '서울 성동구',
  latitude: 37.54,
  longitude: 127.05,
  oneLineDiary: '처음 일기',
  hashtags: ['카페'],
};

describe('mergeSyncedFields', () => {
  it('keeps both edits when two devices changed different fields', () => {
    const mine = { ...base, hashtags: ['카페', '성수'] };
    const theirs = { ...base, oneLineDiary: 'A 기기 일기' };

    expect(mergeSyncedFields(base, mine, theirs)).toEqual({
      merged: { ...base, oneLineDiary: 'A 기기 일기', hashtags: ['카페', '성수'] },
      conflicts: [],
    });
  });

  it('reports a conflict when both devices changed the same field differently', () => {
    const mine = { ...base, oneLineDiary: 'B 기기 일기' };
    const theirs = { ...base, oneLineDiary: 'A 기기 일기' };

    expect(mergeSyncedFields(base, mine, theirs)).toEqual({ merged: mine, conflicts: ['diary'] });
  });

  it('does not report a conflict when both devices made the same change', () => {
    const mine = { ...base, oneLineDiary: '같은 일기' };

    expect(mergeSyncedFields(base, mine, { ...mine }).conflicts).toEqual([]);
  });

  it('treats the place fields as one choice', () => {
    const mine = { ...base, placeName: '내 이름' };
    const theirs = { ...base, address: '다른 주소' };

    expect(mergeSyncedFields(base, mine, theirs).conflicts).toEqual(['place']);
  });

  it('asks about every difference when there is no base to compare with', () => {
    const theirs = { ...base, oneLineDiary: '서버 일기' };

    expect(mergeSyncedFields(null, base, theirs).conflicts).toEqual(['diary']);
  });

  it('notices a hashtag order change', () => {
    const mine = { ...base, hashtags: ['a', 'b'] };
    const theirs = { ...base, hashtags: ['b', 'a'] };

    expect(mergeSyncedFields({ ...base, hashtags: [] }, mine, theirs).conflicts).toEqual(['hashtags']);
  });
});

describe('copyGroups', () => {
  it('copies only the chosen groups', () => {
    const theirs = { ...base, oneLineDiary: '서버 일기', placeName: '서버 이름' };

    expect(copyGroups(base, theirs, ['diary'])).toEqual({ ...base, oneLineDiary: '서버 일기' });
  });
});

describe('describeConflict', () => {
  it('shows both values for each conflicting group', () => {
    const mine = { ...base, oneLineDiary: 'B 일기', hashtags: [] };
    const theirs = { ...base, oneLineDiary: null, dateEntryId: 'entry_2026-11-02', hashtags: ['야경'] };

    expect(describeConflict(['date', 'diary', 'hashtags'], mine, theirs)).toBe(
      [
        '날짜\n내 수정: 2026-11-01\n다른 기기: 2026-11-02',
        '일기\n내 수정: B 일기\n다른 기기: (없음)',
        '해시태그\n내 수정: (없음)\n다른 기기: #야경',
      ].join('\n\n')
    );
  });
});

describe('parseSyncedFields', () => {
  it('returns null for a missing or damaged snapshot', () => {
    expect(parseSyncedFields(null)).toBeNull();
    expect(parseSyncedFields('{broken')).toBeNull();
  });

  it('reads a saved snapshot', () => {
    expect(parseSyncedFields(JSON.stringify(base))).toEqual(base);
  });
});
