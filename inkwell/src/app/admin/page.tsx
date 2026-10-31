import Link from "next/link";
import { PenSquare, Sparkles } from "lucide-react";
import { PageHeader, StatCard, StatusBadge, ViewsChart } from "@/components/admin/ui";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { getDashboardData } from "@/lib/admin";
import { getAiConfig } from "@/lib/ai/config";
import { requireStaff } from "@/lib/auth";
import { commentsEnabled, hasServiceRole, newsletterEnabled } from "@/lib/env";
import { formatDate } from "@/lib/format";
import { effectiveStatus } from "@/lib/post-status";

export const metadata = { title: "Overview" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const ctx = await requireStaff();
  const { denied } = await searchParams;
  const { stats, viewsByDay, recent, top } = await getDashboardData(ctx);
  const isAdmin = ctx.profile.role === "admin";
  const ai = getAiConfig();

  return (
    <>
      <PageHeader
        title={`Welcome back, ${ctx.profile.display_name.split(" ")[0]}`}
        description={isAdmin ? "Everything across the site at a glance." : "Your articles at a glance."}
        actions={
          <>
            <Link href="/admin/ai" className="btn btn-outline"><Sparkles className="h-4 w-4" aria-hidden />AI Studio</Link>
            <Link href="/admin/posts/new" className="btn btn-primary"><PenSquare className="h-4 w-4" aria-hidden />New post</Link>
          </>
        }
      />

      {denied && <Alert kind="error" className="mb-6">That area is only available to administrators.</Alert>}

      <section aria-label="Statistics" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total posts" value={stats.total_posts} />
        <StatCard label="Published" value={stats.published_posts} hint="Live on the site" />
        <StatCard label="Drafts" value={stats.draft_posts} hint="Private — only you can see them" />
        <StatCard label="Total views" value={stats.total_views} hint="Cookie-free, counted once per page load" />
      </section>

      {isAdmin && (
        <section aria-label="Reader activity" className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Scheduled" value={stats.scheduled_posts} hint="Going live automatically" />
          <Link href="/admin/comments" className="block transition-opacity hover:opacity-90"><StatCard label="Comments to review" value={stats.pending_comments} /></Link>
          <Link href="/admin/messages" className="block transition-opacity hover:opacity-90"><StatCard label="New messages" value={stats.new_messages} /></Link>
          <Link href="/admin/subscribers" className="block transition-opacity hover:opacity-90"><StatCard label="Subscribers" value={stats.subscribers} /></Link>
        </section>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section className="card p-6" aria-labelledby="views-h">
          <h2 id="views-h" className="text-xl font-semibold">Views, last 14 days</h2>
          <div className="mt-4"><ViewsChart data={viewsByDay} /></div>
        </section>

        <section className="card p-6" aria-labelledby="top-h">
          <h2 id="top-h" className="text-xl font-semibold">Most read</h2>
          {top.length === 0 || top.every((p) => p.view_count === 0) ? (
            <p className="mt-4 text-sm text-muted-foreground">No views yet. Publish an article and share it.</p>
          ) : (
            <ol className="mt-4 space-y-3">
              {top.map((p) => (
                <li key={p.id} className="flex items-baseline justify-between gap-3 text-sm">
                  <Link href={`/admin/posts/${p.id}`} className="line-clamp-1 font-medium hover:text-accent">{p.title}</Link>
                  <span className="shrink-0 tabular-nums text-muted-foreground">{p.view_count.toLocaleString("en-GB")}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <section className="card mt-6 p-6" aria-labelledby="recent-h">
        <div className="flex items-center justify-between">
          <h2 id="recent-h" className="text-xl font-semibold">Recently edited</h2>
          <Link href="/admin/posts" className="text-sm text-accent hover:underline">All posts →</Link>
        </div>
        {recent.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="No posts yet" action={<Link href="/admin/posts/new" className="btn btn-primary">Write your first post</Link>}>
              Start from a blank page, or let the AI Studio suggest topics and an outline.
            </EmptyState>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {recent.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <Link href={`/admin/posts/${p.id}`} className="min-w-0 flex-1 truncate font-medium hover:text-accent">{p.title}</Link>
                <StatusBadge status={effectiveStatus(p)} />
                <span className="w-28 text-right text-xs text-muted-foreground">{formatDate(p.updated_at, "short")}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {isAdmin && (
        <section className="card mt-6 p-6" aria-labelledby="status-h">
          <h2 id="status-h" className="text-xl font-semibold">System status</h2>
          <p className="mt-1 text-sm text-muted-foreground">What is and isn&apos;t configured on this server. Secrets are never shown.</p>
          <ul className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <StatusRow ok={hasServiceRole()} label="Server database key" detail={hasServiceRole() ? "Contact form, comments, views and AI limits can write data." : "SUPABASE_SERVICE_ROLE_KEY is missing — contact form, comments, view counts and AI are disabled."} />
            <StatusRow ok={ai.configured} label="AI writing assistant" detail={ai.configured ? `${ai.provider} · ${ai.model}` : ai.reason} />
            <StatusRow ok={commentsEnabled()} label="Comments" detail={commentsEnabled() ? "Enabled — every comment is held for your approval." : "Disabled (COMMENTS_ENABLED=false)."} neutral />
            <StatusRow ok={newsletterEnabled()} label="Newsletter sign-up" detail={newsletterEnabled() ? "Collects consented addresses. Sending needs an external email service." : "Disabled (NEWSLETTER_ENABLED=false)."} neutral />
          </ul>
        </section>
      )}
    </>
  );
}

function StatusRow({ ok, label, detail, neutral = false }: { ok: boolean; label: string; detail: string; neutral?: boolean }) {
  return (
    <li className="flex gap-3 rounded-xl border border-border p-4">
      <span aria-hidden className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${ok ? "bg-success" : neutral ? "bg-muted-foreground" : "bg-danger"}`} />
      <div>
        <p className="font-semibold">{label}<span className="sr-only">: {ok ? "on" : "off"}</span></p>
        <p className="text-muted-foreground">{detail}</p>
      </div>
    </li>
  );
}
