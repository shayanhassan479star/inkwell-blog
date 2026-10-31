import type { MetadataRoute } from "next";
import { getAuthors, getCategories, getSitemapPosts, getTags } from "@/lib/posts";
import { absoluteUrl } from "@/lib/site";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/blog"), changeFrequency: "daily", priority: 0.9 },
    { url: absoluteUrl("/about"), changeFrequency: "yearly", priority: 0.5 },
    { url: absoluteUrl("/contact"), changeFrequency: "yearly", priority: 0.3 },
    { url: absoluteUrl("/privacy"), changeFrequency: "yearly", priority: 0.2 },
    { url: absoluteUrl("/terms"), changeFrequency: "yearly", priority: 0.2 },
  ];
  try {
    const [posts, categories, tags, authors] = await Promise.all([getSitemapPosts(), getCategories(), getTags(), getAuthors()]);
    for (const p of posts) entries.push({ url: absoluteUrl(`/blog/${p.slug}`), lastModified: new Date(p.updated_at), changeFrequency: "monthly", priority: 0.8 });
    for (const c of categories.filter((c) => c.post_count > 0)) entries.push({ url: absoluteUrl(`/category/${c.slug}`), changeFrequency: "weekly", priority: 0.6 });
    for (const t of tags.filter((t) => t.post_count > 0)) entries.push({ url: absoluteUrl(`/tag/${t.slug}`), changeFrequency: "weekly", priority: 0.4 });
    for (const a of authors) entries.push({ url: absoluteUrl(`/author/${a.slug}`), changeFrequency: "weekly", priority: 0.5 });
  } catch (err) {
    console.error("[sitemap] falling back to static entries:", (err as Error).message);
  }
  return entries;
}
