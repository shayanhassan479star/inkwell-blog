import { AiWorkbench, type AiStatus } from "@/components/admin/ai-workbench";
import { PageHeader } from "@/components/admin/ui";
import { getAiConfig } from "@/lib/ai/config";
import { dailyLimit, usedToday } from "@/lib/ai/usage";
import { requireStaff } from "@/lib/auth";

export const metadata = { title: "AI Studio" };

export default async function AiStudioPage() {
  const ctx = await requireStaff();
  const config = getAiConfig();
  let status: AiStatus;
  if (config.configured) {
    const used = await usedToday(ctx.user.id);
    const limit = dailyLimit();
    status = { configured: true, provider: config.provider, model: config.model, remaining: Math.max(0, limit - used), dailyLimit: limit };
  } else {
    status = { configured: false, reason: config.reason };
  }
  return (
    <>
      <PageHeader title="AI Studio" description="Research ideas, outline, draft, rewrite and optimise. You review and edit everything — the assistant never publishes." />
      <div className="card p-6 md:p-8">
        <AiWorkbench initialStatus={status} />
      </div>
    </>
  );
}
