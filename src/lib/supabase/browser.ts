"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getSupabasePublicEnv } from "@/lib/supabase/client";
import { type Database } from "@/lib/supabase/database.types";

export function createSupabaseRealtimeBrowserClient() {
  const { supabaseUrl, supabaseAnonKey } = getSupabasePublicEnv();

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
