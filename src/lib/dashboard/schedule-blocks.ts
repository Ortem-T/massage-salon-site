import {
  defaultBookingAvailability
} from "@/lib/booking/booking-options";
import {
  calculateBlockedIntervals,
  calculateRoomRentalIntervals,
  timeToMinutes,
  type AvailabilityScheduleBlock
} from "@/lib/booking/booking-availability";
import { type DashboardUser } from "@/lib/dashboard/auth";
import { type DashboardTherapist, DashboardForbiddenError } from "@/lib/dashboard/bookings";
import { getDashboardOperationSettings, type DashboardOperationSettings } from "@/lib/dashboard/settings";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { type ScheduleBlockScope, type ScheduleBlockType } from "@/lib/supabase/database.types";

export type DashboardScheduleBlock = {
  id: string;
  therapistId: string | null;
  createdBy: string | null;
  blockType: ScheduleBlockType;
  blockScope: ScheduleBlockScope;
  date: string;
  startTime: string | null;
  endTime: string | null;
  roomsOccupied: number;
  seriesId: string | null;
  reason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DashboardScheduleData = {
  blocks: DashboardScheduleBlock[];
  operationSettings: DashboardOperationSettings;
  therapists: DashboardTherapist[];
  error: boolean;
};

export type ScheduleBlockInput = {
  id?: string;
  therapistId?: string | null;
  blockType: ScheduleBlockType;
  blockScope?: ScheduleBlockScope;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  roomsOccupied?: number | null;
  recurrence?: ScheduleBlockRecurrenceInput | null;
  reason?: string | null;
};

export class ScheduleBlockValidationError extends Error {
  constructor(public readonly reason: "invalid" | "invalid_time" | "overlap" | "no_occurrences" | "capacity") {
    super("Invalid schedule block.");
    this.name = "ScheduleBlockValidationError";
  }
}

export type DeleteScheduleBlockMode = "occurrence" | "series";

export type ScheduleBlockRecurrenceInput = {
  enabled?: boolean;
  frequency?: "weekly" | "monthly";
  weekdays?: number[];
  endDate?: string;
};

type ScheduleBlockRow = {
  id: string;
  therapist_id: string | null;
  created_by: string | null;
  block_type: ScheduleBlockType;
  block_scope: ScheduleBlockScope;
  date: string;
  start_time: string | null;
  end_time: string | null;
  rooms_occupied: number | null;
  series_id: string | null;
  reason: string | null;
  created_at: string;
  updated_at: string;
};

type DashboardTherapistRow = {
  id: string;
  profile_id: string | null;
  display_name: string;
  active: boolean;
};

type ScheduleBookingRow = {
  id: string;
  preferred_date: string;
  preferred_time: string;
  duration_minutes: number | null;
  status: "pending" | "confirmed" | "cancelled" | "completed";
};

type ExistingScheduleBlockRow = {
  id: string;
  therapist_id: string | null;
  block_type: ScheduleBlockType;
  block_scope: ScheduleBlockScope;
  date: string;
  start_time: string | null;
  end_time: string | null;
  rooms_occupied: number | null;
  series_id: string | null;
};

const scheduleBlockColumns =
  "id, therapist_id, created_by, block_type, block_scope, date, start_time, end_time, rooms_occupied, series_id, reason, created_at, updated_at";
const recurrenceSafetyLimit = 120;

function toDashboardScheduleBlock(row: ScheduleBlockRow): DashboardScheduleBlock {
  return {
    id: row.id,
    therapistId: row.therapist_id,
    createdBy: row.created_by,
    blockType: row.block_type,
    blockScope: row.block_scope,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    roomsOccupied: row.rooms_occupied ?? 0,
    seriesId: row.series_id,
    reason: row.reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toDashboardTherapist(row: DashboardTherapistRow): DashboardTherapist {
  return {
    id: row.id,
    profileId: row.profile_id,
    displayName: row.display_name,
    active: row.active
  };
}

function normalizeText(value: string | null | undefined) {
  return value?.trim() ? value.trim() : null;
}

function isDateValue(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, day, 12));
}

function toDateKey(date: Date) {
  return date.toISOString().split("T")[0];
}

function addDays(value: string, amount: number) {
  const date = parseDateKey(value);
  date.setUTCDate(date.getUTCDate() + amount);

  return toDateKey(date);
}

function addMonthsSameDay(value: string, amount: number, dayOfMonth: number) {
  const date = parseDateKey(value);
  const targetMonth = date.getUTCMonth() + amount;
  const targetYear = date.getUTCFullYear() + Math.floor(targetMonth / 12);
  const normalizedMonth = ((targetMonth % 12) + 12) % 12;
  const next = new Date(Date.UTC(targetYear, normalizedMonth, dayOfMonth, 12));

  if (next.getUTCMonth() !== normalizedMonth || next.getUTCDate() !== dayOfMonth) {
    return null;
  }

  return toDateKey(next);
}

function getBelgradeWeekday(value: string) {
  return parseDateKey(value).getUTCDay();
}

function normalizeTime(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const [hours, minutes] = value.split(":");

  if (!hours || !minutes) {
    return null;
  }

  return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
}

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

async function getDashboardTherapists(role: DashboardUser["role"], userId: string) {
  const supabase = await createSupabaseServerClient();
  const query = supabase
    .from("therapists")
    .select("id, profile_id, display_name, active")
    .eq("active", true)
    .order("display_name", { ascending: true });
  const { data, error } =
    role === "admin" ? await query : await query.eq("profile_id", userId);

  return {
    therapists: error ? [] : ((data ?? []) as DashboardTherapistRow[]).map(toDashboardTherapist),
    error: Boolean(error)
  };
}

function validateTimeRange(startTime: string | null, endTime: string | null) {
  const firstBookingStart = timeToMinutes(defaultBookingAvailability.firstBookingStart);
  const latestBlockEnd = timeToMinutes(defaultBookingAvailability.lastBookingStart) === null
    ? null
    : (timeToMinutes(defaultBookingAvailability.lastBookingStart) ?? 0) + defaultBookingAvailability.slotStepMinutes;
  const start = startTime ? timeToMinutes(startTime) : null;
  const end = endTime ? timeToMinutes(endTime) : null;

  return (
    firstBookingStart !== null &&
    latestBlockEnd !== null &&
    start !== null &&
    end !== null &&
    start >= firstBookingStart &&
    end <= latestBlockEnd &&
    end > start
  );
}

async function normalizeScheduleBlockInput(user: DashboardUser, input: ScheduleBlockInput) {
  const blockScope = input.blockScope ?? "therapist";
  const blockType = input.blockType;
  const therapistId = input.therapistId?.trim() || null;
  const startTime = normalizeTime(input.startTime);
  const endTime = normalizeTime(input.endTime);
  const recurrence = input.recurrence?.enabled ? input.recurrence : null;

  if (
    !isDateValue(input.date) ||
    !["full_day", "time_range"].includes(blockType) ||
    !["therapist", "salon", "room_rental"].includes(blockScope)
  ) {
    throw new ScheduleBlockValidationError("invalid");
  }

  if (user.role === "therapist" && (blockScope !== "therapist" || recurrence)) {
    throw new DashboardForbiddenError();
  }

  if (blockScope === "therapist" && !therapistId) {
    throw new ScheduleBlockValidationError("invalid");
  }

  if (blockScope !== "therapist" && therapistId) {
    throw new ScheduleBlockValidationError("invalid");
  }

  if (blockType === "full_day" && (startTime || endTime)) {
    throw new ScheduleBlockValidationError("invalid");
  }

  if (blockType === "time_range" && !validateTimeRange(startTime, endTime)) {
    throw new ScheduleBlockValidationError("invalid_time");
  }

  if (user.role === "therapist") {
    const therapistIds = await getTherapistIdsForUser(user.id);

    if (!therapistId || !therapistIds.includes(therapistId)) {
      throw new DashboardForbiddenError();
    }
  }

  const roomsOccupied = blockScope === "room_rental" ? Math.max(1, Math.floor(input.roomsOccupied ?? 1)) : 0;

  if (blockScope === "room_rental" && user.role !== "admin") {
    throw new DashboardForbiddenError();
  }

  if (roomsOccupied > 10) {
    throw new ScheduleBlockValidationError("invalid");
  }

  return {
    therapistId: blockScope === "therapist" ? therapistId : null,
    blockType,
    blockScope,
    date: input.date,
    startTime: blockType === "time_range" ? startTime : null,
    endTime: blockType === "time_range" ? endTime : null,
    roomsOccupied,
    recurrence,
    reason: normalizeText(input.reason)
  };
}

function scheduleBlocksOverlap(first: AvailabilityScheduleBlock, second: AvailabilityScheduleBlock) {
  if (first.blockType === "full_day" || second.blockType === "full_day") {
    return true;
  }

  if (!first.startTime || !first.endTime || !second.startTime || !second.endTime) {
    return false;
  }

  const firstStart = timeToMinutes(first.startTime);
  const firstEnd = timeToMinutes(first.endTime);
  const secondStart = timeToMinutes(second.startTime);
  const secondEnd = timeToMinutes(second.endTime);

  return firstStart !== null &&
    firstEnd !== null &&
    secondStart !== null &&
    secondEnd !== null &&
    firstStart < secondEnd &&
    secondStart < firstEnd;
}

function appliesToSameSchedule(target: AvailabilityScheduleBlock, existing: AvailabilityScheduleBlock) {
  if (target.blockScope === "salon") {
    return existing.blockScope === "salon";
  }

  if (target.blockScope === "therapist") {
    return existing.blockScope === "salon" ||
      (existing.blockScope === "therapist" && existing.therapistId === target.therapistId);
  }

  return existing.blockScope === "salon";
}

async function assertNoOverlappingScheduleBlock(input: Awaited<ReturnType<typeof normalizeScheduleBlockInput>>, excludeId?: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("schedule_blocks")
    .select("id, therapist_id, block_type, block_scope, date, start_time, end_time, rooms_occupied, series_id")
    .eq("date", input.date);

  if (error) {
    throw new Error(error.message);
  }

  const target: AvailabilityScheduleBlock = {
    blockDate: input.date,
    therapistId: input.therapistId,
    blockType: input.blockType,
    blockScope: input.blockScope,
    startTime: input.startTime,
    endTime: input.endTime,
    roomsOccupied: input.roomsOccupied
  };
  const hasOverlap = ((data ?? []) as ExistingScheduleBlockRow[]).some((block) => {
    if (excludeId && block.id === excludeId) {
      return false;
    }

    const existing: AvailabilityScheduleBlock = {
      blockDate: block.date,
      therapistId: block.therapist_id,
      blockType: block.block_type,
      blockScope: block.block_scope,
      startTime: block.start_time,
      endTime: block.end_time,
      roomsOccupied: block.rooms_occupied ?? 0
    };

    return appliesToSameSchedule(target, existing) && scheduleBlocksOverlap(target, existing);
  });

  if (hasOverlap) {
    throw new ScheduleBlockValidationError("overlap");
  }
}

function getOccurrenceDates(input: Awaited<ReturnType<typeof normalizeScheduleBlockInput>>) {
  const recurrence = input.recurrence;

  if (!recurrence) {
    return [input.date];
  }

  const endDate = recurrence.endDate?.trim();

  if (!endDate || !isDateValue(endDate) || endDate < input.date) {
    throw new ScheduleBlockValidationError("invalid");
  }

  if (recurrence.frequency === "weekly") {
    const weekdays = [...new Set((recurrence.weekdays ?? [])
      .map((weekday) => Math.floor(weekday))
      .filter((weekday) => weekday >= 0 && weekday <= 6))];

    if (weekdays.length === 0) {
      throw new ScheduleBlockValidationError("invalid");
    }

    const dates: string[] = [];
    let cursor = input.date;

    while (cursor <= endDate) {
      if (weekdays.includes(getBelgradeWeekday(cursor))) {
        dates.push(cursor);
      }

      if (dates.length > recurrenceSafetyLimit) {
        throw new ScheduleBlockValidationError("invalid");
      }

      cursor = addDays(cursor, 1);
    }

    if (dates.length === 0) {
      throw new ScheduleBlockValidationError("no_occurrences");
    }

    return dates;
  }

  if (recurrence.frequency === "monthly") {
    const startDate = parseDateKey(input.date);
    const dayOfMonth = startDate.getUTCDate();
    const dates: string[] = [];
    let monthOffset = 0;

    while (true) {
      const nextDate = addMonthsSameDay(input.date, monthOffset, dayOfMonth);

      if (nextDate && nextDate > endDate) {
        break;
      }

      if (nextDate) {
        dates.push(nextDate);
      }

      if (monthOffset > recurrenceSafetyLimit || dates.length > recurrenceSafetyLimit) {
        throw new ScheduleBlockValidationError("invalid");
      }

      monthOffset += 1;
    }

    if (dates.length === 0) {
      throw new ScheduleBlockValidationError("no_occurrences");
    }

    return dates;
  }

  throw new ScheduleBlockValidationError("invalid");
}

function toAvailabilityBlock(block: ExistingScheduleBlockRow): AvailabilityScheduleBlock {
  return {
    blockDate: block.date,
    therapistId: block.therapist_id,
    blockType: block.block_type,
    blockScope: block.block_scope,
    startTime: block.start_time,
    endTime: block.end_time,
    roomsOccupied: block.rooms_occupied ?? 0
  };
}

function toTargetAvailabilityBlock(
  input: Awaited<ReturnType<typeof normalizeScheduleBlockInput>>,
  date: string
): AvailabilityScheduleBlock {
  return {
    blockDate: date,
    therapistId: input.therapistId,
    blockType: input.blockType,
    blockScope: input.blockScope,
    startTime: input.startTime,
    endTime: input.endTime,
    roomsOccupied: input.roomsOccupied
  };
}

function scheduleBlockToBookingWindow(block: AvailabilityScheduleBlock) {
  if (block.blockType === "full_day") {
    const startMinutes = timeToMinutes(defaultBookingAvailability.firstBookingStart);
    const latestStart = timeToMinutes(defaultBookingAvailability.lastBookingStart);

    if (startMinutes === null || latestStart === null) {
      return null;
    }

    return {
      startMinutes,
      endMinutes: latestStart + defaultBookingAvailability.slotStepMinutes
    };
  }

  if (!block.startTime || !block.endTime) {
    return null;
  }

  const startMinutes = timeToMinutes(block.startTime);
  const endMinutes = timeToMinutes(block.endTime);

  return startMinutes === null || endMinutes === null || startMinutes >= endMinutes
    ? null
    : { startMinutes, endMinutes };
}

async function assertRoomRentalCapacity(
  input: Awaited<ReturnType<typeof normalizeScheduleBlockInput>>,
  dates: string[],
  excludeId?: string
) {
  if (input.blockScope !== "room_rental") {
    return;
  }

  const supabase = await createSupabaseServerClient();
  const [bookingsResult, blocksResult, operationSettings] = await Promise.all([
    supabase
      .from("bookings")
      .select("id, preferred_date, preferred_time, duration_minutes, status")
      .in("preferred_date", dates),
    supabase
      .from("schedule_blocks")
      .select("id, therapist_id, block_type, block_scope, date, start_time, end_time, rooms_occupied, series_id")
      .in("date", dates),
    getDashboardOperationSettings()
  ]);

  if (bookingsResult.error) {
    throw new Error(bookingsResult.error.message);
  }

  if (blocksResult.error) {
    throw new Error(blocksResult.error.message);
  }

  const availableRooms = operationSettings.availableRooms;
  const bookings = ((bookingsResult.data ?? []) as ScheduleBookingRow[])
    .filter((booking) => booking.status === "pending" || booking.status === "confirmed");
  const existingBlocks = ((blocksResult.data ?? []) as ExistingScheduleBlockRow[])
    .filter((block) => !excludeId || block.id !== excludeId)
    .map(toAvailabilityBlock);

  for (const date of dates) {
    const target = toTargetAvailabilityBlock(input, date);
    const targetInterval = scheduleBlockToBookingWindow(target);

    if (!targetInterval) {
      throw new ScheduleBlockValidationError("invalid_time");
    }

    const existingRentalUsage = calculateRoomRentalIntervals(existingBlocks, { date })
      .filter((interval) => targetInterval.startMinutes < interval.endMinutes && interval.startMinutes < targetInterval.endMinutes)
      .reduce((total, interval) => total + interval.roomsOccupied, 0);
    const bookingUsage = calculateBlockedIntervals(
      bookings
        .filter((booking) => booking.preferred_date === date)
        .map((booking) => ({
          bookingDate: booking.preferred_date,
          preferredTime: booking.preferred_time,
          therapistId: null,
          durationMinutes: booking.duration_minutes,
          status: booking.status
        })),
      { breakMinutes: defaultBookingAvailability.breakMinutes }
    ).filter((interval) => targetInterval.startMinutes < interval.endMinutes && interval.startMinutes < targetInterval.endMinutes).length;

    if (bookingUsage + existingRentalUsage + input.roomsOccupied > availableRooms) {
      throw new ScheduleBlockValidationError("capacity");
    }
  }
}

export async function getScheduleBlocksForRange(startDate: string, endDate: string, therapistId?: string | null) {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("schedule_blocks")
    .select(scheduleBlockColumns)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: true })
    .order("start_time", { ascending: true });

  if (therapistId) {
    query = query.eq("therapist_id", therapistId);
  }

  const { data, error } = await query;

  if (error) {
    return {
      blocks: [],
      error: true
    };
  }

  return {
    blocks: ((data ?? []) as ScheduleBlockRow[]).map(toDashboardScheduleBlock),
    error: false
  };
}

