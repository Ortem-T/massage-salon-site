"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { BookingDatePicker } from "@/components/booking/booking-date-picker";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { type Locale } from "@/i18n/config";
import { type Dictionary } from "@/i18n/dictionaries";
import { useDashboardRealtimeRefresh } from "@/hooks/use-dashboard-realtime-refresh";
import { getTodayValue, isBookingDateSelectable, minutesToTime, timeToMinutes } from "@/lib/booking/booking-availability";
import { defaultBookingAvailability } from "@/lib/booking/booking-options";
import {
  createScheduleBlockAction,
  deleteScheduleBlockAction,
  type DashboardActionResult,
  updateAvailableRoomsAction,
  updateScheduleBlockAction
} from "@/lib/dashboard/actions";
import { type DashboardRole } from "@/lib/dashboard/auth";
import { type DashboardTherapist } from "@/lib/dashboard/bookings";
import { type DashboardOperationSettings } from "@/lib/dashboard/settings";
import {
  type DashboardScheduleBlock
} from "@/lib/dashboard/schedule-blocks";
import { type ScheduleBlockScope, type ScheduleBlockType } from "@/lib/supabase/database.types";

type ScheduleBlocksManagerProps = {
  blocks: DashboardScheduleBlock[];
  dataError: boolean;
  dictionary: Dictionary;
  locale: Locale;
  operationSettings: DashboardOperationSettings;
  role: DashboardRole;
  therapists: DashboardTherapist[];
};

type ScheduleBlockFormState = {
  id: string | null;
  therapistId: string;
  blockType: ScheduleBlockType;
  blockScope: ScheduleBlockScope;
  date: string;
  startTime: string;
  endTime: string;
  repeatEnabled: boolean;
  recurrenceFrequency: "weekly" | "monthly";
  recurrenceEndDate: string;
  recurrenceWeekdays: number[];
  reason: string;
};

type ScheduleBlockFormErrors = Partial<Record<keyof ScheduleBlockFormState, string>>;

const dateLocales: Record<Locale, string> = {
  sr: "sr-Latn-RS",
  ru: "ru-RU",
  en: "en-GB"
};
const scheduleBlocksRealtimeTables = ["schedule_blocks"] as const;
const settingsRealtimeTables = ["app_settings"] as const;

function getTimeOptions() {
  const start = timeToMinutes(defaultBookingAvailability.firstBookingStart) ?? 600;
  const lastStart = timeToMinutes(defaultBookingAvailability.lastBookingStart) ?? 1140;
  const end = lastStart + defaultBookingAvailability.slotStepMinutes;

  return Array.from({ length: Math.floor((end - start) / 30) + 1 }, (_, index) => minutesToTime(start + index * 30));
}

function formatDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(dateLocales[locale], {
    day: "numeric",
    month: "long",
    weekday: "long",
    year: "numeric"
  }).format(new Date(`${value}T12:00:00`));
}

function addDays(value: string, amount: number) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);

  return date.toISOString().split("T")[0];
}

function getWeekdayOptions(locale: Locale) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays("2026-01-05", index);

    return {
      value: getWeekdayFromDate(date),
      label: new Intl.DateTimeFormat(dateLocales[locale], {
        weekday: "short"
      }).format(new Date(`${date}T12:00:00`)).replace(".", "")
    };
  });
}

function getWeekdayFromDate(value: string) {
  return new Date(`${value}T12:00:00Z`).getUTCDay();
}

function formatTimeRange(block: DashboardScheduleBlock) {
  if (block.blockType === "full_day") {
    return null;
  }

  return `${block.startTime?.slice(0, 5)} - ${block.endTime?.slice(0, 5)}`;
}

