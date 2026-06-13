import { NextResponse } from "next/server";
import { getAuthenticatedUser, isAdminEmail } from "@/lib/admin";
import { listPostPerformance, savePostPerformance } from "@/lib/post-performance";
import type { MarketingResultQuality } from "@/types";

const qualities = new Set<MarketingResultQuality>(["bad", "okay", "good", "strong"]);

async function authorized() {
  const user = await getAuthenticatedUser();
  return Boolean(user && isAdminEmail(user.email));
}

export async function GET() {
  if (!(await authorized())) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  return NextResponse.json({ performance: await listPostPerformance().catch(() => []) });
}

export async function POST(request: Request) {
  if (!(await authorized())) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const resultQuality = String(body?.resultQuality ?? "okay") as MarketingResultQuality;
  if (!qualities.has(resultQuality)) {
    return NextResponse.json({ error: "Invalid result quality." }, { status: 400 });
  }
  const metric = (name: string) => Math.max(0, Math.floor(Number(body?.[name]) || 0));
  const performance = await savePostPerformance({
    draftId: body?.draftId ? String(body.draftId) : null,
    replyOpportunityId: body?.replyOpportunityId ? String(body.replyOpportunityId) : null,
    postedUrl: String(body?.postedUrl ?? "").slice(0, 500),
    impressions: metric("impressions"),
    likes: metric("likes"),
    replies: metric("replies"),
    reposts: metric("reposts"),
    bookmarks: metric("bookmarks"),
    profileVisits: metric("profileVisits"),
    resultQuality,
    notes: String(body?.notes ?? "").slice(0, 2000),
  });
  return NextResponse.json({ performance }, { status: 201 });
}
