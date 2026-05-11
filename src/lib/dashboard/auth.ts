import { redirect } from "next/navigation";

import { type Locale } from "@/i18n/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dashboardRoles = ["admin", "therapist"] as const;

export type DashboardRole = (typeof dashboardRoles)[number];

export type DashboardUser = {
  email: string;
  role: DashboardRole;
};

function isDashboardRole(role: unknown): role is DashboardRole {
  return typeof role === "string" && dashboardRoles.includes(role as DashboardRole);
}

function getRoleFromAppMetadata(appMetadata: Record<string, unknown> | undefined): DashboardRole {
  const role = appMetadata?.role ?? appMetadata?.dashboard_role;

  return isDashboardRole(role) ? role : "therapist";
}

export async function requireDashboardUser(locale: Locale): Promise<DashboardUser> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect(`/${locale}/login`);
  }

  return {
    email: data.claims.email ?? "",
    role: getRoleFromAppMetadata(data.claims.app_metadata)
  };
}

export async function requireDashboardRole(locale: Locale, allowedRoles: DashboardRole[]) {
  const user = await requireDashboardUser(locale);

  if (!allowedRoles.includes(user.role)) {
    redirect(`/${locale}/dashboard`);
  }

  return user;
}
