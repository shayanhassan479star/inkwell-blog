export default function AdminLoading() {
  return (
    <div role="status" aria-live="polite" className="space-y-6">
      <span className="sr-only">Loading…</span>
      <div className="skeleton h-10 w-64" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-28" />)}
      </div>
      <div className="skeleton h-64" />
    </div>
  );
}
