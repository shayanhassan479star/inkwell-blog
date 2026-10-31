
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAnonKey, supabaseUrl } from "../env";

type CookieToSet = {
  name: string;
  value: string;
  options: CookieOptions;
};

/**
 * Supabase client bound to the signed-in user's session cookies.
 */
export async function createSessionClient(): Promise<SupabaseClient | null> {
  const url = supabaseUrl();
  const key = supabaseAnonKey();
  if (!url || !key) return null;

  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Server Components may have read-only cookies.
          // Middleware refreshes sessions.
        }
      },
    },
  });
}
