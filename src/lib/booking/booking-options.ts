export const defaultBookingAvailability = {
  workdayStart: "10:00",
  workdayEnd: "19:00",
  workingDays: [0, 1, 2, 3, 4, 5, 6],
  breakMinutes: 30
} as const;

export type BookingWorkingDay = (typeof defaultBookingAvailability.workingDays)[number];
