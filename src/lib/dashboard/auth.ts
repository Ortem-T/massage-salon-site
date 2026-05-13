import { redirect } from "next/navigation";

import { type Locale } from "@/i18n/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dashboardRoles = ["admin", "therapist"] as const;

export type DashboardRole = (typeof dashboardRoles)[number];

export type DashboardUser = {
  id: string;
  email: string;
  role: DashboardRole;
};

function isDashboardRole(role: unknown): role is DashboardRole {
  return typeof role === "string" && dashboardRoles.includes(role as DashboardRole);
}

export function getDashboardRoleFromAppMetadata(appMetadata: Record<string, unknown> | undefined): DashboardRole | null {
  const role = appMetadata?.role;

  return isDashboardRole(role) ? role : null;
}

export async function requireDashboardUser(locale: Locale): Promise<DashboardUser> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect(`/${locale}/login`);
  }

  const role = getDashboardRoleFromAppMetadata(data.claims.app_metadata);

  if (!role) {
    redirect(`/${locale}/login?error=forbidden`);
  }

  return {
    id: data.claims.sub,
    email: data.claims.email ?? "",
    role
  };
}

export async function requireDashboardRole(locale: Locale, allowedRoles: DashboardRole[]) {
  const user = await requireDashboardUser(locale);

  if (!allowedRoles.includes(user.role)) {
    redirect(`/${locale}/dashboard`);
  }

  return user;
}
