"use server";

import { redirect } from "next/navigation";

import { isLocale } from "@/i18n/config";
import { getDashboardRoleFromAppMetadata } from "@/lib/dashboard/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function getSafeRedirect(locale: string, next: string | null) {
  if (!isLocale(locale)) {
    return "/sr/dashboard";
  }

  if (next?.startsWith(`/${locale}/dashboard`)) {
    return next;
  }

  return `/${locale}/dashboard`;
}

export async function signInDashboard(locale: string, next: string | null, formData: FormData) {
  const safeLocale = isLocale(locale) ? locale : "sr";
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect(`/${safeLocale}/login?error=missing`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    redirect(`/${safeLocale}/login?error=invalid`);
  }

  const { data: claimsData } = await supabase.auth.getClaims();
  const role = getDashboardRoleFromAppMetadata(claimsData?.claims?.app_metadata);

  if (!role) {
    await supabase.auth.signOut();
    redirect(`/${safeLocale}/login?error=forbidden`);
  }

  redirect(getSafeRedirect(safeLocale, next));
}
