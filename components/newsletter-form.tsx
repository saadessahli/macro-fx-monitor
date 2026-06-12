"use client";

import { FormEvent, useId, useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";

type FormState = "idle" | "submitting" | "success" | "error";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function NewsletterForm({
  compact = false,
  configured = true,
}: {
  compact?: boolean;
  configured?: boolean;
}) {
  const [state, setState] = useState<FormState>("idle");
  const [message, setMessage] = useState("");
  const emailId = useId();
  const messageId = `${emailId}-message`;

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
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const email = String(form.get("email") ?? "").trim().toLowerCase();

    if (!emailPattern.test(email) || email.length > 254) {
      setState("error");
      setMessage("Enter a valid email address.");
      return;
    }

    setState("submitting");
    setMessage("");

    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          company: form.get("company"),
        }),
      });
      const payload = (await response.json()) as { message?: string; error?: string };

      if (!response.ok) throw new Error(payload.error ?? "Subscription failed.");
      setState("success");
      setMessage(payload.message ?? "Check your inbox to confirm.");
      formElement.reset();
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
    <form
      className={`newsletter-form${compact ? " compact" : ""}`}
      onSubmit={handleSubmit}
      noValidate
    >
      <label className="newsletter-label" htmlFor={emailId}>
        Email address
      </label>
      <input
        id={emailId}
        type="email"
        name="email"
        placeholder="you@example.com"
        autoComplete="email"
        aria-describedby={message ? messageId : undefined}
        aria-invalid={state === "error"}
        onChange={() => {
          if (state === "error") {
            setState("idle");
            setMessage("");
          }
        }}
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
      <p className="newsletter-consent">
        Subscribe to receive the free weekly Macro FX Monitor review and occasional updates
        about related finance/data projects. Unsubscribe anytime.
      </p>
      {message ? (
        <p id={messageId} className="form-error" role="alert">
          {message}
        </p>
      ) : null}
    </form>
  );
}
