import { NextResponse } from "next/server";
import {
  ButtondownRequestError,
  isButtondownConfigured,
  subscribeToNewsletter,
} from "@/lib/buttondown";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const successMessage =
  "If this address is new, check your inbox to confirm. If you already subscribed, you're all set.";

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  if (!isButtondownConfigured()) {
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

  // Honeypot field. Bots commonly fill every visible or hidden input.
  if (body?.company) {
    return json({ ok: true, message: successMessage });
  }

  if (!emailPattern.test(email) || email.length > 254) {
    return json(
      { ok: false, code: "INVALID_EMAIL", error: "Enter a valid email address." },
      400
    );
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  const ipAddress = forwardedFor?.split(",")[0]?.trim();

  try {
    await subscribeToNewsletter(email, ipAddress);
    return json({
      ok: true,
      message: successMessage,
    });
  } catch (error) {
    console.error("Newsletter subscription failed", error);

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

    return json(
      {
        ok: false,
        code: "PROVIDER_ERROR",
        error: "Subscription could not be completed. Please try again shortly.",
      },
      502
    );
  }
}
