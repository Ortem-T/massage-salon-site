import "server-only";

import {
  AVAILABLE_ROOMS_SETTING_KEY,
  MAX_AVAILABLE_ROOMS,
  MIN_AVAILABLE_ROOMS,
  normalizeAvailableRooms
} from "@/lib/booking/room-settings";
import { type DashboardUser } from "@/lib/dashboard/auth";
import { createSupabaseAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  isValidTelegramDailyScheduleTime,
  normalizeTelegramDailyScheduleEnabled,
  normalizeTelegramDailyScheduleTime,
  sendTelegramDailySchedule,
  TELEGRAM_DAILY_SCHEDULE_DEFAULT_TIME,
  TELEGRAM_DAILY_SCHEDULE_ENABLED_KEY,
  TELEGRAM_DAILY_SCHEDULE_TIME_KEY,
  TELEGRAM_DAILY_SCHEDULE_TIMEZONE,
  TELEGRAM_DAILY_SCHEDULE_TIMEZONE_KEY,
  TELEGRAM_DAILY_SCHEDULE_TYPE
} from "@/server/telegram/dailySchedule";

export type DashboardOperationSettings = {
  availableRooms: number;
  error: boolean;
  updatedAt: string | null;
};

export type DashboardTelegramSettings = {
  dailyScheduleEnabled: boolean;
  dailyScheduleTime: string;
  dailyScheduleTimezone: typeof TELEGRAM_DAILY_SCHEDULE_TIMEZONE;
  lastSuccessfulSendAt: string | null;
  error: boolean;
};

export class DashboardSettingsForbiddenError extends Error {
  constructor() {
    super("Dashboard settings are admin-only.");
    this.name = "DashboardSettingsForbiddenError";
  }
}

export class DashboardSettingsValidationError extends Error {
  constructor() {
    super("Invalid dashboard setting.");
    this.name = "DashboardSettingsValidationError";
  }
}

async function replanTelegramDailyScheduleSafely() {
  if (!hasSupabaseAdminEnv()) {
    return;
  }

  try {
    const adminSupabase = createSupabaseAdminClient();
    const { error } = await adminSupabase.rpc("plan_telegram_daily_schedule_cron", {});

    if (error && process.env.NODE_ENV !== "production") {
      console.warn("[telegram daily schedule] cron replanning failed", error.message);
    }
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[telegram daily schedule] cron replanning unavailable", error);
    }
  }
}

export async function getDashboardOperationSettings(): Promise<DashboardOperationSettings> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("app_settings")
    .select("value, updated_at")
    .eq("key", AVAILABLE_ROOMS_SETTING_KEY)
    .maybeSingle();

  return {
    availableRooms: normalizeAvailableRooms(data?.value),
    error: Boolean(error),
    updatedAt: data?.updated_at ?? null
  };
}

export async function getDashboardTelegramSettings(user: DashboardUser): Promise<DashboardTelegramSettings> {
  if (user.role !== "admin") {
    throw new DashboardSettingsForbiddenError();
  }

  const supabase = await createSupabaseServerClient();
  const [{ data: settings, error: settingsError }, { data: lastSend, error: lastSendError }] = await Promise.all([
    supabase
      .from("app_settings")
      .select("key, value")
      .in("key", [
        TELEGRAM_DAILY_SCHEDULE_ENABLED_KEY,
        TELEGRAM_DAILY_SCHEDULE_TIME_KEY,
        TELEGRAM_DAILY_SCHEDULE_TIMEZONE_KEY
      ]),
    supabase
      .from("notification_delivery_log")
      .select("sent_at")
      .eq("notification_type", TELEGRAM_DAILY_SCHEDULE_TYPE)
      .eq("status", "sent")
      .order("sent_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle()
  ]);
  const values = new Map((settings ?? []).map((setting) => [setting.key, setting.value]));

  return {
    dailyScheduleEnabled: normalizeTelegramDailyScheduleEnabled(values.get(TELEGRAM_DAILY_SCHEDULE_ENABLED_KEY)),
    dailyScheduleTime: normalizeTelegramDailyScheduleTime(values.get(TELEGRAM_DAILY_SCHEDULE_TIME_KEY)),
    dailyScheduleTimezone: TELEGRAM_DAILY_SCHEDULE_TIMEZONE,
    lastSuccessfulSendAt: lastSend?.sent_at ?? null,
    error: Boolean(settingsError || lastSendError)
  };
}

export async function updateAvailableRoomsSetting(user: DashboardUser, availableRooms: number) {
  if (user.role !== "admin") {
    throw new DashboardSettingsForbiddenError();
  }

  if (
    !Number.isInteger(availableRooms) ||
    availableRooms < MIN_AVAILABLE_ROOMS ||
    availableRooms > MAX_AVAILABLE_ROOMS
  ) {
    throw new DashboardSettingsValidationError();
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("app_settings")
    .upsert({
      key: AVAILABLE_ROOMS_SETTING_KEY,
      value: availableRooms,
      updated_by: user.id
    }, { onConflict: "key" })
    .select("key")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new DashboardSettingsForbiddenError();
  }
}

export async function updateTelegramDailyScheduleSettings(
  user: DashboardUser,
  input: { enabled: boolean; sendTime: string }
) {
  if (user.role !== "admin") {
    throw new DashboardSettingsForbiddenError();
  }

  if (typeof input.enabled !== "boolean" || !isValidTelegramDailyScheduleTime(input.sendTime)) {
    throw new DashboardSettingsValidationError();
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("app_settings").upsert([
    {
      key: TELEGRAM_DAILY_SCHEDULE_ENABLED_KEY,
      value: input.enabled,
      updated_by: user.id
    },
    {
      key: TELEGRAM_DAILY_SCHEDULE_TIME_KEY,
      value: input.sendTime || TELEGRAM_DAILY_SCHEDULE_DEFAULT_TIME,
      updated_by: user.id
    },
    {
      key: TELEGRAM_DAILY_SCHEDULE_TIMEZONE_KEY,
      value: TELEGRAM_DAILY_SCHEDULE_TIMEZONE,
      updated_by: user.id
    }
  ], { onConflict: "key" });

  if (error) {
    throw new Error(error.message);
  }

  await replanTelegramDailyScheduleSafely();
}

export async function sendTelegramDailyScheduleTest(user: DashboardUser) {
  if (user.role !== "admin") {
    throw new DashboardSettingsForbiddenError();
  }

  const result = await sendTelegramDailySchedule({ mode: "test" });

  if (!result.ok) {
    throw new Error(result.reason ?? "telegram_daily_schedule_test_failed");
  }
}
