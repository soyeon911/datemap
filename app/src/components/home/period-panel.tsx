import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { filterPresetLabels, type FilterPreset } from '@/utils/date-filter';

export function PeriodPanel({
  filterLabel,
  isDropdownVisible,
  onToggleDropdown,
  onOpenCalendar,
  onSelectPreset,
}: {
  filterLabel: string;
  isDropdownVisible: boolean;
  onToggleDropdown: () => void;
  onOpenCalendar: () => void;
  onSelectPreset: (preset: FilterPreset) => void;
}) {
  return (
    <View style={styles.periodPanel}>
      <Pressable
        style={styles.filterDropdownButton}
        onPress={onToggleDropdown}>
        <View>
          <Text style={styles.filterDropdownLabel}>날짜 필터</Text>
          <Text style={styles.filterDropdownValue}>{filterLabel}</Text>
        </View>
        <Text style={styles.dropdownChevron}>⌄</Text>
      </Pressable>
      <Pressable
        accessibilityLabel="날짜 필터 열기"
        style={styles.calendarIconButton}
        onPress={onOpenCalendar}>
        <SymbolView
          name="calendar"
          size={23}
          tintColor="#F8EFEC"
          weight="semibold"
          fallback={<Text style={styles.calendarIconText}>□</Text>}
        />
      </Pressable>
      {isDropdownVisible ? (
        <View style={styles.filterDropdownMenu}>
          {(Object.keys(filterPresetLabels) as FilterPreset[]).map((preset) => (
            <Pressable key={preset} style={styles.filterDropdownItem} onPress={() => onSelectPreset(preset)}>
              <Text style={styles.filterDropdownItemText}>{filterPresetLabels[preset]}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  calendarIconButton: {
    width: 54,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#A86873',
  },
  calendarIconText: {
    color: '#F8EFEC',
    fontSize: 20,
    fontWeight: '900',
  },
  dropdownChevron: {
    color: '#625850',
    fontSize: 20,
    fontWeight: '800',
  },
  filterDropdownButton: {
    flex: 1,
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D2BEB8',
    backgroundColor: '#F1E5E1',
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  filterDropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#E7D2CD',
  },
  filterDropdownItemText: {
    color: '#3E3833',
    fontSize: 14,
    fontWeight: '800',
  },
  filterDropdownLabel: {
    color: '#8B8076',
    fontSize: 11,
    fontWeight: '800',
  },
  filterDropdownMenu: {
    position: 'absolute',
    left: 0,
    right: 62,
    top: 62,
    zIndex: 20,
    overflow: 'hidden',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D8C4BE',
    backgroundColor: '#F8EFEC',
  },
  filterDropdownValue: {
    color: '#342725',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  periodPanel: {
    position: 'relative',
    flexDirection: 'row',
    gap: 8,
    zIndex: 10,
  },
});
