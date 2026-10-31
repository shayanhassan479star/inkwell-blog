import { ImageResponse } from "next/og";
import { getPostBySlug } from "@/lib/posts";
import { site } from "@/lib/site";

export const alt = "Article preview";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const post = await getPostBySlug((await params).slug);
  const title = post?.title ?? site.name;
  const author = post?.author?.display_name ?? "";
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#1c1917", color: "#faf7f2", padding: 80, fontFamily: "Georgia, serif" }}>
        <div style={{ fontSize: 28, letterSpacing: 6, textTransform: "uppercase", color: "#f08a6b", display: "flex" }}>{post?.categories[0]?.name ?? "Article"}</div>
        <div style={{ fontSize: title.length > 70 ? 56 : 76, lineHeight: 1.1, display: "flex" }}>{title.slice(0, 120)}</div>
        <div style={{ fontSize: 32, display: "flex", justifyContent: "space-between", width: "100%" }}>
          <span>{author}</span>
          <span>{site.name}</span>
        </div>
      </div>
    ),
    size,
  );
}
