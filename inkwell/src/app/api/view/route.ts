import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/admin";
import { BOT_UA, getIpHash, isSameOrigin, rateLimit, readJson } from "@/lib/security";

export const runtime = "nodejs";

/** Privacy-friendly view counter: no cookies, no IP stored, bots ignored, one count per visitor per post per 30 min. */
export async function POST(request: Request) {
  const done = () => new Response(null, { status: 204 });
  if (!isSameOrigin(request)) return done();
  if (BOT_UA.test(request.headers.get("user-agent") ?? "")) return done();
  const body = await readJson(request, 500);
  const parsed = z.object({ postId: z.string().uuid() }).safeParse(body);
  if (!parsed.success) return done();

  const ipHash = await getIpHash();
  if (!(await rateLimit(`view:${ipHash}:${parsed.data.postId}`, 1, 1800))) return done();
  const db = createServiceClient();
  if (!db) return done();
  const { error } = await db.rpc("record_post_view", { p_post_id: parsed.data.postId });
  if (error) console.error("[view] rpc failed:", error.message);
  return done();
}
