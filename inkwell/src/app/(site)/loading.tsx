import { PostGridSkeleton } from "@/components/site/post-card";

export default function Loading() {
  return (
    <div className="container py-16" role="status" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="skeleton mb-4 h-4 w-24" />
      <div className="skeleton mb-12 h-12 w-2/3 max-w-xl" />
      <PostGridSkeleton />
    </div>
  );
}
