import { createClient } from "@supabase/supabase-js";

import { assertSupabaseEnv, supabaseServiceRoleKey, supabaseUrl } from "@/lib/env";

export function createAdminSupabaseClient() {
  assertSupabaseEnv();

  return createClient(supabaseUrl!, supabaseServiceRoleKey!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
