"use server";

import { revalidatePath } from "next/cache";

import { type Locale } from "@/i18n/config";
import { requireDashboardUser } from "@/lib/dashboard/auth";
import { updateDashboardBooking, type UpdateDashboardBookingInput } from "@/lib/dashboard/bookings";

export async function updateDashboardBookingAction(locale: Locale, input: UpdateDashboardBookingInput) {
  const user = await requireDashboardUser(locale);

  await updateDashboardBooking(user.role, input);

  revalidatePath(`/${locale}/dashboard`);
  revalidatePath(`/${locale}/dashboard/bookings`);
}
