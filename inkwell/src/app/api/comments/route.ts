import { looksLikeSpam } from "@/lib/spam";
import { commentsEnabled } from "@/lib/env";
import { getPublicClient } from "@/lib/supabase/public";
import { createServiceClient } from "@/lib/supabase/admin";
import { commentSchema, fieldErrors, firstError } from "@/lib/validation";
import { getIpHash, isSameOrigin, jsonError, jsonOk, rateLimit, readJson } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!commentsEnabled()) return jsonError(404, "Comments are turned off.");
  if (!isSameOrigin(request)) return jsonError(403, "Request blocked.");
  const body = await readJson(request);
  if (!body) return jsonError(400, "Invalid request.");

  const parsed = commentSchema.safeParse(body);
  if (!parsed.success) return jsonError(422, firstError(parsed.error), { fieldErrors: fieldErrors(parsed.error) });
  const msg = "Thanks! Your comment is awaiting moderation and will appear once approved.";
  if (parsed.data.website) return jsonOk({ message: msg });

  const ipHash = await getIpHash();
  const allowed =
    (await rateLimit(`comment:short:${ipHash}`, 3, 600)) && (await rateLimit(`comment:day:${ipHash}`, 15, 86_400));
  if (!allowed) return jsonError(429, "You're commenting too quickly. Please wait a few minutes.");

  // Only accept comments on posts that are actually public.
  const pub = getPublicClient();
  const db = createServiceClient();
  if (!pub || !db) return jsonError(503, "Comments aren't available yet.");
  const { data: post } = await pub
    .from("posts")
    .select("id")
    .eq("id", parsed.data.postId)
    .in("status", ["published", "scheduled"])
    .lte("published_at", new Date().toISOString())
    .maybeSingle();
  if (!post) return jsonError(404, "That article could not be found.");

  const { name, email, body: text } = parsed.data;
  const { error } = await db.from("comments").insert({
    post_id: post.id,
    author_name: name,
    author_email: email,
    body: text,
    status: looksLikeSpam(text) ? "spam" : "pending", // nothing is ever auto-approved
    ip_hash: ipHash,
  });
  if (error) {
    console.error("[comments] insert failed:", error.message);
    return jsonError(500, "Your comment could not be saved. Please try again.");
  }
  return jsonOk({ message: msg });
}
