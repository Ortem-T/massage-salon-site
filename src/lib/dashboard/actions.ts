"use server";

import { revalidatePath } from "next/cache";

import { locales, type Locale } from "@/i18n/config";
import { requireDashboardUser } from "@/lib/dashboard/auth";
import {
  assignTherapistToBooking,
  createManualBooking,
  type CreateManualBookingInput,
  DashboardBlockedTimeError,
  DashboardForbiddenError,
  DashboardServiceRestrictionError,
  updateBookingInternalNotes,
  updateBookingStatus
} from "@/lib/dashboard/bookings";
import {
  createScheduleBlock,
  deleteScheduleBlock,
  ScheduleBlockValidationError,
  type ScheduleBlockInput,
  updateScheduleBlock
} from "@/lib/dashboard/schedule-blocks";
import {
  savePromotion,
  setPromotionActive,
  type SavePromotionInput
} from "@/lib/dashboard/promotions";
import { saveClient, type SaveClientInput } from "@/lib/dashboard/clients";
import {
  createClientRebookingLink,
  revokeClientRebookingLink,
  type RebookingTokenMetadata
} from "@/lib/rebooking/tokens";
import { type BookingStatus } from "@/lib/booking/booking-schema";

export type DashboardActionResult = {
  ok: boolean;
  reason?: "forbidden" | "error" | "invalid" | "invalid_time" | "overlap" | "blocked" | "service_restriction";
};

export type RebookingLinkActionResult =
  | {
      ok: true;
      rebookingUrl?: string;
      token: RebookingTokenMetadata | null;
    }
  | {
      ok: false;
      reason: "forbidden" | "error";
    };

type BookingActionInput = {
  bookingId: string;
};

function toActionResult(error: unknown): DashboardActionResult {
  if (error instanceof DashboardForbiddenError) {
    return { ok: false, reason: "forbidden" };
  }

  if (error instanceof ScheduleBlockValidationError) {
    return { ok: false, reason: error.reason };
  }

  if (error instanceof DashboardBlockedTimeError) {
    return { ok: false, reason: "blocked" };
  }

  if (error instanceof DashboardServiceRestrictionError) {
    return { ok: false, reason: "service_restriction" };
  }

  if (process.env.NODE_ENV !== "production") {
    console.error("[dashboard action failed]", error);
  }

  return { ok: false, reason: "error" };
}

function revalidateDashboard(locale: Locale) {
  revalidatePath(`/${locale}/dashboard`);
  revalidatePath(`/${locale}/dashboard/bookings`);
  revalidatePath(`/${locale}/dashboard/clients`);
  revalidatePath(`/${locale}/dashboard/schedule`);
  revalidatePath(`/${locale}/dashboard/promotions`);
  locales.forEach((siteLocale) => {
    revalidatePath(`/${siteLocale}`);
  });
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

export async function createScheduleBlockAction(
  locale: Locale,
  input: ScheduleBlockInput
): Promise<DashboardActionResult> {
  try {
    const user = await requireDashboardUser(locale);
    await createScheduleBlock(user, input);
    revalidateDashboard(locale);
    return { ok: true };
  } catch (error) {
    return toActionResult(error);
  }
}

export async function updateScheduleBlockAction(
  locale: Locale,
  input: ScheduleBlockInput & { id: string }
): Promise<DashboardActionResult> {
  try {
    const user = await requireDashboardUser(locale);
    await updateScheduleBlock(user, input);
    revalidateDashboard(locale);
    return { ok: true };
  } catch (error) {
    return toActionResult(error);
  }
}

export async function deleteScheduleBlockAction(
  locale: Locale,
  id: string
): Promise<DashboardActionResult> {
  try {
    const user = await requireDashboardUser(locale);
    await deleteScheduleBlock(user, id);
    revalidateDashboard(locale);
    return { ok: true };
  } catch (error) {
    return toActionResult(error);
  }
}

export async function savePromotionAction(
  locale: Locale,
  input: SavePromotionInput
): Promise<DashboardActionResult> {
  try {
    const user = await requireDashboardUser(locale);
    await savePromotion(user, input);
    revalidateDashboard(locale);
    return { ok: true };
  } catch (error) {
    return toActionResult(error);
  }
}

export async function setPromotionActiveAction(
  locale: Locale,
  input: { id: string; active: boolean }
): Promise<DashboardActionResult> {
  try {
    const user = await requireDashboardUser(locale);
    await setPromotionActive(user, input.id, input.active);
    revalidateDashboard(locale);
    return { ok: true };
  } catch (error) {
    return toActionResult(error);
  }
}

export async function saveClientAction(
  locale: Locale,
  input: SaveClientInput
): Promise<DashboardActionResult> {
  try {
    const user = await requireDashboardUser(locale);
    await saveClient(user, input);
    revalidateDashboard(locale);
    return { ok: true };
  } catch (error) {
    return toActionResult(error);
  }
}

export async function generateClientRebookingLinkAction(
  locale: Locale,
  input: { clientId: string; messageLocale: Locale }
): Promise<RebookingLinkActionResult> {
  try {
    const user = await requireDashboardUser(locale);
    const result = await createClientRebookingLink(user, {
      clientId: input.clientId,
      locale: input.messageLocale
    });
    return {
      ok: true,
      rebookingUrl: result.url,
      token: result.token
    };
  } catch (error) {
    if (error instanceof DashboardForbiddenError) {
      return { ok: false, reason: "forbidden" };
    }

    if (process.env.NODE_ENV !== "production") {
      console.error("[rebooking link action failed]", error);
    }

    return { ok: false, reason: "error" };
  }
}

export async function revokeClientRebookingLinkAction(
  locale: Locale,
  input: { clientId: string }
): Promise<RebookingLinkActionResult> {
  try {
    const user = await requireDashboardUser(locale);
    const token = await revokeClientRebookingLink(user, input.clientId);
    return {
      ok: true,
      token
    };
  } catch (error) {
    if (error instanceof DashboardForbiddenError) {
      return { ok: false, reason: "forbidden" };
    }

    if (process.env.NODE_ENV !== "production") {
      console.error("[rebooking revoke action failed]", error);
    }

    return { ok: false, reason: "error" };
  }
}
