"use server";

import { revalidatePath } from "next/cache";

import { locales, type Locale } from "@/i18n/config";
import { requireDashboardUser } from "@/lib/dashboard/auth";
import {
  assignTherapistToBooking,
  createManualBooking,
  type CreateManualBookingInput,
  type DashboardBooking,
  DashboardBlockedTimeError,
  DashboardForbiddenError,
  DashboardServiceRestrictionError,
  getBookingById,
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
  createClientRebookingLinkForAuthorizedBooking,
  createClientRebookingLink,
  revokeClientRebookingLinkForAuthorizedBooking,
  revokeClientRebookingLink,
  type StoredRebookingSuggestion,
  type RebookingTokenMetadata
} from "@/lib/rebooking/tokens";
import { type BookingStatus } from "@/lib/booking/booking-schema";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getRebookingTemplateForBooking,
  getRebookingTemplateForClient,
  validateManualRebookingSuggestion
} from "@/lib/rebooking/suggestions";

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
      reason: "forbidden" | "error" | "missing_client" | "manual_required" | "manual_unavailable" | "slot_unavailable";
    };

type BookingActionInput = {
  bookingId: string;
};

type RebookingSuggestionActionInput =
  | {
      suggestionMode?: "automatic";
      manualSuggestion?: never;
    }
  | {
      suggestionMode: "manual";
      manualSuggestion: {
        date: string;
        time: string;
      };
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
  input: { clientId: string; messageLocale: Locale } & RebookingSuggestionActionInput
): Promise<RebookingLinkActionResult> {
  try {
    const user = await requireDashboardUser(locale);
    if (user.role !== "admin") {
      throw new DashboardForbiddenError();
    }

    const suggestion = await resolveClientRebookingSuggestionInput(input);
    const result = await createClientRebookingLink(user, {
      clientId: input.clientId,
      locale: input.messageLocale,
      suggestion
    });
    return {
      ok: true,
      rebookingUrl: result.url,
      token: result.token
    };
  } catch (error) {
    return toRebookingActionError(error);
  }
}

async function resolveClientRebookingSuggestionInput(input: {
  clientId: string;
  suggestionMode?: "automatic" | "manual";
  manualSuggestion?: { date: string; time: string };
}): Promise<StoredRebookingSuggestion | undefined> {
  if (input.suggestionMode !== "manual") {
    return undefined;
  }

  if (!input.manualSuggestion?.date || !input.manualSuggestion.time) {
    throw new RebookingManualRequiredError();
  }

  const supabase = createSupabaseAdminClient();
  const template = await getRebookingTemplateForClient(supabase, input.clientId);

  if (!template) {
    throw new RebookingManualUnavailableError();
  }

  const validated = await validateManualRebookingSuggestion(supabase, {
    template,
    date: input.manualSuggestion.date,
    time: input.manualSuggestion.time
  });

  if (!validated?.therapistId || !validated.date || !validated.time) {
    throw new RebookingSlotUnavailableError();
  }

  return {
    mode: "manual",
    serviceId: template.serviceRecordId,
    therapistId: validated.therapistId,
    date: validated.date,
    time: validated.time
  };
}

class RebookingManualRequiredError extends Error {}
class RebookingManualUnavailableError extends Error {}
class RebookingSlotUnavailableError extends Error {}

function toRebookingActionError(error: unknown): RebookingLinkActionResult {
  if (error instanceof DashboardForbiddenError) {
    return { ok: false, reason: "forbidden" };
  }

  if (error instanceof RebookingManualRequiredError) {
    return { ok: false, reason: "manual_required" };
  }

  if (error instanceof RebookingManualUnavailableError) {
    return { ok: false, reason: "manual_unavailable" };
  }

  if (error instanceof RebookingSlotUnavailableError) {
    return { ok: false, reason: "slot_unavailable" };
  }

  if (process.env.NODE_ENV !== "production") {
    console.error("[rebooking link action failed]", error);
  }

  return { ok: false, reason: "error" };
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

async function getAuthorizedBookingClientId(locale: Locale, bookingId: string) {
  const user = await requireDashboardUser(locale);
  const booking = await getBookingById(user, bookingId);

  if (!booking) {
    throw new DashboardForbiddenError();
  }

  return {
    user,
    clientId: booking.clientId
  };
}

export async function generateBookingRebookingLinkAction(
  locale: Locale,
  input: { bookingId: string; messageLocale: Locale } & RebookingSuggestionActionInput
): Promise<RebookingLinkActionResult> {
  try {
    const { user, booking } = await getAuthorizedBookingForRebooking(locale, input.bookingId);
    const clientId = booking.clientId;

    if (!clientId) {
      return { ok: false, reason: "missing_client" };
    }

    const suggestion = await resolveBookingRebookingSuggestionInput(booking, input);
    const result = await createClientRebookingLinkForAuthorizedBooking({
      clientId,
      locale: input.messageLocale,
      createdBy: user.id,
      suggestion
    });

    return {
      ok: true,
      rebookingUrl: result.url,
      token: result.token
    };
  } catch (error) {
    return toRebookingActionError(error);
  }
}

async function getAuthorizedBookingForRebooking(locale: Locale, bookingId: string) {
  const user = await requireDashboardUser(locale);
  const booking = await getBookingById(user, bookingId);

  if (!booking) {
    throw new DashboardForbiddenError();
  }

  return {
    user,
    booking
  };
}

async function resolveBookingRebookingSuggestionInput(
  booking: DashboardBooking,
  input: {
    suggestionMode?: "automatic" | "manual";
    manualSuggestion?: { date: string; time: string };
  }
): Promise<StoredRebookingSuggestion | undefined> {
  if (input.suggestionMode !== "manual") {
    return undefined;
  }

  if (!input.manualSuggestion?.date || !input.manualSuggestion.time) {
    throw new RebookingManualRequiredError();
  }

  const supabase = createSupabaseAdminClient();
  const template = await getRebookingTemplateForBooking(supabase, {
    serviceSlug: booking.service,
    therapistId: booking.therapistId,
    previousTime: booking.preferredTime
  });

  if (!template) {
    throw new RebookingManualUnavailableError();
  }

  const validated = await validateManualRebookingSuggestion(supabase, {
    template,
    date: input.manualSuggestion.date,
    time: input.manualSuggestion.time
  });

  if (!validated?.therapistId || !validated.date || !validated.time) {
    throw new RebookingSlotUnavailableError();
  }

  return {
    mode: "manual",
    serviceId: template.serviceRecordId,
    therapistId: validated.therapistId,
    date: validated.date,
    time: validated.time
  };
}

export async function revokeBookingRebookingLinkAction(
  locale: Locale,
  input: { bookingId: string }
): Promise<RebookingLinkActionResult> {
  try {
    const { clientId } = await getAuthorizedBookingClientId(locale, input.bookingId);

    if (!clientId) {
      return { ok: false, reason: "missing_client" };
    }

    const token = await revokeClientRebookingLinkForAuthorizedBooking(clientId);

    return {
      ok: true,
      token
    };
  } catch (error) {
    if (error instanceof DashboardForbiddenError) {
      return { ok: false, reason: "forbidden" };
    }

    if (process.env.NODE_ENV !== "production") {
      console.error("[booking rebooking revoke action failed]", error);
    }

    return { ok: false, reason: "error" };
  }
}
