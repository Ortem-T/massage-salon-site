import {
  bookingBookedSlotsByDate,
  bookingClosedDates,
  bookingTimeSlots,
  bookingWorkingWeekDays,
  type BookingTimeSlot
} from "@/lib/booking/booking-options";

export function toDateValue(date: Date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().split("T")[0];
}

export function parseDateValue(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
}

export function getTodayValue() {
  return toDateValue(new Date());
}

export function isWorkingDay(value: string) {
  const date = parseDateValue(value);

  if (!date) {
    return false;
  }

  return bookingWorkingWeekDays.includes(date.getDay() as (typeof bookingWorkingWeekDays)[number]);
}

export function isClosedDate(value: string) {
  return bookingClosedDates.includes(value as (typeof bookingClosedDates)[number]);
}

export function getAvailableTimeSlots(value: string): BookingTimeSlot[] {
  if (!value || !isWorkingDay(value) || isClosedDate(value)) {
    return [];
  }

  const bookedSlots = bookingBookedSlotsByDate[value] ?? [];

  return bookingTimeSlots.filter((slot) => !bookedSlots.includes(slot));
}

export function isFullyBookedDate(value: string) {
  return Boolean(value) && getAvailableTimeSlots(value).length === 0;
}

export function isBookingDateSelectable(value: string, minDate: string) {
  return Boolean(value) && value >= minDate && isWorkingDay(value) && !isClosedDate(value) && !isFullyBookedDate(value);
}

