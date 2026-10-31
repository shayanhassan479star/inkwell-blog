import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/login-form";
import { Alert } from "@/components/ui/feedback";
import { getStaff } from "@/lib/auth";
import { hasServiceRole, hasSupabase } from "@/lib/env";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const safeNext = typeof next === "string" && /^\/admin(\/[A-Za-z0-9._~\-/?=&%]*)?$/.test(next) ? next : "/admin";

  if (hasSupabase() && (await getStaff())) redirect(safeNext);

  return (
    <main id="main" className="flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 block text-center font-display text-3xl font-semibold tracking-tight">
          {site.name}<span className="text-accent">.</span>
        </Link>
        <div className="card p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-semibold">Sign in</h1>
          <p className="mb-6 mt-1 text-sm text-muted-foreground">Dashboard access is limited to authorised writers.</p>
          {!hasSupabase() || !hasServiceRole() ? (
            <Alert kind="error" title="Setup incomplete">
              Supabase environment variables are missing. Follow “Configure Supabase” in the README, then restart the server.
            </Alert>
          ) : (
            <LoginForm next={safeNext} />
          )}
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link href="/" className="hover:text-accent">← Back to the site</Link>
        </p>
      </div>
    </main>
  );
}
