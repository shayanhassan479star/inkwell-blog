
import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseAnonKey, supabaseUrl } from "../env";

type CookieToSet = {
  name: string;
  value: string;
  options: CookieOptions;
};

/** Refreshes the auth session cookies and returns the verified user (or null). */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = supabaseUrl();
  const key = supabaseAnonKey();
  if (!url || !key) return { response, user: null, configured: false };

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  return { response, user: data.user, configured: true };
}
