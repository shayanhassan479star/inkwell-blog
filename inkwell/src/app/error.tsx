"use client";
import Link from "next/link";
import { useEffect } from "react";

/** Friendly error boundary. The real error is logged; its message is never shown to visitors. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="container flex min-h-[60vh] flex-col items-start justify-center py-20">
      <p className="eyebrow mb-3">Something went wrong</p>
      <h1 className="max-w-2xl text-4xl font-semibold md:text-6xl">We couldn&apos;t load this page.</h1>
      <p className="mt-4 max-w-lg text-muted-foreground">It&apos;s probably temporary. Please try again — if it keeps happening, let us know{error.digest ? ` (reference ${error.digest})` : ""}.</p>
      <div className="mt-8 flex gap-3">
        <button onClick={reset} className="btn btn-primary px-6 py-3">Try again</button>
       <Link href="/" className="btn btn-outline px-6 py-3">Go home</Link>
      </div>
    </div>
  );
}
