import { isLocale, type Locale } from "@/i18n/config";
import { bookingStatuses, type BookingStatus } from "@/lib/booking/booking-schema";
import { type DashboardUser } from "@/lib/dashboard/auth";
import {
  manualBookingCreateStatuses,
  manualBookingSourceChannels,
  type ManualBookingSourceChannel
} from "@/lib/dashboard/constants";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type DashboardBooking = {
  id: string;
  createdAt: string;
  service: string;
  specialist: string;
  preferredDate: string;
  preferredTime: string;
  clientName: string;
  clientPhone: string;
  clientComment: string | null;
  locale: Locale;
  status: BookingStatus;
  source: string;
  sourceChannel: ManualBookingSourceChannel | null;
  durationMinutes: number | null;
  clientId: string | null;
  therapistId: string | null;
  internalNotes: string | null;
  updatedAt: string;
};

export type DashboardTherapist = {
  id: string;
  profileId: string | null;
  displayName: string;
  active: boolean;
};

export type DashboardBookingsData = {
  bookings: DashboardBooking[];
  therapists: DashboardTherapist[];
  error: boolean;
};

export type UpdateDashboardBookingInput = {
  bookingId: string;
  status?: BookingStatus;
  therapistId?: string | null;
  internalNotes?: string | null;
};

export type CreateManualBookingInput = {
  service: string;
  preferredDate: string;
  preferredTime: string;
  durationMinutes?: number | null;
  clientName: string;
  clientPhone: string;
  clientComment?: string | null;
  internalNotes?: string | null;
  locale: Locale;
  therapistId?: string | null;
  status: BookingStatus;
  sourceChannel: ManualBookingSourceChannel;
};

export class DashboardForbiddenError extends Error {
  constructor() {
    super("Dashboard action is not allowed for this user.");
    this.name = "DashboardForbiddenError";
  }
}

function isBookingStatus(status: unknown): status is BookingStatus {
  return typeof status === "string" && bookingStatuses.includes(status as BookingStatus);
}

function isManualBookingSourceChannel(channel: unknown): channel is ManualBookingSourceChannel {
  return typeof channel === "string" && manualBookingSourceChannels.includes(channel as ManualBookingSourceChannel);
}

function isManualCreateStatus(status: unknown): status is (typeof manualBookingCreateStatuses)[number] {
  return typeof status === "string" && manualBookingCreateStatuses.includes(status as (typeof manualBookingCreateStatuses)[number]);
}

type DashboardBookingRow = {
  id: string;
  created_at: string;
  service: string;
  specialist: string;
  preferred_date: string;
  preferred_time: string;
  client_name: string;
  client_phone: string;
  client_comment: string | null;
  locale: Locale;
  status: BookingStatus;
  source: string;
  source_channel?: ManualBookingSourceChannel | null;
  duration_minutes?: number | null;
  client_id?: string | null;
  therapist_id?: string | null;
  internal_notes?: string | null;
  updated_at?: string;
};

function toDashboardBooking(row: DashboardBookingRow): DashboardBooking {
  return {
    id: row.id,
    createdAt: row.created_at,
    service: row.service,
    specialist: row.specialist,
    preferredDate: row.preferred_date,
    preferredTime: row.preferred_time,
    clientName: row.client_name,
    clientPhone: row.client_phone,
    clientComment: row.client_comment,
    locale: row.locale,
    status: row.status,
    source: row.source,
    sourceChannel: row.source_channel ?? null,
    durationMinutes: row.duration_minutes ?? null,
    clientId: row.client_id ?? null,
    therapistId: row.therapist_id ?? null,
    internalNotes: row.internal_notes ?? null,
    updatedAt: row.updated_at ?? row.created_at
  };
}

function toDashboardTherapists(therapists: DashboardTherapistRow[] | null): DashboardTherapist[] {
  return (therapists ?? []).map((therapist) => ({
    id: therapist.id,
    profileId: therapist.profile_id,
    displayName: therapist.display_name,
    active: therapist.active
  }));
}

