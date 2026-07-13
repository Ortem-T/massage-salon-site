import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getSupabasePublicEnv } from "@/lib/supabase/client";
import { type Database } from "@/lib/supabase/database.types";

function getSupabaseServiceRoleKey() {
  return process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
}

export function hasSupabaseAdminEnv() {
  return Boolean(getSupabaseServiceRoleKey());
}

export function createSupabaseAdminClient() {
  const { supabaseUrl } = getSupabasePublicEnv();
  const serviceRoleKey = getSupabaseServiceRoleKey();

  if (!serviceRoleKey) {
    throw new Error("Missing Supabase server-only service role key.");
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
