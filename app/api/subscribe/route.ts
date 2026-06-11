import { NextResponse } from "next/server";
import { isButtondownConfigured, subscribeToNewsletter } from "@/lib/buttondown";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  if (!isButtondownConfigured()) {
    return NextResponse.json(
      { error: "Newsletter subscriptions are not configured yet." },
      { status: 503 }
    );
  }

  const body = (await request.json().catch(() => null)) as
    | { email?: string; company?: string }
    | null;
  const email = body?.email?.trim().toLowerCase() ?? "";

  // Honeypot field. Bots commonly fill every visible or hidden input.
  if (body?.company) {
    return NextResponse.json({ ok: true });
  }

  if (!emailPattern.test(email) || email.length > 254) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  const ipAddress = forwardedFor?.split(",")[0]?.trim();

  try {
    await subscribeToNewsletter(email, ipAddress);
    return NextResponse.json({
      ok: true,
      message: "Check your inbox to confirm your subscription.",
    });
  } catch (error) {
    console.error("Newsletter subscription failed", error);
    return NextResponse.json(
      { error: "Subscription could not be completed. Please try again shortly." },
      { status: 502 }
    );
  }
}
