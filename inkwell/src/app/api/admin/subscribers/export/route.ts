import { getAdmin } from "@/lib/auth";
import { jsonError } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Neutralise spreadsheet formula injection: cells starting with = + - @ are prefixed with an apostrophe. */
function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

/** Admin-only CSV of active subscribers (email, consent date). */
export async function GET() {
  const ctx = await getAdmin();
  if (!ctx) return jsonError(401, "Please sign in as an administrator.");
  const { data, error } = await ctx.supabase
    .from("subscribers")
    .select("email, consent_at, consent_text")
    .is("unsubscribed_at", null)
    .order("created_at", { ascending: true })
    .limit(50_000);
  if (error) {
    console.error("[subscribers export]", error.message);
    return jsonError(500, "Couldn't export subscribers.");
  }
  const lines = ["email,consent_at,consent_text", ...(data ?? []).map((r) => [csvCell(r.email), csvCell(r.consent_at), csvCell(r.consent_text)].join(","))];
  return new Response(`${lines.join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="subscribers-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
