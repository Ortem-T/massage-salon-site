import { NextRequest, NextResponse } from "next/server";

import {
  calculateAvailableTimeSlots,
  type AvailabilityBooking,
  type AvailabilityScheduleBlock
} from "@/lib/booking/booking-availability";
import { defaultBookingAvailability } from "@/lib/booking/booking-options";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type PublicAvailabilityRow = {
  booking_date: string;
  preferred_time: string;
  therapist_id: string | null;
  duration_minutes: number | null;
  status: AvailabilityBooking["status"];
};

type PublicScheduleBlockRow = {
  block_date: string;
  therapist_id: string | null;
  block_type: AvailabilityScheduleBlock["blockType"];
  block_scope: AvailabilityScheduleBlock["blockScope"];
  start_time: string | null;
  end_time: string | null;
};

function isDateValue(value: string | null) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
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

function toAvailabilityBooking(row: PublicAvailabilityRow): AvailabilityBooking {
  return {
    bookingDate: row.booking_date,
    preferredTime: row.preferred_time,
    therapistId: row.therapist_id,
    durationMinutes: row.duration_minutes,
    status: row.status
  };
}

function getDateRange(startDate: string, endDate: string) {
  const dates: string[] = [];
  const cursor = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);

  while (cursor <= end) {
    dates.push(cursor.toISOString().split("T")[0]);
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const therapistId = searchParams.get("therapistId")?.trim() ?? "";
  const serviceSlug = searchParams.get("serviceSlug")?.trim() ?? "";
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (!therapistId || !serviceSlug || !isDateValue(startDate) || !isDateValue(endDate) || startDate! > endDate!) {
    return NextResponse.json({ error: "Invalid availability request." }, { status: 400 });
  }

  const supabase = createSupabaseBrowserClient();
  const { data: service, error: serviceError } = await supabase
    .from("services")
    .select("id, slug, duration_minutes")
    .eq("slug", serviceSlug)
    .eq("active", true)
    .eq("bookable_online", true)
    .maybeSingle();

  if (serviceError || !service) {
    return NextResponse.json({ error: "Invalid service." }, { status: 400 });
  }

  const { data: therapist, error: therapistError } = await supabase
    .from("therapists")
    .select("id")
    .eq("id", therapistId)
    .eq("active", true)
    .maybeSingle();

  if (therapistError || !therapist) {
    return NextResponse.json({ error: "Invalid therapist." }, { status: 400 });
  }

  const { data: therapistService, error: therapistServiceError } = await supabase
    .from("therapist_services")
    .select("id")
    .eq("service_id", service.id)
    .eq("therapist_id", therapist.id)
    .eq("active", true)
    .maybeSingle();

  if (therapistServiceError || !therapistService) {
    return NextResponse.json(
      {
        code: "service_therapist_unavailable",
        error: "Selected therapist does not provide this service."
      },
      { status: 400 }
    );
  }

  const { data: rows, error: availabilityError } = await supabase
    .from("public_booking_availability")
    .select("booking_date, preferred_time, therapist_id, duration_minutes, status")
    .gte("booking_date", startDate!)
    .lte("booking_date", endDate!);

  if (availabilityError) {
    return NextResponse.json({ error: "Availability could not be loaded." }, { status: 500 });
  }

  const { data: blockRows, error: blocksError } = await supabase
    .from("public_schedule_block_availability")
    .select("block_date, therapist_id, block_type, block_scope, start_time, end_time")
    .gte("block_date", startDate!)
    .lte("block_date", endDate!);

  if (blocksError) {
    return NextResponse.json({ error: "Availability could not be loaded." }, { status: 500 });
  }

  const bookings = ((rows ?? []) as PublicAvailabilityRow[]).map(toAvailabilityBooking);
  const scheduleBlocks = ((blockRows ?? []) as PublicScheduleBlockRow[]).map(toAvailabilityScheduleBlock);
  const days = Object.fromEntries(
    getDateRange(startDate!, endDate!).map((date) => {
      const availableTimeSlots = calculateAvailableTimeSlots({
        therapistId,
        serviceDurationMinutes: service.duration_minutes,
        date,
        bookings,
        scheduleBlocks,
        bookingWindow: {
          firstStart: defaultBookingAvailability.firstBookingStart,
          lastStart: defaultBookingAvailability.lastBookingStart
        },
        breakMinutes: defaultBookingAvailability.breakMinutes
      });

      return [
        date,
        {
          available: availableTimeSlots.length > 0,
          availableTimeSlots
        }
      ];
    })
  );

  return NextResponse.json({
    days,
    bookingWindow: {
      firstStart: defaultBookingAvailability.firstBookingStart,
      lastStart: defaultBookingAvailability.lastBookingStart
    },
    breakMinutes: defaultBookingAvailability.breakMinutes
  });
}
