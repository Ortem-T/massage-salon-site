import { isLocale, type Locale } from "@/i18n/config";
import {
  isSlotAvailableBeforeSubmit,
  type AvailabilityBooking,
  type AvailabilityScheduleBlock
} from "@/lib/booking/booking-availability";
import { defaultBookingAvailability } from "@/lib/booking/booking-options";
import { bookingStatuses, type BookingStatus } from "@/lib/booking/booking-schema";
import {
  contactValueRequired,
  normalizeClientContact,
  type BookingClient,
  type ClientContactChannel
} from "@/lib/clients/contact";
import {
  clientContactColumns,
  findOrCreateClientForBooking,
  getClientPrimaryContact,
  legacyClientColumns,
  toBookingClient
} from "@/lib/clients/server";
import { type DashboardUser } from "@/lib/dashboard/auth";
import {
  manualBookingCreateStatuses,
  manualBookingSourceChannels,
  type ManualBookingSourceChannel
} from "@/lib/dashboard/constants";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  notifyTelegramBookingStatusChange,
  notifyTelegramNewBooking,
  notifyTelegramTherapistAssignmentChange,
  type TelegramBookingDetails
} from "@/server/telegram/bookingNotifications";

export type DashboardBooking = {
  id: string;
  createdAt: string;
  service: string;
  specialist: string;
  preferredDate: string;
  preferredTime: string;
  clientName: string;
  clientPhone: string;
  clientContactChannel: ClientContactChannel | null;
  clientContactValue: string | null;
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
  clients: BookingClient[];
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
  clientPhone?: string | null;
  clientId?: string | null;
  clientContactValue?: string | null;
  clientNotes?: string | null;
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

export class DashboardBlockedTimeError extends Error {
  constructor() {
    super("Dashboard booking time is unavailable.");
    this.name = "DashboardBlockedTimeError";
  }
}

export class DashboardServiceRestrictionError extends Error {
  constructor() {
    super("Selected therapist does not provide this service.");
    this.name = "DashboardServiceRestrictionError";
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
  client_contact_channel?: ClientContactChannel | null;
  client_contact_value?: string | null;
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
    clientContactChannel: row.client_contact_channel ?? null,
    clientContactValue: row.client_contact_value ?? null,
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
  id: string;
  slug: string;
  duration_minutes: number;
};

type PublicAvailabilityRow = {
  booking_date: string;
  preferred_time: string;
  therapist_id: string | null;
  duration_minutes: number | null;
  status: AvailabilityBooking["status"];
};

type PublicScheduleBlockRow = {
  block_date: string;
  therapist_id: string | null;
  block_type: AvailabilityScheduleBlock["blockType"];
  block_scope: AvailabilityScheduleBlock["blockScope"];
  start_time: string | null;
  end_time: string | null;
};

const fullBookingColumns =
  "id, created_at, service, specialist, preferred_date, preferred_time, client_name, client_phone, client_contact_channel, client_contact_value, client_comment, locale, status, source, source_channel, duration_minutes, client_id, therapist_id, internal_notes, updated_at";
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

function toAvailabilityBooking(row: PublicAvailabilityRow): AvailabilityBooking {
  return {
    bookingDate: row.booking_date,
    preferredTime: row.preferred_time,
    therapistId: row.therapist_id,
    durationMinutes: row.duration_minutes,
    status: row.status
  };
}

function toAvailabilityScheduleBlock(row: PublicScheduleBlockRow): AvailabilityScheduleBlock {
  return {
    blockDate: row.block_date,
    therapistId: row.therapist_id,
    blockType: row.block_type,
    blockScope: row.block_scope,
    startTime: row.start_time,
    endTime: row.end_time
  };
}

async function isManualBookingSlotAvailable(input: {
  therapistId: string;
  serviceDurationMinutes: number;
  date: string;
  preferredTime: string;
}) {
  const publicSupabase = createSupabaseBrowserClient();
  const { data: availabilityRows, error: availabilityError } = await publicSupabase
    .from("public_booking_availability")
    .select("booking_date, preferred_time, therapist_id, duration_minutes, status")
    .eq("booking_date", input.date);

  if (availabilityError) {
    throw new Error(availabilityError.message);
  }

  const { data: blockRows, error: blocksError } = await publicSupabase
    .from("public_schedule_block_availability")
    .select("block_date, therapist_id, block_type, block_scope, start_time, end_time")
    .eq("block_date", input.date);

  if (blocksError) {
    throw new Error(blocksError.message);
  }

  return isSlotAvailableBeforeSubmit({
    therapistId: input.therapistId,
    serviceDurationMinutes: input.serviceDurationMinutes,
    date: input.date,
    preferredTime: input.preferredTime,
    bookings: ((availabilityRows ?? []) as PublicAvailabilityRow[]).map(toAvailabilityBooking),
    scheduleBlocks: ((blockRows ?? []) as PublicScheduleBlockRow[]).map(toAvailabilityScheduleBlock),
    bookingWindow: {
      firstStart: defaultBookingAvailability.firstBookingStart,
      lastStart: defaultBookingAvailability.lastBookingStart
    },
    breakMinutes: defaultBookingAvailability.breakMinutes
  });
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

async function getDashboardClients(role: DashboardUser["role"]) {
  const supabase = await createSupabaseServerClient();

  if (role === "therapist") {
    const { data, error } = await supabase.rpc("list_dashboard_booking_clients", {});

    if (!error) {
      return {
        clients: (data ?? []).map((client) => toBookingClient(client as Parameters<typeof toBookingClient>[0])),
        error: false
      };
    }
  }

  const { data, error } = await supabase
    .from("clients")
    .select(clientContactColumns)
    .order("updated_at", { ascending: false })
    .limit(300);

  if (!error) {
    return {
      clients: (data ?? []).map((client) => toBookingClient(client as Parameters<typeof toBookingClient>[0])),
      error: false
    };
  }

  const { data: legacyData, error: legacyError } = await supabase
    .from("clients")
    .select(legacyClientColumns)
    .order("updated_at", { ascending: false })
    .limit(300);

  return {
    clients: legacyError ? [] : (legacyData ?? []).map((client) => toBookingClient(client as Parameters<typeof toBookingClient>[0])),
    error: Boolean(legacyError)
  };
}

export async function getBookingsForDashboard(user: DashboardUser): Promise<DashboardBookingsData> {
  const supabase = await createSupabaseServerClient();
  const therapistIds = user.role === "therapist" ? await getTherapistIdsForUser(user.id) : [];
  const therapistResult = await getDashboardTherapists(user.role, user.id);
  const clientResult = await getDashboardClients(user.role);

  if (user.role === "therapist" && therapistIds.length === 0) {
    return {
      bookings: [],
      clients: clientResult.clients,
      therapists: therapistResult.therapists,
      error: therapistResult.error || clientResult.error
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
        clients: clientResult.clients,
        therapists: therapistResult.therapists,
        error: therapistResult.error || clientResult.error
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
        clients: clientResult.clients,
        therapists: therapistResult.therapists,
        error: therapistResult.error || clientResult.error
      };
    }

    if (user.role === "therapist") {
      return {
        bookings: [],
        clients: clientResult.clients,
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
      clients: clientResult.clients,
      therapists: [],
      error: Boolean(legacyBookingsError || therapistResult.error || clientResult.error)
    };
  } catch {
    return {
      bookings: [],
      clients: [],
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
    .select("id, slug, duration_minutes")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();

  return error || !data ? null : data;
}

async function isTherapistAllowedForService(serviceId: string, therapistId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("therapist_services")
    .select("id")
    .eq("service_id", serviceId)
    .eq("therapist_id", therapistId)
    .eq("active", true)
    .maybeSingle();

  return !error && Boolean(data);
}

async function getRussianServiceNameBySlug(slug: string) {
  const supabase = await createSupabaseServerClient();
  const { data: service, error: serviceError } = await supabase
    .from("services")
    .select("id, slug")
    .eq("slug", slug)
    .maybeSingle();

  if (serviceError || !service) {
    return slug;
  }

  const { data: translation } = await supabase
    .from("service_translations")
    .select("name")
    .eq("service_id", service.id)
    .eq("locale", "ru")
    .maybeSingle();

  return translation?.name ?? service.slug;
}

async function getTherapistDisplayNameById(therapistId: string | null | undefined) {
  if (!therapistId) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("therapists")
    .select("display_name")
    .eq("id", therapistId)
    .maybeSingle();

  return error || !data ? null : data.display_name;
}

async function getDashboardActorName(user: DashboardUser) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  if (!error && data) {
    return data.full_name || data.email || user.email || user.role;
  }

  return user.email || user.role;
}

async function toTelegramBookingDetails(booking: DashboardBooking, therapistName?: string | null): Promise<TelegramBookingDetails> {
  const serviceName = await getRussianServiceNameBySlug(booking.service);
  const resolvedTherapistName =
    therapistName !== undefined
      ? therapistName
      : (await getTherapistDisplayNameById(booking.therapistId)) ?? (booking.therapistId ? booking.specialist : null);

  return {
    service: serviceName,
    preferredDate: booking.preferredDate,
    preferredTime: booking.preferredTime,
    durationMinutes: booking.durationMinutes,
    clientName: booking.clientName,
    clientPhone: booking.clientPhone,
    clientContactChannel: booking.clientContactChannel,
    clientContactValue: booking.clientContactValue,
    clientLocale: booking.locale,
    source: booking.source,
    sourceChannel: booking.sourceChannel,
    therapistName: resolvedTherapistName,
    clientComment: booking.clientComment,
    internalNotes: booking.internalNotes,
    status: booking.status
  };
}

async function notifyTelegramSafely(task: () => Promise<void>) {
  try {
    await task();
  } catch (error) {
    console.error("[telegram] booking notification preparation failed", error);
  }
}

function validateManualBookingInput(input: CreateManualBookingInput) {
  const service = normalizeRequiredText(input.service);
  const preferredDate = normalizeRequiredText(input.preferredDate);
  const preferredTime = normalizeRequiredText(input.preferredTime);
  const clientName = normalizeRequiredText(input.clientName);
  const clientContactValue = normalizeRequiredText(input.clientContactValue);
  const clientPhone = normalizeOptionalText(input.clientPhone);

  if (
    !service ||
    !preferredDate ||
    !preferredTime ||
    clientName.length < 2 ||
    !isLocale(input.locale) ||
    !isManualBookingSourceChannel(input.sourceChannel) ||
    !isManualCreateStatus(input.status)
  ) {
    throw new Error("Invalid manual booking.");
  }

  if (contactValueRequired(input.sourceChannel) && clientContactValue.length < 2) {
    throw new Error("Invalid manual booking contact.");
  }

  if (input.durationMinutes !== undefined && input.durationMinutes !== null && input.durationMinutes <= 0) {
    throw new Error("Invalid manual booking duration.");
  }

  return {
    service,
    preferredDate,
    preferredTime,
    clientName,
    clientContactValue: clientContactValue || null,
    clientPhone
  };
}

async function getAllowedClientById(user: DashboardUser, clientId: string) {
  const supabase = await createSupabaseServerClient();

  if (user.role === "therapist") {
    const { data, error } = await supabase.rpc("list_dashboard_booking_clients", {});

    if (!error) {
      const client = (data ?? []).find((item) => item.id === clientId);

      return client ? toBookingClient(client as Parameters<typeof toBookingClient>[0]) : null;
    }
  }

  const { data, error } = await supabase
    .from("clients")
    .select(clientContactColumns)
    .eq("id", clientId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return toBookingClient(data as Parameters<typeof toBookingClient>[0]);
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

  if (therapistId) {
    const isAllowed = await isTherapistAllowedForService(service.id, therapistId);

    if (!isAllowed) {
      throw new DashboardServiceRestrictionError();
    }

    const isAvailable = await isManualBookingSlotAvailable({
      therapistId,
      serviceDurationMinutes: input.durationMinutes ?? service.duration_minutes,
      date: normalized.preferredDate,
      preferredTime: normalized.preferredTime
    });

    if (!isAvailable) {
      throw new DashboardBlockedTimeError();
    }
  }

  const explicitContact = normalizeClientContact({
    channel: input.sourceChannel,
    value: normalized.clientContactValue,
    phone: normalized.clientPhone
  });
  const selectedClient = input.clientId ? await getAllowedClientById(user, input.clientId) : null;
  if (input.clientId && !selectedClient) {
    throw new DashboardForbiddenError();
  }

  const bookingClient = selectedClient ?? (await findOrCreateClientForBooking({
    name: normalized.clientName,
    contactChannel: input.sourceChannel,
    contactValue: normalized.clientContactValue,
    phone: normalized.clientPhone,
    locale: input.locale,
    notes: input.clientNotes
  }));
  const clientPrimaryContact = getClientPrimaryContact(bookingClient);
  const bookingContactChannel = input.sourceChannel;
  const bookingContactValue = explicitContact.value ?? clientPrimaryContact.value ?? null;
  const legacyClientPhone = explicitContact.legacyPhoneSnapshot || bookingClient.phone || "";

  const { data, error } = await supabase
    .from("bookings")
    .insert({
      service: normalized.service,
      specialist,
      preferred_date: normalized.preferredDate,
      preferred_time: normalized.preferredTime,
      duration_minutes: input.durationMinutes ?? service.duration_minutes,
      client_name: selectedClient ? bookingClient.name : normalized.clientName,
      client_phone: legacyClientPhone,
      client_contact_channel: bookingContactChannel,
      client_contact_value: bookingContactValue,
      client_comment: normalizeOptionalText(input.clientComment),
      internal_notes: normalizeInternalNotes(input.internalNotes),
      locale: input.locale,
      client_id: bookingClient.id,
      therapist_id: therapistId,
      status: input.status,
      source: "dashboard",
      source_channel: input.sourceChannel
    })
    .select("id")
    .maybeSingle();

  assertUpdatedBooking(data, error);

  await notifyTelegramSafely(async () => {
    await notifyTelegramNewBooking({
      service: await getRussianServiceNameBySlug(normalized.service),
      preferredDate: normalized.preferredDate,
      preferredTime: normalized.preferredTime,
      durationMinutes: input.durationMinutes ?? service.duration_minutes,
      clientName: selectedClient ? bookingClient.name : normalized.clientName,
      clientPhone: legacyClientPhone,
      clientContactChannel: bookingContactChannel,
      clientContactValue: bookingContactValue,
      clientLocale: input.locale,
      source: "dashboard",
      sourceChannel: input.sourceChannel,
      therapistName: therapistId ? specialist : null,
      clientComment: normalizeOptionalText(input.clientComment),
      internalNotes: normalizeInternalNotes(input.internalNotes),
      status: input.status
    });
  });
}

export async function updateBookingStatus(user: DashboardUser, bookingId: string, status: BookingStatus) {
  if (!isBookingStatus(status)) {
    throw new Error("Invalid booking status.");
  }

  if (user.role === "therapist" && status === "pending") {
    throw new DashboardForbiddenError();
  }

  const supabase = await createSupabaseServerClient();
  const existingBooking = await assertCanManageBooking(user, bookingId);

  if (existingBooking.status === status) {
    return;
  }

  if (user.role === "therapist") {
    const therapistIds = await getTherapistIdsForUser(user.id);

    if (therapistIds.length === 0) {
      throw new DashboardForbiddenError();
    }

    const { data, error } = await supabase
      .from("bookings")
      .update({ status })
      .eq("id", bookingId)
      .in("therapist_id", therapistIds)
      .select("id")
      .maybeSingle();

    assertUpdatedBooking(data, error);
  } else {
    const { data, error } = await supabase.from("bookings").update({ status }).eq("id", bookingId).select("id").maybeSingle();
    assertUpdatedBooking(data, error);
  }

  await notifyTelegramSafely(async () => {
    await notifyTelegramBookingStatusChange({
      booking: await toTelegramBookingDetails({ ...existingBooking, status }),
      oldStatus: existingBooking.status,
      newStatus: status,
      changedBy: await getDashboardActorName(user)
    });
  });
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
  const nextTherapistId = therapistId?.trim() || null;
  const existingBooking = await assertCanManageBooking(user, bookingId);
  let nextTherapist: DashboardTherapist | null = null;

  if (nextTherapistId) {
    nextTherapist = await getActiveTherapistById(nextTherapistId);

    if (!nextTherapist) {
      throw new DashboardForbiddenError();
    }

    const service = await getActiveServiceBySlug(existingBooking.service);

    if (!service || !(await isTherapistAllowedForService(service.id, nextTherapistId))) {
      throw new DashboardServiceRestrictionError();
    }
  }

  if (existingBooking.therapistId === nextTherapistId) {
    return;
  }

  const previousTherapistName =
    (await getTherapistDisplayNameById(existingBooking.therapistId)) ?? (existingBooking.therapistId ? existingBooking.specialist : null);
  const nextTherapistName = nextTherapist?.displayName ?? null;

  const { data, error } = await supabase
    .from("bookings")
    .update({ therapist_id: nextTherapistId, specialist: nextTherapistName ?? "unassigned" })
    .eq("id", bookingId)
    .select("id")
    .maybeSingle();
  assertUpdatedBooking(data, error);

  await notifyTelegramSafely(async () => {
    await notifyTelegramTherapistAssignmentChange({
      booking: await toTelegramBookingDetails(
        {
          ...existingBooking,
          specialist: nextTherapistName ?? "unassigned",
          therapistId: nextTherapistId
        },
        nextTherapistName
      ),
      previousTherapistName,
      nextTherapistName
    });
  });
}
