export type CalendarMonthGridDay = {
  dateKey: string;
  dayOfMonth: number;
  isCurrentMonth: boolean;
};

function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, day, 12));
}

function toDateKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(
    date.getUTCDate()
  ).padStart(2, "0")}`;
}

function addDays(value: string, amount: number) {
  const date = parseDateKey(value);
  date.setUTCDate(date.getUTCDate() + amount);
  return toDateKey(date);
}

function startOfWeek(value: string) {
  const date = parseDateKey(value);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  return toDateKey(date);
}

function getWeekDays(value: string) {
  const start = startOfWeek(value);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function getCalendarMonthGridDays(value: string): CalendarMonthGridDay[] {
  const date = parseDateKey(value);
  const month = date.getUTCMonth();
  const first = new Date(Date.UTC(date.getUTCFullYear(), month, 1, 12));
  const last = new Date(Date.UTC(date.getUTCFullYear(), month + 1, 0, 12));
  const start = startOfWeek(toDateKey(first));
  const lastWeek = getWeekDays(toDateKey(last));
  const end = lastWeek[lastWeek.length - 1];
  const days: CalendarMonthGridDay[] = [];
  let cursor = start;

  while (cursor <= end) {
    const cursorDate = parseDateKey(cursor);

    days.push({
      dateKey: cursor,
      dayOfMonth: cursorDate.getUTCDate(),
      isCurrentMonth: cursorDate.getUTCMonth() === month
    });
    cursor = addDays(cursor, 1);
  }

  return days;
}
