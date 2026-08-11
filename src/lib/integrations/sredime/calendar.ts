import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { siteUrl } from "@/config/seo";
import {
  calculateTherapistBusyIntervals,
  type AvailabilityBooking,
  type AvailabilityScheduleBlock,
  type BlockedInterval
} from "@/lib/booking/booking-availability";
import { defaultBookingAvailability, getDefaultBookingStartWindow } from "@/lib/booking/booking-options";
import { getAvailableRoomsForAvailability } from "@/lib/booking/room-settings";
import { type BookingStatus } from "@/lib/booking/booking-schema";
import { type DashboardUser } from "@/lib/dashboard/auth";
import { DashboardForbiddenError } from "@/lib/dashboard/bookings";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SredimeCalendarTokenStatus = "active" | "revoked";

export type SredimeCalendarTokenMetadata = {
  id: string;
  status: SredimeCalendarTokenStatus;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

export type SredimeTherapistCalendar = {
  therapistId: string;
  displayName: string;
  active: boolean;
  token: SredimeCalendarTokenMetadata | null;
};

export type SredimeCalendarLinkResult = {
  calendarUrl: string;
  token: SredimeCalendarTokenMetadata;
};

type TherapistRow = {
  id: string;
  display_name: string;
  active: boolean;
};

type CalendarTokenRow = {
  id: string;
  therapist_id: string;
  active: boolean;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

type BookingRow = {
  preferred_date: string;
  preferred_time: string;
  therapist_id: string | null;
  duration_minutes: number | null;
  status: BookingStatus;
};

type ScheduleBlockRow = {
  date: string;
  therapist_id: string | null;
  block_type: AvailabilityScheduleBlock["blockType"];
  block_scope: AvailabilityScheduleBlock["blockScope"];
  start_time: string | null;
  end_time: string | null;
  rooms_occupied: number | null;
};

type BusyEvent = {
  start: Date;
  end: Date;
};

const provider = "sredime";
const salonTimeZone = "Europe/Belgrade";
const tokenBytes = 32;
const tokenPattern = /^[A-Za-z0-9_-]{32,160}$/;
const icsHost = "raine.rs";

function assertAdmin(user: DashboardUser) {
  if (user.role !== "admin") {
    throw new DashboardForbiddenError();
  }
}

function createRawCalendarToken() {
  return randomBytes(tokenBytes).toString("base64url");
}

function hashCalendarToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function hashUid(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex").slice(0, 40);
}

function toTokenMetadata(row: CalendarTokenRow): SredimeCalendarTokenMetadata {
  return {
    id: row.id,
    status: row.revoked_at || !row.active ? "revoked" : "active",
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
    revokedAt: row.revoked_at
  };
}

function getPublicOrigin() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim() || siteUrl;

  try {
    return new URL(configured).origin;
  } catch {
    return siteUrl;
  }
}

export function buildSredimeCalendarUrl(token: string) {
  return `${getPublicOrigin()}/api/calendar/sredime/${token}.ics`;
}

export function isSredimeCalendarTokenFormat(value: string) {
  return tokenPattern.test(value);
}

export async function getSredimeTherapistCalendars(user: DashboardUser) {
  assertAdmin(user);

  const supabase = await createSupabaseServerClient();
  const { data: therapists, error: therapistsError } = await supabase
    .from("therapists")
    .select("id, display_name, active")
    .order("display_name", { ascending: true });

  if (therapistsError) {
    return {
      calendars: [] as SredimeTherapistCalendar[],
      error: true
    };
  }

  const { data: tokens, error: tokensError } = await supabase
    .from("therapist_calendar_tokens")
    .select("id, therapist_id, active, created_at, last_used_at, revoked_at")
    .eq("provider", provider)
    .is("revoked_at", null)
    .eq("active", true);

  const tokensByTherapist = new Map(
    ((tokens ?? []) as CalendarTokenRow[]).map((token) => [token.therapist_id, toTokenMetadata(token)])
  );

  return {
    calendars: ((therapists ?? []) as TherapistRow[]).map((therapist) => ({
      therapistId: therapist.id,
      displayName: therapist.display_name,
      active: therapist.active,
      token: tokensByTherapist.get(therapist.id) ?? null
    })),
    error: Boolean(tokensError)
  };
}

export async function createSredimeTherapistCalendarLink(user: DashboardUser, therapistId: string) {
  assertAdmin(user);

  const rawToken = createRawCalendarToken();
  const tokenHash = hashCalendarToken(rawToken);
  const now = new Date().toISOString();
  const supabase = createSupabaseAdminClient();

  const { data: therapist, error: therapistError } = await supabase
    .from("therapists")
    .select("id")
    .eq("id", therapistId)
    .eq("active", true)
    .maybeSingle();

  if (therapistError || !therapist) {
    throw new DashboardForbiddenError();
  }

  const { error: revokeError } = await supabase
    .from("therapist_calendar_tokens")
    .update({
      active: false,
      revoked_at: now,
      updated_at: now
    })
    .eq("therapist_id", therapist.id)
    .eq("provider", provider)
    .eq("active", true)
    .is("revoked_at", null);

  if (revokeError) {
    throw new Error(revokeError.message);
  }

  const { data, error } = await supabase
    .from("therapist_calendar_tokens")
    .insert({
      therapist_id: therapist.id,
      token_hash: tokenHash,
      provider,
      active: true,
      created_by: user.id
    })
    .select("id, therapist_id, active, created_at, last_used_at, revoked_at")
    .maybeSingle();

  if (error || !data) {
    throw new Error(error?.message ?? "SrediMe calendar token could not be created.");
  }

  return {
    calendarUrl: buildSredimeCalendarUrl(rawToken),
    token: toTokenMetadata(data as CalendarTokenRow)
  } satisfies SredimeCalendarLinkResult;
}

export async function revokeSredimeTherapistCalendarLink(user: DashboardUser, therapistId: string) {
  assertAdmin(user);

  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("therapist_calendar_tokens")
    .update({
      active: false,
      revoked_at: now,
      updated_at: now
    })
    .eq("therapist_id", therapistId)
    .eq("provider", provider)
    .eq("active", true)
    .is("revoked_at", null)
    .select("id, therapist_id, active, created_at, last_used_at, revoked_at")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? toTokenMetadata(data as CalendarTokenRow) : null;
}

function getBelgradeDateValue(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: salonTimeZone,
    year: "numeric"
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";

  return `${part("year")}-${part("month")}-${part("day")}`;
}

function addDays(dateValue: string, days: number) {
  const date = new Date(`${dateValue}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}

function getDateRange(startDate: string, endDate: string) {
  const dates: string[] = [];
  const cursor = new Date(`${startDate}T12:00:00Z`);
  const end = new Date(`${endDate}T12:00:00Z`);

  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

function getExportWindow() {
  const today = getBelgradeDateValue();

  return {
    startDate: addDays(today, -1),
    endDate: addDays(today, defaultBookingAvailability.maxAdvanceBookingDays)
  };
}

function toAvailabilityBooking(row: BookingRow): AvailabilityBooking {
  return {
    bookingDate: row.preferred_date,
    preferredTime: row.preferred_time,
    therapistId: row.therapist_id,
    durationMinutes: row.duration_minutes,
    status: row.status
  };
}

function toAvailabilityScheduleBlock(row: ScheduleBlockRow): AvailabilityScheduleBlock {
  return {
    blockDate: row.date,
    therapistId: row.therapist_id,
    blockType: row.block_type,
    blockScope: row.block_scope,
    startTime: row.start_time,
    endTime: row.end_time,
    roomsOccupied: row.rooms_occupied
  };
}

function getTimeZoneOffsetMinutes(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    second: "2-digit",
    timeZone: salonTimeZone,
    timeZoneName: "shortOffset",
    year: "numeric"
  }).formatToParts(date);
  const zoneName = parts.find((part) => part.type === "timeZoneName")?.value ?? "GMT";
  const match = /^GMT(?:([+-])(\d{1,2})(?::?(\d{2}))?)?$/.exec(zoneName);

  if (!match?.[1]) {
    return 0;
  }

  const hours = Number.parseInt(match[2] ?? "0", 10);
  const minutes = Number.parseInt(match[3] ?? "0", 10);
  const sign = match[1] === "-" ? -1 : 1;

  return sign * (hours * 60 + minutes);
}

function localDateMinutesToUtc(dateValue: string, minutes: number) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const normalizedLocal = new Date(Date.UTC(year, month - 1, day, 0, minutes, 0));
  const localAsUtcMs = Date.UTC(
    normalizedLocal.getUTCFullYear(),
    normalizedLocal.getUTCMonth(),
    normalizedLocal.getUTCDate(),
    normalizedLocal.getUTCHours(),
    normalizedLocal.getUTCMinutes()
  );
  const initialOffset = getTimeZoneOffsetMinutes(new Date(localAsUtcMs));
  let utcDate = new Date(localAsUtcMs - initialOffset * 60000);
  const refinedOffset = getTimeZoneOffsetMinutes(utcDate);

  if (refinedOffset !== initialOffset) {
    utcDate = new Date(localAsUtcMs - refinedOffset * 60000);
  }

  return utcDate;
}

function intervalsToBusyEvents(date: string, intervals: BlockedInterval[]) {
  return intervals.map((interval) => ({
    start: localDateMinutesToUtc(date, interval.startMinutes),
    end: localDateMinutesToUtc(date, interval.endMinutes)
  }));
}

async function loadBusyEventsForTherapist(therapistId: string) {
  const supabase = createSupabaseAdminClient();
  const { startDate, endDate } = getExportWindow();

  const [{ data: bookingRows, error: bookingsError }, { data: blockRows, error: blocksError }, availableRooms] =
    await Promise.all([
      supabase
        .from("bookings")
        .select("preferred_date, preferred_time, therapist_id, duration_minutes, status")
        .gte("preferred_date", startDate)
        .lte("preferred_date", endDate)
        .not("therapist_id", "is", null)
        .in("status", ["pending", "confirmed"]),
      supabase
        .from("schedule_blocks")
        .select("date, therapist_id, block_type, block_scope, start_time, end_time, rooms_occupied")
        .gte("date", startDate)
        .lte("date", endDate),
      getAvailableRoomsForAvailability()
    ]);

  if (bookingsError || blocksError) {
    throw new Error(bookingsError?.message ?? blocksError?.message ?? "SrediMe calendar data could not be loaded.");
  }

  const bookings = ((bookingRows ?? []) as BookingRow[]).map(toAvailabilityBooking);
  const scheduleBlocks = ((blockRows ?? []) as ScheduleBlockRow[]).map(toAvailabilityScheduleBlock);

  return getDateRange(startDate, endDate).flatMap((date) =>
    intervalsToBusyEvents(
      date,
      calculateTherapistBusyIntervals({
        therapistId,
        date,
        bookings,
        scheduleBlocks,
        bookingWindow: getDefaultBookingStartWindow(),
        breakMinutes: defaultBookingAvailability.breakMinutes,
        availableRooms
      })
    )
  );
}

function formatIcsDate(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeIcsText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function foldIcsLine(line: string) {
  if (line.length <= 75) {
    return line;
  }

  const chunks: string[] = [];
  let cursor = line;

  while (cursor.length > 75) {
    chunks.push(cursor.slice(0, 75));
    cursor = cursor.slice(75);
  }

  chunks.push(cursor);

  return chunks.map((chunk, index) => (index === 0 ? chunk : ` ${chunk}`)).join("\r\n");
}

function serializeIcs(events: BusyEvent[], calendarTokenId: string) {
  const dtstamp = formatIcsDate(new Date());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Raine//SrediMe Busy Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Raine SrediMe busy calendar",
    "X-WR-TIMEZONE:Europe/Belgrade",
    ...events.flatMap((event) => [
      "BEGIN:VEVENT",
      `UID:${hashUid(`${provider}:${calendarTokenId}:${event.start.toISOString()}:${event.end.toISOString()}`)}@${icsHost}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${formatIcsDate(event.start)}`,
      `DTEND:${formatIcsDate(event.end)}`,
      `SUMMARY:${escapeIcsText("Busy")}`,
      "STATUS:CONFIRMED",
      "TRANSP:OPAQUE",
      "END:VEVENT"
    ]),
    "END:VCALENDAR"
  ];

  return `${lines.map(foldIcsLine).join("\r\n")}\r\n`;
}

export async function resolveSredimeBusyCalendarIcs(rawToken: string) {
  if (!isSredimeCalendarTokenFormat(rawToken)) {
    return null;
  }

  const supabase = createSupabaseAdminClient();
  const tokenHash = hashCalendarToken(rawToken);
  const { data: token, error: tokenError } = await supabase
    .from("therapist_calendar_tokens")
    .select("id, therapist_id, active, created_at, last_used_at, revoked_at")
    .eq("token_hash", tokenHash)
    .eq("provider", provider)
    .eq("active", true)
    .is("revoked_at", null)
    .maybeSingle();

  if (tokenError || !token) {
    return null;
  }

  const { data: therapist, error: therapistError } = await supabase
    .from("therapists")
    .select("id")
    .eq("id", token.therapist_id)
    .eq("active", true)
    .maybeSingle();

  if (therapistError || !therapist) {
    return null;
  }

  const events = await loadBusyEventsForTherapist(therapist.id);
  const { error: lastUsedError } = await supabase
    .from("therapist_calendar_tokens")
    .update({
      last_used_at: new Date().toISOString()
    })
    .eq("id", token.id);

  if (lastUsedError && process.env.NODE_ENV !== "production") {
    console.error("[sredime calendar] last_used_at update failed", lastUsedError);
  }

  return serializeIcs(events, token.id);
}
