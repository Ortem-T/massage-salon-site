import { NextResponse } from "next/server";

import {
  recordTelegramDailyScheduleCronEvent,
  sendTelegramDailySchedule
} from "@/server/telegram/dailySchedule";

export const dynamic = "force-dynamic";

type CronRequestBody = {
  source?: unknown;
};

async function readCronSource(request: Request) {
  try {
    const body = (await request.json()) as CronRequestBody;

    return typeof body.source === "string" ? body.source : "";
  } catch {
    return "";
  }
}

export async function GET() {
  return NextResponse.json({ ok: false, status: "method_not_allowed" }, { status: 405 });
}

export async function POST(request: Request) {
  const receivedAt = new Date().toISOString();
  const source = await readCronSource(request);

  if (source !== "supabase_cron") {
    return NextResponse.json({ ok: false, status: "bad_cron_source" }, { status: 400 });
  }

  const result = await sendTelegramDailySchedule({ mode: "scheduled" });
  const responseStatus = result.ok ? 200 : 502;

  await recordTelegramDailyScheduleCronEvent({
    source,
    result,
    responseStatus,
    receivedAt
  });

  return NextResponse.json(
    {
      ok: result.ok,
      status: result.status,
      localDate: result.localDate,
      reason: result.reason ?? null
    },
    { status: responseStatus }
  );
}
