import { renderMarkdown, markdownToPlainText } from "@/lib/markdown";
import { getFeedPosts } from "@/lib/posts";
import { absoluteUrl, site } from "@/lib/site";
import { truncate } from "@/lib/format";

export const revalidate = 600;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const cdata = (s: string) => `<![CDATA[${s.replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;

export async function GET() {
  let posts: Awaited<ReturnType<typeof getFeedPosts>> = [];
  try {
    posts = await getFeedPosts(30);
  } catch (err) {
    console.error("[rss] failed:", (err as Error).message);
  }
  const items = posts
    .map((p) => {
      const link = absoluteUrl(`/blog/${p.slug}`);
      return `<item>
<title>${esc(p.title)}</title>
<link>${link}</link>
<guid isPermaLink="true">${link}</guid>
${p.published_at ? `<pubDate>${new Date(p.published_at).toUTCString()}</pubDate>` : ""}
${p.author ? `<dc:creator>${esc(p.author.display_name)}</dc:creator>` : ""}
${p.categories.map((c) => `<category>${esc(c.name)}</category>`).join("")}
<description>${cdata(p.excerpt || truncate(markdownToPlainText(p.body), 280))}</description>
<content:encoded>${cdata(renderMarkdown(p.body).html)}</content:encoded>
</item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel>
<title>${esc(site.name)}</title>
<link>${site.url}</link>
<description>${esc(site.tagline)}</description>
<language>en</language>
<atom:link href="${absoluteUrl("/feed.xml")}" rel="self" type="application/rss+xml" />
${posts[0]?.published_at ? `<lastBuildDate>${new Date(posts[0].published_at).toUTCString()}</lastBuildDate>` : ""}
${items}
</channel>
</rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600" } });
}
