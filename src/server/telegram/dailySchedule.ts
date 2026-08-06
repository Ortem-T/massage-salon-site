import "server-only";

import { createHash } from "node:crypto";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { type BookingStatus } from "@/lib/booking/booking-schema";
import { type ScheduleBlockScope, type ScheduleBlockType } from "@/lib/supabase/database.types";
import { sendTelegramMessage } from "@/server/telegram/sendTelegramMessage";

export const TELEGRAM_DAILY_SCHEDULE_ENABLED_KEY = "telegram_daily_schedule_enabled";
export const TELEGRAM_DAILY_SCHEDULE_TIME_KEY = "telegram_daily_schedule_time";
export const TELEGRAM_DAILY_SCHEDULE_TIMEZONE_KEY = "telegram_daily_schedule_timezone";
export const TELEGRAM_DAILY_SCHEDULE_TIMEZONE = "Europe/Belgrade";
export const TELEGRAM_DAILY_SCHEDULE_DEFAULT_TIME = "09:30";
export const TELEGRAM_DAILY_SCHEDULE_TYPE = "telegram_daily_schedule";
export const TELEGRAM_DAILY_SCHEDULE_TEST_TYPE = "telegram_daily_schedule_test";

type DailyScheduleSettings = {
  enabled: boolean;
  sendTime: string;
  timezone: typeof TELEGRAM_DAILY_SCHEDULE_TIMEZONE;
};

type DailyScheduleBookingRow = {
  id: string;
  service: string;
  specialist: string;
  preferred_date: string;
  preferred_time: string;
  status: BookingStatus;
  duration_minutes: number | null;
  therapist_id: string | null;
};

type DailyScheduleBlockRow = {
  id: string;
  therapist_id: string | null;
  block_type: ScheduleBlockType;
  block_scope: ScheduleBlockScope;
  date: string;
  start_time: string | null;
  end_time: string | null;
  rooms_occupied: number | null;
};

type ServiceRow = {
  id: string;
  slug: string;
  duration_minutes: number;
};

type ServiceTranslationRow = {
  service_id: string;
  name: string;
};

type TherapistRow = {
  id: string;
  display_name: string;
};

type TimelineItem = {
  typeOrder: number;
  startMinutes: number;
  endMinutes: number;
  text: string;
};

type DeliveryStatus = "sent" | "failed" | "skipped";
type DailyScheduleNotificationType =
  | typeof TELEGRAM_DAILY_SCHEDULE_TYPE
  | typeof TELEGRAM_DAILY_SCHEDULE_TEST_TYPE;

export type DailyScheduleSendResult = {
  ok: boolean;
  status: DeliveryStatus;
  localDate: string;
  reason?: "disabled" | "outside_window" | "already_sent" | "already_running" | "missing_secret" | "send_failed";
  message?: string;
};

type CronEventStatus = Extract<DeliveryStatus, "sent" | "failed" | "skipped">;

const includedBookingStatuses = ["pending", "confirmed"] satisfies BookingStatus[];
const sendWindowMinutes = 60;

export function isValidTelegramDailyScheduleTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function normalizeTelegramDailyScheduleTime(value: unknown) {
  return typeof value === "string" && isValidTelegramDailyScheduleTime(value)
    ? value
    : TELEGRAM_DAILY_SCHEDULE_DEFAULT_TIME;
}

export function normalizeTelegramDailyScheduleEnabled(value: unknown) {
  return typeof value === "boolean" ? value : true;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function toLocalDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TELEGRAM_DAILY_SCHEDULE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";

  return {
    localDate: `${part("year")}-${part("month")}-${part("day")}`,
    time: `${part("hour")}:${part("minute")}`,
    minuteOfDay: Number(part("hour")) * 60 + Number(part("minute"))
  };
}

function toMinutes(time: string | null | undefined, fallback: number) {
  if (!time) {
    return fallback;
  }

  const [hours, minutes] = time.slice(0, 5).split(":").map(Number);

  return Number.isFinite(hours) && Number.isFinite(minutes) ? hours * 60 + minutes : fallback;
}

