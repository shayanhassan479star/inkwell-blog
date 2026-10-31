/** Helpers for reading configuration safely. Server-side only values must never be read in client components. */

const PLACEHOLDER = /(YOUR[-_]|REPLACE[-_]WITH|your-project-ref|example\.supabase)/i;

export function isConfigured(value: string | undefined | null): value is string {
  return Boolean(value && value.trim() && !PLACEHOLDER.test(value));
}

export function supabaseUrl(): string | null {
  const v = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return isConfigured(v) ? v : null;
}

export function supabaseAnonKey(): string | null {
  const v = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return isConfigured(v) ? v : null;
}

export function supabaseServiceKey(): string | null {
  const v = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return isConfigured(v) ? v : null;
}

/** True when the public Supabase connection (URL + anon key) is available. */
export function hasSupabase(): boolean {
  return Boolean(supabaseUrl() && supabaseAnonKey());
}
console.log("HAS SUPABASE:", hasSupabase());
console.log("URL VALID:", Boolean(supabaseUrl()));
console.log("KEY VALID:", Boolean(supabaseAnonKey()));
/** True when server-only features (contact form, comments, newsletter, AI usage…) can write to the database. */
export function hasServiceRole(): boolean {
  return Boolean(supabaseUrl() && supabaseServiceKey());
}

export const storageBucket = () => process.env.SUPABASE_STORAGE_BUCKET || "covers";
export const commentsEnabled = () => (process.env.COMMENTS_ENABLED ?? "true").toLowerCase() !== "false";
export const newsletterEnabled = () => (process.env.NEWSLETTER_ENABLED ?? "true").toLowerCase() !== "false";

export function intFromEnv(name: string, fallback: number, min = 1, max = 1_000_000): number {
  const n = Number.parseInt(process.env[name] ?? "", 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
  
}
