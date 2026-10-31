import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseServiceKey, supabaseUrl } from "../env";

/**
 * Service-role client. BYPASSES Row Level Security — only use it after the caller has been
 * authorised (or for narrowly scoped anonymous writes such as the contact form), and never
 * return raw rows from it to the browser. `server-only` makes the build fail if a client
 * component ever imports this file.
 */
export function createServiceClient(): SupabaseClient | null {
  const url = supabaseUrl();
  const key = supabaseServiceKey();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
