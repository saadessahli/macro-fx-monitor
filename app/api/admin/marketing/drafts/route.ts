import { NextResponse } from "next/server";
import { getAuthenticatedUser, isAdminEmail } from "@/lib/admin";
import { createMarketingDraft } from "@/lib/marketing-agent";
import { listMarketingDrafts, saveMarketingDraft } from "@/lib/marketing-drafts";
import { generateMacroSnapshot, loadRecentSnapshots } from "@/lib/snapshots";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { XContentType } from "@/types";

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

  const body = await request.json().catch(() => null) as { contentType?: XContentType } | null;
  if (!body?.contentType || !contentTypes.has(body.contentType)) {
    return NextResponse.json({ error: "Invalid content type." }, { status: 400 });
  }

  const stored = isSupabaseConfigured()
    ? await loadRecentSnapshots("weekly", 2).catch(() => [])
    : [];
  const snapshot = stored[0] ?? await generateMacroSnapshot("weekly");
  const draft = createMarketingDraft(body.contentType, snapshot, stored[1] ?? null);

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
