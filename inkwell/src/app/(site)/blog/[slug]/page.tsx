import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArticleView } from "@/components/site/article-view";
import { Comments } from "@/components/site/comments";
import { JsonLd } from "@/components/site/json-ld";
import { NewsletterForm } from "@/components/site/newsletter-form";
import { ReadingProgress } from "@/components/site/reading-progress";
import { ViewTracker } from "@/components/site/view-tracker";
import { Skeleton } from "@/components/ui/feedback";
import { newsletterEnabled } from "@/lib/env";
import { markdownToPlainText } from "@/lib/markdown";
import { getPostBySlug, getRelatedPosts } from "@/lib/posts";
import { absoluteUrl, site } from "@/lib/site";
import { truncate } from "@/lib/format";

type Props = { params: Promise<{ slug: string }> };

// Statically generated on first request, then regenerated in the background at most once a minute.
// Publishing/editing in the dashboard also triggers an immediate revalidation.
export const revalidate = 60;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPostBySlug((await params).slug);
  if (!post) return { title: "Article not found", robots: { index: false } };

  const title = post.seo_title || post.title;
  const description = post.meta_description || post.excerpt || truncate(markdownToPlainText(post.body), 155);
  const canonical = post.canonical_url || absoluteUrl(`/blog/${post.slug}`);
  return {
    title,
    description,
    alternates: { canonical },
    authors: post.author ? [{ name: post.author.display_name, url: absoluteUrl(`/author/${post.author.slug}`) }] : undefined,
    keywords: post.tags.map((t) => t.name),
    openGraph: {
      type: "article",
      title,
      description,
      url: absoluteUrl(`/blog/${post.slug}`),
      siteName: site.name,
      publishedTime: post.published_at ?? undefined,
      modifiedTime: post.updated_at,
      authors: post.author ? [post.author.display_name] : undefined,
      tags: post.tags.map((t) => t.name),
      // When there is no cover image, Next uses the generated opengraph-image next to this page.
      ...(post.cover_image_url ? { images: [{ url: post.cover_image_url, alt: post.cover_image_alt ?? post.title }] } : {}),
    },
    twitter: { card: "summary_large_image", title, description, ...(post.cover_image_url ? { images: [post.cover_image_url] } : {}) },
  };
}

export default async function ArticlePage({ params }: Props) {
  const post = await getPostBySlug((await params).slug);
  if (!post) notFound();
  const related = await getRelatedPosts(post.id, 3);

  const url = absoluteUrl(`/blog/${post.slug}`);
  const category = post.categories[0];
  const description = post.meta_description || post.excerpt || truncate(markdownToPlainText(post.body), 155);
  const wordCount = markdownToPlainText(post.body).split(/\s+/).filter(Boolean).length;

  const article = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: truncate(post.title, 110),
    description,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    image: post.cover_image_url ? [post.cover_image_url] : [absoluteUrl(`/blog/${post.slug}/opengraph-image`)],
    datePublished: post.published_at ?? undefined,
    dateModified: post.updated_at,
    wordCount,
    keywords: post.tags.map((t) => t.name).join(", ") || undefined,
    articleSection: category?.name,
    inLanguage: "en",
    author: post.author ? { "@type": "Person", name: post.author.display_name, url: absoluteUrl(`/author/${post.author.slug}`) } : undefined,
    publisher: { "@type": "Organization", name: site.name, url: site.url },
  };
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { name: "Home", item: absoluteUrl("/") },
      { name: "Articles", item: absoluteUrl("/blog") },
      ...(category ? [{ name: category.name, item: absoluteUrl(`/category/${category.slug}`) }] : []),
      { name: post.title, item: url },
    ].map((entry, i) => ({ "@type": "ListItem", position: i + 1, ...entry })),
  };

  return (
    <>
      <JsonLd data={[article, breadcrumbs]} />
      <ReadingProgress />
      <ViewTracker postId={post.id} />
      <ArticleView post={post} related={related}>
        <Suspense fallback={<div className="mt-16 space-y-3" aria-busy="true"><Skeleton className="h-8 w-40" /><Skeleton className="h-24 w-full" /></div>}>
          <Comments postId={post.id} />
        </Suspense>
        {newsletterEnabled() && (
          <aside className="card mt-16 p-6" aria-labelledby="article-nl">
            <h2 id="article-nl" className="text-xl font-semibold">Enjoyed this? Get the next one by email.</h2>
            <div className="mt-4"><NewsletterForm /></div>
          </aside>
        )}
      </ArticleView>
    </>
  );
}
