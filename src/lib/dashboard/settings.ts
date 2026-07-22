import "server-only";

import {
  AVAILABLE_ROOMS_SETTING_KEY,
  MAX_AVAILABLE_ROOMS,
  MIN_AVAILABLE_ROOMS,
  normalizeAvailableRooms
} from "@/lib/booking/room-settings";
import { type DashboardUser } from "@/lib/dashboard/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type DashboardOperationSettings = {
  availableRooms: number;
  error: boolean;
  updatedAt: string | null;
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
