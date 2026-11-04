export type FilterPreset = 'all' | 'this_week' | 'this_month' | 'last_30_days';

export const filterPresetLabels: Record<FilterPreset, string> = {
  all: '전체 기간',
  this_week: '이번 주',
  this_month: '이번 달',
  last_30_days: '최근 30일',
};
