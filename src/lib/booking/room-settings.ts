import "server-only";

import { defaultBookingAvailability } from "@/lib/booking/booking-options";
import { createSupabaseAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase/admin";

export const AVAILABLE_ROOMS_SETTING_KEY = "available_rooms";
export const MIN_AVAILABLE_ROOMS = 1;
export const MAX_AVAILABLE_ROOMS = 10;

export function normalizeAvailableRooms(value: unknown) {
  const numberValue = typeof value === "number"
    ? value
    : typeof value === "string"
      ? Number.parseInt(value, 10)
      : Number.NaN;

  if (
    !Number.isInteger(numberValue) ||
    numberValue < MIN_AVAILABLE_ROOMS ||
    numberValue > MAX_AVAILABLE_ROOMS
  ) {
    return defaultBookingAvailability.availableRooms;
  }

  return numberValue;
}

export async function getAvailableRoomsForAvailability() {
  if (!hasSupabaseAdminEnv()) {
    return defaultBookingAvailability.availableRooms;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", AVAILABLE_ROOMS_SETTING_KEY)
      .maybeSingle();

    if (error) {
      return defaultBookingAvailability.availableRooms;
    }

    return normalizeAvailableRooms(data?.value);
  } catch {
    return defaultBookingAvailability.availableRooms;
  }
}
