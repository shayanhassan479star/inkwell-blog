"use client";

import { useEffect } from "react";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="card mx-auto max-w-lg p-8 text-center" role="alert">
      <h1 className="text-2xl font-semibold">That didn&apos;t load</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The dashboard couldn&apos;t reach the database. Check that Supabase is configured and the migrations have been applied{error.digest ? ` (reference ${error.digest})` : ""}.
      </p>
      <button onClick={reset} className="btn btn-primary mt-6">Try again</button>
    </div>
  );
}
