import { type Locale } from "@/i18n/config";
import { bookingStatuses, type BookingStatus } from "@/lib/booking/booking-schema";
import { type DashboardUser } from "@/lib/dashboard/auth";
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

export class DashboardForbiddenError extends Error {
  constructor() {
    super("Dashboard action is not allowed for this user.");
    this.name = "DashboardForbiddenError";
  }
}

function isBookingStatus(status: unknown): status is BookingStatus {
  return typeof status === "string" && bookingStatuses.includes(status as BookingStatus);
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

async function getDashboardTherapists(role: DashboardUser["role"], userId: string) {
  const supabase = await createSupabaseServerClient();
  const query = supabase.from("therapists").select("id, profile_id, display_name, active").order("display_name", { ascending: true });
  const { data, error } =
    role === "admin" ? await query : await query.eq("profile_id", userId).eq("active", true);

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
        .select(
          "id, created_at, service, specialist, preferred_date, preferred_time, client_name, client_phone, client_comment, locale, status, source, client_id, therapist_id, internal_notes, updated_at"
        )
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

    if (user.role === "therapist") {
      return {
        bookings: [],
        therapists: therapistResult.therapists,
        error: true
      };
    }

    const { data: legacyBookings, error: legacyBookingsError } = await supabase
      .from("bookings")
      .select(
        "id, created_at, service, specialist, preferred_date, preferred_time, client_name, client_phone, client_comment, locale, status, source"
      )
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
    if (user.role === "therapist") {
      const therapistIds = await getTherapistIdsForUser(user.id);

      if (therapistIds.length === 0) {
        return null;
      }

      const { data, error } = await supabase
        .from("bookings")
        .select(
          "id, created_at, service, specialist, preferred_date, preferred_time, client_name, client_phone, client_comment, locale, status, source, client_id, therapist_id, internal_notes, updated_at"
        )
        .eq("id", bookingId)
        .in("therapist_id", therapistIds)
        .maybeSingle();

      return error || !data ? null : toDashboardBooking(data);
    }

    const { data, error } = await supabase
      .from("bookings")
      .select(
        "id, created_at, service, specialist, preferred_date, preferred_time, client_name, client_phone, client_comment, locale, status, source, client_id, therapist_id, internal_notes, updated_at"
      )
      .eq("id", bookingId)
      .maybeSingle();

    if (!error && data) {
      return toDashboardBooking(data);
    }

    const { data: legacyData, error: legacyError } = await supabase
      .from("bookings")
      .select("id, created_at, service, specialist, preferred_date, preferred_time, client_name, client_phone, client_comment, locale, status, source")
      .eq("id", bookingId)
      .maybeSingle();

    return legacyError || !legacyData ? null : toDashboardBooking(legacyData);
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

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      throw new DashboardForbiddenError();
    }

    return;
  }

  const { error } = await supabase.from("bookings").update({ status }).eq("id", bookingId);

  if (error) {
    throw new Error(error.message);
  }
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

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      throw new DashboardForbiddenError();
    }

    return;
  }

  const { error } = await supabase.from("bookings").update({ internal_notes: notes }).eq("id", bookingId);

  if (error) {
    throw new Error(error.message);
  }
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

  const { error } = await supabase.from("bookings").update({ therapist_id: therapistId }).eq("id", bookingId);

  if (error) {
    throw new Error(error.message);
  }
}
