import { NextRequest } from "next/server";

import { resolveSredimeBusyCalendarIcs } from "@/lib/integrations/sredime/calendar";

export const dynamic = "force-dynamic";

function notFoundResponse() {
  return new Response("Not found.", {
    status: 404,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/plain; charset=utf-8"
    }
  });
}

type SredimeCalendarRouteProps = {
  params: Promise<{
    token?: string[];
  }>;
};

export async function GET(_request: NextRequest, { params }: SredimeCalendarRouteProps) {
  const { token: tokenSegments } = await params;
  const tokenFile = tokenSegments?.[0] ?? "";

  if (tokenSegments?.length !== 1 || !tokenFile.endsWith(".ics")) {
    return notFoundResponse();
  }

  const rawToken = tokenFile.slice(0, -4);

  try {
    const calendar = await resolveSredimeBusyCalendarIcs(rawToken);

    if (!calendar) {
      return notFoundResponse();
    }

    return new Response(calendar, {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": 'inline; filename="raine-sredime-busy.ics"',
        "Content-Type": "text/calendar; charset=utf-8"
      }
    });
  } catch (error) {
    console.error("[sredime calendar] feed generation failed", error);

    return new Response("Calendar temporarily unavailable.", {
      status: 500,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/plain; charset=utf-8"
      }
    });
  }
}
