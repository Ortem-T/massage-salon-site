import { NextResponse } from "next/server";

import { resolveClientRebookingToken, isRebookingTokenFormat } from "@/lib/rebooking/tokens";
import { consumeRateLimit, getClientIp } from "@/server/security/rate-limit";

const rebookingResolveLimit = {
  max: 10,
  windowMs: 10 * 60 * 1000
};

function rateLimitHeaders(resetAt: number): HeadersInit {
  return {
    "Retry-After": String(Math.max(1, Math.ceil((resetAt - Date.now()) / 1000)))
  };
}

function genericInvalidResponse(status = 404, headers?: HeadersInit) {
  return NextResponse.json(
    { code: "invalid_rebooking_link" },
    {
      headers: {
        "Cache-Control": "no-store",
        ...(headers ?? {})
      },
      status
    }
  );
}

export async function GET(request: Request) {
  const rateLimit = consumeRateLimit(
    `rebooking-resolve:ip:${getClientIp(request)}`,
    rebookingResolveLimit.max,
    rebookingResolveLimit.windowMs
  );

  if (!rateLimit.allowed) {
    return genericInvalidResponse(429, rateLimitHeaders(rateLimit.resetAt));
  }

  const token = new URL(request.url).searchParams.get("token")?.trim() ?? "";

  if (!isRebookingTokenFormat(token)) {
    return genericInvalidResponse();
  }

  const prefill = await resolveClientRebookingToken(token);

  if (!prefill) {
    return genericInvalidResponse();
  }

  return NextResponse.json(
    {
      name: prefill.name,
      phone: prefill.phone,
      preferredLocale: prefill.preferredLocale
    },
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
