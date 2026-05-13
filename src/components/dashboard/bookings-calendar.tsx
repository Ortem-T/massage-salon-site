"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { type Locale } from "@/i18n/config";
import { type Dictionary } from "@/i18n/dictionaries";
import { type BookingStatus, bookingStatuses } from "@/lib/booking/booking-schema";
import {
  assignTherapistToBookingAction,
  type DashboardActionResult,
  updateBookingInternalNotesAction,
  updateBookingStatusAction
} from "@/lib/dashboard/actions";
import { type DashboardRole } from "@/lib/dashboard/auth";
import { type DashboardBooking, type DashboardTherapist } from "@/lib/dashboard/bookings";
import { cn } from "@/lib/utils";

type CalendarView = "day" | "week" | "month";
type StatusFilter = BookingStatus | "all";

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

function todayKey() {
  return toDateKey(new Date());
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseDateKey(value: string) {
  return new Date(`${value}T00:00:00`);
}

function addDays(value: string, amount: number) {
  const date = parseDateKey(value);
  date.setDate(date.getDate() + amount);
  return toDateKey(date);
}

function addMonths(value: string, amount: number) {
  const date = parseDateKey(value);
  date.setMonth(date.getMonth() + amount);
  return toDateKey(date);
}

function startOfWeek(value: string) {
  const date = parseDateKey(value);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return toDateKey(date);
}

function getWeekDays(value: string) {
  const start = startOfWeek(value);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

function getMonthDays(value: string) {
  const date = parseDateKey(value);
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0);
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
  return new Intl.DateTimeFormat(locale, options).format(parseDateKey(value));
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
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const therapistNames = useMemo(
    () => new Map(therapists.map((therapist) => [therapist.id, therapist.displayName])),
    [therapists]
  );
  const serviceLabels = useMemo(
    () => new Map(dictionary.services.items.map((service) => [service.id, service.title])),
    [dictionary.services.items]
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
    setSelectedBookingId(booking.id);
    setInternalNotes(booking.internalNotes ?? "");
    setAssignedTherapistId(booking.therapistId);
    setMessage(null);
  }

  function closeBooking() {
    setSelectedBookingId(null);
    setMessage(null);
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
    if (status === "cancelled" && !window.confirm(calendar.actions.confirmCancel)) {
      return;
    }

    runAction(() =>
      updateBookingStatusAction(locale, {
        bookingId: selectedBooking?.id ?? "",
        status
      })
    );
  }

  function runNotesUpdate() {
    runAction(() =>
      updateBookingInternalNotesAction(locale, {
        bookingId: selectedBooking?.id ?? "",
        internalNotes
      })
    );
  }

  function runTherapistAssignment() {
    runAction(() =>
      assignTherapistToBookingAction(locale, {
        bookingId: selectedBooking?.id ?? "",
        therapistId: assignedTherapistId
      })
    );
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

          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[34rem]">
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
                  view === "week" && "min-h-40 cursor-pointer overflow-hidden transition hover:border-primary/25 hover:bg-background/70",
                  view === "month" && "min-h-32 cursor-pointer overflow-hidden transition hover:border-primary/25 hover:bg-background/70"
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

      {selectedBooking ? (
        <div className="fixed inset-0 z-50 flex items-end bg-primary/25 px-3 py-3 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6">
          <section
            aria-modal="true"
            role="dialog"
            aria-label={calendar.details.title}
            className="max-h-[92vh] w-full overflow-y-auto rounded-3xl border border-border/80 bg-card p-5 shadow-[0_30px_90px_rgb(20_61_42/0.24)] sm:max-w-2xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                  {dictionary.booking.statuses[selectedBooking.status]}
                </p>
                <h2 className="mt-2 font-serif text-3xl font-semibold leading-tight text-primary">
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
