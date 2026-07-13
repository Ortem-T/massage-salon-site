import "server-only";

import {
  calculateAvailableTimeSlots,
  timeToMinutes,
  type AvailabilityBooking,
  type AvailabilityScheduleBlock
} from "@/lib/booking/booking-availability";
import { defaultBookingAvailability, getDefaultBookingStartWindow } from "@/lib/booking/booking-options";
import { type BookingStatus } from "@/lib/booking/booking-schema";
import { type Database } from "@/lib/supabase/database.types";

type SupabaseAdminClient = ReturnType<typeof import("@/lib/supabase/admin").createSupabaseAdminClient>;

export type SuggestedRebooking = {
  serviceId: string;
  therapistId: string | null;
  date: string | null;
  time: string | null;
};

type PreviousBookingRow = {
  service: string;
  therapist_id: string | null;
  preferred_date: string;
  preferred_time: string;
  duration_minutes: number | null;
  status: BookingStatus;
};

type PublicAvailabilityRow = Database["public"]["Views"]["public_booking_availability"]["Row"];
type PublicScheduleBlockRow = Database["public"]["Views"]["public_schedule_block_availability"]["Row"];

const salonTimeZone = "Europe/Belgrade";
const rebookingSearchWindowDays = 60;

function getBelgradeParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    timeZone: salonTimeZone,
    year: "numeric"
  }).formatToParts(date);

  return new Map(parts.map((part) => [part.type, part.value]));
}

function getBelgradeNow() {
  const parts = getBelgradeParts(new Date());
  const date = `${parts.get("year")}-${parts.get("month")}-${parts.get("day")}`;
  const time = `${parts.get("hour")}:${parts.get("minute")}`;

  return {
    date,
    dateTimeKey: `${date}T${time}`,
    minutes: timeToMinutes(time) ?? 0
  };
}

