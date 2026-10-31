import { z } from "zod";
import { getStaff } from "@/lib/auth";
import { getAiConfig, publicAiStatus } from "@/lib/ai/config";
import { AiError } from "@/lib/ai/providers";
import { runAiTool } from "@/lib/ai/run";
import { TOOL_IDS } from "@/lib/ai/tools";
import { dailyLimit, logUsage, perMinuteLimit, usedToday } from "@/lib/ai/usage";
import { hasServiceRole } from "@/lib/env";
import { isSameOrigin, jsonError, jsonOk, rateLimit, readJson } from "@/lib/security";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/** GET → whether AI is configured and how much of today's allowance is left. Never returns secrets. */
export async function GET() {
  const staff = await getStaff();
  if (!staff) return jsonError(401, "Please sign in.");
  const used = await usedToday(staff.user.id);
  const limit = dailyLimit();
  return jsonOk({ ...publicAiStatus(getAiConfig()), usedToday: used, dailyLimit: limit, remaining: Math.max(0, limit - used) });
}

const bodySchema = z.object({ tool: z.enum(TOOL_IDS), input: z.record(z.unknown()) });

/** POST → run one AI tool. The result is returned for human review; nothing is saved or published here. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, "Request blocked.");
  const staff = await getStaff();
  if (!staff) return jsonError(401, "Please sign in.");

  const config = getAiConfig();
  if (!config.configured) return jsonError(503, `AI tools are not configured on this server. ${config.reason}`, { code: "not_configured" });
  if (!hasServiceRole()) return jsonError(503, "Usage tracking needs SUPABASE_SERVICE_ROLE_KEY, so AI tools are disabled.", { code: "not_configured" });

  const body = await readJson(request, 120_000);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return jsonError(400, "Invalid request.");

  if (!(await rateLimit(`ai:min:${staff.user.id}`, perMinuteLimit(), 60))) {
    return jsonError(429, "You're going a little fast — wait a moment and try again.", { code: "rate_limited" });
  }
  const used = await usedToday(staff.user.id);
  const limit = dailyLimit();
  if (used >= limit) {
    return jsonError(429, `Daily AI limit reached (${limit} requests). It resets at 00:00 UTC.`, { code: "daily_limit" });
  }

  try {
    const result = await runAiTool(parsed.data.tool, parsed.data.input, config);
    await logUsage({ userId: staff.user.id, tool: parsed.data.tool, provider: result.provider, model: result.model, inputChars: result.inputChars, outputChars: result.text.length, ok: true });
    return jsonOk({
      text: result.text,
      seo: result.seo ?? null,
      truncated: result.truncated,
      model: result.model,
      remaining: Math.max(0, limit - used - 1),
    });
  } catch (err) {
    if (err instanceof AiError) {
      if (err.code !== "invalid") {
        await logUsage({ userId: staff.user.id, tool: parsed.data.tool, provider: config.provider, model: config.model, inputChars: 0, outputChars: 0, ok: false });
      }
      return jsonError(err.status, err.message, { code: err.code });
    }
    console.error("[ai] unexpected:", (err as Error)?.message);
    return jsonError(500, "Something went wrong while running the AI tool.");
  }
}
