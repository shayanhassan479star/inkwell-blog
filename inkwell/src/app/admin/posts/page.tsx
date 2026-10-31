import Link from "next/link";
import { PenSquare, Search, Star } from "lucide-react";
import { PostRowActions } from "@/components/admin/post-row-actions";
import { PageHeader, StatusBadge } from "@/components/admin/ui";
import { Pagination } from "@/components/site/pagination";
import { EmptyState } from "@/components/ui/feedback";
import { listAdminPosts, POST_FILTERS, type PostFilter } from "@/lib/admin";
import { requireStaff } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { effectiveStatus } from "@/lib/post-status";
import { cn } from "@/lib/utils";

export const metadata = { title: "Posts" };

type PostsSearch = { status?: string; q?: string; page?: string };

export default async function PostsPage({ searchParams }: { searchParams: Promise<PostsSearch> }) {
  const ctx = await requireStaff();
  const sp = await searchParams;
  const status: PostFilter = POST_FILTERS.includes(sp.status as PostFilter) ? (sp.status as PostFilter) : "all";
  const q = (sp.q ?? "").slice(0, 100);
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const { rows, total, pageCount } = await listAdminPosts(ctx, { status, q, page });
  const isAdmin = ctx.profile.role === "admin";

  const href = (p: number, s: PostFilter = status) => {
    const params = new URLSearchParams();
    if (s !== "all") params.set("status", s);
    if (q) params.set("q", q);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `/admin/posts${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title="Posts"
        description={isAdmin ? "All articles on the site." : "Your articles. Drafts are only visible to you."}
        actions={<Link href="/admin/posts/new" className="btn btn-primary"><PenSquare className="h-4 w-4" aria-hidden />New post</Link>}
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
          {POST_FILTERS.map((s) => (
            <Link key={s} href={href(1, s)} aria-current={s === status ? "page" : undefined} className={cn("chip capitalize", s === status && "chip-active")}>{s}</Link>
          ))}
        </nav>
        <form role="search" action="/admin/posts" className="relative w-full sm:w-72">
          {status !== "all" && <input type="hidden" name="status" value={status} />}
          <label htmlFor="post-q" className="sr-only">Search posts by title</label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input id="post-q" name="q" defaultValue={q} placeholder="Search titles…" maxLength={100} className="input rounded-full pl-9" />
        </form>
      </div>

      {rows.length === 0 ? (
        <EmptyState title={q || status !== "all" ? "No posts match" : "No posts yet"} action={q || status !== "all" ? <Link href="/admin/posts" className="btn btn-outline">Clear filters</Link> : <Link href="/admin/posts/new" className="btn btn-primary">Write a post</Link>}>
          {q || status !== "all" ? "Try a different search or filter." : "Your first article is one click away."}
        </EmptyState>
      ) : (
        <div className="card overflow-hidden">
          <p className="border-b border-border px-5 py-3 text-xs text-muted-foreground" aria-live="polite">{total.toLocaleString("en-GB")} {total === 1 ? "post" : "posts"}</p>
          <ul className="divide-y divide-border">
            {rows.map((p) => {
              const st = effectiveStatus(p);
              return (
                <li key={p.id} className="grid gap-x-4 gap-y-2 px-5 py-4 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center">
                  <div className="min-w-0">
                    <Link href={`/admin/posts/${p.id}`} className="line-clamp-2 font-semibold hover:text-accent">
                      {p.is_featured && <Star className="mr-1 inline h-3.5 w-3.5 fill-accent text-accent" aria-label="Featured" />}
                      {p.title}
                    </Link>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {isAdmin && p.author ? `${p.author.display_name} · ` : ""}
                      {p.categories.length ? `${p.categories.join(", ")} · ` : ""}
                      {st === "scheduled" ? `Goes live ${formatDate(p.published_at ?? p.scheduled_at, "short")}` : st === "published" ? `Published ${formatDate(p.published_at, "short")}` : `Edited ${formatDate(p.updated_at, "short")}`}
                      {" · "}{p.view_count.toLocaleString("en-GB")} views
                    </p>
                  </div>
                  <StatusBadge status={st} />
                  <PostRowActions id={p.id} title={p.title} slug={p.slug} status={st} />
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <Pagination page={page} pageCount={pageCount} hrefFor={(p) => href(p)} />
    </>
  );
}
