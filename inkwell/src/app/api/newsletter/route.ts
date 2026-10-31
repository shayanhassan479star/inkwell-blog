import { NEWSLETTER_CONSENT_TEXT as CONSENT_TEXT } from "@/lib/consent";
import { newsletterEnabled } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/admin";
import { firstError, newsletterSchema } from "@/lib/validation";
import { getIpHash, isSameOrigin, jsonError, jsonOk, rateLimit, readJson } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!newsletterEnabled()) return jsonError(404, "The newsletter is turned off.");
  if (!isSameOrigin(request)) return jsonError(403, "Request blocked.");
  const body = await readJson(request, 5_000);
  if (!body) return jsonError(400, "Invalid request.");

  const parsed = newsletterSchema.safeParse(body);
  if (!parsed.success) return jsonError(422, firstError(parsed.error));
  // Same response whether the address is new, existing or a bot, so the form can't be used to probe the list.
  const ok = jsonOk({ message: "Thanks — you're on the list. You can unsubscribe at any time." });
  if (parsed.data.website) return ok;

  const ipHash = await getIpHash();
  if (!(await rateLimit(`newsletter:${ipHash}`, 5, 3600))) return jsonError(429, "Too many attempts. Please try again later.");

  const db = createServiceClient();
  if (!db) return jsonError(503, "Sign-up isn't available yet.");

  const email = parsed.data.email;
  const { data: existing } = await db.from("subscribers").select("id, unsubscribed_at").eq("email", email).maybeSingle();
  if (existing) {
    if (existing.unsubscribed_at) {
      // Re-subscribing is a fresh, explicit consent.
      await db
        .from("subscribers")
        .update({ unsubscribed_at: null, consent_at: new Date().toISOString(), consent_text: CONSENT_TEXT, ip_hash: ipHash })
        .eq("id", existing.id);
    }
    return ok;
  }
  const { error } = await db.from("subscribers").insert({ email, consent_text: CONSENT_TEXT, ip_hash: ipHash });
  if (error && error.code !== "23505") {
    console.error("[newsletter] insert failed:", error.message);
    return jsonError(500, "Sign-up failed. Please try again.");
  }
  return ok;
}
