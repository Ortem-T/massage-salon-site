"use client";

import { type FormEvent, type KeyboardEvent, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { BookingDatePicker } from "@/components/booking/booking-date-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { type Locale } from "@/i18n/config";
import { type Dictionary } from "@/i18n/dictionaries";
import { getTodayValue, isBookingDateSelectable } from "@/lib/booking/booking-availability";
import { type BookingStatus, bookingStatuses } from "@/lib/booking/booking-schema";
import {
  contactValueRequired,
  getClientContactLabel,
  normalizePrimaryContactValue,
  type BookingClient
} from "@/lib/clients/contact";
import {
  assignTherapistToBookingAction,
  createManualBookingAction,
  type DashboardActionResult,
  updateBookingInternalNotesAction,
  updateBookingStatusAction
} from "@/lib/dashboard/actions";
import { type DashboardRole } from "@/lib/dashboard/auth";
import {
  manualBookingCreateStatuses,
  manualBookingSourceChannels,
  type ManualBookingSourceChannel
} from "@/lib/dashboard/constants";
import { type DashboardBooking, type DashboardTherapist } from "@/lib/dashboard/bookings";
import {
  formatServiceDuration,
  formatServicePrice,
  getAllowedTherapistIdsForService,
  isTherapistAllowedForService,
  type ServiceCatalogItem
} from "@/lib/services/catalog";
import { cn } from "@/lib/utils";

type CalendarView = "day" | "week" | "month";
type StatusFilter = BookingStatus | "all";
type CreateBookingStatus = (typeof manualBookingCreateStatuses)[number];
type ClientMode = "existing" | "new";

type ManualBookingFormState = {
  clientMode: ClientMode;
  selectedClientId: string;
  clientSearch: string;
  service: string;
  preferredDate: string;
  preferredTime: string;
  durationMinutes: string;
  clientName: string;
  clientPhone: string;
  clientContactValue: string;
  clientNotes: string;
  clientComment: string;
  internalNotes: string;
  locale: Locale;
  therapistId: string;
  status: CreateBookingStatus;
  sourceChannel: ManualBookingSourceChannel;
};

type ManualBookingFormErrors = Partial<Record<keyof ManualBookingFormState, string>>;

type ManualFieldErrorProps = {
  id?: string;
  message?: string;
};

type BookingsCalendarProps = {
  bookings: DashboardBooking[];
  clients: BookingClient[];
  dataError: boolean;
  dictionary: Dictionary;
  initialDate?: string;
  locale: Locale;
  role: DashboardRole;
  serviceCatalog: ServiceCatalogItem[];
  serviceCatalogError: boolean;
  therapists: DashboardTherapist[];
};

type AvailabilityResponse = {
  days: Record<string, { availableTimeSlots: string[] }>;
};

const statusStyles: Record<BookingStatus, string> = {
  pending: "border-[#c6a15a]/40 bg-[#f6ecd8] text-[#72551f]",
  confirmed: "border-primary/25 bg-[#e3ede5] text-primary",
  cancelled: "border-[#b47c72]/35 bg-[#f1ded9] text-[#7b3c34]",
  completed: "border-[#8f9d86]/35 bg-[#e7eadf] text-[#46543d]"
};
const salonTimeZone = "Europe/Belgrade";
const dateLocales: Record<Locale, string> = {
  sr: "sr-Latn-RS",
  ru: "ru-RU",
  en: "en-GB"
};
const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])"
].join(",");

function todayKey() {
  return toDateKey(new Date());
}

function isDateKey(value: string | undefined): value is string {
  return Boolean(value?.match(/^\d{4}-\d{2}-\d{2}$/));
}

function getInitialDate(value: string | undefined) {
  return isDateKey(value) ? value : todayKey();
}

function toDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: salonTimeZone,
    year: "numeric"
  }).formatToParts(date);
  const values = new Map(parts.map((part) => [part.type, part.value]));

  return `${values.get("year")}-${values.get("month")}-${values.get("day")}`;
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, day, 12));
}

function addDays(value: string, amount: number) {
  const date = parseDateKey(value);
  date.setUTCDate(date.getUTCDate() + amount);
  return toDateKey(date);
}

function addMonths(value: string, amount: number) {
  const date = parseDateKey(value);
  date.setUTCMonth(date.getUTCMonth() + amount);
  return toDateKey(date);
}

function startOfWeek(value: string) {
  const date = parseDateKey(value);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  return toDateKey(date);
}

function getWeekDays(value: string) {
  const start = startOfWeek(value);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

function getMonthDays(value: string) {
  const date = parseDateKey(value);
  const first = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 12));
  const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 12));
  const start = startOfWeek(toDateKey(first));
  const lastWeek = getWeekDays(toDateKey(last));
  const end = lastWeek[lastWeek.length - 1];
  const days: string[] = [];
  let cursor = start;

  while (cursor <= end) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }

  return days;
}

function formatDate(value: string, locale: Locale, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(dateLocales[locale], { ...options, timeZone: salonTimeZone }).format(parseDateKey(value));
}

function formatCompactWeekday(value: string, locale: Locale) {
  return formatDate(value, locale, { weekday: "short" }).replace(".", "").slice(0, 2);
}

function sortBookings(bookings: DashboardBooking[]) {
  return [...bookings].sort((a, b) => {
    const dateCompare = a.preferredDate.localeCompare(b.preferredDate);
    return dateCompare === 0 ? a.preferredTime.localeCompare(b.preferredTime) : dateCompare;
  });
}

function ManualFieldError({ id, message }: ManualFieldErrorProps) {
  if (!message) {
    return <p aria-hidden="true" className="min-h-5 text-sm leading-5" />;
  }

  return (
    <p id={id} role="alert" aria-live="polite" className="min-h-5 text-sm leading-5 text-accent">
      {message}
    </p>
  );
}

function getFocusableElements(container: HTMLElement | null) {
  if (!container) {
    return [];
  }

  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelector)).filter(
    (element) => !element.hasAttribute("disabled") && element.getAttribute("aria-hidden") !== "true"
  );
}