export async function getScheduleBlocksForDate(date: string, therapistId?: string | null) {
  return getScheduleBlocksForRange(date, date, therapistId);
}

export async function getScheduleBlocksForDashboard(user: DashboardUser): Promise<DashboardScheduleData> {
  const today = new Date();
  const startDate = new Date(today);
  const endDate = new Date(today);

  startDate.setDate(today.getDate() - 45);
  endDate.setDate(today.getDate() + 180);

  const start = startDate.toISOString().split("T")[0];
  const end = endDate.toISOString().split("T")[0];
  const [blocksResult, therapistsResult, operationSettings] = await Promise.all([
    getScheduleBlocksForRange(start, end),
    getDashboardTherapists(user.role, user.id),
    getDashboardOperationSettings()
  ]);

  return {
    blocks: blocksResult.blocks,
    operationSettings,
    therapists: therapistsResult.therapists,
    error: blocksResult.error || therapistsResult.error
  };
}

export async function createScheduleBlock(user: DashboardUser, input: ScheduleBlockInput) {
  const normalized = await normalizeScheduleBlockInput(user, input);
  const occurrenceDates = getOccurrenceDates(normalized);
  const seriesId = normalized.recurrence ? crypto.randomUUID() : null;

  for (const date of occurrenceDates) {
    await assertNoOverlappingScheduleBlock({ ...normalized, date });
  }

  await assertRoomRentalCapacity(normalized, occurrenceDates);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("schedule_blocks")
    .insert(
      occurrenceDates.map((date) => ({
        therapist_id: normalized.therapistId,
        created_by: user.id,
        block_type: normalized.blockType,
        block_scope: normalized.blockScope,
        date,
        start_time: normalized.startTime,
        end_time: normalized.endTime,
        rooms_occupied: normalized.roomsOccupied,
        series_id: seriesId,
        reason: normalized.reason
      }))
    )
    .select("id");

  if (error) {
    throw new Error(error.message);
  }

  if (!data || data.length !== occurrenceDates.length) {
    throw new DashboardForbiddenError();
  }
}

