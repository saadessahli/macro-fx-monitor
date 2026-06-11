import { NextResponse } from "next/server";
import { isButtondownConfigured, publishNewsletterEmail } from "@/lib/buttondown";
import { snapshotToMarkdown } from "@/lib/snapshot-content";
import {
  generateMacroSnapshot,
  loadSnapshotById,
  markSnapshotDelivered,
  saveMacroSnapshot,
} from "@/lib/snapshots";
import { isSupabaseConfigured } from "@/lib/supabase";
import { NewsletterFrequency } from "@/types";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isButtondownConfigured() || !isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Buttondown and Supabase must be configured." },
      { status: 503 }
    );
  }

  try {
    const payload = (await request.json().catch(() => ({}))) as {
      frequency?: NewsletterFrequency;
    };
    const frequency = payload.frequency === "monthly" ? "monthly" : "weekly";
    const snapshot = await generateMacroSnapshot(frequency);
    const existing = await loadSnapshotById(snapshot.id);

    if (existing?.delivery_status === "sent") {
      return NextResponse.json({
        ok: true,
        duplicate: true,
        snapshotId: snapshot.id,
        providerMessageId: existing.provider_message_id,
      });
    }

    await saveMacroSnapshot(snapshot);
    const email = await publishNewsletterEmail({
      subject: `${snapshot.title}: ${snapshot.dxyPlay.bias}`,
      body: snapshotToMarkdown(snapshot),
      slug: `${frequency}-macro-dxy-${snapshot.periodEnd}`,
      description: snapshot.summary,
      snapshotId: snapshot.id,
    });
    await markSnapshotDelivered(snapshot.id, email.id);

    return NextResponse.json({
      ok: true,
      snapshotId: snapshot.id,
      providerMessageId: email.id,
      archiveUrl: email.absolute_url ?? null,
    });
  } catch (error) {
    console.error("Snapshot publication failed", error);
    return NextResponse.json(
      { error: "Snapshot publication failed." },
      { status: 500 }
    );
  }
}
