import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseAnonKey, supabaseUrl } from "../env";

/**
 * Cookie-less, anonymous client for public pages. Because it never reads cookies, pages that use
 * it can be statically generated / ISR-cached. Row Level Security limits it to published posts.
 * Returns null when Supabase has not been configured yet (the UI then shows a setup notice).
 */
export function getPublicClient(): SupabaseClient | null {
  const url = supabaseUrl();
  const key = supabaseAnonKey();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