function formatMinutes(minutes: number) {
  const clampedMinutes = Math.max(0, Math.min(23 * 60 + 59, minutes));
  const hours = Math.floor(clampedMinutes / 60);
  const mins = clampedMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function addMinutes(time: string, minutesToAdd: number) {
  return formatMinutes(toMinutes(time, 0) + minutesToAdd);
}

function formatRussianDate(localDate: string) {
  const [year, month, day] = localDate.split("-").map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day, 12));

  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "UTC",
    day: "numeric",
    month: "long"
  }).format(utcDate);
}

function getDestinationKey() {
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();

  if (!chatId) {
    return "telegram_team_chat_unconfigured";
  }

  return `telegram_team_chat:${createHash("sha256").update(chatId).digest("hex").slice(0, 16)}`;
}

async function getDailyScheduleSettings(): Promise<DailyScheduleSettings> {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("app_settings")
    .select("key, value")
    .in("key", [
      TELEGRAM_DAILY_SCHEDULE_ENABLED_KEY,
      TELEGRAM_DAILY_SCHEDULE_TIME_KEY,
      TELEGRAM_DAILY_SCHEDULE_TIMEZONE_KEY
    ]);
  const settings = new Map((data ?? []).map((item) => [item.key, item.value]));

  return {
    enabled: normalizeTelegramDailyScheduleEnabled(settings.get(TELEGRAM_DAILY_SCHEDULE_ENABLED_KEY)),
    sendTime: normalizeTelegramDailyScheduleTime(settings.get(TELEGRAM_DAILY_SCHEDULE_TIME_KEY)),
    timezone: TELEGRAM_DAILY_SCHEDULE_TIMEZONE
  };
}

async function claimScheduledDelivery(localDate: string, destinationKey: string) {
  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const { error } = await supabase.from("notification_delivery_log").insert({
    notification_type: TELEGRAM_DAILY_SCHEDULE_TYPE,
    local_date: localDate,
    destination_key: destinationKey,
    status: "pending",
    attempted_at: now
  });

  if (!error) {
    return { claimed: true as const };
  }

  const { data } = await supabase
    .from("notification_delivery_log")
    .select("id, status, attempted_at")
    .eq("notification_type", TELEGRAM_DAILY_SCHEDULE_TYPE)
    .eq("local_date", localDate)
    .eq("destination_key", destinationKey)
    .maybeSingle();

  if (data?.status === "sent") {
    return { claimed: false as const, reason: "already_sent" as const, id: data.id };
  }

  if (data?.status === "pending" && Date.now() - new Date(data.attempted_at).getTime() < 10 * 60 * 1000) {
    return { claimed: false as const, reason: "already_running" as const, id: data.id };
  }

  if (data?.id) {
    await supabase
      .from("notification_delivery_log")
      .update({
        status: "pending",
        attempted_at: now,
        sent_at: null,
        error_code: null,
        error_message_safe: null
      })
      .eq("id", data.id)
      .neq("status", "sent");

    return { claimed: true as const, id: data.id };
  }

  return { claimed: false as const, reason: "already_running" as const };
}

async function updateDeliveryLog(input: {
  notificationType: DailyScheduleNotificationType;
  localDate: string;
  destinationKey: string;
  status: "sent" | "failed";
  errorCode?: string | null;
  errorMessageSafe?: string | null;
}) {
  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const payload = {
    notification_type: input.notificationType,
    local_date: input.localDate,
    destination_key: input.destinationKey,
    status: input.status,
    attempted_at: now,
    sent_at: input.status === "sent" ? now : null,
    error_code: input.errorCode ?? null,
    error_message_safe: input.errorMessageSafe ?? null
  };

  if (input.notificationType === TELEGRAM_DAILY_SCHEDULE_TYPE) {
    await supabase
      .from("notification_delivery_log")
      .update(payload)
      .eq("notification_type", input.notificationType)
      .eq("local_date", input.localDate)
      .eq("destination_key", input.destinationKey)
      .neq("status", "sent");
    return;
  }

  await supabase.from("notification_delivery_log").insert(payload);
}

function normalizeCronSource(value: string | null | undefined) {
  const normalized = value?.trim().replaceAll(/[^\w:-]/g, "_").slice(0, 80);

  return normalized || "unknown";
}

