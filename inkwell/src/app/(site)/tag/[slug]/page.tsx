import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pagination } from "@/components/site/pagination";
import { PostCard } from "@/components/site/post-card";
import { PageHeader } from "@/components/site/section-heading";
import { EmptyState } from "@/components/ui/feedback";
import { parsePage } from "@/lib/pagination";
import { getPostsPage, getTagBySlug } from "@/lib/posts";
import { site } from "@/lib/site";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string }> };
export const revalidate = 60;

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const tag = await getTagBySlug((await params).slug);
  if (!tag) return { title: "Tag not found", robots: { index: false } };
  const page = parsePage((await searchParams).page);
  return {
    title: `#${tag.name}${page > 1 ? ` — page ${page}` : ""}`,
    description: `Articles tagged ${tag.name} on ${site.name}.`,
    alternates: { canonical: `/tag/${tag.slug}${page > 1 ? `?page=${page}` : ""}` },
  };
}

export default async function TagPage({ params, searchParams }: Props) {
  const tag = await getTagBySlug((await params).slug);
  if (!tag) notFound();
  const page = parsePage((await searchParams).page);
  const { posts, pageCount, total } = await getPostsPage({ page, tagId: tag.id });
  return (
    <>
      <PageHeader eyebrow="Tag" title={`#${tag.name}`} description={`${total} ${total === 1 ? "article" : "articles"} tagged “${tag.name}”.`} />
      <div className="container">
        {posts.length ? (
          <>
            <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">{posts.map((p) => <PostCard key={p.id} post={p} />)}</div>
            <Pagination page={page} pageCount={pageCount} hrefFor={(n) => (n === 1 ? `/tag/${tag.slug}` : `/tag/${tag.slug}?page=${n}`)} />
          </>
        ) : (
          <EmptyState title="Nothing here yet" action={<Link href="/blog" className="btn btn-outline">Browse all articles</Link>}>No published articles carry this tag.</EmptyState>
        )}
      </div>
    </>
  );
}