export function ScheduleBlocksManager({
  blocks,
  dataError,
  dictionary,
  locale,
  operationSettings,
  role,
  therapists
}: ScheduleBlocksManagerProps) {
  const router = useRouter();
  const schedule = dictionary.dashboard.schedule;
  const today = useMemo(() => getTodayValue(), []);
  const timeOptions = useMemo(() => getTimeOptions(), []);
  const weekdayOptions = useMemo(() => getWeekdayOptions(locale), [locale]);
  const ownTherapistId = role === "therapist" ? (therapists[0]?.id ?? "") : "";
  const [selectedDate, setSelectedDate] = useState(today);
  const [therapistFilter, setTherapistFilter] = useState(role === "admin" ? "all" : ownTherapistId);
  const [form, setForm] = useState<ScheduleBlockFormState>(() => ({
    id: null,
    therapistId: ownTherapistId,
    blockType: "full_day",
    blockScope: "therapist",
    date: today,
    startTime: "10:00",
    endTime: "11:00",
    repeatEnabled: false,
    recurrenceFrequency: "weekly",
    recurrenceEndDate: today,
    recurrenceWeekdays: [getWeekdayFromDate(today)],
    reason: ""
  }));
  const [errors, setErrors] = useState<ScheduleBlockFormErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [availableRooms, setAvailableRooms] = useState(operationSettings.availableRooms);
  const [isPending, startTransition] = useTransition();
  const refreshScheduleData = useCallback(() => {
    router.refresh();
  }, [router]);

  useDashboardRealtimeRefresh({
    channelName: "dashboard-schedule-blocks",
    onRefresh: refreshScheduleData,
    tables: scheduleBlocksRealtimeTables
  });

  useDashboardRealtimeRefresh({
    channelName: "dashboard-operation-settings",
    onRefresh: refreshScheduleData,
    tables: settingsRealtimeTables
  });

  useEffect(() => {
    setAvailableRooms(operationSettings.availableRooms);
  }, [operationSettings.availableRooms]);

  const therapistNames = useMemo(
    () => new Map(therapists.map((therapist) => [therapist.id, therapist.displayName])),
    [therapists]
  );
  const blocksByDate = useMemo(() => {
    const map = new Map<string, number>();

    blocks.forEach((block) => {
      map.set(block.date, (map.get(block.date) ?? 0) + 1);
    });

    return map;
  }, [blocks]);
  const visibleBlocks = useMemo(() => {
    return blocks
      .filter((block) => block.date === selectedDate)
      .filter((block) => {
        if (role !== "admin" || therapistFilter === "all") {
          return true;
        }

        if (therapistFilter === "salon") {
          return block.blockScope === "salon";
        }

        if (therapistFilter === "room_rental") {
          return block.blockScope === "room_rental";
        }

        return block.blockScope === "room_rental" || block.blockScope === "salon" || block.therapistId === therapistFilter;
      })
      .sort((a, b) => (a.startTime ?? "00:00").localeCompare(b.startTime ?? "00:00"));
  }, [blocks, role, selectedDate, therapistFilter]);

  function resetForm(nextDate = selectedDate) {
    setForm({
      id: null,
      therapistId: role === "therapist" ? ownTherapistId : "",
      blockType: "full_day",
      blockScope: "therapist",
      date: nextDate,
      startTime: "10:00",
      endTime: "11:00",
      repeatEnabled: false,
      recurrenceFrequency: "weekly",
      recurrenceEndDate: nextDate,
      recurrenceWeekdays: [getWeekdayFromDate(nextDate)],
      reason: ""
    });
    setErrors({});
  }

  function updateField<K extends keyof ScheduleBlockFormState>(field: K, value: ScheduleBlockFormState[K]) {
    setForm((current) => {
      const next = { ...current, [field]: value };

      if (field === "blockType" && value === "full_day") {
        next.startTime = "10:00";
        next.endTime = "11:00";
      }

      if (field === "blockScope" && value === "salon") {
        next.therapistId = "";
      }

      if (field === "blockScope" && value === "room_rental") {
        next.therapistId = "";
        next.reason = next.reason.trim() ? next.reason : schedule.scope.roomRental;
      }

      if (field === "blockScope" && value === "therapist" && !next.therapistId) {
        next.therapistId = role === "therapist" ? ownTherapistId : "";
      }

      if (field === "date" && typeof value === "string") {
        next.recurrenceEndDate = value;
        next.recurrenceWeekdays = [getWeekdayFromDate(value)];
      }

      return next;
    });
    setErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function selectDate(value: string) {
    setSelectedDate(value);
    updateField("date", value);
    setMessage(null);
  }

  function validateForm() {
    const nextErrors: ScheduleBlockFormErrors = {};

    if (!form.date) {
      nextErrors.date = schedule.errors.date;
    }

    if (form.blockScope === "therapist" && !form.therapistId) {
      nextErrors.therapistId = schedule.errors.therapist;
    }

    if (form.repeatEnabled && !form.id) {
      if (!form.recurrenceEndDate || form.recurrenceEndDate < form.date) {
        nextErrors.recurrenceEndDate = schedule.errors.endDateAfterStart;
      }

      if (form.recurrenceFrequency === "weekly" && form.recurrenceWeekdays.length === 0) {
        nextErrors.recurrenceWeekdays = schedule.errors.weekdayRequired;
      }
    }

    if (form.blockType === "time_range") {
      const start = timeToMinutes(form.startTime);
      const end = timeToMinutes(form.endTime);
      const firstBookingStart = timeToMinutes(defaultBookingAvailability.firstBookingStart);
      const latestBlockEnd = timeToMinutes(defaultBookingAvailability.lastBookingStart) === null
        ? null
        : (timeToMinutes(defaultBookingAvailability.lastBookingStart) ?? 0) + defaultBookingAvailability.slotStepMinutes;

      if (
        start === null ||
        end === null ||
        firstBookingStart === null ||
        latestBlockEnd === null ||
        start < firstBookingStart ||
        end > latestBlockEnd ||
        end <= start
      ) {
        nextErrors.endTime = schedule.errors.endAfterStart;
      }
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  }

  function getActionMessage(result: DashboardActionResult) {
    if (result.ok) {
      return form.id ? schedule.messages.updated : schedule.messages.created;
    }

    if (result.reason === "forbidden") {
      return schedule.errors.ownOnly;
    }

    if (result.reason === "invalid_time") {
      return schedule.errors.endAfterStart;
    }

    if (result.reason === "overlap") {
      return schedule.errors.overlap;
    }

    if (result.reason === "capacity") {
      return schedule.errors.conflictingBookings;
    }

    if (result.reason === "no_occurrences") {
      return schedule.errors.noRecurrenceDates;
    }

    return schedule.messages.error;
  }

  function updateAvailableRooms(nextAvailableRooms: number) {
    if (nextAvailableRooms === availableRooms) {
      return;
    }

    const previousAvailableRooms = availableRooms;
    setAvailableRooms(nextAvailableRooms);
    setMessage(null);

    startTransition(async () => {
      const result = await updateAvailableRoomsAction(locale, { availableRooms: nextAvailableRooms });

      if (result.ok) {
        setMessage(schedule.operationMode.messages.saved);
        refreshScheduleData();
        return;
      }

      setAvailableRooms(previousAvailableRooms);
      setMessage(result.reason === "forbidden" ? schedule.operationMode.messages.forbidden : schedule.operationMode.messages.error);
    });
  }

  function submitBlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    const payload = {
      therapistId: form.blockScope === "therapist" ? form.therapistId : null,
      blockType: form.blockType,
      blockScope: form.blockScope,
      date: form.date,
      startTime: form.blockType === "time_range" ? form.startTime : null,
      endTime: form.blockType === "time_range" ? form.endTime : null,
      roomsOccupied: form.blockScope === "room_rental" ? 1 : 0,
      recurrence: form.repeatEnabled && !form.id
        ? {
            enabled: true,
            frequency: form.recurrenceFrequency,
            weekdays: form.recurrenceWeekdays,
            endDate: form.recurrenceEndDate
          }
        : null,
      reason: form.reason
    };

    setMessage(null);
    startTransition(async () => {
      const result = form.id
        ? await updateScheduleBlockAction(locale, { ...payload, id: form.id })
        : await createScheduleBlockAction(locale, payload);

      setMessage(getActionMessage(result));

      if (result.ok) {
        resetForm(form.date);
        refreshScheduleData();
      }
    });
  }

  function editBlock(block: DashboardScheduleBlock) {
    setForm({
      id: block.id,
      therapistId: block.therapistId ?? "",
      blockType: block.blockType,
      blockScope: block.blockScope,
      date: block.date,
      startTime: block.startTime?.slice(0, 5) ?? "10:00",
      endTime: block.endTime?.slice(0, 5) ?? "11:00",
      repeatEnabled: false,
      recurrenceFrequency: "weekly",
      recurrenceEndDate: block.date,
      recurrenceWeekdays: [getWeekdayFromDate(block.date)],
      reason: block.reason ?? ""
    });
    setSelectedDate(block.date);
    setErrors({});
    setMessage(null);
  }

  function deleteBlock(block: DashboardScheduleBlock, mode: "occurrence" | "series" = "occurrence") {
    const confirmMessage = mode === "series"
      ? schedule.confirmDeleteSeries
      : block.seriesId
        ? schedule.confirmDeleteOccurrence
        : schedule.confirmDelete;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setMessage(null);
    startTransition(async () => {
      const result = await deleteScheduleBlockAction(locale, block.id, mode);
      setMessage(result.ok ? schedule.messages.deleted : getActionMessage(result));

      if (result.ok) {
        resetForm(block.date);
        refreshScheduleData();
      }
    });
  }

  function toggleRecurrenceWeekday(weekday: number) {
    setForm((current) => {
      const exists = current.recurrenceWeekdays.includes(weekday);
      const recurrenceWeekdays = exists
        ? current.recurrenceWeekdays.filter((item) => item !== weekday)
        : [...current.recurrenceWeekdays, weekday].sort((a, b) => a - b);

      return {
        ...current,
        recurrenceWeekdays
      };
    });
    setErrors((current) => {
      if (!current.recurrenceWeekdays) {
        return current;
      }

      const next = { ...current };
      delete next.recurrenceWeekdays;
      return next;
    });
  }

  function getBlockScopeLabel(block: DashboardScheduleBlock) {
    if (block.blockScope === "salon") {
      return schedule.scope.salon;
    }

    if (block.blockScope === "room_rental") {
      return schedule.scope.roomRental;
    }

    return therapistNames.get(block.therapistId ?? "") ?? schedule.placeholders.therapist;
  }

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-border/70 bg-card/82 p-4 shadow-soft sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">{schedule.eyebrow}</p>
            <h1 className="mt-2 font-serif text-3xl font-semibold leading-tight text-primary sm:text-4xl">
              {schedule.title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{schedule.subtitle}</p>
          </div>

          {role === "admin" ? (
            <Select
              aria-label={schedule.filters.therapist}
              className="xl:max-w-xs"
              value={therapistFilter}
              onChange={(event) => setTherapistFilter(event.target.value)}
            >
              <option value="all">{schedule.filters.allTherapists}</option>
              <option value="salon">{schedule.scope.salon}</option>
              <option value="room_rental">{schedule.scope.roomRental}</option>
              {therapists.map((therapist) => (
                <option key={therapist.id} value={therapist.id}>
                  {therapist.displayName}
                </option>
              ))}
            </Select>
          ) : null}
        </div>

        {dataError ? (
          <p className="mt-5 rounded-2xl border border-accent/25 bg-accent/10 px-4 py-3 text-sm leading-6 text-foreground">
            {schedule.dataError}
          </p>
        ) : null}

        {message ? <p className="mt-5 rounded-2xl border border-primary/15 bg-secondary/60 px-4 py-3 text-sm font-semibold text-primary">{message}</p> : null}
      </div>

      {role === "admin" ? (
        <div className="rounded-3xl border border-border/70 bg-card/82 p-4 shadow-soft sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                  {schedule.operationMode.eyebrow}
                </p>
                {availableRooms === 1 ? (
                  <span className="rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    {schedule.operationMode.badgeOneRoom}
                  </span>
                ) : null}
              </div>
              <h2 className="mt-2 font-serif text-2xl font-semibold leading-tight text-primary">
                {schedule.operationMode.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{schedule.operationMode.description}</p>
            </div>

            <div className="w-full lg:max-w-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {schedule.operationMode.availableRooms}
              </p>
              <div
                aria-label={schedule.operationMode.availableRooms}
                className="mt-3 grid grid-cols-2 gap-2 rounded-2xl border border-border/70 bg-background/55 p-1.5"
                role="radiogroup"
              >
                {[1, 2].map((roomCount) => {
                  const isSelected = availableRooms === roomCount;

                  return (
                    <button
                      key={roomCount}
                      type="button"
                      aria-checked={isSelected}
                      className={[
                        "focus-ring rounded-xl px-3 py-3 text-sm font-semibold transition",
                        isSelected
                          ? "bg-primary text-primary-foreground shadow-[0_12px_30px_rgb(20_61_42/0.18)]"
                          : "text-muted-foreground hover:bg-secondary/70 hover:text-primary"
                      ].join(" ")}
                      disabled={isPending}
                      role="radio"
                      onClick={() => updateAvailableRooms(roomCount)}
                    >
                      {roomCount === 1 ? schedule.operationMode.oneRoom : schedule.operationMode.twoRooms}
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                {isPending ? schedule.operationMode.saving : schedule.operationMode.hint}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="rounded-3xl border border-border/70 bg-card/78 p-4 shadow-soft sm:p-5">
          <h2 className="text-lg font-semibold text-primary">{schedule.addBlock}</h2>
          <form className="mt-5 space-y-5" onSubmit={submitBlock}>
            <div className="space-y-2">
              <label htmlFor="schedule-date" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {schedule.fields.date}
              </label>
              <BookingDatePicker
                id="schedule-date"
                copy={dictionary.booking.calendar}
                errorId={errors.date ? "schedule-date-error" : undefined}
                getDateHint={(value) => blocksByDate.has(value) ? schedule.existingBlockHint : null}
                invalid={Boolean(errors.date)}
                isDateSelectable={(value) => isBookingDateSelectable(value, today)}
                locale={locale}
                minDate={today}
                value={form.date}
                onChange={selectDate}
              />
              {errors.date ? <p id="schedule-date-error" className="text-sm text-accent">{errors.date}</p> : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="schedule-type" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {schedule.fields.blockType}
                </label>
                <Select
                  id="schedule-type"
                  value={form.blockType}
                  onChange={(event) => updateField("blockType", event.target.value as ScheduleBlockType)}
                >
                  <option value="full_day">{schedule.types.fullDay}</option>
                  <option value="time_range">{schedule.types.timeRange}</option>
                </Select>
              </div>

              {role === "admin" ? (
                <div className="space-y-2">
                  <label htmlFor="schedule-scope" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {schedule.fields.scope}
                  </label>
                  <Select
                    id="schedule-scope"
                    value={form.blockScope}
                    onChange={(event) => updateField("blockScope", event.target.value as ScheduleBlockScope)}
                  >
                    <option value="therapist">{schedule.scope.therapist}</option>
                    <option value="salon">{schedule.scope.salon}</option>
                    <option value="room_rental">{schedule.scope.roomRental}</option>
                  </Select>
                </div>
              ) : null}
            </div>

            {form.blockScope === "therapist" ? (
              <div className="space-y-2">
                <label htmlFor="schedule-therapist" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {schedule.fields.therapist}
                </label>
                {role === "admin" ? (
                  <Select
                    id="schedule-therapist"
                    value={form.therapistId}
                    onChange={(event) => updateField("therapistId", event.target.value)}
                    aria-invalid={Boolean(errors.therapistId)}
                  >
                    <option value="">{schedule.placeholders.therapist}</option>
                    {therapists.map((therapist) => (
                      <option key={therapist.id} value={therapist.id}>
                        {therapist.displayName}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <div className="rounded-xl border border-border/70 bg-background/50 px-4 py-3 text-sm font-semibold text-primary">
                    {therapistNames.get(ownTherapistId) ?? schedule.ownTherapistFallback}
                  </div>
                )}
                {errors.therapistId ? <p className="text-sm text-accent">{errors.therapistId}</p> : null}
              </div>
            ) : null}

            {form.blockType === "time_range" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="schedule-start" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {schedule.fields.startTime}
                  </label>
                  <Select
                    id="schedule-start"
                    value={form.startTime}
                    onChange={(event) => updateField("startTime", event.target.value)}
                  >
                    {timeOptions.slice(0, -1).map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="schedule-end" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {schedule.fields.endTime}
                  </label>
                  <Select
                    id="schedule-end"
                    value={form.endTime}
                    onChange={(event) => updateField("endTime", event.target.value)}
                    aria-invalid={Boolean(errors.endTime)}
                  >
                    {timeOptions.slice(1).map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </Select>
                  {errors.endTime ? <p className="text-sm text-accent">{errors.endTime}</p> : null}
                </div>
              </div>
            ) : null}

            {!form.id ? (
              <div className="rounded-2xl border border-border/70 bg-background/45 p-4">
                <label className="flex items-start gap-3 text-sm font-semibold text-primary">
                  <input
                    type="checkbox"
                    checked={form.repeatEnabled}
                    className="mt-1 size-4 rounded border-border accent-primary"
                    onChange={(event) => updateField("repeatEnabled", event.target.checked)}
                  />
                  <span>
                    <span className="block">{schedule.recurrence.repeatEvent}</span>
                    <span className="mt-1 block text-xs font-normal leading-5 text-muted-foreground">
                      {form.repeatEnabled ? schedule.recurrence.generatedOccurrences : schedule.recurrence.doesNotRepeat}
                    </span>
                  </span>
                </label>

                {form.repeatEnabled ? (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label htmlFor="schedule-recurrence-frequency" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        {schedule.recurrence.frequency}
                      </label>
                      <Select
                        id="schedule-recurrence-frequency"
                        value={form.recurrenceFrequency}
                        onChange={(event) => updateField("recurrenceFrequency", event.target.value as "weekly" | "monthly")}
                      >
                        <option value="weekly">{schedule.recurrence.weekly}</option>
                        <option value="monthly">{schedule.recurrence.monthly}</option>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="schedule-recurrence-end-date" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        {schedule.recurrence.endDate}
                      </label>
                      <BookingDatePicker
                        id="schedule-recurrence-end-date"
                        copy={dictionary.booking.calendar}
                        errorId={errors.recurrenceEndDate ? "schedule-recurrence-end-date-error" : undefined}
                        invalid={Boolean(errors.recurrenceEndDate)}
                        isDateSelectable={(value) => value >= form.date}
                        locale={locale}
                        minDate={form.date}
                        value={form.recurrenceEndDate}
                        onChange={(value) => updateField("recurrenceEndDate", value)}
                      />
                      {errors.recurrenceEndDate ? (
                        <p id="schedule-recurrence-end-date-error" className="text-sm text-accent">
                          {errors.recurrenceEndDate}
                        </p>
                      ) : null}
                    </div>

                    {form.recurrenceFrequency === "weekly" ? (
                      <div className="space-y-2 sm:col-span-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                          {schedule.recurrence.repeatOn}
                        </p>
                        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                          {weekdayOptions.map((weekday) => {
                            const selected = form.recurrenceWeekdays.includes(weekday.value);

                            return (
                              <button
                                key={weekday.value}
                                type="button"
                                aria-pressed={selected}
                                className={[
                                  "focus-ring rounded-xl border px-2 py-2 text-sm font-semibold transition",
                                  selected
                                    ? "border-primary/35 bg-primary text-primary-foreground shadow-sm"
                                    : "border-border/70 bg-card/60 text-muted-foreground hover:border-primary/25 hover:text-primary"
                                ].join(" ")}
                                onClick={() => toggleRecurrenceWeekday(weekday.value)}
                              >
                                {weekday.label}
                              </button>
                            );
                          })}
                        </div>
                        {errors.recurrenceWeekdays ? (
                          <p className="text-sm text-accent">{errors.recurrenceWeekdays}</p>
                        ) : null}
                      </div>
                    ) : (
                      <p className="rounded-2xl border border-border/70 bg-card/55 px-4 py-3 text-sm leading-6 text-muted-foreground sm:col-span-2">
                        {schedule.recurrence.monthlyHint}
                      </p>
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="space-y-2">
              <label htmlFor="schedule-reason" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {schedule.fields.reason}
              </label>
              <Textarea
                id="schedule-reason"
                value={form.reason}
                onChange={(event) => updateField("reason", event.target.value)}
                placeholder={schedule.placeholders.reason}
              />
            </div>

            <div className="flex flex-col gap-2 border-t border-border/70 pt-5 sm:flex-row sm:justify-end">
              {form.id ? (
                <Button type="button" variant="outline" onClick={() => resetForm()}>
                  {schedule.cancelEdit}
                </Button>
              ) : null}
              <Button type="submit" disabled={isPending}>
                {isPending ? schedule.saving : form.id ? schedule.editBlock : schedule.addBlock}
              </Button>
            </div>
          </form>
        </div>

        <div className="rounded-3xl border border-border/70 bg-card/78 p-4 shadow-soft sm:p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {schedule.availability}
              </p>
              <h2 className="mt-1 text-xl font-semibold text-primary">{formatDate(selectedDate, locale)}</h2>
            </div>
            <p className="text-sm text-muted-foreground">{visibleBlocks.length}</p>
          </div>

          <div className="mt-5 space-y-3">
            {visibleBlocks.length > 0 ? (
              visibleBlocks.map((block) => {
                const range = formatTimeRange(block);

                return (
                  <article key={block.id} className="rounded-2xl border border-border/70 bg-background/50 p-4">
                    <div className="space-y-4">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold leading-6 text-primary">
                          {block.blockType === "full_day" ? schedule.types.fullDay : schedule.types.timeRange}
                          {range ? ` · ${range}` : ""}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                          {getBlockScopeLabel(block)}
                          {block.seriesId ? ` · ${schedule.recurrence.recurring}` : ""}
                        </p>
                        {block.reason ? <p className="mt-3 text-sm leading-6 text-foreground">{block.reason}</p> : null}
                      </div>

                      <div className="flex flex-col gap-2 border-t border-border/60 pt-3 sm:flex-row sm:flex-wrap sm:justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full whitespace-nowrap sm:w-auto"
                          onClick={() => editBlock(block)}
                        >
                          {schedule.editBlock}
                        </Button>
                        {block.seriesId && role === "admin" ? (
                          <div className="grid w-full grid-cols-2 gap-1 rounded-full border border-border/70 bg-card/70 p-1 sm:w-auto">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              aria-label={schedule.recurrence.deleteOccurrence}
                              title={schedule.recurrence.deleteOccurrence}
                              className="min-w-0 whitespace-nowrap rounded-full px-3 text-muted-foreground hover:bg-secondary/75 hover:text-primary"
                              onClick={() => deleteBlock(block, "occurrence")}
                            >
                              {schedule.recurrence.deleteOccurrenceShort}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              aria-label={schedule.recurrence.deleteSeries}
                              title={schedule.recurrence.deleteSeries}
                              className="min-w-0 whitespace-nowrap rounded-full px-3 text-muted-foreground hover:bg-secondary/75 hover:text-primary"
                              onClick={() => deleteBlock(block, "series")}
                            >
                              {schedule.recurrence.deleteSeriesShort}
                            </Button>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="w-full whitespace-nowrap text-muted-foreground hover:bg-secondary/75 hover:text-primary sm:w-auto"
                            onClick={() => deleteBlock(block)}
                          >
                            {schedule.deleteBlock}
                          </Button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })
            ) : (
              <p className="rounded-2xl border border-dashed border-border/80 px-4 py-8 text-sm leading-6 text-muted-foreground">
                {schedule.noBlocks}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
