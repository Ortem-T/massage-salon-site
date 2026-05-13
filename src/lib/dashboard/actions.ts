"use server";

import { revalidatePath } from "next/cache";

import { type Locale } from "@/i18n/config";
import { requireDashboardUser } from "@/lib/dashboard/auth";
import {
  assignTherapistToBooking,
  createManualBooking,
  type CreateManualBookingInput,
  DashboardForbiddenError,
  updateBookingInternalNotes,
  updateBookingStatus
} from "@/lib/dashboard/bookings";
import { type BookingStatus } from "@/lib/booking/booking-schema";

export type DashboardActionResult = {
  ok: boolean;
  reason?: "forbidden" | "error";
};

type BookingActionInput = {
  bookingId: string;
};

function toActionResult(error: unknown): DashboardActionResult {
  if (error instanceof DashboardForbiddenError) {
    return { ok: false, reason: "forbidden" };
  }

  return { ok: false, reason: "error" };
}

function revalidateDashboard(locale: Locale) {
  revalidatePath(`/${locale}/dashboard`);
  revalidatePath(`/${locale}/dashboard/bookings`);
}

export async function updateBookingStatusAction(
  locale: Locale,
  input: BookingActionInput & { status: BookingStatus }
): Promise<DashboardActionResult> {
  try {
    const user = await requireDashboardUser(locale);
    await updateBookingStatus(user, input.bookingId, input.status);
    revalidateDashboard(locale);
    return { ok: true };
  } catch (error) {
    return toActionResult(error);
  }
}

export async function updateBookingInternalNotesAction(
  locale: Locale,
  input: BookingActionInput & { internalNotes: string | null }
): Promise<DashboardActionResult> {
  try {
    const user = await requireDashboardUser(locale);
    await updateBookingInternalNotes(user, input.bookingId, input.internalNotes);
    revalidateDashboard(locale);
    return { ok: true };
  } catch (error) {
    return toActionResult(error);
  }
}

export async function assignTherapistToBookingAction(
  locale: Locale,
  input: BookingActionInput & { therapistId: string | null }
): Promise<DashboardActionResult> {
  try {
    const user = await requireDashboardUser(locale);
    await assignTherapistToBooking(user, input.bookingId, input.therapistId);
    revalidateDashboard(locale);
    return { ok: true };
  } catch (error) {
    return toActionResult(error);
  }
}

export async function createManualBookingAction(
  locale: Locale,
  input: CreateManualBookingInput
): Promise<DashboardActionResult> {
  try {
    const user = await requireDashboardUser(locale);
    await createManualBooking(user, input);
    revalidateDashboard(locale);
    return { ok: true };
  } catch (error) {
    return toActionResult(error);
  }
}
