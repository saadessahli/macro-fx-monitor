import { NextResponse } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import {
  buttondownErrorCode,
  ButtondownRequestError,
  isButtondownAccountUnderReview,
  isButtondownConfigured,
  subscribeToNewsletter,
} from "@/lib/buttondown";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function emailFingerprint(email: string) {
  return createHash("sha256").update(email).digest("hex").slice(0, 12);
}

function logSubscription(
  level: "info" | "warn" | "error",
  event: Record<string, unknown>
) {
  const entry = JSON.stringify({ scope: "newsletter-subscription", ...event });
  if (level === "error") console.error(entry);
  else if (level === "warn") console.warn(entry);
  else console.info(entry);
}

export async function POST(request: Request) {
  const requestId = request.headers.get("x-vercel-id") ?? randomUUID();

  if (!isButtondownConfigured()) {
    logSubscription("error", {
      requestId,
      outcome: "configuration_missing",
      variable: "BUTTONDOWN_API_KEY",
    });
    return json(
      {
        ok: false,
        code: "NEWSLETTER_UNAVAILABLE",
        error: "Newsletter subscriptions are temporarily unavailable.",
      },
      503
    );
  }

  const body = (await request.json().catch(() => null)) as
    | { email?: unknown; company?: unknown }
    | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const fingerprint = email ? emailFingerprint(email) : "missing";

  // Honeypot field. Bots commonly fill every visible or hidden input.
  if (body?.company) {
    logSubscription("warn", {
      requestId,
      emailFingerprint: fingerprint,
      outcome: "honeypot_rejected",
    });
    return json(
      {
        ok: false,
        code: "AUTOMATION_REJECTED",
        error: "Subscription could not be processed. Clear autofilled hidden fields and try again.",
      },
      422
    );
  }

  if (!emailPattern.test(email) || email.length > 254) {
    logSubscription("warn", {
      requestId,
      emailFingerprint: fingerprint,
      outcome: "invalid_email",
    });
    return json(
      { ok: false, code: "INVALID_EMAIL", error: "Enter a valid email address." },
      400
    );
  }

  try {
    const result = await subscribeToNewsletter(email);
    logSubscription("info", {
      requestId,
      emailFingerprint: fingerprint,
      outcome: result.created ? "created_and_verified" : "already_registered",
      subscriberId: result.subscriber.id,
      subscriberStatus: result.subscriber.type,
    });

    return json(
      {
        ok: true,
        code: result.created ? "SUBSCRIBER_CREATED" : "SUBSCRIBER_EXISTS",
        message: result.created
          ? "You're registered. Check your inbox to confirm your subscription."
          : result.subscriber.type === "unactivated"
            ? "This address is already registered. Check your inbox for the confirmation email."
            : "This address is already subscribed.",
      },
      result.created ? 201 : 200
    );
  } catch (error) {
    const providerCode =
      error instanceof ButtondownRequestError ? buttondownErrorCode(error) : null;
    logSubscription("error", {
      requestId,
      emailFingerprint: fingerprint,
      outcome: "provider_error",
      providerStatus: error instanceof ButtondownRequestError ? error.status : null,
      providerCode,
      errorType: error instanceof Error ? error.name : "UnknownError",
    });

    if (error instanceof ButtondownRequestError && error.status === 429) {
      return json(
        {
          ok: false,
          code: "RATE_LIMITED",
          error: "Too many signup attempts. Please try again shortly.",
        },
        429
      );
    }

    if (error instanceof ButtondownRequestError && isButtondownAccountUnderReview(error)) {
      return json(
        {
          ok: false,
          code: "BUTTONDOWN_REVIEW_PENDING",
          error:
            "Newsletter signup is temporarily paused while Buttondown reviews the sender account. Please try again later.",
        },
        503
      );
    }

    if (
      error instanceof ButtondownRequestError &&
      error.status === 400 &&
      providerCode === "subscriber_blocked"
    ) {
      return json(
        {
          ok: false,
          code: "ADDRESS_REJECTED",
          error:
            "Buttondown could not register this address. Try a different email address or contact us.",
        },
        422
      );
    }

    return json(
      {
        ok: false,
        code: "PROVIDER_ERROR",
        error:
          "The newsletter provider did not confirm registration. Please try again shortly.",
      },
      502
    );
  }
}