function addDays(dateValue: string, days: number) {
  const date = new Date(`${dateValue}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().split("T")[0];
}

function getDateRange(startDate: string, endDate: string) {
  const dates: string[] = [];
  const cursor = new Date(`${startDate}T12:00:00Z`);
  const end = new Date(`${endDate}T12:00:00Z`);

  while (cursor <= end) {
    dates.push(cursor.toISOString().split("T")[0]);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

function isPastBooking(booking: PreviousBookingRow, nowKey: string) {
  return `${booking.preferred_date}T${booking.preferred_time}` < nowKey;
}

function findTemplateBooking(bookings: PreviousBookingRow[], nowKey: string) {
  const pastBookings = bookings.filter((booking) => isPastBooking(booking, nowKey));
  const completed = pastBookings.find((booking) => booking.status === "completed");

  if (completed) {
    return completed;
  }

  return pastBookings.find((booking) => booking.status === "confirmed") ?? null;
}

function toAvailabilityBooking(row: PublicAvailabilityRow): AvailabilityBooking {
  return {
    bookingDate: row.booking_date,
    preferredTime: row.preferred_time,
    therapistId: row.therapist_id,
    durationMinutes: row.duration_minutes,
    status: row.status
  };
}

function toAvailabilityScheduleBlock(row: PublicScheduleBlockRow): AvailabilityScheduleBlock {
  return {
    blockDate: row.block_date,
    therapistId: row.therapist_id,
    blockType: row.block_type,
    blockScope: row.block_scope,
    startTime: row.start_time,
    endTime: row.end_time
  };
}

function orderSlotsByPreferredTime(slots: string[], preferredTime: string) {
  const preferredMinutes = timeToMinutes(preferredTime);

  if (preferredMinutes === null) {
    return slots;
  }

  return [...slots].sort((a, b) => {
    const aMinutes = timeToMinutes(a) ?? 0;
    const bMinutes = timeToMinutes(b) ?? 0;
    const aDiff = aMinutes - preferredMinutes;
    const bDiff = bMinutes - preferredMinutes;
    const distance = Math.abs(aDiff) - Math.abs(bDiff);

    if (distance !== 0) {
      return distance;
    }

    if (aDiff >= 0 && bDiff < 0) {
      return -1;
    }

    if (aDiff < 0 && bDiff >= 0) {
      return 1;
    }

    return aMinutes - bMinutes;
  });
}

async function findNearestAvailableSlot(
  supabase: SupabaseAdminClient,
  input: {
    serviceDurationMinutes: number;
    therapistId: string;
    previousTime: string;
  }
) {
  const now = getBelgradeNow();
  const endDate = addDays(now.date, rebookingSearchWindowDays);
  const [{ data: availabilityRows, error: availabilityError }, { data: blockRows, error: blocksError }] = await Promise.all([
    supabase
      .from("public_booking_availability")
      .select("booking_date, preferred_time, therapist_id, service_slug, duration_minutes, status")
      .gte("booking_date", now.date)
      .lte("booking_date", endDate),
    supabase
      .from("public_schedule_block_availability")
      .select("block_date, therapist_id, block_type, block_scope, start_time, end_time")
      .gte("block_date", now.date)
      .lte("block_date", endDate)
  ]);

  if (availabilityError || blocksError) {
    return null;
  }

  const bookings = ((availabilityRows ?? []) as PublicAvailabilityRow[]).map(toAvailabilityBooking);
  const scheduleBlocks = ((blockRows ?? []) as PublicScheduleBlockRow[]).map(toAvailabilityScheduleBlock);

  for (const date of getDateRange(now.date, endDate)) {
    let slots = calculateAvailableTimeSlots({
      therapistId: input.therapistId,
      serviceDurationMinutes: input.serviceDurationMinutes,
      date,
      bookings,
      scheduleBlocks,
      bookingWindow: getDefaultBookingStartWindow(),
      breakMinutes: defaultBookingAvailability.breakMinutes
    });

    if (date === now.date) {
      slots = slots.filter((slot) => {
        const minutes = timeToMinutes(slot);
        return minutes !== null && minutes > now.minutes;
      });
    }

    const [bestSlot] = orderSlotsByPreferredTime(slots, input.previousTime);

    if (bestSlot) {
      return {
        date,
        time: bestSlot
      };
    }
  }

  return null;
}

export async function getSuggestedRebookingForClient(
  supabase: SupabaseAdminClient,
  clientId: string
): Promise<SuggestedRebooking | null> {
  const now = getBelgradeNow();
  const { data: previousRows, error: previousError } = await supabase
    .from("bookings")
    .select("service, therapist_id, preferred_date, preferred_time, duration_minutes, status")
    .eq("client_id", clientId)
    .in("status", ["completed", "confirmed"])
    .order("preferred_date", { ascending: false })
    .order("preferred_time", { ascending: false })
    .limit(50);

  if (previousError || !previousRows?.length) {
    return null;
  }

  const previousBooking = findTemplateBooking(previousRows as PreviousBookingRow[], now.dateTimeKey);

  if (!previousBooking) {
    return null;
  }

  const { data: service, error: serviceError } = await supabase
    .from("services")
    .select("id, slug, duration_minutes")
    .eq("slug", previousBooking.service)
    .eq("active", true)
    .eq("bookable_online", true)
    .maybeSingle();

  if (serviceError || !service || !Number.isFinite(service.duration_minutes) || service.duration_minutes <= 0) {
    return null;
  }

  const suggestion: SuggestedRebooking = {
    serviceId: service.slug,
    therapistId: null,
    date: null,
    time: null
  };

  if (!previousBooking.therapist_id) {
    return suggestion;
  }

  const { data: therapist, error: therapistError } = await supabase
    .from("therapists")
    .select("id")
    .eq("id", previousBooking.therapist_id)
    .eq("active", true)
    .maybeSingle();

  if (therapistError || !therapist) {
    return suggestion;
  }

  const { data: therapistService, error: therapistServiceError } = await supabase
    .from("therapist_services")
    .select("id")
    .eq("service_id", service.id)
    .eq("therapist_id", therapist.id)
    .eq("active", true)
    .maybeSingle();

  if (therapistServiceError || !therapistService) {
    return suggestion;
  }

  suggestion.therapistId = therapist.id;

  const slot = await findNearestAvailableSlot(supabase, {
    serviceDurationMinutes: service.duration_minutes,
    therapistId: therapist.id,
    previousTime: previousBooking.preferred_time
  });

  if (slot) {
    suggestion.date = slot.date;
    suggestion.time = slot.time;
  }

  return suggestion;
}
