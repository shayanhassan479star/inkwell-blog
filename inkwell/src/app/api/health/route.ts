import { hasServiceRole, hasSupabase } from "@/lib/env";
import { getAiConfig } from "@/lib/ai/config";

export const dynamic = "force-dynamic";

/** Reports WHICH features are configured — never any values. Handy for deployment checks. */
export function GET() {
  return Response.json(
    {
      ok: true,
      supabase: hasSupabase(),
      serviceRole: hasServiceRole(),
      ai: getAiConfig().configured,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
