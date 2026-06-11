"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";

type FormState = "idle" | "submitting" | "success" | "error";

export function NewsletterForm({
  compact = false,
  configured = true,
}: {
  compact?: boolean;
  configured?: boolean;
}) {
  const [state, setState] = useState<FormState>("idle");
  const [message, setMessage] = useState("");

  if (!configured) {
    return (
      <div className="newsletter-unavailable" role="status">
        <span>Newsletter signup is launching soon.</span>
        <small>The public dashboard is fully available in the meantime.</small>
      </div>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setState("submitting");
    setMessage("");

    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          company: form.get("company"),
        }),
      });
      const payload = (await response.json()) as { message?: string; error?: string };

      if (!response.ok) throw new Error(payload.error ?? "Subscription failed.");
      setState("success");
      setMessage(payload.message ?? "Check your inbox to confirm.");
      event.currentTarget.reset();
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Subscription failed.");
    }
  }

  if (state === "success") {
    return (
      <div className="newsletter-success" role="status">
        <CheckCircle2 size={18} />
        <span>{message}</span>
      </div>
    );
  }

  return (
    <form className={`newsletter-form${compact ? " compact" : ""}`} onSubmit={handleSubmit}>
      <input
        aria-label="Email address"
        type="email"
        name="email"
        placeholder="you@example.com"
        autoComplete="email"
        required
        maxLength={254}
      />
      <input
        className="form-honeypot"
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />
      <button type="submit" disabled={state === "submitting"}>
        {state === "submitting" ? "Joining..." : "Get the weekly snapshot"}
        <ArrowRight size={15} />
      </button>
      {message ? <p className="form-error" role="alert">{message}</p> : null}
    </form>
  );
}
