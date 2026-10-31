import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createServiceClient } from "./supabase/admin";

/** Best-effort client IP. On Vercel/most proxies the first x-forwarded-for entry is set by the platform. */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

function salt(): string {
  const configured = process.env.IP_HASH_SALT;
  if (configured && !/REPLACE_WITH|YOUR_/i.test(configured)) return configured;
  // Fall back to a secret that only the server knows, so raw IPs are never stored or hashed with a public constant.
  return `fallback:${process.env.SUPABASE_SERVICE_ROLE_KEY ?? "dev"}`;
}

/** One-way, salted hash. Used so IP addresses are never stored in plain text. */
export function hashValue(value: string): string {
  return createHash("sha256").update(`${salt()}|${value}`).digest("hex").slice(0, 32);
}

export async function getIpHash(): Promise<string> {
  return hashValue(await getClientIp());
}

/**
 * Fixed-window rate limiter backed by Postgres (works across serverless instances).
 * Returns true when the request is allowed. Fails CLOSED if the limiter cannot be reached.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const db = createServiceClient();
  if (!db) return false;
  const { data, error } = await db.rpc("check_rate_limit", {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error("[rate-limit] rpc failed:", error.message);
    return false;
  }
  return data === true;
}

/** Reject cross-site form posts: if an Origin header is present it must match the Host. */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // same-origin navigations and non-browser clients; abuse is handled by rate limits
  try {
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function jsonError(status: number, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status });
}

export function jsonOk(body: Record<string, unknown> = {}) {
  return NextResponse.json({ ok: true, ...body });
}

export const BOT_UA = /bot|crawl|spider|slurp|preview|fetch|monitor|headless|lighthouse/i;

/** Parse a small JSON body defensively. Returns null for oversize, non-JSON or non-object bodies. */
export async function readJson(request: Request, maxBytes = 20_000): Promise<Record<string, unknown> | null> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > maxBytes) return null;
  try {
    const text = await request.text();
    if (text.length > maxBytes) return null;
    const value = JSON.parse(text);
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
