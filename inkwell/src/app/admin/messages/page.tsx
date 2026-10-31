import Link from "next/link";
import { MessageActions } from "@/components/admin/moderation";
import { PageHeader } from "@/components/admin/ui";
import { EmptyState } from "@/components/ui/feedback";
import { listMessages } from "@/lib/admin";
import { requireAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import type { MessageStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export const metadata = { title: "Messages" };

const FILTERS: (MessageStatus | "all")[] = ["all", "new", "read", "archived"];

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const ctx = await requireAdmin();
  const sp = await searchParams;
  const status = FILTERS.includes(sp.status as MessageStatus | "all") ? (sp.status as MessageStatus | "all") : "all";
  const messages = await listMessages(ctx, status);

  return (
    <>
      <PageHeader title="Messages" description="Submissions from the contact form. Replying opens your own email app — this site doesn't send email." />
      <nav aria-label="Filter" className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((s) => (
          <Link key={s} href={`/admin/messages${s === "all" ? "" : `?status=${s}`}`} aria-current={s === status ? "page" : undefined} className={cn("chip capitalize", s === status && "chip-active")}>{s === "all" ? "Inbox" : s}</Link>
        ))}
      </nav>
      {messages.length === 0 ? (
        <EmptyState title="No messages">When a reader writes to you via the contact page it will appear here.</EmptyState>
      ) : (
        <ul className="space-y-4">
          {messages.map((m) => (
            <li key={m.id} className={cn("card p-5", m.status === "new" && "border-accent/50")}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-semibold">{m.status === "new" && <span className="mr-2 rounded-full bg-accent px-2 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wider text-accent-foreground">New</span>}{m.subject}</h2>
                <time dateTime={m.created_at} className="text-xs text-muted-foreground">{formatDate(m.created_at)}</time>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{m.name} · {m.email}</p>
              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed">{m.message}</p>
              <div className="mt-4"><MessageActions id={m.id} status={m.status} email={m.email} subject={m.subject} /></div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