export async function updateScheduleBlock(user: DashboardUser, input: ScheduleBlockInput & { id: string }) {
  const normalized = await normalizeScheduleBlockInput(user, input);

  await assertNoOverlappingScheduleBlock(normalized, input.id);
  await assertRoomRentalCapacity(normalized, [normalized.date], input.id);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("schedule_blocks")
    .update({
      therapist_id: normalized.therapistId,
      block_type: normalized.blockType,
      block_scope: normalized.blockScope,
      date: normalized.date,
      start_time: normalized.startTime,
      end_time: normalized.endTime,
      rooms_occupied: normalized.roomsOccupied,
      series_id: null,
      reason: normalized.reason
    })
    .eq("id", input.id)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new DashboardForbiddenError();
  }
}

export async function deleteScheduleBlock(user: DashboardUser, id: string, mode: DeleteScheduleBlockMode = "occurrence") {
  const supabase = await createSupabaseServerClient();

  if (mode === "series") {
    if (user.role !== "admin") {
      throw new DashboardForbiddenError();
    }

    const { data: targetBlock, error: targetError } = await supabase
      .from("schedule_blocks")
      .select("id, series_id")
      .eq("id", id)
      .maybeSingle();

    if (targetError) {
      throw new Error(targetError.message);
    }

    if (!targetBlock?.series_id) {
      throw new DashboardForbiddenError();
    }

    const { data, error } = await supabase
      .from("schedule_blocks")
      .delete()
      .eq("series_id", targetBlock.series_id)
      .select("id");

    if (error) {
      throw new Error(error.message);
    }

    if (!data || data.length === 0) {
      throw new DashboardForbiddenError();
    }

    return;
  }

  const { data, error } = await supabase
    .from("schedule_blocks")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new DashboardForbiddenError();
  }
}
