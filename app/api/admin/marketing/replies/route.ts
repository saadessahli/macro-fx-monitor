import { NextResponse } from "next/server";
import { getAuthenticatedUser, isAdminEmail } from "@/lib/admin";
import {
  createReplyOpportunity,
  listReplyOpportunities,
  saveReplyOpportunity,
} from "@/lib/reply-opportunities";
import { generateMacroSnapshot, loadLatestSnapshot } from "@/lib/snapshots";
import { isSupabaseConfigured } from "@/lib/supabase";

async function authorized() {
  const user = await getAuthenticatedUser();
  return Boolean(user && isAdminEmail(user.email));
}

export async function GET() {
  if (!(await authorized())) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  return NextResponse.json({ replies: await listReplyOpportunities().catch(() => []) });
}

export async function POST(request: Request) {
  if (!(await authorized())) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const body = await request.json().catch(() => null) as {
    originalUrl?: string;
    author?: string;
    postText?: string;
  } | null;
  const postText = String(body?.postText ?? "").trim();
  if (!postText) return NextResponse.json({ error: "Paste the original X post text." }, { status: 400 });
  const originalUrl = String(body?.originalUrl ?? "").trim();
  if (originalUrl && !/^https:\/\/(x\.com|twitter\.com)\//i.test(originalUrl)) {
    return NextResponse.json({ error: "Use a valid x.com or twitter.com URL." }, { status: 400 });
  }
  const stored = isSupabaseConfigured() ? await loadLatestSnapshot("weekly").catch(() => null) : null;
  const snapshot = stored ?? await generateMacroSnapshot("weekly");
  const reply = createReplyOpportunity({
    originalUrl,
    author: String(body?.author ?? "").trim().slice(0, 100),
    postText: postText.slice(0, 5000),
  }, snapshot);
  return NextResponse.json({ reply: await saveReplyOpportunity(reply) }, { status: 201 });
}

