import { getMonthRange, getWeekRange } from '@/utils/date';

export type FilterPreset = 'all' | 'this_week' | 'this_month';
export type CalendarTarget = 'start' | 'end';

export const filterPresetLabels: Record<FilterPreset, string> = {
  all: '전체 기간',
  this_week: '이번 주',
  this_month: '이번 달',
};

// Dates are YYYY-MM-DD strings, so plain string comparison keeps calendar order.
export function filterPlacesByDate<T extends { date: string }>(places: T[], startDate: string, endDate: string) {
  return places.filter((place) => {
    if (startDate && place.date < startDate) {
      return false;
    }

    if (endDate && place.date > endDate) {
      return false;
    }

    return true;
  });
}

export function getFilterLabel(startDate: string, endDate: string, preset: FilterPreset) {
  if (startDate && endDate) {
    return `${startDate} ~ ${endDate}`;
  }

  if (startDate) {
    return `${startDate}부터`;
  }

  if (endDate) {
    return `${endDate}까지`;
  }

  return filterPresetLabels[preset];
}

export function getPresetRange(preset: FilterPreset, today: string) {
  if (preset === 'all') {
    return { start: '', end: '' };
  }

  return preset === 'this_week' ? getWeekRange(today) : getMonthRange(today);
}

// Decides what a calendar tap means while picking a date range.
export function getNextRangeSelection(
  startDate: string,
  endDate: string,
  nextDate: string
): { start: string; end: string; target: CalendarTarget } {
  // Nothing picked yet, or a finished range: start over.
  // A date before the current start also starts over.
  if (!startDate || endDate || nextDate < startDate) {
    return { start: nextDate, end: '', target: 'end' };
  }

  return { start: startDate, end: nextDate, target: 'start' };
}
