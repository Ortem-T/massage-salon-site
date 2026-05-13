import { defaultBookingAvailability, type BookingWorkingDay } from "@/lib/booking/booking-options";

export type AvailabilityBookingStatus = "pending" | "confirmed" | "cancelled" | "completed";

export type AvailabilityBooking = {
  bookingDate: string;
  preferredTime: string;
  therapistId: string | null;
  durationMinutes: number | null;
  status: AvailabilityBookingStatus;
};

export type BlockedInterval = {
  startMinutes: number;
  endMinutes: number;
};

type CalculateAvailableTimeSlotsInput = {
  therapistId: string;
  serviceDurationMinutes: number;
  date: string;
  workingHours?: {
    start: string;
    end: string;
  };
  breakMinutes?: number;
  bookings?: AvailabilityBooking[];
};

type IsSlotAvailableInput = CalculateAvailableTimeSlotsInput & {
  preferredTime: string;
};

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

export function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
}

export function minutesToTime(value: number) {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function isWorkingDay(value: string) {
  const date = parseDateValue(value);

  if (!date) {
    return false;
  }

  return defaultBookingAvailability.workingDays.includes(date.getDay() as BookingWorkingDay);
}

export function roundServiceDurationForScheduling(durationMinutes: number) {
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    return 60;
  }

  return Math.ceil(durationMinutes / 30) * 30;
}

export function calculateBlockedIntervals(
  bookings: AvailabilityBooking[],
  options: { breakMinutes?: number } = {}
): BlockedInterval[] {
  const breakMinutes = options.breakMinutes ?? defaultBookingAvailability.breakMinutes;

  return bookings
    .filter((booking) => booking.status === "pending" || booking.status === "confirmed")
    .flatMap((booking) => {
      const startMinutes = timeToMinutes(booking.preferredTime);

      if (startMinutes === null) {
        return [];
      }

      const roundedDuration = roundServiceDurationForScheduling(booking.durationMinutes ?? 60);

      return [
        {
          startMinutes,
          endMinutes: startMinutes + roundedDuration + breakMinutes
        }
      ];
    })
    .sort((a, b) => a.startMinutes - b.startMinutes);
}

export function getTherapistBookingsByDate(
  therapistId: string,
  date: string,
  bookings: AvailabilityBooking[]
) {
  return bookings.filter((booking) => booking.therapistId === therapistId && booking.bookingDate === date);
}

export function getAllBookingsByDate(date: string, bookings: AvailabilityBooking[]) {
  return bookings.filter((booking) => booking.bookingDate === date);
}

function intervalsOverlap(first: BlockedInterval, second: BlockedInterval) {
  return first.startMinutes < second.endMinutes && second.startMinutes < first.endMinutes;
}

export function calculateAvailableTimeSlots({
  therapistId,
  serviceDurationMinutes,
  date,
  workingHours = {
    start: defaultBookingAvailability.workdayStart,
    end: defaultBookingAvailability.workdayEnd
  },
  breakMinutes = defaultBookingAvailability.breakMinutes,
  bookings = []
}: CalculateAvailableTimeSlotsInput) {
  if (!therapistId || !date || !isWorkingDay(date)) {
    return [];
  }

  const workdayStart = timeToMinutes(workingHours.start);
  const workdayEnd = timeToMinutes(workingHours.end);

  if (workdayStart === null || workdayEnd === null || workdayStart >= workdayEnd) {
    return [];
  }

  const slotDuration = roundServiceDurationForScheduling(serviceDurationMinutes) + breakMinutes;
  const therapistBookings = getTherapistBookingsByDate(therapistId, date, bookings);
  const blockedIntervals = calculateBlockedIntervals(therapistBookings, { breakMinutes });
  const slots: string[] = [];

  for (let startMinutes = workdayStart; startMinutes + slotDuration <= workdayEnd; startMinutes += 30) {
    const candidate = {
      startMinutes,
      endMinutes: startMinutes + slotDuration
    };

    if (!blockedIntervals.some((interval) => intervalsOverlap(candidate, interval))) {
      slots.push(minutesToTime(startMinutes));
    }
  }

  return slots;
}

export function isSlotAvailableBeforeSubmit(input: IsSlotAvailableInput) {
  return calculateAvailableTimeSlots(input).includes(input.preferredTime);
}

export function getAvailableTimeSlots(value: string) {
  return calculateAvailableTimeSlots({
    therapistId: "manual-dashboard-preview",
    serviceDurationMinutes: 60,
    date: value,
    bookings: []
  });
}

export function isBookingDateSelectable(value: string, minDate: string) {
  return Boolean(value) && value >= minDate && isWorkingDay(value);
}
