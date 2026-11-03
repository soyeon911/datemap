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

export function getLast30DaysRange(endDateString: string) {
  const startDate = new Date(`${endDateString}T00:00:00`);
  startDate.setDate(startDate.getDate() - 29);

  return {
    start: toDateString(startDate),
    end: endDateString,
  };
}

export function toDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}
