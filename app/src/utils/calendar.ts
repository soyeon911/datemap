export type CalendarCell = {
  key: string;
  day: number | null;
};

// Rows of 7 cells starting on Sunday, padded with empty cells. `month` is 0-based.
export function buildCalendarWeeks(year: number, month: number): CalendarCell[][] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const cells: CalendarCell[] = [
    ...Array.from({ length: firstDay }, (_, index) => ({ key: `empty_start_${index}`, day: null })),
    ...Array.from({ length: daysInMonth }, (_, index) => ({ key: `day_${index + 1}`, day: index + 1 })),
  ];
  const trailingEmptyCellCount = (7 - (cells.length % 7)) % 7;
  const paddedCells = [
    ...cells,
    ...Array.from({ length: trailingEmptyCellCount }, (_, index) => ({ key: `empty_end_${index}`, day: null })),
  ];

  return Array.from({ length: Math.ceil(paddedCells.length / 7) }, (_, weekIndex) =>
    paddedCells.slice(weekIndex * 7, weekIndex * 7 + 7)
  );
}

// `month` is 0-based.
export function formatCalendarDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
