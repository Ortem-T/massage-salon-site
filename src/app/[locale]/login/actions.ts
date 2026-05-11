"use server";

import { redirect } from "next/navigation";

import { isLocale } from "@/i18n/config";
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

  redirect(getSafeRedirect(safeLocale, next));
}
