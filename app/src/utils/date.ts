export function getYearOptions(centerYear: number) {
  return Array.from({ length: 11 }, (_, index) => centerYear - 5 + index);
}

export function getWeekRange(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`);
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const start = new Date(date);
  start.setDate(date.getDate() + mondayOffset);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return {
    start: toDateString(start),
    end: toDateString(end),
  };
}

export function getMonthRange(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`);
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);

  return {
    start: toDateString(start),
    end: toDateString(end),
  };
}

// Uses the device's local calendar date. toISOString() would convert to UTC first,
// which turns local midnight in UTC+9 into the previous day.
export function toDateString(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${date.getFullYear()}-${month}-${day}`;
}
