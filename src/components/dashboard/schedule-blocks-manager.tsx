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

        return block.therapistId === therapistFilter;
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
      reason: block.reason ?? ""
    });
    setSelectedDate(block.date);
    setErrors({});
    setMessage(null);
  }

  function deleteBlock(block: DashboardScheduleBlock) {
    if (!window.confirm(schedule.confirmDelete)) {
      return;
    }

    setMessage(null);
    startTransition(async () => {
      const result = await deleteScheduleBlockAction(locale, block.id);
      setMessage(result.ok ? schedule.messages.deleted : getActionMessage(result));

      if (result.ok) {
        resetForm(block.date);
        refreshScheduleData();
      }
    });
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
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-primary">
                          {block.blockType === "full_day" ? schedule.types.fullDay : schedule.types.timeRange}
                          {range ? ` · ${range}` : ""}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {block.blockScope === "salon"
                            ? schedule.scope.salon
                            : therapistNames.get(block.therapistId ?? "") ?? schedule.placeholders.therapist}
                        </p>
                        {block.reason ? <p className="mt-3 text-sm leading-6 text-foreground">{block.reason}</p> : null}
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => editBlock(block)}>
                          {schedule.editBlock}
                        </Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => deleteBlock(block)}>
                          {schedule.deleteBlock}
                        </Button>
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
