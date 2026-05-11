import { type Locale } from "@/i18n/config";
import { bookingStatuses, type BookingStatus } from "@/lib/booking/booking-schema";
import { type DashboardRole } from "@/lib/dashboard/auth";
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

function isBookingStatus(status: unknown): status is BookingStatus {
  return typeof status === "string" && bookingStatuses.includes(status as BookingStatus);
}

function toDashboardBooking(row: {
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
  client_id: string | null;
  therapist_id: string | null;
  internal_notes: string | null;
  updated_at: string;
}): DashboardBooking {
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
    clientId: row.client_id,
    therapistId: row.therapist_id,
    internalNotes: row.internal_notes,
    updatedAt: row.updated_at
  };
}

export async function getDashboardBookingsData(): Promise<DashboardBookingsData> {
  const supabase = await createSupabaseServerClient();
  const [{ data: bookings, error: bookingsError }, { data: therapists, error: therapistsError }] = await Promise.all([
    supabase
      .from("bookings")
      .select(
        "id, created_at, service, specialist, preferred_date, preferred_time, client_name, client_phone, client_comment, locale, status, source, client_id, therapist_id, internal_notes, updated_at"
      )
      .order("preferred_date", { ascending: true })
      .order("preferred_time", { ascending: true })
      .limit(400),
    supabase.from("therapists").select("id, profile_id, display_name, active").order("display_name", { ascending: true })
  ]);

  return {
    bookings: bookingsError ? [] : bookings.map(toDashboardBooking),
    therapists: therapistsError
      ? []
      : therapists.map((therapist) => ({
          id: therapist.id,
          profileId: therapist.profile_id,
          displayName: therapist.display_name,
          active: therapist.active
        })),
    error: Boolean(bookingsError || therapistsError)
  };
}

export async function updateDashboardBooking(role: DashboardRole, input: UpdateDashboardBookingInput) {
  const supabase = await createSupabaseServerClient();
  const update: {
    status?: BookingStatus;
    therapist_id?: string | null;
    internal_notes?: string | null;
  } = {};

  if (input.status !== undefined) {
    if (!isBookingStatus(input.status)) {
      throw new Error("Invalid booking status.");
    }

    if (role === "therapist" && input.status !== "completed") {
      throw new Error("Therapists can only mark bookings as completed.");
    }

    update.status = input.status;
  }

  if (input.internalNotes !== undefined) {
    update.internal_notes = input.internalNotes?.trim() ? input.internalNotes.trim() : null;
  }

  if (role === "admin" && input.therapistId !== undefined) {
    update.therapist_id = input.therapistId;
  }

  if (Object.keys(update).length === 0) {
    return;
  }

  const { error } = await supabase.from("bookings").update(update).eq("id", input.bookingId);

  if (error) {
    throw new Error(error.message);
  }
}
