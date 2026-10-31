import type { PostStatus } from "./types";

/**
 * What a post actually looks like to readers right now.
 * A post saved as "scheduled" whose time has passed is live, even though the stored status
 * still says "scheduled" (visibility is decided at query time — no cron job is required).
 */
export type EffectiveStatus = "draft" | "scheduled" | "published";

export function effectiveStatus(
  post: { status: PostStatus; published_at: string | null; scheduled_at?: string | null },
  now: Date = new Date(),
): EffectiveStatus {
  if (post.status === "draft") return "draft";
  const when = post.published_at ?? post.scheduled_at ?? null;
  if (post.status === "scheduled" && (!when || new Date(when) > now)) return "scheduled";
  return "published";
}

export const STATUS_LABEL: Record<EffectiveStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  published: "Published",
};