type DashboardTherapistRow = {
  id: string;
  profile_id: string | null;
  display_name: string;
  active: boolean;
};

type ActiveServiceRow = {
  slug: string;
  duration_minutes: number;
};

const fullBookingColumns =
  "id, created_at, service, specialist, preferred_date, preferred_time, client_name, client_phone, client_comment, locale, status, source, source_channel, duration_minutes, client_id, therapist_id, internal_notes, updated_at";
const dashboardBookingColumns =
  "id, created_at, service, specialist, preferred_date, preferred_time, client_name, client_phone, client_comment, locale, status, source, client_id, therapist_id, internal_notes, updated_at";
const legacyBookingColumns =
  "id, created_at, service, specialist, preferred_date, preferred_time, client_name, client_phone, client_comment, locale, status, source";

async function getTherapistIdsForUser(userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("therapists")
    .select("id")
    .eq("profile_id", userId)
    .eq("active", true);

  if (error) {
    return [];
  }

  return (data ?? []).map((therapist) => therapist.id);
}

function normalizeInternalNotes(notes: string | null | undefined) {
  return notes?.trim() ? notes.trim() : null;
}

function normalizeOptionalText(value: string | null | undefined) {
  return value?.trim() ? value.trim() : null;
}

function normalizeRequiredText(value: string | null | undefined) {
  return value?.trim() ?? "";
}

async function getDashboardTherapists(role: DashboardUser["role"], userId: string) {
  const supabase = await createSupabaseServerClient();
  const query = supabase.from("therapists").select("id, profile_id, display_name, active").order("display_name", { ascending: true });
  const { data, error } =
    role === "admin" ? await query.eq("active", true) : await query.eq("profile_id", userId).eq("active", true);

  return {
    therapists: error ? [] : toDashboardTherapists(data),
    error: Boolean(error)
  };
}

export async function getBookingsForDashboard(user: DashboardUser): Promise<DashboardBookingsData> {
  const supabase = await createSupabaseServerClient();
  const therapistIds = user.role === "therapist" ? await getTherapistIdsForUser(user.id) : [];
  const therapistResult = await getDashboardTherapists(user.role, user.id);

  if (user.role === "therapist" && therapistIds.length === 0) {
    return {
      bookings: [],
      therapists: therapistResult.therapists,
      error: therapistResult.error
    };
  }

  try {
    const bookingsQuery = supabase
        .from("bookings")
        .select(fullBookingColumns)
        .order("preferred_date", { ascending: true })
        .order("preferred_time", { ascending: true })
      .limit(400);
    const { data: bookings, error: bookingsError } =
      user.role === "admin" ? await bookingsQuery : await bookingsQuery.in("therapist_id", therapistIds);

    if (!bookingsError) {
      return {
        bookings: (bookings ?? []).map(toDashboardBooking),
        therapists: therapistResult.therapists,
        error: therapistResult.error
      };
    }

    const dashboardBookingsQuery = supabase
      .from("bookings")
      .select(dashboardBookingColumns)
      .order("preferred_date", { ascending: true })
      .order("preferred_time", { ascending: true })
      .limit(400);
    const { data: dashboardBookings, error: dashboardBookingsError } =
      user.role === "admin" ? await dashboardBookingsQuery : await dashboardBookingsQuery.in("therapist_id", therapistIds);

    if (!dashboardBookingsError) {
      return {
        bookings: (dashboardBookings ?? []).map(toDashboardBooking),
        therapists: therapistResult.therapists,
        error: therapistResult.error
      };
    }

    if (user.role === "therapist") {
      return {
        bookings: [],
        therapists: therapistResult.therapists,
        error: true
      };
    }

    const { data: legacyBookings, error: legacyBookingsError } = await supabase
      .from("bookings")
      .select(legacyBookingColumns)
      .order("preferred_date", { ascending: true })
      .order("preferred_time", { ascending: true })
      .limit(400);

    return {
      bookings: legacyBookingsError ? [] : (legacyBookings ?? []).map(toDashboardBooking),
      therapists: [],
      error: Boolean(legacyBookingsError || therapistResult.error)
    };
  } catch {
    return {
      bookings: [],
      therapists: [],
      error: true
    };
  }
}

