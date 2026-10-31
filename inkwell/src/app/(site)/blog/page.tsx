import type { Metadata } from "next";
import Link from "next/link";
import { Pagination } from "@/components/site/pagination";
import { PostCard } from "@/components/site/post-card";
import { PageHeader } from "@/components/site/section-heading";
import { SetupNotice } from "@/components/site/setup-notice";
import { EmptyState } from "@/components/ui/feedback";
import { hasSupabase } from "@/lib/env";
import { getCategories, getPostsPage } from "@/lib/posts";
import { parsePage } from "@/lib/pagination";

type Props = { searchParams: Promise<{ page?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const page = parsePage((await searchParams).page);
  return {
    title: page > 1 ? `All articles — page ${page}` : "All articles",
    description: "Browse every article, newest first.",
    alternates: { canonical: page > 1 ? `/blog?page=${page}` : "/blog" },
  };
}

export const revalidate = 60;

export default async function BlogPage({ searchParams }: Props) {
  if (!hasSupabase()) return <SetupNotice />;
  const page = parsePage((await searchParams).page);
  const [{ posts, pageCount, total }, categories] = await Promise.all([getPostsPage({ page }), getCategories()]);

  return (
    <>
      <PageHeader eyebrow="Archive" title="All articles" description={total ? `${total} ${total === 1 ? "article" : "articles"}, newest first.` : undefined} />
      <div className="container">
        {categories.length > 0 && (
          <nav aria-label="Filter by category" className="mb-10 flex flex-wrap gap-2">
            <span className="chip chip-active" aria-current="page">All</span>
            {categories.map((c) => <Link key={c.id} href={`/category/${c.slug}`} className="chip">{c.name} <span className="ml-1.5 opacity-60">{c.post_count}</span></Link>)}
          </nav>
        )}
        {posts.length ? (
          <>
            <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((p, i) => <PostCard key={p.id} post={p} priority={i < 3} />)}
            </div>
            <Pagination page={page} pageCount={pageCount} hrefFor={(n) => (n === 1 ? "/blog" : `/blog?page=${n}`)} />
          </>
        ) : (
          <EmptyState title={page > 1 ? "No more articles" : "No articles yet"} action={page > 1 ? <Link href="/blog" className="btn btn-outline">Back to the first page</Link> : undefined}>
            {page > 1 ? "That page doesn't exist." : "Check back soon — new writing is on its way."}
          </EmptyState>
        )}
      </div>
    </>
  );
}
