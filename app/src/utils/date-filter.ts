export type FilterPreset = 'all' | 'this_week' | 'this_month';

export const filterPresetLabels: Record<FilterPreset, string> = {
  all: '전체 기간',
  this_week: '이번 주',
  this_month: '이번 달',
};
