import { getLast30DaysRange, getMonthRange, getWeekRange, getYearOptions, toDateString } from '@/utils/date';

// All inputs are fixed dates; nothing here reads the current time. The time zone
// is pinned to Asia/Seoul in jest.config.js.
describe('getYearOptions', () => {
  it('returns 11 years centered on the given year', () => {
    expect(getYearOptions(2026)).toEqual([2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031]);
  });
});

describe('toDateString', () => {
  it('현재 동작(버그): 서울 오전 9시 이전 시각은 전날 날짜가 된다', () => {
    expect(toDateString(new Date('2026-11-04T08:59:00+09:00'))).toBe('2026-11-03');
  });

  it('현재 동작(버그): 서울 자정은 전날 날짜가 된다', () => {
    expect(toDateString(new Date(2026, 10, 4))).toBe('2026-11-03');
  });

  it('서울 오전 9시 이후 시각은 같은 날짜가 된다', () => {
    expect(toDateString(new Date('2026-11-04T09:00:00+09:00'))).toBe('2026-11-04');
  });
});

describe('getWeekRange', () => {
  it('현재 동작(버그): 월~일이 아니라 일~토 범위가 된다', () => {
    expect(getWeekRange('2026-11-04')).toEqual({ start: '2026-11-01', end: '2026-11-07' });
  });

  it('현재 동작(버그): 일요일 입력도 하루 밀린 범위가 된다', () => {
    expect(getWeekRange('2026-11-08')).toEqual({ start: '2026-11-01', end: '2026-11-07' });
  });
});

describe('getMonthRange', () => {
  it('현재 동작(버그): 지난달 말일을 포함하고 이번 달 말일을 뺀다', () => {
    expect(getMonthRange('2026-11-04')).toEqual({ start: '2026-10-31', end: '2026-11-29' });
  });

  it('현재 동작(버그): 1월 범위가 지난해 12월 31일에서 시작한다', () => {
    expect(getMonthRange('2026-01-15')).toEqual({ start: '2025-12-31', end: '2026-01-30' });
  });

  it('현재 동작(버그): 윤년 2월의 마지막 날이 28일이 된다', () => {
    expect(getMonthRange('2028-02-10')).toEqual({ start: '2028-01-31', end: '2028-02-28' });
  });
});

describe('getLast30DaysRange', () => {
  it('현재 동작(버그): 시작일만 하루 밀려 31일 범위가 된다', () => {
    expect(getLast30DaysRange('2026-11-04')).toEqual({ start: '2026-10-05', end: '2026-11-04' });
  });
});
