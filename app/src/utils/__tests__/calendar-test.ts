import { buildCalendarWeeks, formatCalendarDate } from '@/utils/calendar';

function days(year: number, month: number) {
  return buildCalendarWeeks(year, month).map((week) => week.map((cell) => cell.day));
}

describe('buildCalendarWeeks', () => {
  it('needs no padding when the month fills whole weeks', () => {
    // February 2026 starts on Sunday and has 28 days.
    const weeks = days(2026, 1);

    expect(weeks).toHaveLength(4);
    expect(weeks[0]).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(weeks[3]).toEqual([22, 23, 24, 25, 26, 27, 28]);
  });

  it('pads before the first day and after the last day', () => {
    // August 2026 starts on Saturday and has 31 days.
    const weeks = days(2026, 7);

    expect(weeks).toHaveLength(6);
    expect(weeks[0]).toEqual([null, null, null, null, null, null, 1]);
    expect(weeks[5]).toEqual([30, 31, null, null, null, null, null]);
  });

  it('includes February 29 in a leap year', () => {
    expect(days(2028, 1).flat()).toContain(29);
  });

  it('gives every cell a unique key', () => {
    const keys = buildCalendarWeeks(2026, 7)
      .flat()
      .map((cell) => cell.key);

    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('formatCalendarDate', () => {
  it('zero-pads the 0-based month and the day', () => {
    expect(formatCalendarDate(2026, 0, 5)).toBe('2026-01-05');
  });

  it('keeps two-digit months and days', () => {
    expect(formatCalendarDate(2026, 11, 31)).toBe('2026-12-31');
  });
});
