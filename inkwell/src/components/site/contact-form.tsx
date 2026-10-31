"use client";

import { useState } from "react";
import { Alert, Spinner } from "@/components/ui/feedback";

export function ContactForm() {
  const [state, setState] = useState<{ status: "idle" | "loading" | "done" | "error"; message?: string; fields?: Record<string, string> }>({ status: "idle" });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const d = new FormData(form);
    setState({ status: "loading" });
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: d.get("name"), email: d.get("email"), subject: d.get("subject"), message: d.get("message"), consent: d.get("consent") === "on", website: d.get("website") }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        form.reset();
        setState({ status: "done", message: json.message });
      } else {
        setState({ status: "error", message: json.error ?? "Your message could not be sent.", fields: json.fieldErrors });
      }
    } catch {
      setState({ status: "error", message: "Network error. Please check your connection and try again." });
    }
  }

  if (state.status === "done") {
    return (
      <Alert kind="success" title="Message sent">
        {state.message}
      </Alert>
    );
  }
  const err = (k: string) => state.fields?.[k];

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="ct-name">Your name</label>
          <input id="ct-name" name="name" required maxLength={100} autoComplete="name" className="input" aria-invalid={Boolean(err("name"))} />
          {err("name") && <p className="field-error">{err("name")}</p>}
        </div>
        <div>
          <label className="label" htmlFor="ct-email">Email</label>
          <input id="ct-email" name="email" type="email" required maxLength={254} autoComplete="email" className="input" aria-invalid={Boolean(err("email"))} />
          {err("email") && <p className="field-error">{err("email")}</p>}
        </div>
      </div>
      <div>
        <label className="label" htmlFor="ct-subject">Subject</label>
        <input id="ct-subject" name="subject" required maxLength={150} className="input" aria-invalid={Boolean(err("subject"))} />
        {err("subject") && <p className="field-error">{err("subject")}</p>}
      </div>
      <div>
        <label className="label" htmlFor="ct-message">Message</label>
        <textarea id="ct-message" name="message" required rows={7} minLength={5} maxLength={5000} className="input" aria-invalid={Boolean(err("message"))} />
        {err("message") && <p className="field-error">{err("message")}</p>}
      </div>
      <div className="absolute left-[-9999px] h-0 w-0 overflow-hidden" aria-hidden>
        <label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <label className="flex items-start gap-2 text-sm text-muted-foreground">
        <input type="checkbox" name="consent" required className="mt-1 h-4 w-4 accent-[hsl(var(--accent))]" />
        <span>I agree that my details will be used to reply to this message, as described in the <a className="underline" href="/privacy">privacy policy</a>.</span>
      </label>
      {err("consent") && <p className="field-error">{err("consent")}</p>}
      {state.status === "error" && <Alert kind="error">{state.message}</Alert>}
      <button type="submit" className="btn btn-primary" disabled={state.status === "loading"}>
        {state.status === "loading" && <Spinner />}Send message
      </button>
    </form>
  );
}
