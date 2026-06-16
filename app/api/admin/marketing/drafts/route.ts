import { NextResponse } from "next/server";
import { getAuthenticatedUser, isAdminEmail } from "@/lib/admin";
import { createMarketingDraft } from "@/lib/marketing-agent";
import { buildContextBrief } from "@/lib/marketing-context-brief";
import { listMarketingDrafts, saveMarketingDraft } from "@/lib/marketing-drafts";
import { DEFAULT_MARKETING_SETTINGS, getMarketingSettings } from "@/lib/marketing-settings";
import { MARKETING_TOPIC_BANK } from "@/lib/marketing-plan";
import { listPostPerformance } from "@/lib/post-performance";
import { generateMacroSnapshot, loadRecentSnapshots } from "@/lib/snapshots";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { MarketingTone, XContentType } from "@/types";
import { scoreMarketingText } from "@/lib/marketing-quality";

const contentTypes = new Set<XContentType>([
  "single",
  "thread",
  "educational",
  "driver",
  "weekly-recap",
  "contrarian",
]);

async function authorized() {
  const user = await getAuthenticatedUser();
  return Boolean(user && isAdminEmail(user.email));
}

export async function GET() {
  if (!(await authorized())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    return NextResponse.json({ drafts: await listMarketingDrafts() });
  } catch {
    return NextResponse.json({ error: "Draft storage is unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!(await authorized())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as {
    contentType?: XContentType;
    topic?: string;
    tone?: MarketingTone;
    instruction?: string;
    sourceText?: string;
    status?: "draft" | "needs_review";
  } | null;
  if (!body?.contentType || !contentTypes.has(body.contentType)) {
    return NextResponse.json({ error: "Invalid content type." }, { status: 400 });
  }

  const stored = isSupabaseConfigured()
    ? await loadRecentSnapshots("weekly", 2).catch(() => [])
    : [];
  const snapshot = stored[0] ?? await generateMacroSnapshot("weekly");
  const existingDrafts = await listMarketingDrafts(40).catch(() => []);
  const settings = await getMarketingSettings().catch(() => DEFAULT_MARKETING_SETTINGS);
  const performanceRecords = isSupabaseConfigured()
    ? await listPostPerformance().catch(() => [])
    : [];
  const contextBrief = buildContextBrief(performanceRecords, existingDrafts);
  const topic = String(body.topic ?? MARKETING_TOPIC_BANK[0]).slice(0, 160);
  const tone = body.tone ?? settings.defaultTone;
  const instruction = String(body.instruction ?? "").slice(0, 1000);
  const draft = await createMarketingDraft(body.contentType, snapshot, stored[1] ?? null, {
    topic,
    tone,
    instruction,
    recentTexts: existingDrafts.map((item) => item.textContent),
    settings,
    contextBrief,
  });
  const sourceText = String(body.sourceText ?? "").trim().slice(0, 4000);
  if (sourceText) {
    draft.textContent = sourceText;
    draft.threadPosts = body.contentType === "thread"
      ? sourceText.split(/\n-{3,}\n/).map((item) => item.trim()).filter(Boolean)
      : [];
    draft.qualityScores = scoreMarketingText(
      sourceText,
      existingDrafts.map((item) => item.textContent)
    );
    draft.status = body.status === "needs_review" ? "needs_review" : "draft";
    draft.manuallyPostedAt = null;
    draft.title = `${topic} | ${body.contentType === "thread" ? "Thread idea" : "Daily X idea"}`;
  }

  try {
    const saved = await saveMarketingDraft(draft);
    return NextResponse.json({ draft: saved }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "The draft was generated but could not be saved. Apply the Supabase migration." },
      { status: 503 }
    );
  }
}
