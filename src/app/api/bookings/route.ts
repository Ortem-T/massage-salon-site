import { NextResponse } from "next/server";

import {
  isSlotAvailableBeforeSubmit,
  type AvailabilityBooking
} from "@/lib/booking/booking-availability";
import { bookingRequestPayloadSchema } from "@/lib/booking/booking-request-payload";
import { defaultBookingAvailability } from "@/lib/booking/booking-options";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type PublicAvailabilityRow = {
  booking_date: string;
  preferred_time: string;
  therapist_id: string | null;
  duration_minutes: number | null;
  status: AvailabilityBooking["status"];
};

function toAvailabilityBooking(row: PublicAvailabilityRow): AvailabilityBooking {
  return {
    bookingDate: row.booking_date,
    preferredTime: row.preferred_time,
    therapistId: row.therapist_id,
    durationMinutes: row.duration_minutes,
    status: row.status
  };
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid booking request." }, { status: 400 });
  }

  const payload = bookingRequestPayloadSchema.safeParse(body);

  if (!payload.success) {
    return NextResponse.json({ error: "Invalid booking request." }, { status: 400 });
  }

  const supabase = createSupabaseBrowserClient();
  const { data: service, error: serviceError } = await supabase
    .from("services")
    .select("slug, duration_minutes")
    .eq("slug", payload.data.service)
    .eq("active", true)
    .eq("bookable_online", true)
    .maybeSingle();

  if (serviceError || !service) {
    return NextResponse.json({ error: "Invalid booking service." }, { status: 400 });
  }

  const { data: therapist, error: therapistError } = await supabase
    .from("therapists")
    .select("id, display_name")
    .eq("id", payload.data.specialist)
    .eq("active", true)
    .maybeSingle();

  if (therapistError || !therapist) {
    return NextResponse.json({ error: "Invalid booking specialist." }, { status: 400 });
  }

  const { data: availabilityRows, error: availabilityError } = await supabase
    .from("public_booking_availability")
    .select("booking_date, preferred_time, therapist_id, duration_minutes, status")
    .eq("booking_date", payload.data.preferred_date);

  if (availabilityError) {
    return NextResponse.json({ error: "Booking availability could not be checked." }, { status: 500 });
  }

  const isAvailable = isSlotAvailableBeforeSubmit({
    therapistId: therapist.id,
    serviceDurationMinutes: service.duration_minutes,
    date: payload.data.preferred_date,
    preferredTime: payload.data.preferred_time,
    bookings: ((availabilityRows ?? []) as PublicAvailabilityRow[]).map(toAvailabilityBooking),
    workingHours: {
      start: defaultBookingAvailability.workdayStart,
      end: defaultBookingAvailability.workdayEnd
    },
    breakMinutes: defaultBookingAvailability.breakMinutes
  });

  if (!isAvailable) {
    return NextResponse.json(
      {
        code: "slot_unavailable",
        error: "Selected time is no longer available."
      },
      { status: 409 }
    );
  }

  const { error } = await supabase
    .from("bookings")
    .insert({
      ...payload.data,
      specialist: therapist.display_name,
      therapist_id: therapist.id,
      status: "pending",
      source: "website"
    });

  if (error) {
    return NextResponse.json({ error: "Booking request could not be created." }, { status: 500 });
  }

  return NextResponse.json({ booking: { status: "pending" } }, { status: 201 });
}
