import { createClient } from "@supabase/supabase-js";

// Service-role client — bypasses RLS. SERVER-ONLY. Never import this into a
// client component or expose the key to the browser. Used for privileged admin
// mutations (e.g. creating tenants) behind an explicit admin-role check.
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set — required for admin mutations."
    );
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
