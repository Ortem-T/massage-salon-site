const defaultAllowedOrigins = ["https://raine.rs", "https://www.raine.rs", "http://localhost:3000"];

function normalizeOrigin(value: string) {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function getAllowedPublicOrigins() {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const configuredOrigin = configuredSiteUrl ? normalizeOrigin(configuredSiteUrl) : null;

  return new Set([
    ...defaultAllowedOrigins,
    ...(configuredOrigin ? [configuredOrigin] : [])
  ]);
}

export function isAllowedPublicOrigin(request: Request) {
  const allowedOrigins = getAllowedPublicOrigins();
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  if (origin) {
    return allowedOrigins.has(normalizeOrigin(origin) ?? "");
  }

  if (referer) {
    return allowedOrigins.has(normalizeOrigin(referer) ?? "");
  }

  return false;
}

