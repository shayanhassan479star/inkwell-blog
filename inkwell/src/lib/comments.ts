import "server-only";
import { createServiceClient } from "./supabase/admin";

export type PublicComment = { id: string; author_name: string; body: string; created_at: string };

/**
 * Approved comments for a post. Read with the service role because the comments table is not
 * readable through the public API (it contains e-mail addresses) — only safe columns are selected.
 */
export async function getApprovedComments(postId: string): Promise<PublicComment[]> {
  const db = createServiceClient();
  if (!db) return [];
  const { data, error } = await db
    .from("comments")
    .select("id, author_name, body, created_at")
    .eq("post_id", postId)
    .eq("status", "approved")
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) {
    console.error("[comments] read failed:", error.message);
    return [];
  }
  return data as PublicComment[];
}
