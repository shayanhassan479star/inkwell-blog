import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Runs only for /admin and /login. It refreshes the session cookie and sends visitors without
 * a valid session to the login page. Fine-grained authorisation (role checks) is repeated on
 * the server in every page, server action and API route — never rely on middleware alone.
 */
export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith("/admin") && !user) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(login);
  }
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/login"],
};
