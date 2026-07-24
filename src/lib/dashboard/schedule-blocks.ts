import {
  defaultBookingAvailability
} from "@/lib/booking/booking-options";
import {
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
  reason?: string | null;
};

export class ScheduleBlockValidationError extends Error {
  constructor(public readonly reason: "invalid" | "invalid_time" | "overlap") {
    super("Invalid schedule block.");
    this.name = "ScheduleBlockValidationError";
  }
}

type ScheduleBlockRow = {
  id: string;
  therapist_id: string | null;
  created_by: string | null;
  block_type: ScheduleBlockType;
  block_scope: ScheduleBlockScope;
  date: string;
  start_time: string | null;
  end_time: string | null;
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

const scheduleBlockColumns =
  "id, therapist_id, created_by, block_type, block_scope, date, start_time, end_time, reason, created_at, updated_at";

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

  if (!isDateValue(input.date) || !["full_day", "time_range"].includes(blockType) || !["therapist", "salon"].includes(blockScope)) {
    throw new ScheduleBlockValidationError("invalid");
  }

  if (user.role === "therapist" && blockScope !== "therapist") {
    throw new DashboardForbiddenError();
  }

  if (blockScope === "therapist" && !therapistId) {
    throw new ScheduleBlockValidationError("invalid");
  }

  if (blockScope === "salon" && therapistId) {
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

  return {
    therapistId,
    blockType,
    blockScope,
    date: input.date,
    startTime: blockType === "time_range" ? startTime : null,
    endTime: blockType === "time_range" ? endTime : null,
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

  return existing.blockScope === "salon" || existing.therapistId === target.therapistId;
}

async function assertNoOverlappingScheduleBlock(input: Awaited<ReturnType<typeof normalizeScheduleBlockInput>>, excludeId?: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("schedule_blocks")
    .select("id, therapist_id, block_type, block_scope, date, start_time, end_time")
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
    endTime: input.endTime
  };
  const hasOverlap = ((data ?? []) as Array<{
    id: string;
    therapist_id: string | null;
    block_type: ScheduleBlockType;
    block_scope: ScheduleBlockScope;
    date: string;
    start_time: string | null;
    end_time: string | null;
  }>).some((block) => {
    if (excludeId && block.id === excludeId) {
      return false;
    }

    const existing: AvailabilityScheduleBlock = {
      blockDate: block.date,
      therapistId: block.therapist_id,
      blockType: block.block_type,
      blockScope: block.block_scope,
      startTime: block.start_time,
      endTime: block.end_time
    };

    return appliesToSameSchedule(target, existing) && scheduleBlocksOverlap(target, existing);
  });

  if (hasOverlap) {
    throw new ScheduleBlockValidationError("overlap");
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

  await assertNoOverlappingScheduleBlock(normalized);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("schedule_blocks")
    .insert({
      therapist_id: normalized.therapistId,
      created_by: user.id,
      block_type: normalized.blockType,
      block_scope: normalized.blockScope,
      date: normalized.date,
      start_time: normalized.startTime,
      end_time: normalized.endTime,
      reason: normalized.reason
    })
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new DashboardForbiddenError();
  }
}

export async function updateScheduleBlock(user: DashboardUser, input: ScheduleBlockInput & { id: string }) {
  const normalized = await normalizeScheduleBlockInput(user, input);

  await assertNoOverlappingScheduleBlock(normalized, input.id);

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

export async function deleteScheduleBlock(user: DashboardUser, id: string) {
  const supabase = await createSupabaseServerClient();
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
