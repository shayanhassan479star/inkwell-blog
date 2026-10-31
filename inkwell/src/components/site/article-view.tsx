import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { renderMarkdown } from "@/lib/markdown";
import { formatDate } from "@/lib/format";
import { absoluteUrl } from "@/lib/site";
import type { PostFull, PostSummary } from "@/lib/types";
import { Avatar } from "./avatar";
import { CoverImage } from "./cover-image";
import { PostCard } from "./post-card";
import { ShareButtons } from "./share-buttons";
import { TableOfContents } from "./toc";

/** The article layout, shared by the public page and the admin preview. */
export function ArticleView({ post, related = [], preview = false, children }: { post: PostFull; related?: PostSummary[]; preview?: boolean; children?: React.ReactNode }) {
  const { html, toc } = renderMarkdown(post.body);
  const category = post.categories[0];
  const url = absoluteUrl(`/blog/${post.slug}`);

  return (
    <article>
      <header className="container-prose pb-8 pt-10 md:pt-16">
        <nav aria-label="Breadcrumb" className="mb-6 text-xs text-muted-foreground">
          <ol className="flex flex-wrap items-center gap-1">
            <li><Link href="/" className="hover:text-accent">Home</Link></li>
            <ChevronRight className="h-3 w-3" aria-hidden />
            <li><Link href="/blog" className="hover:text-accent">Articles</Link></li>
            {category && (
              <>
                <ChevronRight className="h-3 w-3" aria-hidden />
                <li><Link href={`/category/${category.slug}`} className="hover:text-accent">{category.name}</Link></li>
              </>
            )}
          </ol>
        </nav>
        {category && <Link href={`/category/${category.slug}`} className="eyebrow hover:underline">{category.name}</Link>}
        <h1 className="mt-3 text-4xl font-semibold leading-[1.1] md:text-6xl">{post.title}</h1>
        {post.excerpt && <p className="mt-5 font-serif text-xl leading-relaxed text-muted-foreground">{post.excerpt}</p>}
        <div className="mt-8 flex items-center gap-3 border-y border-border py-4">
          {post.author && <Avatar name={post.author.display_name} src={post.author.avatar_url} size={44} />}
          <div className="text-sm">
            {post.author && (
              <Link href={`/author/${post.author.slug}`} rel="author" className="font-semibold hover:text-accent">{post.author.display_name}</Link>
            )}
            <p className="text-muted-foreground">
              {post.published_at ? <time dateTime={post.published_at}>{formatDate(post.published_at)}</time> : <span>Unpublished draft</span>}
              <span aria-hidden> · </span>
              {post.reading_time_minutes} min read
              {post.updated_at && post.published_at && new Date(post.updated_at).getTime() - new Date(post.published_at).getTime() > 7 * 86_400_000 && (
                <>
                  <span aria-hidden> · </span>Updated <time dateTime={post.updated_at}>{formatDate(post.updated_at)}</time>
                </>
              )}
            </p>
          </div>
        </div>
      </header>

      <div className="container max-w-5xl pb-10">
        <CoverImage src={post.cover_image_url} alt={post.cover_image_alt ?? ""} seed={post.slug} title={post.title} priority sizes="(min-width: 1024px) 960px, 100vw" className="aspect-[16/9] rounded-2xl" />
      </div>

      <div className="container grid gap-8 lg:grid-cols-[minmax(0,44rem)_15rem] lg:justify-center lg:gap-14">
        <div className="min-w-0">
          <div className="article-body" dangerouslySetInnerHTML={{ __html: html }} />
          {post.tags.length > 0 && (
            <ul className="mt-12 flex flex-wrap gap-2" aria-label="Tags">
              {post.tags.map((t) => (
                <li key={t.id}><Link href={`/tag/${t.slug}`} className="chip">#{t.name}</Link></li>
              ))}
            </ul>
          )}
          {!preview && <div className="mt-10 border-t border-border pt-6"><ShareButtons url={url} title={post.title} /></div>}

          {post.author && (
            <aside className="card mt-12 flex gap-4 p-6" aria-label="About the author">
              <Avatar name={post.author.display_name} src={post.author.avatar_url} size={56} />
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Written by</p>
                <p className="font-display text-xl font-semibold">
                  <Link href={`/author/${post.author.slug}`} className="hover:text-accent">{post.author.display_name}</Link>
                </p>
                <Link href={`/author/${post.author.slug}`} className="mt-1 inline-block text-sm text-accent hover:underline">More from this author →</Link>
              </div>
            </aside>
          )}
          {children}
        </div>
        <aside className="order-first lg:order-none">
          <div className="lg:sticky lg:top-28">
            <TableOfContents items={toc} />
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="container mt-20" aria-labelledby="related-heading">
          <h2 id="related-heading" className="mb-8 border-t border-foreground/80 pt-4 text-2xl font-semibold">Keep reading</h2>
          <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p) => <PostCard key={p.id} post={p} />)}
          </div>
        </section>
      )}
    </article>
  );
}