export async function getDashboardBookingsData(user: DashboardUser): Promise<DashboardBookingsData> {
  return getBookingsForDashboard(user);
}

export async function getBookingById(user: DashboardUser, bookingId: string): Promise<DashboardBooking | null> {
  const supabase = await createSupabaseServerClient();

  try {
    const therapistIds = user.role === "therapist" ? await getTherapistIdsForUser(user.id) : [];

    if (user.role === "therapist" && therapistIds.length === 0) {
      return null;
    }

    async function queryBooking(columns: string) {
      const query = supabase.from("bookings").select(columns).eq("id", bookingId);

      return user.role === "therapist" ? query.in("therapist_id", therapistIds).maybeSingle() : query.maybeSingle();
    }

    const { data, error } = await queryBooking(fullBookingColumns);

    if (!error && data) {
      return toDashboardBooking(data as unknown as DashboardBookingRow);
    }

    const { data: dashboardData, error: dashboardError } = await queryBooking(dashboardBookingColumns);

    if (!dashboardError && dashboardData) {
      return toDashboardBooking(dashboardData as unknown as DashboardBookingRow);
    }

    if (user.role === "therapist") {
      return null;
    }

    const { data: legacyData, error: legacyError } = await queryBooking(legacyBookingColumns);

    return legacyError || !legacyData ? null : toDashboardBooking(legacyData as unknown as DashboardBookingRow);
  } catch {
    return null;
  }
}

async function assertCanManageBooking(user: DashboardUser, bookingId: string) {
  const booking = await getBookingById(user, bookingId);

  if (!booking) {
    throw new DashboardForbiddenError();
  }

  return booking;
}

function assertUpdatedBooking(data: { id: string } | null, error: { message: string } | null) {
  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new DashboardForbiddenError();
  }
}

async function getActiveTherapistById(therapistId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("therapists")
    .select("id, profile_id, display_name, active")
    .eq("id", therapistId)
    .eq("active", true)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    profileId: data.profile_id,
    displayName: data.display_name,
    active: data.active
  };
}

async function getActiveServiceBySlug(slug: string): Promise<ActiveServiceRow | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("services")
    .select("slug, duration_minutes")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();

  return error || !data ? null : data;
}

function validateManualBookingInput(input: CreateManualBookingInput) {
  const service = normalizeRequiredText(input.service);
  const preferredDate = normalizeRequiredText(input.preferredDate);
  const preferredTime = normalizeRequiredText(input.preferredTime);
  const clientName = normalizeRequiredText(input.clientName);
  const clientPhone = normalizeRequiredText(input.clientPhone);

  if (
    !service ||
    !preferredDate ||
    !preferredTime ||
    clientName.length < 2 ||
    clientPhone.length < 6 ||
    !isLocale(input.locale) ||
    !isManualBookingSourceChannel(input.sourceChannel) ||
    !isManualCreateStatus(input.status)
  ) {
    throw new Error("Invalid manual booking.");
  }

  if (input.durationMinutes !== undefined && input.durationMinutes !== null && input.durationMinutes <= 0) {
    throw new Error("Invalid manual booking duration.");
  }

  return {
    service,
    preferredDate,
    preferredTime,
    clientName,
    clientPhone
  };
}

