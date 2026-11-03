import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { today } from '@/constants/today';
import { buildCalendarWeeks, formatCalendarDate } from '@/utils/calendar';
import { getYearOptions } from '@/utils/date';

const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
const monthLabels = Array.from({ length: 12 }, (_, index) => `${index + 1}월`);

export function CalendarPicker({
  selectedDate,
  onSelectDate,
  activeDates = [],
  rangeStartDate,
  rangeEndDate,
}: {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  activeDates?: string[];
  rangeStartDate?: string;
  rangeEndDate?: string;
}) {
  const safeSelectedDate = selectedDate || today;
  const selected = new Date(`${safeSelectedDate}T00:00:00`);
  const [displayYear, setDisplayYear] = useState(selected.getFullYear());
  const [displayMonth, setDisplayMonth] = useState(selected.getMonth());
  const [openSelector, setOpenSelector] = useState<'year' | 'month' | null>(null);
  const yearOptions = useMemo(() => getYearOptions(displayYear), [displayYear]);

  const year = displayYear;
  const month = displayMonth;
  const calendarWeeks = buildCalendarWeeks(year, month);

  return (
    <View style={styles.calendar}>
      <View style={styles.calendarSelectorRow}>
        <View style={styles.calendarSelectorGroup}>
          <Pressable
            style={styles.calendarSelectorButton}
            onPress={() => setOpenSelector(openSelector === 'year' ? null : 'year')}>
            <Text style={styles.calendarSelectorText}>{year}년</Text>
            <Text style={styles.calendarSelectorChevron}>⌄</Text>
          </Pressable>
          {openSelector === 'year' ? (
            <ScrollView
              style={styles.calendarSelectorMenu}
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}>
              {yearOptions.map((yearOption) => (
                <Pressable
                  key={yearOption}
                  style={[styles.calendarSelectorItem, yearOption === year && styles.calendarSelectorItemActive]}
                  onPress={() => {
                    setDisplayYear(yearOption);
                    setOpenSelector(null);
                  }}>
                  <Text
                    style={[
                      styles.calendarSelectorItemText,
                      yearOption === year && styles.calendarSelectorItemTextActive,
                    ]}>
                    {yearOption}년
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}
        </View>

        <View style={styles.calendarSelectorGroup}>
          <Pressable
            style={styles.calendarSelectorButton}
            onPress={() => setOpenSelector(openSelector === 'month' ? null : 'month')}>
            <Text style={styles.calendarSelectorText}>{month + 1}월</Text>
            <Text style={styles.calendarSelectorChevron}>⌄</Text>
          </Pressable>
          {openSelector === 'month' ? (
            <ScrollView
              style={styles.calendarSelectorMenu}
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}>
              {monthLabels.map((monthLabel, monthIndex) => (
                <Pressable
                  key={monthLabel}
                  style={[styles.calendarSelectorItem, monthIndex === month && styles.calendarSelectorItemActive]}
                  onPress={() => {
                    setDisplayMonth(monthIndex);
                    setOpenSelector(null);
                  }}>
                  <Text
                    style={[
                      styles.calendarSelectorItemText,
                      monthIndex === month && styles.calendarSelectorItemTextActive,
                    ]}>
                    {monthLabel}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}
        </View>
      </View>
      <View style={styles.weekdayRow}>
        {weekdays.map((weekday) => (
          <Text key={weekday} style={styles.weekdayText}>
            {weekday}
          </Text>
        ))}
      </View>
      <View style={styles.calendarGrid}>
        {calendarWeeks.map((week, weekIndex) => (
          <View key={`week_${weekIndex}`} style={styles.calendarWeekRow}>
            {week.map((cell) => {
              if (!cell.day) {
                return <View key={cell.key} style={styles.calendarCell} />;
              }

              const cellDate = formatCalendarDate(year, month, cell.day);
              const isSelected = cellDate === safeSelectedDate;
              const isInRange = Boolean(
                rangeStartDate && rangeEndDate && cellDate >= rangeStartDate && cellDate <= rangeEndDate
              );
              const isActiveDate = activeDates.includes(cellDate);

              return (
                <Pressable
                  key={cell.key}
                  style={[
                    styles.calendarCell,
                    isInRange && styles.calendarCellInRange,
                    isSelected && styles.calendarCellSelected,
                  ]}
                  onPress={() => onSelectDate(cellDate)}>
                  <Text style={[styles.calendarDayText, isSelected && styles.calendarDayTextSelected]}>{cell.day}</Text>
                  {isActiveDate ? (
                    <View style={[styles.activeDateDot, isSelected && styles.activeDateDotSelected]} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  activeDateDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#B96A76',
    marginTop: 2,
  },
  activeDateDotSelected: {
    backgroundColor: '#F8EFEC',
  },
  calendar: {
    gap: 8,
    zIndex: 30,
  },
  calendarCell: {
    flex: 1,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarCellInRange: {
    backgroundColor: '#EBD8DC',
  },
  calendarCellSelected: {
    borderRadius: 8,
    backgroundColor: '#A86873',
  },
  calendarDayText: {
    color: '#3E3833',
    fontSize: 13,
    fontWeight: '700',
  },
  calendarDayTextSelected: {
    color: '#F8EFEC',
  },
  calendarGrid: {
    gap: 4,
  },
  calendarSelectorButton: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(222, 212, 201, 0.78)',
    backgroundColor: 'rgba(251, 250, 247, 0.68)',
    paddingHorizontal: 12,
  },
  calendarSelectorChevron: {
    color: '#625850',
    fontSize: 18,
    fontWeight: '900',
  },
  calendarSelectorGroup: {
    position: 'relative',
    flex: 1,
    zIndex: 40,
  },
  calendarSelectorItem: {
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E7D2CD',
  },
  calendarSelectorItemActive: {
    backgroundColor: '#EBD8DC',
  },
  calendarSelectorItemText: {
    color: '#3E3833',
    fontSize: 13,
    fontWeight: '800',
  },
  calendarSelectorItemTextActive: {
    color: '#A86873',
  },
  calendarSelectorMenu: {
    position: 'absolute',
    top: 48,
    left: 0,
    right: 0,
    zIndex: 60,
    maxHeight: 238,
    overflow: 'hidden',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D8C4BE',
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
  },
  calendarSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    zIndex: 40,
  },
  calendarSelectorText: {
    color: '#342725',
    fontSize: 14,
    fontWeight: '900',
  },
  calendarWeekRow: {
    flexDirection: 'row',
  },
  weekdayRow: {
    flexDirection: 'row',
  },
  weekdayText: {
    flex: 1,
    color: '#8B8076',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
});
