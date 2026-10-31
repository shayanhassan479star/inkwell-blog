import "server-only";
import { intFromEnv } from "../env";
import { createServiceClient } from "../supabase/admin";

export const dailyLimit = () => intFromEnv("AI_DAILY_LIMIT_PER_USER", 40, 1, 10_000);
export const perMinuteLimit = () => intFromEnv("AI_REQUESTS_PER_MINUTE", 6, 1, 600);

function startOfUtcDay(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

/** Successful AI calls made by this user today (UTC). */
export async function usedToday(userId: string): Promise<number> {
  const db = createServiceClient();
  if (!db) return 0;
  const { count, error } = await db
    .from("ai_usage")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "ok")
    .gte("created_at", startOfUtcDay());
  if (error) {
    console.error("[ai] usage count failed:", error.message);
    return 0;
  }
  return count ?? 0;
}

/** Records metadata only (tool, size, outcome) — article text and prompts are never stored. */
export async function logUsage(row: {
  userId: string; tool: string; provider: string; model: string; inputChars: number; outputChars: number; ok: boolean;
}): Promise<void> {
  const db = createServiceClient();
  if (!db) return;
  const { error } = await db.from("ai_usage").insert({
    user_id: row.userId, tool: row.tool, provider: row.provider, model: row.model,
    input_chars: row.inputChars, output_chars: row.outputChars, status: row.ok ? "ok" : "error",
  });
  if (error) console.error("[ai] usage log failed:", error.message);
}
