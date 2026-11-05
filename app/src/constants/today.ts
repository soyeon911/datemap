import { toDateString } from '@/utils/date';

// Evaluated once when the app starts, so it goes stale past midnight.
// See docs/known-issues.md S-1.
export const today = toDateString(new Date());
