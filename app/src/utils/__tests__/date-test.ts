import { getMonthRange, getWeekRange, getYearOptions, toDateString } from '@/utils/date';

// All inputs are fixed dates; nothing here reads the current time. The time zone
// is pinned to Asia/Seoul in jest.config.js.
describe('getYearOptions', () => {
  it('returns 11 years centered on the given year', () => {
    expect(getYearOptions(2026)).toEqual([2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031]);
  });
});

describe('toDateString', () => {
  it('서울 오전 9시 이전 시각도 같은 날짜가 된다', () => {
    expect(toDateString(new Date('2026-11-04T08:59:00+09:00'))).toBe('2026-11-04');
  });

  it('서울 자정은 같은 날짜가 된다', () => {
    expect(toDateString(new Date(2026, 10, 4))).toBe('2026-11-04');
  });

  it('서울 오전 9시 이후 시각은 같은 날짜가 된다', () => {
    expect(toDateString(new Date('2026-11-04T09:00:00+09:00'))).toBe('2026-11-04');
  });
});

describe('getWeekRange', () => {
  it('입력 날짜가 속한 주의 월~일 범위를 반환한다', () => {
    expect(getWeekRange('2026-11-04')).toEqual({ start: '2026-11-02', end: '2026-11-08' });
  });

  it('일요일은 그 주의 마지막 날로 계산한다', () => {
    expect(getWeekRange('2026-11-08')).toEqual({ start: '2026-11-02', end: '2026-11-08' });
  });
});

describe('getMonthRange', () => {
  it('이번 달 1일부터 말일까지 반환한다', () => {
    expect(getMonthRange('2026-11-04')).toEqual({ start: '2026-11-01', end: '2026-11-30' });
  });

  it('1월 범위가 같은 해 안에서 시작한다', () => {
    expect(getMonthRange('2026-01-15')).toEqual({ start: '2026-01-01', end: '2026-01-31' });
  });

  it('윤년 2월의 마지막 날은 29일이다', () => {
    expect(getMonthRange('2028-02-10')).toEqual({ start: '2028-02-01', end: '2028-02-29' });
  });
});
