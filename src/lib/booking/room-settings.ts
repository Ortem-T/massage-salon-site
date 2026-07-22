import "server-only";

import { defaultBookingAvailability } from "@/lib/booking/booking-options";
import { createSupabaseAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

async function readAvailableRooms(
  supabase: Pick<ReturnType<typeof createSupabaseAdminClient>, "from">
) {
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", AVAILABLE_ROOMS_SETTING_KEY)
    .maybeSingle();

  if (error) {
    return null;
  }

  return normalizeAvailableRooms(data?.value);
}

export async function getAvailableRoomsForAvailability() {
  if (!hasSupabaseAdminEnv()) {
    try {
      const supabase = await createSupabaseServerClient();
      const availableRooms = await readAvailableRooms(supabase);

      return availableRooms ?? defaultBookingAvailability.availableRooms;
    } catch {
      return defaultBookingAvailability.availableRooms;
    }
  }

  try {
    const supabase = createSupabaseAdminClient();
    const availableRooms = await readAvailableRooms(supabase);

    return availableRooms ?? defaultBookingAvailability.availableRooms;
  } catch {
    return defaultBookingAvailability.availableRooms;
  }
}
