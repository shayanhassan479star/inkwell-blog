import Link from "next/link";
import { formatDate } from "@/lib/format";
import type { PostSummary } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CoverImage } from "./cover-image";

function Meta({ post }: { post: PostSummary }) {
  return (
    <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
      {post.published_at && <time dateTime={post.published_at}>{formatDate(post.published_at, "short")}</time>}
      <span aria-hidden>·</span>
      <span>{post.reading_time_minutes} min read</span>
    </p>
  );
}

function CategoryLabel({ post }: { post: PostSummary }) {
  const cat = post.categories[0];
  if (!cat) return null;
  return (
    <Link href={`/category/${cat.slug}`} className="eyebrow relative z-10 hover:underline">
      {cat.name}
    </Link>
  );
}

/** variant: "default" vertical card · "lead" large hero card · "compact" text-only row */
export function PostCard({ post, variant = "default", priority = false }: { post: PostSummary; variant?: "default" | "lead" | "compact"; priority?: boolean }) {
  if (variant === "compact") {
    return (
      <article className="group relative flex gap-4 border-b border-border py-4 last:border-b-0">
        <div className="min-w-0 flex-1">
          <CategoryLabel post={post} />
          <h3 className="mt-1 font-display text-lg font-semibold leading-snug">
            <Link href={`/blog/${post.slug}`} className="after:absolute after:inset-0 group-hover:text-accent">{post.title}</Link>
          </h3>
          <div className="mt-1"><Meta post={post} /></div>
        </div>
      </article>
    );
  }

  const lead = variant === "lead";
  return (
    <article className={cn("group relative flex flex-col", lead && "lg:grid lg:grid-cols-5 lg:gap-8")}>
      <Link href={`/blog/${post.slug}`} tabIndex={-1} aria-hidden className={cn("block overflow-hidden rounded-2xl", lead && "lg:col-span-3")}>
        <CoverImage src={post.cover_image_url} alt="" seed={post.slug} title={post.title} priority={priority} sizes={lead ? "(min-width: 1024px) 60vw, 100vw" : undefined} className={lead ? "lg:aspect-[4/3]" : undefined} />
      </Link>
      <div className={cn("flex flex-1 flex-col pt-4", lead && "lg:col-span-2 lg:justify-center lg:pt-0")}>
        <CategoryLabel post={post} />
        <h3 className={cn("mt-2 font-display font-semibold leading-tight", lead ? "text-3xl md:text-4xl" : "text-xl")}>
          <Link href={`/blog/${post.slug}`} className="after:absolute after:inset-0 group-hover:text-accent">{post.title}</Link>
        </h3>
        {post.excerpt && <p className={cn("mt-2 text-muted-foreground", lead ? "text-base" : "line-clamp-3 text-sm")}>{post.excerpt}</p>}
        <div className="mt-3 flex items-center gap-2">
          {post.author && <span className="text-xs font-medium">{post.author.display_name}</span>}
          {post.author && <span aria-hidden className="text-xs text-muted-foreground">·</span>}
          <Meta post={post} />
        </div>
      </div>
    </article>
  );
}

export function PostGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading articles">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-3">
          <div className="skeleton aspect-[16/10] w-full" />
          <div className="skeleton h-3 w-20" />
          <div className="skeleton h-6 w-11/12" />
          <div className="skeleton h-4 w-full" />
        </div>
      ))}
    </div>
  );
}
