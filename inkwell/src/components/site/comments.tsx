import { getApprovedComments } from "@/lib/comments";
import { commentsEnabled } from "@/lib/env";
import { formatDate } from "@/lib/format";
import { CommentForm } from "./comment-form";

export async function Comments({ postId }: { postId: string }) {
  if (!commentsEnabled()) return null;
  const comments = await getApprovedComments(postId);
  return (
    <section aria-labelledby="comments-heading" className="mt-16">
      <h2 id="comments-heading" className="text-2xl font-semibold">
        {comments.length ? `${comments.length} ${comments.length === 1 ? "comment" : "comments"}` : "Comments"}
      </h2>
      {comments.length === 0 && <p className="mt-2 text-sm text-muted-foreground">No comments yet — be the first to join the conversation.</p>}
      <ol className="mt-6 space-y-6">
        {comments.map((c) => (
          <li key={c.id} className="card p-5">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-semibold">{c.author_name}</p>
              <time dateTime={c.created_at} className="text-xs text-muted-foreground">{formatDate(c.created_at)}</time>
            </div>
            {/* Rendered as plain text: React escapes it, whitespace is preserved with CSS. */}
            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed">{c.body}</p>
          </li>
        ))}
      </ol>
      <div className="mt-10">
        <h3 className="mb-4 text-xl font-semibold">Leave a comment</h3>
        <CommentForm postId={postId} />
      </div>
    </section>
  );
}
