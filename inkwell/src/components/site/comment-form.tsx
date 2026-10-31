"use client";

import { useState } from "react";
import { Alert, Spinner } from "@/components/ui/feedback";

export function CommentForm({ postId }: { postId: string }) {
  const [state, setState] = useState<{ status: "idle" | "loading" | "done" | "error"; message?: string; fields?: Record<string, string> }>({ status: "idle" });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const d = new FormData(form);
    setState({ status: "loading" });
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ postId, name: d.get("name"), email: d.get("email"), body: d.get("body"), consent: d.get("consent") === "on", website: d.get("website") }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        form.reset();
        setState({ status: "done", message: json.message });
      } else {
        setState({ status: "error", message: json.error ?? "Your comment could not be sent.", fields: json.fieldErrors });
      }
    } catch {
      setState({ status: "error", message: "Network error. Please try again." });
    }
  }

  if (state.status === "done") return <Alert kind="success">{state.message}</Alert>;
  const err = (k: string) => state.fields?.[k];

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="c-name">Name</label>
          <input id="c-name" name="name" required maxLength={80} autoComplete="name" className="input" aria-invalid={Boolean(err("name"))} />
          {err("name") && <p className="field-error">{err("name")}</p>}
        </div>
        <div>
          <label className="label" htmlFor="c-email">Email <span className="font-normal text-muted-foreground">(never shown)</span></label>
          <input id="c-email" name="email" type="email" required maxLength={254} autoComplete="email" className="input" aria-invalid={Boolean(err("email"))} />
          {err("email") && <p className="field-error">{err("email")}</p>}
        </div>
      </div>
      <div>
        <label className="label" htmlFor="c-body">Comment</label>
        <textarea id="c-body" name="body" required rows={5} minLength={2} maxLength={2000} className="input" aria-invalid={Boolean(err("body"))} />
        {err("body") && <p className="field-error">{err("body")}</p>}
      </div>
      <div className="absolute left-[-9999px] h-0 w-0 overflow-hidden" aria-hidden>
        <label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <label className="flex items-start gap-2 text-sm text-muted-foreground">
        <input type="checkbox" name="consent" required className="mt-1 h-4 w-4 accent-[hsl(var(--accent))]" />
        <span>I agree that my name and comment are stored and shown publicly once approved, as described in the <a className="underline" href="/privacy">privacy policy</a>.</span>
      </label>
      {state.status === "error" && <Alert kind="error">{state.message}</Alert>}
      <button type="submit" className="btn btn-primary" disabled={state.status === "loading"}>
        {state.status === "loading" && <Spinner />}Post comment
      </button>
      <p className="hint">Comments are reviewed before they appear.</p>
    </form>
  );
}
