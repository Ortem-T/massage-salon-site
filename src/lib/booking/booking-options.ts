export const defaultBookingAvailability = {
  firstBookingStart: "10:00",
  lastBookingStart: "19:00",
  maxAdvanceBookingDays: 60,
  slotStepMinutes: 30,
  workingDays: [0, 1, 2, 3, 4, 5, 6],
  breakMinutes: 30
} as const;

export type BookingWorkingDay = (typeof defaultBookingAvailability.workingDays)[number];

export function getDefaultBookingStartWindow() {
  return {
    firstStart: defaultBookingAvailability.firstBookingStart,
    lastStart: defaultBookingAvailability.lastBookingStart
  };
}
