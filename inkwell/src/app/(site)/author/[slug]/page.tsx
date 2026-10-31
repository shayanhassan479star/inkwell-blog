import { Globe } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/site/avatar";
import { JsonLd } from "@/components/site/json-ld";
import { Pagination } from "@/components/site/pagination";
import { PostCard } from "@/components/site/post-card";
import { EmptyState } from "@/components/ui/feedback";
import { parsePage } from "@/lib/pagination";
import { getAuthorBySlug, getPostsPage } from "@/lib/posts";
import { absoluteUrl, site } from "@/lib/site";
import { truncate } from "@/lib/format";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string }> };
export const revalidate = 60;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const author = await getAuthorBySlug((await params).slug);
  if (!author) return { title: "Author not found", robots: { index: false } };
  return {
    title: author.display_name,
    description: truncate(author.bio ?? `Articles by ${author.display_name} on ${site.name}.`, 160),
    alternates: { canonical: `/author/${author.slug}` },
    openGraph: { type: "profile", title: author.display_name, url: absoluteUrl(`/author/${author.slug}`) },
  };
}

export default async function AuthorPage({ params, searchParams }: Props) {
  const author = await getAuthorBySlug((await params).slug);
  if (!author) notFound();
  const page = parsePage((await searchParams).page);
  const { posts, pageCount, total } = await getPostsPage({ page, authorId: author.id });

  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "ProfilePage", mainEntity: { "@type": "Person", name: author.display_name, description: author.bio ?? undefined, url: absoluteUrl(`/author/${author.slug}`), image: author.avatar_url ?? undefined, sameAs: author.website_url ? [author.website_url] : undefined } }} />
      <header className="container flex flex-col gap-6 pb-12 pt-12 md:flex-row md:items-center md:pt-20">
        <Avatar name={author.display_name} src={author.avatar_url} size={112} />
        <div>
          <p className="eyebrow mb-2">Author</p>
          <h1 className="text-4xl font-semibold md:text-6xl">{author.display_name}</h1>
          {author.bio && <p className="mt-4 max-w-2xl whitespace-pre-line text-lg text-muted-foreground">{author.bio}</p>}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span>{total} {total === 1 ? "article" : "articles"}</span>
            {author.website_url && (
              <a href={author.website_url} rel="me noopener noreferrer" target="_blank" className="inline-flex items-center gap-1.5 hover:text-accent"><Globe className="h-4 w-4" aria-hidden />Website</a>
            )}
          </div>
        </div>
      </header>
      <div className="container">
        {posts.length ? (
          <>
            <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">{posts.map((p) => <PostCard key={p.id} post={p} />)}</div>
            <Pagination page={page} pageCount={pageCount} hrefFor={(n) => (n === 1 ? `/author/${author.slug}` : `/author/${author.slug}?page=${n}`)} />
          </>
        ) : <EmptyState title="No articles yet">{author.display_name} hasn&apos;t published anything yet.</EmptyState>}
      </div>
    </>
  );
}
