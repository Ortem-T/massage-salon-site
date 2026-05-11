export const bookingTimeSlots = ["10:00", "11:30", "13:00", "14:30", "16:00", "17:30", "19:00"] as const;

export type BookingTimeSlot = (typeof bookingTimeSlots)[number];

export const bookingWorkingWeekDays = [1, 2, 3, 4, 5, 6] as const;

export const bookingClosedDates = ["2026-05-15"] as const;

export const bookingBookedSlotsByDate: Record<string, readonly BookingTimeSlot[]> = {
  "2026-05-18": ["10:00", "11:30", "13:00", "14:30", "16:00", "17:30", "19:00"],
  "2026-05-20": ["10:00", "11:30", "13:00"]
};

