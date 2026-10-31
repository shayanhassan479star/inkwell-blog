import { notFound } from "next/navigation";
import { PostEditor } from "@/components/admin/post-editor";
import { getEditorOptions, getPostForEdit } from "@/lib/admin";
import { requireStaff } from "@/lib/auth";

export const metadata = { title: "Edit post" };

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireStaff();
  const { id } = await params;
  // Row Level Security returns nothing when an author asks for somebody else's post → 404, not 403 (no existence leak).
  const post = await getPostForEdit(ctx, id);
  if (!post) notFound();
  const { categories, tags, authors } = await getEditorOptions(ctx);
  return <PostEditor key={post.id} post={post} categories={categories} tags={tags} authors={authors} isAdmin={ctx.profile.role === "admin"} currentUserId={ctx.user.id} />;
}
