import { PostEditor } from "@/components/admin/post-editor";
import { getEditorOptions } from "@/lib/admin";
import { requireStaff } from "@/lib/auth";

export const metadata = { title: "New post" };

export default async function NewPostPage() {
  const ctx = await requireStaff();
  const { categories, tags, authors } = await getEditorOptions(ctx);
  return <PostEditor post={null} categories={categories} tags={tags} authors={authors} isAdmin={ctx.profile.role === "admin"} currentUserId={ctx.user.id} />;
}