export async function recordTelegramDailyScheduleCronEvent(input: {
  source: string | null | undefined;
  result: DailyScheduleSendResult;
  responseStatus: number;
  receivedAt: string;
}) {
  try {
    const supabase = createSupabaseAdminClient();
    await supabase.from("notification_cron_event_log").insert({
      event_type: TELEGRAM_DAILY_SCHEDULE_TYPE,
      source: normalizeCronSource(input.source),
      local_date: input.result.localDate,
      status: input.result.status as CronEventStatus,
      response_status: input.responseStatus,
      response_reason: input.result.reason ?? null,
      received_at: input.receivedAt,
      completed_at: new Date().toISOString()
    });
  } catch (error) {
    console.error("[telegram daily schedule] cron event log unavailable", error instanceof Error ? error.name : "unknown");
  }
}

async function loadDailyScheduleData(localDate: string) {
  const supabase = createSupabaseAdminClient();
  const [{ data: bookings }, { data: blocks }] = await Promise.all([
    supabase
      .from("bookings")
      .select("id, service, specialist, preferred_date, preferred_time, status, duration_minutes, therapist_id")
      .eq("preferred_date", localDate)
      .in("status", includedBookingStatuses),
    supabase
      .from("schedule_blocks")
      .select("id, therapist_id, block_type, block_scope, date, start_time, end_time, rooms_occupied")
      .eq("date", localDate)
      .order("start_time", { ascending: true, nullsFirst: true })
  ]);
  const bookingRows = (bookings ?? []) as DailyScheduleBookingRow[];
  const blockRows = (blocks ?? []) as DailyScheduleBlockRow[];
  const serviceSlugs = Array.from(new Set(bookingRows.map((booking) => booking.service).filter(Boolean)));
  const therapistIds = Array.from(
    new Set([...bookingRows.map((booking) => booking.therapist_id), ...blockRows.map((block) => block.therapist_id)].filter(Boolean))
  ) as string[];
  const [{ data: services }, { data: therapists }] = await Promise.all([
    serviceSlugs.length
      ? supabase.from("services").select("id, slug, duration_minutes").in("slug", serviceSlugs)
      : Promise.resolve({ data: [] as ServiceRow[] }),
    therapistIds.length
      ? supabase.from("therapists").select("id, display_name").in("id", therapistIds)
      : Promise.resolve({ data: [] as TherapistRow[] })
  ]);
  const serviceRows = (services ?? []) as ServiceRow[];
  const serviceIds = serviceRows.map((service) => service.id);
  const { data: translations } = serviceIds.length
    ? await supabase.from("service_translations").select("service_id, name").in("service_id", serviceIds).eq("locale", "ru")
    : { data: [] as ServiceTranslationRow[] };

  return {
    bookings: bookingRows,
    blocks: blockRows,
    services: serviceRows,
    translations: (translations ?? []) as ServiceTranslationRow[],
    therapists: (therapists ?? []) as TherapistRow[]
  };
}

