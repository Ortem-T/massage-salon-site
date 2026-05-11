import { NextResponse } from "next/server";

import { bookingRequestPayloadSchema } from "@/lib/booking/booking-request-payload";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

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
  const { error } = await supabase
    .from("bookings")
    .insert({
      ...payload.data,
      status: "pending",
      source: "website"
    });

  if (error) {
    return NextResponse.json({ error: "Booking request could not be created." }, { status: 500 });
  }

  return NextResponse.json({ booking: { status: "pending" } }, { status: 201 });
}
