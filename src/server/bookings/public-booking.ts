import { NextResponse } from "next/server";

import {
  isSlotAvailableBeforeSubmit,
  timeToMinutes,
  type AvailabilityBooking,
  type AvailabilityScheduleBlock
} from "@/lib/booking/booking-availability";
import { bookingRequestPayloadSchema } from "@/lib/booking/booking-request-payload";
import { defaultBookingAvailability, getDefaultBookingStartWindow } from "@/lib/booking/booking-options";
import { getAvailableRoomsForAvailability } from "@/lib/booking/room-settings";
import { getActivePromotionForPlacement } from "@/lib/promotions/public";
import { createSupabasePublicClient } from "@/lib/supabase/client";
import { notifyTelegramNewBooking } from "@/server/telegram/bookingNotifications";
import { isAllowedPublicOrigin } from "@/server/security/origin";
import { checkRateLimit, consumeRateLimit, getClientIp } from "@/server/security/rate-limit";

const bookingAttemptLimit = {
  max: 5,
  windowMs: 10 * 60 * 1000
};

const successfulPhoneLimit = {
  max: 2,
  windowMs: 30 * 60 * 1000
};

const salonTimeZone = "Europe/Belgrade";

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

function jsonError(code: string, error: string, status: number, headers?: HeadersInit) {
  return NextResponse.json({ code, error }, { status, headers });
}

function getDateValueInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    return date.toISOString().split("T")[0];
  }

  return `${year}-${month}-${day}`;
}

function getTodayValue() {
  return getDateValueInTimeZone(new Date(), salonTimeZone);
}

