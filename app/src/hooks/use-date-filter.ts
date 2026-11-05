import { useMemo, useState } from 'react';

import { today } from '@/constants/today';
import type { SavedDatePlace } from '@/db/date-cards';
import { getWeekRange } from '@/utils/date';
import {
  filterPlacesByDate,
  getFilterLabel,
  getNextRangeSelection,
  getPresetRange,
  type CalendarTarget,
  type FilterPreset,
} from '@/utils/date-filter';

// Owns the date range applied to saved places, from presets or the calendar.
export function useDateFilter(savedPlaces: SavedDatePlace[]) {
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [calendarTarget, setCalendarTarget] = useState<CalendarTarget>('start');
  const [filterPreset, setFilterPreset] = useState<FilterPreset>('all');
  const [isFilterDropdownVisible, setIsFilterDropdownVisible] = useState(false);

  const filteredPlaces = useMemo(
    () => filterPlacesByDate(savedPlaces, filterStartDate, filterEndDate),
    [filterEndDate, filterStartDate, savedPlaces]
  );

  const activeDates = useMemo(() => Array.from(new Set(savedPlaces.map((place) => place.date))), [savedPlaces]);

  const filterLabel = useMemo(
    () => getFilterLabel(filterStartDate, filterEndDate, filterPreset),
    [filterEndDate, filterPreset, filterStartDate]
  );

  const activeFilterDate = calendarTarget === 'start' ? filterStartDate || today : filterEndDate || today;

  function selectFilterDate(nextDate: string) {
    const selection = getNextRangeSelection(filterStartDate, filterEndDate, nextDate);
    setFilterPreset('all');
    setFilterStartDate(selection.start);
    setFilterEndDate(selection.end);
    setCalendarTarget(selection.target);
  }

  function applyFilterPreset(preset: FilterPreset) {
    const range = getPresetRange(preset, today);
    setFilterPreset(preset);
    setIsFilterDropdownVisible(false);
    setFilterStartDate(range.start);
    setFilterEndDate(range.end);
  }

  function selectWeekFilter(nextDate: string) {
    const range = getWeekRange(nextDate);
    setFilterPreset('all');
    setFilterStartDate(range.start);
    setFilterEndDate(range.end);
  }

  function toggleFilterDropdown() {
    setIsFilterDropdownVisible((isVisible) => !isVisible);
  }

  return {
    filteredPlaces,
    activeDates,
    filterStartDate,
    filterEndDate,
    filterLabel,
    activeFilterDate,
    isFilterDropdownVisible,
    toggleFilterDropdown,
    selectFilterDate,
    selectWeekFilter,
    applyFilterPreset,
  };
}
