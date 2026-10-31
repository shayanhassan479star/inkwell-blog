import Link from "next/link";
import { CommentActions } from "@/components/admin/moderation";
import { PageHeader } from "@/components/admin/ui";
import { EmptyState } from "@/components/ui/feedback";
import { COMMENT_FILTERS, listComments } from "@/lib/admin";
import { requireAdmin } from "@/lib/auth";
import { commentsEnabled } from "@/lib/env";
import { formatDate } from "@/lib/format";
import type { CommentStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Alert } from "@/components/ui/feedback";

export const metadata = { title: "Comments" };

export default async function CommentsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const ctx = await requireAdmin();
  const sp = await searchParams;
  const status: CommentStatus = COMMENT_FILTERS.includes(sp.status as CommentStatus) ? (sp.status as CommentStatus) : "pending";
  const comments = await listComments(ctx, status);

  return (
    <>
      <PageHeader title="Comments" description="Every new comment is held here until you approve it. Links and spam-like text are flagged automatically." />
      {!commentsEnabled() && <Alert kind="info" className="mb-6">Comments are currently switched off (<code>COMMENTS_ENABLED=false</code>); readers can&apos;t submit new ones.</Alert>}
      <nav aria-label="Filter by status" className="mb-5 flex flex-wrap gap-2">
        {COMMENT_FILTERS.map((s) => (
          <Link key={s} href={`/admin/comments?status=${s}`} aria-current={s === status ? "page" : undefined} className={cn("chip capitalize", s === status && "chip-active")}>{s}</Link>
        ))}
      </nav>
      {comments.length === 0 ? (
        <EmptyState title={`No ${status} comments`}>{status === "pending" ? "You're all caught up." : "Nothing here."}</EmptyState>
      ) : (
        <ul className="space-y-4">
          {comments.map((c) => (
            <li key={c.id} className="card p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <p><strong className="font-semibold">{c.author_name}</strong> <span className="text-muted-foreground">&lt;{c.author_email}&gt;</span></p>
                <time dateTime={c.created_at} className="text-xs text-muted-foreground">{formatDate(c.created_at)}</time>
              </div>
              {c.post && <p className="mt-1 text-xs text-muted-foreground">on <Link href={`/blog/${c.post.slug}`} target="_blank" className="underline hover:text-accent">{c.post.title}</Link></p>}
              {/* Rendered as text — React escapes it; comments are never treated as HTML. */}
              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed">{c.body}</p>
              <div className="mt-4"><CommentActions id={c.id} status={c.status} author={c.author_name} /></div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
