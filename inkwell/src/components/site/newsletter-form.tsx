"use client";

import { useState } from "react";
import { Alert, Spinner } from "@/components/ui/feedback";

export function NewsletterForm({ compact = false }: { compact?: boolean }) {
  const [state, setState] = useState<{ status: "idle" | "loading" | "done" | "error"; message?: string }>({ status: "idle" });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setState({ status: "loading" });
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: data.get("email"), consent: data.get("consent") === "on", website: data.get("website") }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        form.reset();
        setState({ status: "done", message: json.message });
      } else {
        setState({ status: "error", message: json.error ?? "Something went wrong. Please try again." });
      }
    } catch {
      setState({ status: "error", message: "Network error. Please check your connection and try again." });
    }
  }

  if (state.status === "done") return <Alert kind="success">{state.message}</Alert>;

  return (
    <form onSubmit={onSubmit} className="space-y-3" noValidate>
      <div className="flex gap-2">
        <label htmlFor={`nl-email-${compact ? "c" : "f"}`} className="sr-only">Email address</label>
        <input id={`nl-email-${compact ? "c" : "f"}`} name="email" type="email" required autoComplete="email" placeholder="you@example.com" className="input rounded-full" />
        <button type="submit" className="btn btn-primary shrink-0" disabled={state.status === "loading"}>
          {state.status === "loading" ? <Spinner /> : null}
          Subscribe
        </button>
      </div>
      {/* Honeypot: hidden from people, irresistible to bots */}
      <div className="absolute left-[-9999px] h-0 w-0 overflow-hidden" aria-hidden>
        <label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <label className="flex items-start gap-2 text-xs text-muted-foreground">
        <input type="checkbox" name="consent" required className="mt-0.5 h-4 w-4 rounded border-border accent-[hsl(var(--accent))]" />
        <span>
          I agree to receive occasional emails about new articles and can unsubscribe at any time. See the <a href="/privacy" className="underline">privacy policy</a>.
        </span>
      </label>
      {state.status === "error" && <p role="alert" className="field-error">{state.message}</p>}
    </form>
  );
}
