import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/site/json-ld";
import { Pagination } from "@/components/site/pagination";
import { PostCard } from "@/components/site/post-card";
import { PageHeader } from "@/components/site/section-heading";
import { EmptyState } from "@/components/ui/feedback";
import { parsePage } from "@/lib/pagination";
import { getCategories, getCategoryBySlug, getPostsPage } from "@/lib/posts";
import { absoluteUrl, site } from "@/lib/site";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string }> };
export const revalidate = 60;

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const category = await getCategoryBySlug((await params).slug);
  if (!category) return { title: "Category not found", robots: { index: false } };
  const page = parsePage((await searchParams).page);
  const path = `/category/${category.slug}${page > 1 ? `?page=${page}` : ""}`;
  return {
    title: `${category.name}${page > 1 ? ` — page ${page}` : ""}`,
    description: category.description ?? `Articles filed under ${category.name} on ${site.name}.`,
    alternates: { canonical: path },
    openGraph: { title: category.name, description: category.description ?? undefined, url: absoluteUrl(path), type: "website" },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();
  const page = parsePage((await searchParams).page);
  const [{ posts, pageCount, total }, categories] = await Promise.all([getPostsPage({ page, categoryId: category.id }), getCategories()]);

  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "CollectionPage", name: category.name, description: category.description ?? undefined, url: absoluteUrl(`/category/${category.slug}`), isPartOf: { "@type": "WebSite", name: site.name, url: site.url } }} />
      <PageHeader eyebrow="Category" title={category.name} description={category.description ?? `${total} ${total === 1 ? "article" : "articles"}`} />
      <div className="container">
        <nav aria-label="Filter by category" className="mb-10 flex flex-wrap gap-2">
          <Link href="/blog" className="chip">All</Link>
          {categories.map((c) => (
            <Link key={c.id} href={`/category/${c.slug}`} aria-current={c.id === category.id ? "page" : undefined} className={c.id === category.id ? "chip chip-active" : "chip"}>
              {c.name} <span className="ml-1.5 opacity-60">{c.post_count}</span>
            </Link>
          ))}
        </nav>
        {posts.length ? (
          <>
            <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">{posts.map((p) => <PostCard key={p.id} post={p} />)}</div>
            <Pagination page={page} pageCount={pageCount} hrefFor={(n) => (n === 1 ? `/category/${category.slug}` : `/category/${category.slug}?page=${n}`)} />
          </>
        ) : (
          <EmptyState title="Nothing here yet" action={<Link href="/blog" className="btn btn-outline">Browse all articles</Link>}>No published articles in this category.</EmptyState>
        )}
      </div>
    </>
  );
}