function addDays(dateValue: string, days: number) {
  const date = new Date(`${dateValue}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().split("T")[0];
}

function isTimeInsideBookingStartWindow(time: string) {
  const selectedMinutes = timeToMinutes(time);
  const firstBookingStart = timeToMinutes(defaultBookingAvailability.firstBookingStart);
  const lastBookingStart = timeToMinutes(defaultBookingAvailability.lastBookingStart);

  return (
    selectedMinutes !== null &&
    firstBookingStart !== null &&
    lastBookingStart !== null &&
    selectedMinutes >= firstBookingStart &&
    selectedMinutes <= lastBookingStart
  );
}

function normalizePhoneForRateLimit(phone: string) {
  return phone.replace(/[^\d+]/g, "");
}

function rateLimitHeaders(resetAt: number): HeadersInit {
  return {
    "Retry-After": String(Math.max(1, Math.ceil((resetAt - Date.now()) / 1000)))
  };
}

export async function handlePublicBookingPost(request: Request) {
  if (!isAllowedPublicOrigin(request)) {
    return jsonError("invalid_origin", "Invalid booking request.", 403);
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError("invalid_payload", "Invalid booking request.", 400);
  }

  const payload = bookingRequestPayloadSchema.safeParse(body);

  if (!payload.success) {
    return jsonError("invalid_payload", "Invalid booking request.", 400);
  }

  if (payload.data.website) {
    return NextResponse.json({ booking: { status: "pending" } }, { status: 202 });
  }

  const ipLimit = consumeRateLimit(`public-booking:attempt:ip:${getClientIp(request)}`, bookingAttemptLimit.max, bookingAttemptLimit.windowMs);

  if (!ipLimit.allowed) {
    return jsonError("rate_limited", "Too many attempts. Please try again later.", 429, rateLimitHeaders(ipLimit.resetAt));
  }

  const phoneRateKey = `public-booking:success:phone:${normalizePhoneForRateLimit(payload.data.client_phone)}`;
  const phoneLimit = checkRateLimit(phoneRateKey, successfulPhoneLimit.max, successfulPhoneLimit.windowMs);

  if (!phoneLimit.allowed) {
    return jsonError("rate_limited", "Too many attempts. Please try again later.", 429, rateLimitHeaders(phoneLimit.resetAt));
  }

  const today = getTodayValue();
  const maxBookingDate = addDays(today, 60);

  if (payload.data.preferred_date < today || payload.data.preferred_date > maxBookingDate) {
    return jsonError("invalid_booking_date", "Invalid booking date.", 400);
  }

  if (!isTimeInsideBookingStartWindow(payload.data.preferred_time)) {
    return jsonError("invalid_booking_time", "Invalid booking time.", 400);
  }

  const supabase = createSupabasePublicClient();
  const activePromotion = await getActivePromotionForPlacement(payload.data.locale, "booking_section_card");
  const { data: service, error: serviceError } = await supabase
    .from("services")
    .select("id, slug, duration_minutes")
    .eq("slug", payload.data.service)
    .eq("active", true)
    .eq("bookable_online", true)
    .maybeSingle();

  if (serviceError || !service) {
    return jsonError("invalid_service", "Invalid booking service.", 400);
  }

  const { data: serviceTranslation } = await supabase
    .from("service_translations")
    .select("name")
    .eq("service_id", service.id)
    .eq("locale", "ru")
    .maybeSingle();

  const { data: therapist, error: therapistError } = await supabase
    .from("therapists")
    .select("id, display_name")
    .eq("id", payload.data.specialist)
    .eq("active", true)
    .maybeSingle();

  if (therapistError || !therapist) {
    return jsonError("invalid_specialist", "Invalid booking specialist.", 400);
  }

  const { data: therapistService, error: therapistServiceError } = await supabase
    .from("therapist_services")
    .select("id")
    .eq("service_id", service.id)
    .eq("therapist_id", therapist.id)
    .eq("active", true)
    .maybeSingle();

  if (therapistServiceError || !therapistService) {
    return jsonError("service_therapist_unavailable", "Selected specialist does not provide this service.", 400);
  }

  const { data: availabilityRows, error: availabilityError } = await supabase
    .from("public_booking_availability")
    .select("booking_date, preferred_time, therapist_id, duration_minutes, status")
    .eq("booking_date", payload.data.preferred_date);

  if (availabilityError) {
    return jsonError("availability_check_failed", "Booking availability could not be checked.", 500);
  }

  const { data: blockRows, error: blocksError } = await supabase
    .from("public_schedule_block_availability")
    .select("block_date, therapist_id, block_type, block_scope, start_time, end_time")
    .eq("block_date", payload.data.preferred_date);

  if (blocksError) {
    return jsonError("availability_check_failed", "Booking availability could not be checked.", 500);
  }

  const availableRooms = await getAvailableRoomsForAvailability();
  const isAvailable = isSlotAvailableBeforeSubmit({
    therapistId: therapist.id,
    serviceDurationMinutes: service.duration_minutes,
    date: payload.data.preferred_date,
    preferredTime: payload.data.preferred_time,
    bookings: ((availabilityRows ?? []) as PublicAvailabilityRow[]).map(toAvailabilityBooking),
    scheduleBlocks: ((blockRows ?? []) as PublicScheduleBlockRow[]).map(toAvailabilityScheduleBlock),
    bookingWindow: getDefaultBookingStartWindow(),
    breakMinutes: defaultBookingAvailability.breakMinutes,
    availableRooms
  });

  if (!isAvailable) {
    return jsonError("slot_unavailable", "Selected time is no longer available.", 409);
  }

  const { data: clientId, error: clientError } = await supabase.rpc("find_or_create_public_booking_client", {
    client_name: payload.data.client_name,
    client_phone: payload.data.client_phone,
    client_locale: payload.data.locale
  });

  if (clientError || !clientId) {
    return jsonError("client_link_failed", "Booking client could not be prepared.", 500);
  }

  const { error } = await supabase
    .from("bookings")
    .insert({
      service: payload.data.service,
      specialist: therapist.display_name,
      preferred_date: payload.data.preferred_date,
      preferred_time: payload.data.preferred_time,
      client_name: payload.data.client_name,
      client_phone: payload.data.client_phone,
      client_contact_channel: "phone",
      client_contact_value: payload.data.client_phone,
      client_comment: payload.data.client_comment,
      locale: payload.data.locale,
      client_id: clientId,
      therapist_id: therapist.id,
      duration_minutes: service.duration_minutes,
      ...(activePromotion
        ? {
            promotion_id: activePromotion.id,
            promotion_snapshot_title: activePromotion.title,
            promotion_snapshot_description: activePromotion.description
          }
        : {}),
      status: "pending",
      source: "website"
    });

  if (error) {
    return jsonError("insert_failed", "Booking request could not be created.", 500);
  }

  consumeRateLimit(phoneRateKey, successfulPhoneLimit.max, successfulPhoneLimit.windowMs);

  await notifyTelegramNewBooking({
    service: serviceTranslation?.name ?? service.slug,
    preferredDate: payload.data.preferred_date,
    preferredTime: payload.data.preferred_time,
    durationMinutes: service.duration_minutes,
    clientName: payload.data.client_name,
    clientPhone: payload.data.client_phone,
    clientLocale: payload.data.locale,
    source: "website",
    therapistName: therapist.display_name,
    clientComment: payload.data.client_comment,
    promotionTitle: activePromotion?.telegramTitle ?? null
  });

  return NextResponse.json({ booking: { status: "pending" } }, { status: 201 });
}