export async function createManualBooking(user: DashboardUser, input: CreateManualBookingInput) {
  const supabase = await createSupabaseServerClient();
  const normalized = validateManualBookingInput(input);
  let therapistId = input.therapistId ?? null;

  if (user.role === "therapist") {
    const therapistIds = await getTherapistIdsForUser(user.id);

    if (!therapistId || !therapistIds.includes(therapistId) || input.status !== "confirmed") {
      throw new DashboardForbiddenError();
    }
  }

  if (user.role === "admin" && input.status !== "pending" && input.status !== "confirmed") {
    throw new DashboardForbiddenError();
  }

  let specialist = "unassigned";
  const service = await getActiveServiceBySlug(normalized.service);

  if (!service) {
    throw new Error("Invalid manual booking service.");
  }

  if (therapistId) {
    const therapist = await getActiveTherapistById(therapistId);

    if (!therapist) {
      if (user.role === "therapist") {
        throw new DashboardForbiddenError();
      }

      therapistId = null;
    } else {
      specialist = therapist.displayName;
    }
  }

  const { data, error } = await supabase
    .from("bookings")
    .insert({
      service: normalized.service,
      specialist,
      preferred_date: normalized.preferredDate,
      preferred_time: normalized.preferredTime,
      duration_minutes: input.durationMinutes ?? service.duration_minutes,
      client_name: normalized.clientName,
      client_phone: normalized.clientPhone,
      client_comment: normalizeOptionalText(input.clientComment),
      internal_notes: normalizeInternalNotes(input.internalNotes),
      locale: input.locale,
      therapist_id: therapistId,
      status: input.status,
      source: "dashboard",
      source_channel: input.sourceChannel
    })
    .select("id")
    .maybeSingle();

  assertUpdatedBooking(data, error);
}

export async function updateBookingStatus(user: DashboardUser, bookingId: string, status: BookingStatus) {
  if (!isBookingStatus(status)) {
    throw new Error("Invalid booking status.");
  }

  if (user.role === "therapist" && status === "pending") {
    throw new DashboardForbiddenError();
  }

  const supabase = await createSupabaseServerClient();

  if (user.role === "therapist") {
    const therapistIds = await getTherapistIdsForUser(user.id);

    if (therapistIds.length === 0) {
      throw new DashboardForbiddenError();
    }

    await assertCanManageBooking(user, bookingId);
    const { data, error } = await supabase
      .from("bookings")
      .update({ status })
      .eq("id", bookingId)
      .in("therapist_id", therapistIds)
      .select("id")
      .maybeSingle();

    assertUpdatedBooking(data, error);

    return;
  }

  const { data, error } = await supabase.from("bookings").update({ status }).eq("id", bookingId).select("id").maybeSingle();
  assertUpdatedBooking(data, error);
}

export async function updateBookingInternalNotes(user: DashboardUser, bookingId: string, internalNotes: string | null) {
  const supabase = await createSupabaseServerClient();
  const notes = normalizeInternalNotes(internalNotes);

  if (user.role === "therapist") {
    const therapistIds = await getTherapistIdsForUser(user.id);

    if (therapistIds.length === 0) {
      throw new DashboardForbiddenError();
    }

    await assertCanManageBooking(user, bookingId);
    const { data, error } = await supabase
      .from("bookings")
      .update({ internal_notes: notes })
      .eq("id", bookingId)
      .in("therapist_id", therapistIds)
      .select("id")
      .maybeSingle();

    assertUpdatedBooking(data, error);

    return;
  }

  const { data, error } = await supabase
    .from("bookings")
    .update({ internal_notes: notes })
    .eq("id", bookingId)
    .select("id")
    .maybeSingle();
  assertUpdatedBooking(data, error);
}

export async function assignTherapistToBooking(user: DashboardUser, bookingId: string, therapistId: string | null) {
  if (user.role !== "admin") {
    throw new DashboardForbiddenError();
  }

  const supabase = await createSupabaseServerClient();

  if (therapistId) {
    const { data: therapist, error: therapistError } = await supabase
      .from("therapists")
      .select("id")
      .eq("id", therapistId)
      .eq("active", true)
      .maybeSingle();

    if (therapistError || !therapist) {
      throw new DashboardForbiddenError();
    }
  }

  const { data, error } = await supabase
    .from("bookings")
    .update({ therapist_id: therapistId })
    .eq("id", bookingId)
    .select("id")
    .maybeSingle();
  assertUpdatedBooking(data, error);
}