export async function buildTelegramDailyScheduleMessage(localDate: string) {
  const data = await loadDailyScheduleData(localDate);
  const servicesBySlug = new Map(data.services.map((service) => [service.slug, service]));
  const serviceTranslationsById = new Map(data.translations.map((translation) => [translation.service_id, translation.name]));
  const therapistsById = new Map(data.therapists.map((therapist) => [therapist.id, therapist.display_name]));
  const items: TimelineItem[] = [];

  data.bookings.forEach((booking) => {
    const service = servicesBySlug.get(booking.service);
    const durationMinutes = booking.duration_minutes ?? service?.duration_minutes ?? 60;
    const startTime = booking.preferred_time.slice(0, 5);
    const endTime = addMinutes(startTime, durationMinutes);
    const serviceName = service ? serviceTranslationsById.get(service.id) ?? booking.service : booking.service;
    const therapistName = booking.therapist_id
      ? therapistsById.get(booking.therapist_id) ?? booking.specialist
      : booking.specialist;

    items.push({
      typeOrder: 1,
      startMinutes: toMinutes(startTime, 0),
      endMinutes: toMinutes(endTime, 0),
      text: `${startTime}–${endTime}\n✍️ ${escapeHtml(therapistName || "Специалист")} · ${escapeHtml(serviceName)}`
    });
  });

  data.blocks.forEach((block) => {
    const startMinutes = block.block_type === "full_day" ? 0 : toMinutes(block.start_time, 0);
    const endMinutes = block.block_type === "full_day" ? 23 * 60 + 59 : toMinutes(block.end_time, startMinutes);
    const interval = `${formatMinutes(startMinutes)}–${formatMinutes(endMinutes)}`;
    let label = "🔒 Салон недоступен";
    let typeOrder = 4;

    if (block.block_scope === "room_rental") {
      label = (block.rooms_occupied ?? 1) > 1 ? `🏠 Аренда кабинетов: ${block.rooms_occupied}` : "🏠 Аренда кабинета";
      typeOrder = 2;
    } else if (block.block_scope === "therapist") {
      const therapistName = block.therapist_id ? therapistsById.get(block.therapist_id) : null;
      label = `🔒 ${escapeHtml(therapistName ?? "Специалист")} недоступен`;
      typeOrder = 3;
    }

    items.push({
      typeOrder,
      startMinutes,
      endMinutes,
      text: `${interval}\n${label}`
    });
  });

  items.sort((a, b) => a.startMinutes - b.startMinutes || a.endMinutes - b.endMinutes || a.typeOrder - b.typeOrder);

  const header = [
    "Доброе утро, команда! 🌿",
    "",
    `📆 Расписание на сегодня, ${formatRussianDate(localDate)}:`
  ];
  const body = items.length ? items.map((item) => item.text).join("\n\n") : "На сегодня записей и блокировок нет.";
  const footer = `Всего записей: ${data.bookings.length}`;

  return [header.join("\n"), body, footer].join("\n\n");
}

export function shouldSendForConfiguredTime(sendTime: string, now = new Date()) {
  const current = toLocalDateParts(now);
  const configuredMinutes = toMinutes(sendTime, 0);
  const diff = current.minuteOfDay - configuredMinutes;

  return {
    localDate: current.localDate,
    currentTime: current.time,
    withinWindow: diff >= 0 && diff < sendWindowMinutes
  };
}

export async function sendTelegramDailySchedule(input: { mode: "scheduled" | "test" }): Promise<DailyScheduleSendResult> {
  let settings: DailyScheduleSettings;

  try {
    settings = await getDailyScheduleSettings();
  } catch (error) {
    console.error("[telegram daily schedule] settings unavailable", error instanceof Error ? error.name : "unknown");
    return {
      ok: false,
      status: "failed",
      localDate: toLocalDateParts().localDate,
      reason: "missing_secret"
    };
  }

  const destinationKey = getDestinationKey();
  const timing = shouldSendForConfiguredTime(settings.sendTime);
  const localDate = timing.localDate;

  if (input.mode === "scheduled") {
    if (!settings.enabled) {
      return { ok: true, status: "skipped", localDate, reason: "disabled" };
    }

    if (!timing.withinWindow) {
      return { ok: true, status: "skipped", localDate, reason: "outside_window" };
    }

    const claim = await claimScheduledDelivery(localDate, destinationKey);

    if (!claim.claimed) {
      return { ok: true, status: "skipped", localDate, reason: claim.reason };
    }
  }

  const notificationType =
    input.mode === "test" ? TELEGRAM_DAILY_SCHEDULE_TEST_TYPE : TELEGRAM_DAILY_SCHEDULE_TYPE;
  const message = await buildTelegramDailyScheduleMessage(localDate);
  const sent = await sendTelegramMessage({ text: message });

  await updateDeliveryLog({
    notificationType,
    localDate,
    destinationKey,
    status: sent ? "sent" : "failed",
    errorCode: sent ? null : "telegram_send_failed",
    errorMessageSafe: sent ? null : "Telegram API did not accept the message or Telegram env is missing."
  });

  return {
    ok: sent,
    status: sent ? "sent" : "failed",
    localDate,
    reason: sent ? undefined : "send_failed",
    message
  };
}
