import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleView } from "@/components/site/article-view";
import { getPostForEdit } from "@/lib/admin";
import { requireStaff } from "@/lib/auth";
import { effectiveStatus } from "@/lib/post-status";

export const metadata = { title: "Preview", robots: { index: false, follow: false } };

/** Private preview of the last SAVED version, including drafts. Only the post's author or an admin can open it. */
export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireStaff();
  const post = await getPostForEdit(ctx, (await params).id);
  if (!post) notFound();
  const state = effectiveStatus(post);

  return (
    <div className="-mx-4 -my-8 sm:-mx-8 lg:-mx-10">
      <div className="sticky top-14 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-accent/30 bg-accent/10 px-4 py-2.5 text-sm backdrop-blur sm:px-8 lg:top-0 lg:px-10" role="status">
        <p><strong className="font-semibold">Preview</strong> — {state === "published" ? "this post is live." : state === "scheduled" ? "scheduled; visible only to you until it goes live." : "draft; visible only to you."} Shows the last saved version.</p>
        <Link href={`/admin/posts/${post.id}`} className="btn btn-primary btn-sm">← Back to editor</Link>
      </div>
      <ArticleView post={post} preview />
    </div>
  );
}
