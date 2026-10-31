import { createServiceClient } from "@/lib/supabase/admin";
import { fieldErrors, contactSchema, firstError } from "@/lib/validation";
import { getIpHash, isSameOrigin, jsonError, jsonOk, rateLimit, readJson } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, "Request blocked.");
  const body = await readJson(request);
  if (!body) return jsonError(400, "Invalid request.");

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) return jsonError(422, firstError(parsed.error), { fieldErrors: fieldErrors(parsed.error) });
  // Honeypot: bots fill the hidden field. Pretend success so they learn nothing.
  if (parsed.data.website) return jsonOk({ message: "Thanks — your message has been sent." });

  const ipHash = await getIpHash();
  if (!(await rateLimit(`contact:${ipHash}`, 3, 3600))) {
    return jsonError(429, "You've sent several messages recently. Please try again in an hour.");
  }

  const db = createServiceClient();
  if (!db) return jsonError(503, "The contact form isn't available yet. Please try again later.");

  const { name, email, subject, message } = parsed.data;
  const { error } = await db.from("contact_messages").insert({ name, email, subject, message, ip_hash: ipHash });
  if (error) {
    console.error("[contact] insert failed:", error.message);
    return jsonError(500, "Sorry, your message could not be sent. Please try again.");
  }
  return jsonOk({ message: "Thanks — your message has been sent. I'll reply as soon as I can." });
}
