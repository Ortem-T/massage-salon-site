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
import { getAvailableTimeSlots, getTodayValue, isBookingDateSelectable } from "@/lib/booking/booking-availability";
import { type BookingStatus, bookingStatuses } from "@/lib/booking/booking-schema";
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
import { cn } from "@/lib/utils";

type CalendarView = "day" | "week" | "month";
type StatusFilter = BookingStatus | "all";
type CreateBookingStatus = (typeof manualBookingCreateStatuses)[number];

type ManualBookingFormState = {
  service: string;
  preferredDate: string;
  preferredTime: string;
  durationMinutes: string;
  clientName: string;
  clientPhone: string;
  clientComment: string;
  internalNotes: string;
  locale: Locale;
  therapistId: string;
  status: CreateBookingStatus;
  sourceChannel: ManualBookingSourceChannel;
};

type ManualBookingFormErrors = Partial<Record<keyof ManualBookingFormState, string>>;

type BookingsCalendarProps = {
  bookings: DashboardBooking[];
  dataError: boolean;
  dictionary: Dictionary;
  locale: Locale;
  role: DashboardRole;
  therapists: DashboardTherapist[];
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

function parseDurationMinutes(duration: string) {
  const match = duration.match(/\d+/);

  return match?.[0] ?? "";
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
  dataError,
  dictionary,
  locale,
  role,
  therapists
}: BookingsCalendarProps) {
  const router = useRouter();
  const calendar = dictionary.dashboard.calendar;
  const [view, setView] = useState<CalendarView>("day");
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [therapistFilter, setTherapistFilter] = useState("all");
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [internalNotes, setInternalNotes] = useState("");
  const [assignedTherapistId, setAssignedTherapistId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const manualMinDate = useMemo(() => getTodayValue(), []);
  const [manualBookingForm, setManualBookingForm] = useState<ManualBookingFormState>(() => ({
    service: "",
    preferredDate: todayKey(),
    preferredTime: "",
    durationMinutes: "",
    clientName: "",
    clientPhone: "",
    clientComment: "",
    internalNotes: "",
    locale,
    therapistId: "",
    status: "confirmed",
    sourceChannel: "phone"
  }));
  const [manualBookingErrors, setManualBookingErrors] = useState<ManualBookingFormErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const dialogRef = useRef<HTMLElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const therapistNames = useMemo(
    () => new Map(therapists.map((therapist) => [therapist.id, therapist.displayName])),
    [therapists]
  );
  const serviceLabels = useMemo(
    () => new Map(dictionary.services.items.map((service) => [service.id, service.title])),
    [dictionary.services.items]
  );
  const serviceDurations = useMemo(
    () => new Map(dictionary.services.items.map((service) => [service.id, parseDurationMinutes(service.duration)])),
    [dictionary.services.items]
  );
  const manualAvailableTimeSlots = useMemo(
    () => getAvailableTimeSlots(manualBookingForm.preferredDate),
    [manualBookingForm.preferredDate]
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
  const visibleDays = view === "day" ? [selectedDate] : view === "week" ? getWeekDays(selectedDate) : getMonthDays(selectedDate);
  const visibleBookings = filteredBookings.filter((booking) => visibleDays.includes(booking.preferredDate));

  const statusCounts = bookingStatuses.map((status) => ({
    status,
    count: bookings.filter((booking) => booking.status === status).length
  }));

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
    if (
      manualBookingForm.preferredTime &&
      !manualAvailableTimeSlots.includes(manualBookingForm.preferredTime as (typeof manualAvailableTimeSlots)[number])
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
    const ownTherapistId = role === "therapist" ? (therapists[0]?.id ?? "") : "";
    const defaultDate = isBookingDateSelectable(selectedDate, manualMinDate) ? selectedDate : "";

    setSelectedBookingId(null);
    setManualBookingForm({
      service: "",
      preferredDate: defaultDate,
      preferredTime: "",
      durationMinutes: "",
      clientName: "",
      clientPhone: "",
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

  function updateManualBookingService(service: string) {
    setManualBookingForm((current) => ({
      ...current,
      service,
      durationMinutes: serviceDurations.get(service) ?? current.durationMinutes
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

    if (manualBookingForm.durationMinutes && Number(manualBookingForm.durationMinutes) <= 0) {
      errors.durationMinutes = create.errors.duration;
    }

    if (manualBookingForm.clientName.trim().length < 2) {
      errors.clientName = create.errors.clientName;
    }

    if (manualBookingForm.clientPhone.trim().length < 6) {
      errors.clientPhone = create.errors.clientPhone;
    }

    if (!manualBookingForm.sourceChannel) {
      errors.sourceChannel = create.errors.sourceChannel;
    }

    if (role === "therapist" && !manualBookingForm.therapistId) {
      errors.therapistId = create.errors.therapist;
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

    setMessage(result.reason === "forbidden" ? calendar.actions.forbidden : calendar.actions.error);
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
      const durationMinutes = manualBookingForm.durationMinutes ? Number(manualBookingForm.durationMinutes) : null;
      const result = await createManualBookingAction(locale, {
        service: manualBookingForm.service,
        preferredDate: manualBookingForm.preferredDate,
        preferredTime: manualBookingForm.preferredTime,
        durationMinutes,
        clientName: manualBookingForm.clientName,
        clientPhone: manualBookingForm.clientPhone,
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

      setMessage(result.reason === "forbidden" ? calendar.actions.forbidden : calendar.create.error);
    });
  }

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-border/70 bg-card/82 p-5 shadow-soft sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">{calendar.eyebrow}</p>
            <h1 className="mt-3 font-serif text-4xl font-semibold leading-tight text-primary sm:text-5xl">
              {calendar.title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{calendar.subtitle}</p>
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
                      {dayBookings.slice(0, isCompactView ? 4 : dayBookings.length).map((booking) =>
                        isCompactView ? (
                          <div
                            key={booking.id}
                            className={cn(
                              "w-full truncate rounded-lg border px-2 py-1 text-left text-xs font-semibold leading-5",
                              statusStyles[booking.status]
                            )}
                          >
                            <span className="mr-1 uppercase tracking-[0.08em]">
                              {calendar.statusShort[booking.status]}
                            </span>
                            <span className="mr-1 tabular-nums">{booking.preferredTime}</span>
                            <span>{serviceLabels.get(booking.service) ?? booking.service}</span>
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
                            <span className="mt-1 block font-semibold text-foreground">
                              {serviceLabels.get(booking.service) ?? booking.service}
                            </span>
                            <span className="mt-1 block text-xs text-muted-foreground">{booking.clientName}</span>
                            <span className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                              <span>{dictionary.booking.statuses[booking.status]}</span>
                              {role === "admin" ? (
                                <span>{therapistNames.get(booking.therapistId ?? "") ?? booking.specialist}</span>
                              ) : null}
                            </span>
                          </button>
                        )
                      )}
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
        <div className="fixed inset-0 z-50 flex items-end bg-primary/25 px-3 py-3 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6">
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
                  >
                    <option value="">{calendar.create.placeholders.service}</option>
                    {dictionary.services.items.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.title}
                      </option>
                    ))}
                  </Select>
                  {manualBookingErrors.service ? <p className="text-sm text-accent">{manualBookingErrors.service}</p> : null}
                </div>

                <div className="space-y-2">
                  <label htmlFor="manual-source-channel" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {calendar.create.fields.sourceChannel}
                  </label>
                  <Select
                    id="manual-source-channel"
                    value={manualBookingForm.sourceChannel}
                    onChange={(event) =>
                      updateManualBookingField("sourceChannel", event.target.value as ManualBookingSourceChannel)
                    }
                    aria-invalid={Boolean(manualBookingErrors.sourceChannel)}
                  >
                    {manualBookingSourceChannels.map((channel) => (
                      <option key={channel} value={channel}>
                        {calendar.create.sourceChannels[channel]}
                      </option>
                    ))}
                  </Select>
                  {manualBookingErrors.sourceChannel ? <p className="text-sm text-accent">{manualBookingErrors.sourceChannel}</p> : null}
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
                  {manualBookingErrors.preferredDate ? (
                    <p id="manual-date-error" className="text-sm text-accent">
                      {manualBookingErrors.preferredDate}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <label htmlFor="manual-time" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {calendar.create.fields.time}
                  </label>
                  <Select
                    id="manual-time"
                    disabled={!manualBookingForm.preferredDate}
                    value={manualBookingForm.preferredTime}
                    onChange={(event) => updateManualBookingField("preferredTime", event.target.value)}
                    aria-invalid={Boolean(manualBookingErrors.preferredTime)}
                    aria-describedby={manualBookingErrors.preferredTime ? "manual-time-error" : undefined}
                  >
                    <option value="">{dictionary.booking.fields.time.placeholder}</option>
                    {manualAvailableTimeSlots.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </Select>
                  {manualBookingErrors.preferredTime ? (
                    <p id="manual-time-error" className="text-sm text-accent">
                      {manualBookingErrors.preferredTime}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <label htmlFor="manual-duration" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {calendar.create.fields.duration}
                  </label>
                  <Input
                    id="manual-duration"
                    type="number"
                    min={1}
                    inputMode="numeric"
                    value={manualBookingForm.durationMinutes}
                    onChange={(event) => updateManualBookingField("durationMinutes", event.target.value)}
                    placeholder={calendar.create.placeholders.duration}
                    aria-invalid={Boolean(manualBookingErrors.durationMinutes)}
                  />
                  {manualBookingErrors.durationMinutes ? <p className="text-sm text-accent">{manualBookingErrors.durationMinutes}</p> : null}
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
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
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
                  {manualBookingErrors.clientName ? <p className="text-sm text-accent">{manualBookingErrors.clientName}</p> : null}
                </div>

                <div className="space-y-2">
                  <label htmlFor="manual-client-phone" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {calendar.create.fields.clientPhone}
                  </label>
                  <Input
                    id="manual-client-phone"
                    value={manualBookingForm.clientPhone}
                    onChange={(event) => updateManualBookingField("clientPhone", event.target.value)}
                    placeholder={calendar.create.placeholders.clientPhone}
                    aria-invalid={Boolean(manualBookingErrors.clientPhone)}
                  />
                  {manualBookingErrors.clientPhone ? <p className="text-sm text-accent">{manualBookingErrors.clientPhone}</p> : null}
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
                      >
                        <option value="">{calendar.filters.unassignedTherapist}</option>
                        {therapists.map((therapist) => (
                          <option key={therapist.id} value={therapist.id}>
                            {therapist.displayName}
                          </option>
                        ))}
                      </Select>
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
                    {manualBookingErrors.therapistId ? <p className="mt-2 text-sm text-accent">{manualBookingErrors.therapistId}</p> : null}
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
        <div className="fixed inset-0 z-50 flex items-end bg-primary/25 px-3 py-3 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6">
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
                [calendar.details.service, serviceLabels.get(selectedBooking.service) ?? selectedBooking.service],
                ...(selectedBooking.durationMinutes
                  ? [[calendar.details.duration, `${selectedBooking.durationMinutes} ${calendar.create.durationUnit}`]]
                  : []),
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
                    {therapists.map((therapist) => (
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
