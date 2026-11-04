import { filterPlacesByDate, getFilterLabel, getNextRangeSelection, getPresetRange } from '@/utils/date-filter';

const places = [{ date: '2026-11-01' }, { date: '2026-11-04' }, { date: '2026-11-30' }];

describe('filterPlacesByDate', () => {
  it('keeps everything when no range is set', () => {
    expect(filterPlacesByDate(places, '', '')).toEqual(places);
  });

  it('includes both ends of the range', () => {
    expect(filterPlacesByDate(places, '2026-11-01', '2026-11-04')).toEqual([places[0], places[1]]);
  });

  it('applies a start date on its own', () => {
    expect(filterPlacesByDate(places, '2026-11-04', '')).toEqual([places[1], places[2]]);
  });

  it('applies an end date on its own', () => {
    expect(filterPlacesByDate(places, '', '2026-11-01')).toEqual([places[0]]);
  });
});

describe('getFilterLabel', () => {
  it('shows a full range', () => {
    expect(getFilterLabel('2026-11-01', '2026-11-30', 'all')).toBe('2026-11-01 ~ 2026-11-30');
  });

  it('shows an open-ended start', () => {
    expect(getFilterLabel('2026-11-01', '', 'all')).toBe('2026-11-01부터');
  });

  it('shows an open-ended end', () => {
    expect(getFilterLabel('', '2026-11-30', 'all')).toBe('2026-11-30까지');
  });

  it('falls back to the preset label', () => {
    expect(getFilterLabel('', '', 'all')).toBe('전체 기간');
  });
});

describe('getPresetRange', () => {
  it('clears the range for all time', () => {
    expect(getPresetRange('all', '2026-11-04')).toEqual({ start: '', end: '' });
  });

  it('uses Monday to Sunday for this week', () => {
    expect(getPresetRange('this_week', '2026-11-04')).toEqual({ start: '2026-11-02', end: '2026-11-08' });
  });

  it('uses the whole calendar month for this month', () => {
    expect(getPresetRange('this_month', '2026-11-04')).toEqual({ start: '2026-11-01', end: '2026-11-30' });
  });
});

describe('getNextRangeSelection', () => {
  it('starts a range on the first tap', () => {
    expect(getNextRangeSelection('', '', '2026-11-04')).toEqual({ start: '2026-11-04', end: '', target: 'end' });
  });

  it('finishes the range on a later date', () => {
    expect(getNextRangeSelection('2026-11-04', '', '2026-11-10')).toEqual({
      start: '2026-11-04',
      end: '2026-11-10',
      target: 'start',
    });
  });

  it('allows a one-day range', () => {
    expect(getNextRangeSelection('2026-11-04', '', '2026-11-04')).toEqual({
      start: '2026-11-04',
      end: '2026-11-04',
      target: 'start',
    });
  });

  it('starts over on a date before the start', () => {
    expect(getNextRangeSelection('2026-11-04', '', '2026-11-01')).toEqual({
      start: '2026-11-01',
      end: '',
      target: 'end',
    });
  });

  it('starts over after a finished range', () => {
    expect(getNextRangeSelection('2026-11-01', '2026-11-04', '2026-11-20')).toEqual({
      start: '2026-11-20',
      end: '',
      target: 'end',
    });
  });
});