export function BookingsCalendar({
  bookings,
  clients,
  dataError,
  dictionary,
  initialDate,
  locale,
  role,
  serviceCatalog,
  serviceCatalogError,
  therapists
}: BookingsCalendarProps) {
  const router = useRouter();
  const calendar = dictionary.dashboard.calendar;
  const [view, setView] = useState<CalendarView>("day");
  const [selectedDate, setSelectedDate] = useState(() => getInitialDate(initialDate));
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [therapistFilter, setTherapistFilter] = useState("all");
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [internalNotes, setInternalNotes] = useState("");
  const [assignedTherapistId, setAssignedTherapistId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const manualMinDate = useMemo(() => getTodayValue(), []);
  const [manualBookingForm, setManualBookingForm] = useState<ManualBookingFormState>(() => ({
    clientMode: "new",
    selectedClientId: "",
    clientSearch: "",
    service: "",
    preferredDate: todayKey(),
    preferredTime: "",
    durationMinutes: "",
    clientName: "",
    clientPhone: "",
    clientContactValue: "",
    clientNotes: "",
    clientComment: "",
    internalNotes: "",
    locale,
    therapistId: "",
    status: "confirmed",
    sourceChannel: "phone"
  }));
  const [manualBookingErrors, setManualBookingErrors] = useState<ManualBookingFormErrors>({});
  const [manualAvailableTimeSlots, setManualAvailableTimeSlots] = useState<string[]>([]);
  const [isManualAvailabilityLoading, setIsManualAvailabilityLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const dialogRef = useRef<HTMLElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const therapistNames = useMemo(
    () => new Map(therapists.map((therapist) => [therapist.id, therapist.displayName])),
    [therapists]
  );
  const serviceLabels = useMemo(
    () => new Map(serviceCatalog.map((service) => [service.slug, service.name])),
    [serviceCatalog]
  );
  const servicesBySlug = useMemo(
    () => new Map(serviceCatalog.map((service) => [service.slug, service])),
    [serviceCatalog]
  );
  const filteredManualClients = useMemo(() => {
    const query = manualBookingForm.clientSearch.trim().toLowerCase();

    if (!query) {
      return clients.slice(0, 8);
    }

    return clients
      .filter((client) =>
        [
          client.name,
          client.phone,
          client.instagramUsername,
          client.telegramUsername,
          client.whatsappPhone,
          client.viberPhone,
          client.primaryContactValue
        ]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(query))
      )
      .slice(0, 8);
  }, [clients, manualBookingForm.clientSearch]);
  const serviceDurations = useMemo(
    () => new Map(serviceCatalog.map((service) => [service.slug, String(service.durationMinutes)])),
    [serviceCatalog]
  );
  const activeServiceCatalog = useMemo(() => serviceCatalog.filter((service) => service.active), [serviceCatalog]);
  const ownTherapistId = role === "therapist" ? (therapists[0]?.id ?? "") : "";
  const manualServiceCatalog = useMemo(
    () =>
      role === "therapist"
        ? activeServiceCatalog.filter((service) => service.allowedTherapistIds.includes(ownTherapistId))
        : activeServiceCatalog,
    [activeServiceCatalog, ownTherapistId, role]
  );
  const selectedManualService = manualBookingForm.service ? (servicesBySlug.get(manualBookingForm.service) ?? null) : null;
  const manualAllowedTherapistIds = useMemo(
    () => (manualBookingForm.service ? getAllowedTherapistIdsForService(serviceCatalog, manualBookingForm.service) : []),
    [manualBookingForm.service, serviceCatalog]
  );
  const manualAvailableTherapists = useMemo(
    () => therapists.filter((therapist) => manualAllowedTherapistIds.includes(therapist.id)),
    [manualAllowedTherapistIds, therapists]
  );
  const selectedManualServiceTherapists = useMemo(
    () =>
      selectedManualService
        ? selectedManualService.allowedTherapistIds
            .map((therapistId) => therapistNames.get(therapistId))
            .filter((name): name is string => Boolean(name))
        : [],
    [selectedManualService, therapistNames]
  );
  const manualCanLoadAvailability = Boolean(
    manualBookingForm.service &&
    manualBookingForm.therapistId &&
    manualBookingForm.preferredDate
  );

  const filteredBookings = useMemo(() => {
    return sortBookings(bookings).filter((booking) => {
      if (statusFilter !== "all" && booking.status !== statusFilter) {
        return false;
      }

      if (role === "admin" && therapistFilter !== "all" && booking.therapistId !== therapistFilter) {
        return false;
      }

      return true;
    });
  }, [bookings, role, statusFilter, therapistFilter]);

  const selectedBooking = filteredBookings.find((booking) => booking.id === selectedBookingId) ?? null;
  const selectedBookingServiceMeta = selectedBooking ? getBookingServiceMeta(selectedBooking) : null;
  const assignmentAvailableTherapists = useMemo(
    () =>
      selectedBooking
        ? therapists.filter((therapist) => isTherapistAllowedForService(serviceCatalog, selectedBooking.service, therapist.id))
        : [],
    [selectedBooking, serviceCatalog, therapists]
  );
  const visibleDays = view === "day" ? [selectedDate] : view === "week" ? getWeekDays(selectedDate) : getMonthDays(selectedDate);
  const visibleBookings = filteredBookings.filter((booking) => visibleDays.includes(booking.preferredDate));

  const statusCounts = bookingStatuses.map((status) => ({
    status,
    count: bookings.filter((booking) => booking.status === status).length
  }));

  function getServiceOptionLabel(service: ServiceCatalogItem) {
    return [service.name, formatServiceDuration(service.durationMinutes, locale), formatServicePrice(service.priceRsd)]
      .filter(Boolean)
      .join(" - ");
  }

  function getBookingServiceMeta(booking: DashboardBooking) {
    const service = servicesBySlug.get(booking.service);
    const durationText = formatServiceDuration(booking.durationMinutes ?? service?.durationMinutes, locale);
    const priceText = formatServicePrice(service?.priceRsd);
    const compactText = [durationText, priceText].filter(Boolean).join(" · ");

    return {
      service,
      serviceName: service?.name ?? serviceLabels.get(booking.service) ?? booking.service,
      durationText,
      priceText,
      compactText
    };
  }

  function getClientPrimaryContact(client: BookingClient) {
    if (client.primaryContactChannel) {
      return {
        channel: client.primaryContactChannel,
        value: normalizePrimaryContactValue(client.primaryContactChannel, client.primaryContactValue)
      };
    }

    if (client.phone) {
      return { channel: "phone" as const, value: client.phone };
    }

    if (client.whatsappPhone) {
      return { channel: "whatsapp" as const, value: client.whatsappPhone };
    }

    if (client.viberPhone) {
      return { channel: "viber" as const, value: client.viberPhone };
    }

    if (client.instagramUsername) {
      return { channel: "instagram" as const, value: client.instagramUsername };
    }

    if (client.telegramUsername) {
      return { channel: "telegram" as const, value: client.telegramUsername };
    }

    return { channel: "walk_in" as const, value: null };
  }

  function getManualClientContactLabel(client: BookingClient) {
    const contact = getClientPrimaryContact(client);

    return getClientContactLabel(
      contact.channel,
      contact.value,
      calendar.create.sourceChannels,
      calendar.create.noPrimaryContact
    );
  }

  function getContactPlaceholder(channel: ManualBookingSourceChannel) {
    return calendar.create.contactPlaceholders[channel];
  }

  useEffect(() => {
    if (!selectedBookingId && !isCreateOpen) {
      return;
    }

    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = window.requestAnimationFrame(() => {
      const dialog = dialogRef.current;
      const focusableElements = getFocusableElements(dialog);
      const target = focusableElements[0] ?? dialog;

      target?.focus();
    });

    return () => {
      window.cancelAnimationFrame(frame);
      previousFocusRef.current?.focus();
    };
  }, [isCreateOpen, selectedBookingId]);

  useEffect(() => {
    if (!manualCanLoadAvailability) {
      setManualAvailableTimeSlots([]);
      setIsManualAvailabilityLoading(false);
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({
      therapistId: manualBookingForm.therapistId,
      serviceSlug: manualBookingForm.service,
      startDate: manualBookingForm.preferredDate,
      endDate: manualBookingForm.preferredDate
    });

    setIsManualAvailabilityLoading(true);

    fetch(`/api/booking-availability?${params.toString()}`, {
      cache: "no-store",
      signal: controller.signal
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Manual booking availability could not be loaded.");
        }

        return (await response.json()) as AvailabilityResponse;
      })
      .then((data) => {
        setManualAvailableTimeSlots(data.days[manualBookingForm.preferredDate]?.availableTimeSlots ?? []);
      })
      .catch((error) => {
        if ((error as Error).name !== "AbortError") {
          setManualAvailableTimeSlots([]);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsManualAvailabilityLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [
    manualBookingForm.preferredDate,
    manualBookingForm.service,
    manualBookingForm.therapistId,
    manualCanLoadAvailability
  ]);

  useEffect(() => {
    if (
      manualBookingForm.preferredTime &&
      !manualAvailableTimeSlots.includes(manualBookingForm.preferredTime)
    ) {
      setManualBookingForm((current) => ({
        ...current,
        preferredTime: ""
      }));
    }
  }, [manualAvailableTimeSlots, manualBookingForm.preferredTime]);

  function shiftDate(direction: -1 | 1) {
    if (view === "day") {
      setSelectedDate((current) => addDays(current, direction));
    } else if (view === "week") {
      setSelectedDate((current) => addDays(current, direction * 7));
    } else {
      setSelectedDate((current) => addMonths(current, direction));
    }
  }

  function openDay(day: string) {
    setSelectedDate(day);
    setView("day");
    setSelectedBookingId(null);
    setMessage(null);
  }

  function openBooking(booking: DashboardBooking) {
    setIsCreateOpen(false);
    setSelectedBookingId(booking.id);
    setInternalNotes(booking.internalNotes ?? "");
    setAssignedTherapistId(booking.therapistId);
    setMessage(null);
  }

  function closeBooking() {
    setSelectedBookingId(null);
    setMessage(null);
  }

  function openCreateBooking() {
    const defaultDate = isBookingDateSelectable(selectedDate, manualMinDate) ? selectedDate : "";

    setSelectedBookingId(null);
    setManualBookingForm({
      clientMode: clients.length > 0 ? "existing" : "new",
      selectedClientId: "",
      clientSearch: "",
      service: "",
      preferredDate: defaultDate,
      preferredTime: "",
      durationMinutes: "",
      clientName: "",
      clientPhone: "",
      clientContactValue: "",
      clientNotes: "",
      clientComment: "",
      internalNotes: "",
      locale,
      therapistId: ownTherapistId,
      status: "confirmed",
      sourceChannel: "phone"
    });
    setManualBookingErrors({});
    setMessage(null);
    setIsCreateOpen(true);
  }

  function updateManualBookingDate(value: string) {
    setManualBookingForm((current) => ({
      ...current,
      preferredDate: value,
      preferredTime: ""
    }));
    setManualBookingErrors((current) => {
      if (!current.preferredDate && !current.preferredTime) {
        return current;
      }

      const next = { ...current };
      delete next.preferredDate;
      delete next.preferredTime;
      return next;
    });
  }

  function closeCreateBooking() {
    setIsCreateOpen(false);
    setManualBookingErrors({});
  }

  function closeActiveDialog() {
    if (isCreateOpen) {
      closeCreateBooking();
      return;
    }

    closeBooking();
  }

  function updateManualBookingField<K extends keyof ManualBookingFormState>(
    field: K,
    value: ManualBookingFormState[K]
  ) {
    setManualBookingForm((current) => ({
      ...current,
      [field]: value
    }));
    setManualBookingErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function updateManualClientMode(mode: ClientMode) {
    setManualBookingForm((current) => ({
      ...current,
      clientMode: mode,
      selectedClientId: mode === "new" ? "" : current.selectedClientId,
      clientSearch: mode === "new" ? "" : current.clientSearch,
      clientName: mode === "new" ? "" : current.clientName,
      clientPhone: mode === "new" ? "" : current.clientPhone,
      clientContactValue: mode === "new" ? "" : current.clientContactValue,
      clientNotes: mode === "new" ? "" : current.clientNotes,
      sourceChannel: mode === "new" ? "phone" : current.sourceChannel
    }));
    setManualBookingErrors({});
  }

  function selectManualClient(client: BookingClient) {
    const contact = getClientPrimaryContact(client);

    setManualBookingForm((current) => ({
      ...current,
      clientMode: "existing",
      selectedClientId: client.id,
      clientSearch: client.name,
      clientName: client.name,
      clientPhone: client.phone ?? "",
      clientContactValue: contact.value ?? "",
      locale: client.locale ?? current.locale,
      sourceChannel: contact.channel
    }));
    setManualBookingErrors((current) => {
      const next = { ...current };
      delete next.selectedClientId;
      delete next.clientName;
      delete next.clientPhone;
      delete next.clientContactValue;
      delete next.sourceChannel;
      return next;
    });
  }

  function updateManualSourceChannel(channel: ManualBookingSourceChannel) {
    setManualBookingForm((current) => ({
      ...current,
      sourceChannel: channel,
      clientContactValue: channel === "walk_in" ? "" : current.clientContactValue,
      clientPhone:
        channel === "phone" || channel === "whatsapp" || channel === "viber"
          ? current.clientContactValue || current.clientPhone
          : current.clientPhone
    }));
    setManualBookingErrors((current) => {
      if (!current.sourceChannel && !current.clientContactValue) {
        return current;
      }

      const next = { ...current };
      delete next.sourceChannel;
      delete next.clientContactValue;
      return next;
    });
  }

  function updateManualBookingService(service: string) {
    const allowedTherapistIds = getAllowedTherapistIdsForService(serviceCatalog, service);
    const nextTherapistId =
      role === "therapist"
        ? (allowedTherapistIds.includes(ownTherapistId) ? ownTherapistId : "")
        : allowedTherapistIds.length === 1
          ? allowedTherapistIds[0]
          : allowedTherapistIds.includes(manualBookingForm.therapistId)
            ? manualBookingForm.therapistId
            : "";

    setManualBookingForm((current) => ({
      ...current,
      service,
      therapistId: nextTherapistId,
      durationMinutes: serviceDurations.get(service) ?? current.durationMinutes,
      preferredTime: ""
    }));
    setManualBookingErrors((current) => {
      if (!current.service) {
        return current;
      }

      const next = { ...current };
      delete next.service;
      return next;
    });
  }

  function validateManualBookingForm() {
    const create = calendar.create;
    const errors: ManualBookingFormErrors = {};

    if (!manualBookingForm.service) {
      errors.service = create.errors.service;
    }

    if (!manualBookingForm.preferredDate) {
      errors.preferredDate = create.errors.date;
    }

    if (!manualBookingForm.preferredTime) {
      errors.preferredTime = create.errors.time;
    }

    if (manualBookingForm.clientName.trim().length < 2) {
      errors.clientName = create.errors.clientName;
    }

    if (manualBookingForm.clientMode === "existing" && !manualBookingForm.selectedClientId) {
      errors.selectedClientId = create.errors.clientRequired;
    }

    if (!manualBookingForm.sourceChannel) {
      errors.sourceChannel = create.errors.sourceChannel;
    }

    if (
      contactValueRequired(manualBookingForm.sourceChannel) &&
      manualBookingForm.clientContactValue.trim().length < 2
    ) {
      errors.clientContactValue = create.errors.clientContactValue;
    }

    if (!manualBookingForm.therapistId) {
      errors.therapistId = manualBookingForm.service && manualAvailableTherapists.length === 0
        ? create.errors.noTherapistsForService
        : create.errors.therapist;
    } else if (!isTherapistAllowedForService(serviceCatalog, manualBookingForm.service, manualBookingForm.therapistId)) {
      errors.therapistId = create.errors.serviceTherapistUnavailable;
    }

    setManualBookingErrors(errors);

    return Object.keys(errors).length === 0;
  }

  function handleDialogKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      closeActiveDialog();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const dialog = dialogRef.current;
    const focusableElements = getFocusableElements(dialog);

    if (!dialog || focusableElements.length === 0) {
      event.preventDefault();
      dialog?.focus();
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  function showActionResult(result: DashboardActionResult) {
    if (result.ok) {
      setMessage(calendar.actions.saved);
      router.refresh();
      return;
    }

    setMessage(
      result.reason === "forbidden"
        ? calendar.actions.forbidden
        : result.reason === "service_restriction"
          ? calendar.actions.serviceRestriction
          : calendar.actions.error
    );
  }

  function runAction(action: () => Promise<DashboardActionResult>) {
    if (!selectedBooking) {
      return;
    }

    setMessage(null);
    startTransition(async () => {
      showActionResult(await action());
    });
  }

  function runStatusUpdate(status: BookingStatus) {
    if (!selectedBooking) {
      return;
    }

    if (status === "cancelled" && !window.confirm(calendar.actions.confirmCancel)) {
      return;
    }

    const bookingId = selectedBooking.id;

    runAction(() =>
      updateBookingStatusAction(locale, {
        bookingId,
        status
      })
    );
  }

  function runNotesUpdate() {
    if (!selectedBooking) {
      return;
    }

    const bookingId = selectedBooking.id;

    runAction(() =>
      updateBookingInternalNotesAction(locale, {
        bookingId,
        internalNotes
      })
    );
  }

  function runTherapistAssignment() {
    if (!selectedBooking) {
      return;
    }

    const bookingId = selectedBooking.id;

    runAction(() =>
      assignTherapistToBookingAction(locale, {
        bookingId,
        therapistId: assignedTherapistId
      })
    );
  }

  function submitManualBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validateManualBookingForm()) {
      return;
    }

    setMessage(null);
    startTransition(async () => {
      const result = await createManualBookingAction(locale, {
        service: manualBookingForm.service,
        preferredDate: manualBookingForm.preferredDate,
        preferredTime: manualBookingForm.preferredTime,
        durationMinutes: selectedManualService?.durationMinutes ?? null,
        clientName: manualBookingForm.clientName,
        clientPhone: manualBookingForm.clientPhone,
        clientId: manualBookingForm.clientMode === "existing" ? manualBookingForm.selectedClientId : null,
        clientContactValue: manualBookingForm.clientContactValue,
        clientNotes: manualBookingForm.clientNotes,
        clientComment: manualBookingForm.clientComment,
        internalNotes: manualBookingForm.internalNotes,
        locale: manualBookingForm.locale,
        therapistId: manualBookingForm.therapistId || null,
        status: role === "therapist" ? "confirmed" : manualBookingForm.status,
        sourceChannel: manualBookingForm.sourceChannel
      });

      if (result.ok) {
        closeCreateBooking();
        setMessage(calendar.create.success);
        router.refresh();
        return;
      }

      if (result.reason === "blocked") {
        setManualBookingErrors((current) => ({
          ...current,
          preferredTime: calendar.create.errors.blocked
        }));
        setMessage(calendar.create.errors.blocked);
        return;
      }

      if (result.reason === "service_restriction") {
        setManualBookingErrors((current) => ({
          ...current,
          therapistId: calendar.create.errors.serviceTherapistUnavailable
        }));
        setMessage(calendar.create.errors.serviceTherapistUnavailable);
        return;
      }

      setMessage(result.reason === "forbidden" ? calendar.actions.forbidden : calendar.create.error);
    });
  }

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-border/70 bg-card/82 p-4 shadow-soft sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">{calendar.eyebrow}</p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{calendar.subtitle}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[42rem] xl:grid-cols-4">
            <Button type="button" onClick={openCreateBooking}>
              {calendar.create.action}
            </Button>

            <Select
              aria-label={calendar.controls.view}
              value={view}
              onChange={(event) => setView(event.target.value as CalendarView)}
            >
              <option value="day">{calendar.views.day}</option>
              <option value="week">{calendar.views.week}</option>
              <option value="month">{calendar.views.month}</option>
            </Select>

            <Select
              aria-label={calendar.controls.status}
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            >
              <option value="all">{calendar.filters.allStatuses}</option>
              {bookingStatuses.map((status) => (
                <option key={status} value={status}>
                  {dictionary.booking.statuses[status]}
                </option>
              ))}
            </Select>

            {role === "admin" ? (
              <Select
                aria-label={calendar.controls.therapist}
                value={therapistFilter}
                onChange={(event) => setTherapistFilter(event.target.value)}
              >
                <option value="all">{calendar.filters.allTherapists}</option>
                {therapists.map((therapist) => (
                  <option key={therapist.id} value={therapist.id}>
                    {therapist.displayName}
                  </option>
                ))}
              </Select>
            ) : null}
          </div>
        </div>

        {dataError ? (
          <p className="mt-5 rounded-2xl border border-accent/25 bg-accent/10 px-4 py-3 text-sm leading-6 text-foreground">
            {calendar.dataError}
          </p>
        ) : null}

        {message ? <p className="mt-5 rounded-2xl border border-primary/15 bg-secondary/60 px-4 py-3 text-sm font-semibold text-primary">{message}</p> : null}

        {role === "admin" ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {statusCounts.map(({ status, count }) => (
              <div key={status} className={cn("rounded-2xl border px-4 py-3", statusStyles[status])}>
                <p className="text-xs font-semibold uppercase tracking-[0.14em]">{dictionary.booking.statuses[status]}</p>
                <p className="mt-2 text-3xl font-semibold leading-none">{count}</p>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="rounded-3xl border border-border/70 bg-card/78 p-4 shadow-soft sm:p-5">
        <div className="flex flex-col gap-3 border-b border-border/70 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {calendar.currentRange}
            </p>
            <h2 className="mt-1 text-xl font-semibold text-primary">
              {view === "month"
                ? formatDate(selectedDate, locale, { month: "long", year: "numeric" })
                : view === "week"
                  ? `${formatDate(visibleDays[0], locale, { day: "numeric", month: "short" })} - ${formatDate(
                      visibleDays[visibleDays.length - 1],
                      locale,
                      { day: "numeric", month: "short" }
                    )}`
                  : formatDate(selectedDate, locale, { weekday: "long", day: "numeric", month: "long" })}
            </h2>
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => shiftDate(-1)}>
              {calendar.controls.previous}
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setSelectedDate(todayKey())}>
              {calendar.controls.today}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => shiftDate(1)}>
              {calendar.controls.next}
            </Button>
          </div>
        </div>

        <div
          className={cn(
            "mt-4 grid gap-3",
            view === "day" ? "grid-cols-1" : "grid-cols-1 md:grid-cols-7",
            view === "month" && "md:auto-rows-[8.5rem]",
            view === "week" && "md:auto-rows-[12rem]"
          )}
        >
          {visibleDays.map((day) => {
            const dayBookings = visibleBookings.filter((booking) => booking.preferredDate === day);
            const isCompactView = view !== "day";

            return (
              <article
                key={day}
                role={isCompactView ? "button" : undefined}
                tabIndex={isCompactView ? 0 : undefined}
                onClick={isCompactView ? () => openDay(day) : undefined}
                onKeyDown={
                  isCompactView
                    ? (event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openDay(day);
                        }
                      }
                    : undefined
                }
                className={cn(
                  "rounded-2xl border border-border/70 bg-background/45 p-3",
                  view === "day" && "min-h-64",
                  view === "week" && "focus-ring min-h-40 cursor-pointer overflow-hidden transition hover:border-primary/25 hover:bg-background/70",
                  view === "month" && "focus-ring min-h-32 cursor-pointer overflow-hidden transition hover:border-primary/25 hover:bg-background/70"
                )}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-sm font-semibold text-primary">
                    {view === "day"
                      ? formatDate(day, locale, { weekday: "long", day: "numeric" })
                      : `${formatCompactWeekday(day, locale)} ${formatDate(day, locale, { day: "numeric" })}`}
                  </h3>
                  <span className="text-xs text-muted-foreground">{dayBookings.length}</span>
                </div>

                <div className={cn("mt-3 space-y-2", isCompactView && "max-h-[calc(100%-2rem)] overflow-hidden")}>
                  {dayBookings.length > 0 ? (
                    <>
                      {dayBookings.slice(0, isCompactView ? 4 : dayBookings.length).map((booking) => {
                        const serviceMeta = getBookingServiceMeta(booking);

                        return isCompactView ? (
                          <div
                            key={booking.id}
                            title={[booking.preferredTime, serviceMeta.serviceName, serviceMeta.compactText].filter(Boolean).join(" - ")}
                            className={cn(
                              "w-full truncate rounded-lg border px-2 py-1 text-left text-xs font-semibold leading-5",
                              statusStyles[booking.status]
                            )}
                          >
                            <span className="mr-1 uppercase tracking-[0.08em]">
                              {calendar.statusShort[booking.status]}
                            </span>
                            <span className="mr-1 tabular-nums">{booking.preferredTime}</span>
                            <span>{serviceMeta.serviceName}</span>
                          </div>
                        ) : (
                          <button
                            key={booking.id}
                            type="button"
                            onClick={() => openBooking(booking)}
                            className={cn(
                              "focus-ring w-full rounded-xl border p-3 text-left text-sm transition hover:-translate-y-0.5 hover:shadow-sm",
                              statusStyles[booking.status]
                            )}
                          >
                            <span className="block text-xs font-semibold uppercase tracking-[0.12em]">
                              {booking.preferredTime}
                            </span>
                            <span className="mt-1 block font-semibold text-foreground">{booking.clientName}</span>
                            <span className="mt-1 block text-sm text-foreground/85">{serviceMeta.serviceName}</span>
                            {serviceMeta.compactText ? (
                              <span className="mt-1 block text-xs font-semibold text-primary/80">
                                {serviceMeta.compactText}
                              </span>
                            ) : null}
                            <span className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                              <span>
                                {calendar.details.status}: {dictionary.booking.statuses[booking.status]}
                              </span>
                              {role === "admin" ? (
                                <span>{therapistNames.get(booking.therapistId ?? "") ?? booking.specialist}</span>
                              ) : null}
                            </span>
                          </button>
                        );
                      })}
                      {isCompactView && dayBookings.length > 4 ? (
                        <p className="px-2 text-xs font-semibold text-muted-foreground">
                          +{dayBookings.length - 4}
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <p
                      className={cn(
                        "rounded-xl border border-dashed border-border/80 text-sm leading-6 text-muted-foreground",
                        isCompactView ? "px-2 py-2 text-xs" : "px-3 py-5"
                      )}
                    >
                      {isCompactView ? calendar.emptyCompact : calendar.emptyDay}
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {isCreateOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end bg-primary/25 px-3 py-3 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) {
              closeCreateBooking();
            }
          }}
        >
          <section
            ref={dialogRef}
            aria-modal="true"
            aria-labelledby="manual-booking-title"
            role="dialog"
            tabIndex={-1}
            onKeyDown={handleDialogKeyDown}
            className="max-h-[92vh] w-full overflow-y-auto rounded-3xl border border-border/80 bg-card p-5 shadow-[0_30px_90px_rgb(20_61_42/0.24)] sm:max-w-3xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                  {calendar.create.eyebrow}
                </p>
                <h2 id="manual-booking-title" className="mt-2 font-serif text-3xl font-semibold leading-tight text-primary">
                  {calendar.create.title}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{calendar.create.subtitle}</p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={closeCreateBooking}>
                {calendar.details.close}
              </Button>
            </div>

            <form className="mt-6 space-y-5" onSubmit={submitManualBooking}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="manual-service" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {calendar.create.fields.service}
                  </label>
                  <Select
                    id="manual-service"
                    value={manualBookingForm.service}
                    onChange={(event) => updateManualBookingService(event.target.value)}
                    aria-invalid={Boolean(manualBookingErrors.service)}
                    disabled={serviceCatalogError || manualServiceCatalog.length === 0}
                  >
                    <option value="">{calendar.create.placeholders.service}</option>
                    {manualServiceCatalog.map((service) => (
                      <option key={service.slug} value={service.slug}>
                        {getServiceOptionLabel(service)}
                      </option>
                    ))}
                  </Select>
                  {serviceCatalogError ? (
                    <p className="text-sm leading-5 text-accent">{calendar.create.servicesLoadError}</p>
                  ) : manualServiceCatalog.length === 0 ? (
                    <p className="text-sm leading-5 text-muted-foreground">{calendar.create.noServicesAvailable}</p>
                  ) : null}
                  <ManualFieldError message={manualBookingErrors.service} />
                </div>

                <div className="space-y-2">
                  <label htmlFor="manual-date" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {calendar.create.fields.date}
                  </label>
                  <BookingDatePicker
                    id="manual-date"
                    copy={dictionary.booking.calendar}
                    errorId={manualBookingErrors.preferredDate ? "manual-date-error" : undefined}
                    invalid={Boolean(manualBookingErrors.preferredDate)}
                    isDateSelectable={(value) => isBookingDateSelectable(value, manualMinDate)}
                    locale={locale}
                    minDate={manualMinDate}
                    value={manualBookingForm.preferredDate}
                    onChange={updateManualBookingDate}
                  />
                  <ManualFieldError id="manual-date-error" message={manualBookingErrors.preferredDate} />
                </div>

                <div className="space-y-2">
                  <label htmlFor="manual-time" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {calendar.create.fields.time}
                  </label>
                  <Select
                    id="manual-time"
                    disabled={!manualCanLoadAvailability || isManualAvailabilityLoading || manualAvailableTimeSlots.length === 0}
                    value={manualBookingForm.preferredTime}
                    onChange={(event) => updateManualBookingField("preferredTime", event.target.value)}
                    aria-invalid={Boolean(manualBookingErrors.preferredTime)}
                    aria-describedby={manualBookingErrors.preferredTime ? "manual-time-error" : undefined}
                  >
                    <option value="">
                      {isManualAvailabilityLoading
                        ? dictionary.booking.availability.loadingTimes
                        : manualCanLoadAvailability && manualAvailableTimeSlots.length === 0
                          ? dictionary.booking.availability.noAvailableTimes
                          : dictionary.booking.fields.time.placeholder}
                    </option>
                    {manualAvailableTimeSlots.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </Select>
                  <ManualFieldError id="manual-time-error" message={manualBookingErrors.preferredTime} />
                </div>

                <div className="space-y-2">
                  <label htmlFor="manual-locale" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {calendar.create.fields.locale}
                  </label>
                  <Select
                    id="manual-locale"
                    value={manualBookingForm.locale}
                    onChange={(event) => updateManualBookingField("locale", event.target.value as Locale)}
                  >
                    <option value="sr">SR</option>
                    <option value="ru">RU</option>
                    <option value="en">EN</option>
                  </Select>
                  <ManualFieldError />
                </div>
              </div>

              {selectedManualService ? (
                <div className="rounded-2xl border border-primary/12 bg-secondary/45 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">
                    {calendar.create.serviceSummary.title}
                  </p>
                  <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      [calendar.create.serviceSummary.service, selectedManualService.name],
                      [calendar.create.serviceSummary.duration, formatServiceDuration(selectedManualService.durationMinutes, locale)],
                      [
                        calendar.create.serviceSummary.price,
                        formatServicePrice(selectedManualService.priceRsd) || calendar.details.priceNotSet
                      ],
                      [calendar.create.serviceSummary.category, dictionary.services.categories[selectedManualService.category]]
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                          {label}
                        </dt>
                        <dd className="mt-1 text-sm font-semibold text-foreground">{value}</dd>
                      </div>
                    ))}
                  </dl>
                  {selectedManualServiceTherapists.length > 0 ? (
                    <p className="mt-3 text-xs leading-5 text-muted-foreground">
                      <span className="font-semibold text-primary">{calendar.create.serviceSummary.therapists}: </span>
                      {selectedManualServiceTherapists.join(", ")}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="rounded-3xl border border-border/70 bg-background/45 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">
                      {calendar.create.clientSection.title}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {calendar.create.clientSection.subtitle}
                    </p>
                  </div>
                  <div className="grid w-full grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-1 rounded-full border border-border/70 bg-card/80 p-1 sm:w-auto sm:min-w-[19rem]">
                    {(["existing", "new"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => updateManualClientMode(mode)}
                        className={cn(
                          "focus-ring min-w-0 rounded-full px-3 py-2 text-center text-[0.68rem] font-semibold uppercase leading-4 tracking-[0.08em] transition sm:px-4 sm:text-xs sm:tracking-[0.12em]",
                          manualBookingForm.clientMode === mode
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:bg-secondary/70 hover:text-primary"
                        )}
                      >
                        <span className="block min-w-0 truncate">
                          {mode === "existing" ? calendar.create.clientSection.existing : calendar.create.clientSection.new}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {manualBookingForm.clientMode === "existing" ? (
                  <div className="mt-4 space-y-3">
                    <div className="space-y-2">
                      <label htmlFor="manual-client-search" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        {calendar.create.fields.clientSearch}
                      </label>
                      <Input
                        id="manual-client-search"
                        value={manualBookingForm.clientSearch}
                        onChange={(event) => {
                          updateManualBookingField("clientSearch", event.target.value);
                          updateManualBookingField("selectedClientId", "");
                        }}
                        placeholder={calendar.create.placeholders.clientSearch}
                        aria-invalid={Boolean(manualBookingErrors.selectedClientId)}
                      />
                      <ManualFieldError message={manualBookingErrors.selectedClientId} />
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      {filteredManualClients.length > 0 ? (
                        filteredManualClients.map((client) => {
                          const selected = manualBookingForm.selectedClientId === client.id;

                          return (
                            <button
                              key={client.id}
                              type="button"
                              onClick={() => selectManualClient(client)}
                              className={cn(
                                "focus-ring rounded-2xl border p-3 text-left transition",
                                selected
                                  ? "border-primary/35 bg-secondary/70 shadow-sm"
                                  : "border-border/70 bg-card/60 hover:border-primary/25 hover:bg-secondary/45"
                              )}
                            >
                              <span className="block text-sm font-semibold text-primary">{client.name}</span>
                              <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                                {getManualClientContactLabel(client)}
                              </span>
                              {client.locale ? (
                                <span className="mt-2 inline-flex rounded-full bg-background/70 px-2 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                  {client.locale}
                                </span>
                              ) : null}
                            </button>
                          );
                        })
                      ) : (
                        <p className="rounded-2xl border border-dashed border-border/80 px-3 py-4 text-sm leading-6 text-muted-foreground sm:col-span-2">
                          {calendar.create.clientSection.empty}
                        </p>
                      )}
                    </div>
                  </div>
                ) : null}

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="manual-client-name" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {calendar.create.fields.clientName}
                    </label>
                    <Input
                      id="manual-client-name"
                      value={manualBookingForm.clientName}
                      onChange={(event) => updateManualBookingField("clientName", event.target.value)}
                      placeholder={calendar.create.placeholders.clientName}
                      aria-invalid={Boolean(manualBookingErrors.clientName)}
                    />
                    <ManualFieldError message={manualBookingErrors.clientName} />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="manual-source-channel" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {calendar.create.fields.sourceChannel}
                    </label>
                    <Select
                      id="manual-source-channel"
                      value={manualBookingForm.sourceChannel}
                      onChange={(event) => updateManualSourceChannel(event.target.value as ManualBookingSourceChannel)}
                      aria-invalid={Boolean(manualBookingErrors.sourceChannel)}
                    >
                      {manualBookingSourceChannels.map((channel) => (
                        <option key={channel} value={channel}>
                          {calendar.create.sourceChannels[channel]}
                        </option>
                      ))}
                    </Select>
                    <ManualFieldError message={manualBookingErrors.sourceChannel} />
                  </div>

                  {manualBookingForm.sourceChannel !== "walk_in" ? (
                    <div className="space-y-2">
                      <label htmlFor="manual-client-contact-value" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        {calendar.create.fields.clientContactValue}
                      </label>
                      <Input
                        id="manual-client-contact-value"
                        value={manualBookingForm.clientContactValue}
                        onChange={(event) => {
                          const value = event.target.value;
                          updateManualBookingField("clientContactValue", value);
                          if (
                            manualBookingForm.sourceChannel === "phone" ||
                            manualBookingForm.sourceChannel === "whatsapp" ||
                            manualBookingForm.sourceChannel === "viber"
                          ) {
                            updateManualBookingField("clientPhone", value);
                          }
                        }}
                        placeholder={getContactPlaceholder(manualBookingForm.sourceChannel)}
                        aria-invalid={Boolean(manualBookingErrors.clientContactValue)}
                      />
                      <ManualFieldError message={manualBookingErrors.clientContactValue} />
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-border/70 bg-card/55 p-3 text-sm leading-6 text-muted-foreground">
                      {calendar.create.clientSection.walkIn}
                    </div>
                  )}

                  {manualBookingForm.sourceChannel !== "phone" &&
                  manualBookingForm.sourceChannel !== "whatsapp" &&
                  manualBookingForm.sourceChannel !== "viber" ? (
                    <div className="space-y-2">
                      <label htmlFor="manual-client-phone" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        {calendar.create.fields.clientPhoneOptional}
                      </label>
                      <Input
                        id="manual-client-phone"
                        value={manualBookingForm.clientPhone}
                        onChange={(event) => updateManualBookingField("clientPhone", event.target.value)}
                        placeholder={calendar.create.placeholders.clientPhone}
                      />
                      <ManualFieldError />
                    </div>
                  ) : null}

                  {manualBookingForm.clientMode === "new" ? (
                    <div className="space-y-2 sm:col-span-2">
                      <label htmlFor="manual-client-notes" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        {calendar.create.fields.clientNotes}
                      </label>
                      <Textarea
                        id="manual-client-notes"
                        value={manualBookingForm.clientNotes}
                        onChange={(event) => updateManualBookingField("clientNotes", event.target.value)}
                        placeholder={calendar.create.placeholders.clientNotes}
                      />
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {role === "admin" ? (
                  <>
                    <div className="space-y-2">
                      <label htmlFor="manual-therapist" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        {calendar.create.fields.therapist}
                      </label>
                      <Select
                        id="manual-therapist"
                        value={manualBookingForm.therapistId}
                        onChange={(event) => updateManualBookingField("therapistId", event.target.value)}
                        aria-invalid={Boolean(manualBookingErrors.therapistId)}
                        disabled={!manualBookingForm.service || manualAvailableTherapists.length === 0}
                      >
                        <option value="">
                          {!manualBookingForm.service
                            ? calendar.create.placeholders.therapistForService
                            : manualAvailableTherapists.length === 0
                              ? calendar.create.placeholders.noTherapistsForService
                              : calendar.create.placeholders.therapist}
                        </option>
                        {manualAvailableTherapists.map((therapist) => (
                          <option key={therapist.id} value={therapist.id}>
                            {therapist.displayName}
                          </option>
                        ))}
                      </Select>
                      <ManualFieldError message={manualBookingErrors.therapistId} />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="manual-status" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        {calendar.create.fields.status}
                      </label>
                      <Select
                        id="manual-status"
                        value={manualBookingForm.status}
                        onChange={(event) => updateManualBookingField("status", event.target.value as CreateBookingStatus)}
                      >
                        {manualBookingCreateStatuses.map((status) => (
                          <option key={status} value={status}>
                            {dictionary.booking.statuses[status]}
                          </option>
                        ))}
                      </Select>
                      <ManualFieldError />
                    </div>
                  </>
                ) : (
                  <div className="rounded-2xl border border-border/70 bg-background/50 p-3 sm:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {calendar.create.fields.therapist}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-primary">
                      {therapistNames.get(manualBookingForm.therapistId) ?? calendar.create.ownTherapistFallback}
                    </p>
                    {manualServiceCatalog.length > 0 ? (
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{calendar.create.servicesAvailableToTherapist}</p>
                    ) : null}
                    <ManualFieldError message={manualBookingErrors.therapistId} />
                  </div>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="manual-client-comment" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {calendar.create.fields.clientComment}
                  </label>
                  <Textarea
                    id="manual-client-comment"
                    value={manualBookingForm.clientComment}
                    onChange={(event) => updateManualBookingField("clientComment", event.target.value)}
                    placeholder={calendar.create.placeholders.clientComment}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="manual-internal-notes" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {calendar.create.fields.internalNotes}
                  </label>
                  <Textarea
                    id="manual-internal-notes"
                    value={manualBookingForm.internalNotes}
                    onChange={(event) => updateManualBookingField("internalNotes", event.target.value)}
                    placeholder={calendar.create.placeholders.internalNotes}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 border-t border-border/70 pt-5 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={closeCreateBooking}>
                  {calendar.create.cancel}
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? calendar.create.saving : calendar.create.submit}
                </Button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {selectedBooking ? (
        <div
          className="fixed inset-0 z-50 flex items-end bg-primary/25 px-3 py-3 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) {
              closeBooking();
            }
          }}
        >
          <section
            ref={dialogRef}
            aria-modal="true"
            aria-labelledby="booking-details-title"
            role="dialog"
            tabIndex={-1}
            onKeyDown={handleDialogKeyDown}
            className="max-h-[92vh] w-full overflow-y-auto rounded-3xl border border-border/80 bg-card p-5 shadow-[0_30px_90px_rgb(20_61_42/0.24)] sm:max-w-2xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                  {dictionary.booking.statuses[selectedBooking.status]}
                </p>
                <h2 id="booking-details-title" className="mt-2 font-serif text-3xl font-semibold leading-tight text-primary">
                  {selectedBooking.clientName}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedBooking.preferredTime} · {formatDate(selectedBooking.preferredDate, locale, {
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                  })}
                </p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={closeBooking}>
                {calendar.details.close}
              </Button>
            </div>

            <dl className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                [calendar.details.client, selectedBooking.clientName],
                [calendar.details.phone, selectedBooking.clientPhone],
                [calendar.details.service, selectedBookingServiceMeta?.serviceName ?? selectedBooking.service],
                [
                  calendar.details.duration,
                  selectedBookingServiceMeta?.durationText || calendar.details.durationNotSet
                ],
                [calendar.details.price, selectedBookingServiceMeta?.priceText || calendar.details.priceNotSet],
                ...(selectedBooking.sourceChannel
                  ? [[calendar.details.sourceChannel, calendar.create.sourceChannels[selectedBooking.sourceChannel]]]
                  : []),
                [calendar.details.locale, selectedBooking.locale.toUpperCase()],
                [calendar.details.therapist, therapistNames.get(selectedBooking.therapistId ?? "") ?? selectedBooking.specialist],
                [calendar.details.status, dictionary.booking.statuses[selectedBooking.status]]
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-border/70 bg-background/50 p-3">
                  <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</dt>
                  <dd className="mt-1 text-sm font-semibold text-foreground">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-5 space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {calendar.details.comment}
                </p>
                <p className="mt-2 rounded-2xl border border-border/70 bg-background/50 p-3 text-sm leading-6 text-foreground">
                  {selectedBooking.clientComment || calendar.details.noComment}
                </p>
              </div>

              {role === "admin" ? (
                <div className="space-y-2">
                  <label htmlFor="booking-therapist" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {calendar.details.assignedTherapist}
                  </label>
                  <Select
                    id="booking-therapist"
                    value={assignedTherapistId ?? ""}
                    onChange={(event) => setAssignedTherapistId(event.target.value || null)}
                  >
                    <option value="">{calendar.filters.unassignedTherapist}</option>
                    {assignmentAvailableTherapists.map((therapist) => (
                      <option key={therapist.id} value={therapist.id}>
                        {therapist.displayName}
                      </option>
                    ))}
                  </Select>
                  <Button type="button" variant="outline" size="sm" onClick={runTherapistAssignment} disabled={isPending}>
                    {calendar.actions.assignTherapist}
                  </Button>
                </div>
              ) : null}

              <div className="space-y-2">
                <label htmlFor="booking-notes" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {calendar.details.internalNotes}
                </label>
                <Textarea id="booking-notes" value={internalNotes} onChange={(event) => setInternalNotes(event.target.value)} />
                <Button type="button" variant="outline" size="sm" onClick={runNotesUpdate} disabled={isPending}>
                  {calendar.actions.saveNotes}
                </Button>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2 border-t border-border/70 pt-5">
              {role === "admin" ? (
                <>
                  <Button type="button" variant="outline" size="sm" onClick={() => runStatusUpdate("pending")} disabled={isPending}>
                    {calendar.actions.pending}
                  </Button>
                  <Button type="button" size="sm" onClick={() => runStatusUpdate("confirmed")} disabled={isPending}>
                    {calendar.actions.confirm}
                  </Button>
                  <Button type="button" variant="secondary" size="sm" onClick={() => runStatusUpdate("completed")} disabled={isPending}>
                    {calendar.actions.complete}
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => runStatusUpdate("cancelled")} disabled={isPending}>
                    {calendar.actions.cancel}
                  </Button>
                </>
              ) : (
                <>
                  <Button type="button" size="sm" onClick={() => runStatusUpdate("confirmed")} disabled={isPending}>
                    {calendar.actions.confirm}
                  </Button>
                  <Button type="button" variant="secondary" size="sm" onClick={() => runStatusUpdate("completed")} disabled={isPending}>
                    {calendar.actions.markCompleted}
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => runStatusUpdate("cancelled")} disabled={isPending}>
                    {calendar.actions.cancel}
                  </Button>
                </>
              )}
            </div>

            {message ? <p className="mt-4 text-sm font-semibold text-primary">{message}</p> : null}
            {isPending ? <p className="mt-2 text-sm text-muted-foreground">{calendar.actions.saving}</p> : null}
          </section>
        </div>
      ) : null}
    </section>
  );
}
