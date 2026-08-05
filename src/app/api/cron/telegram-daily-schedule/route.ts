import { NextResponse } from "next/server";

import { sendTelegramDailySchedule } from "@/server/telegram/dailySchedule";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const authorization = request.headers.get("authorization")?.trim();

  return Boolean(cronSecret && authorization === `Bearer ${cronSecret}`);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, status: "unauthorized" }, { status: 401 });
  }

  const result = await sendTelegramDailySchedule({ mode: "scheduled" });
  const responseStatus = result.ok ? 200 : 502;

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

export async function POST(request: Request) {
  return GET(request);
}
