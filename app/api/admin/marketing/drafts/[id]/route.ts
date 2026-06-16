import { NextResponse } from "next/server";
import { getAuthenticatedUser, isAdminEmail } from "@/lib/admin";
import {
  deleteMarketingDraft,
  duplicateMarketingDraft,
  getMarketingDraft,
  saveDraftVersion,
  updateMarketingDraft,
} from "@/lib/marketing-drafts";
import { getComplianceBlockers, scoreMarketingText } from "@/lib/marketing-quality";
import { DEFAULT_MARKETING_SETTINGS, getMarketingSettings } from "@/lib/marketing-settings";
import type { MarketingDraftStatus } from "@/types";

const statuses = new Set<MarketingDraftStatus>(["draft", "ready", "needs_review", "approved", "rejected", "posted"]);

async function authorized() {
  const user = await getAuthenticatedUser();
  return Boolean(user && isAdminEmail(user.email));
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await authorized())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as {
    status?: MarketingDraftStatus;
    notes?: string;
    textContent?: string;
    postedUrl?: string;
    copied?: boolean;
    duplicate?: boolean;
  } | null;

  const { id } = await params;
  const current = await getMarketingDraft(id);
  if (!current) return NextResponse.json({ error: "Draft not found." }, { status: 404 });
  if (body?.duplicate) {
    return NextResponse.json({ draft: await duplicateMarketingDraft(current) }, { status: 201 });
  }
  if (body?.status && !statuses.has(body.status)) {
    return NextResponse.json({ error: "Invalid draft status." }, { status: 400 });
  }
  if (body?.status && body.status !== current.status && current.status === "rejected") {
    if (body.status === "approved" || body.status === "posted") {
      return NextResponse.json(
        { error: "A rejected draft must be returned to draft and revised before it can be approved or posted." },
        { status: 422 }
      );
    }
  }
  const textContent = body?.textContent === undefined
    ? undefined
    : String(body.textContent).slice(0, 6000);
  if (textContent !== undefined && textContent !== current.textContent) {
    await saveDraftVersion(current);
  }

  if (body?.status === "ready" || body?.status === "approved" || body?.status === "posted") {
    const settings = await getMarketingSettings().catch(() => DEFAULT_MARKETING_SETTINGS);
    const checkText = textContent ?? current.textContent;
    const checkScores = textContent !== undefined
      ? scoreMarketingText(checkText)
      : current.qualityScores;
    const blockers = getComplianceBlockers(checkScores, settings, checkText);
    if (blockers.length > 0) {
      return NextResponse.json(
        { error: `Draft cannot be marked ready. ${blockers[0]}`, blockers },
        { status: 422 }
      );
    }
  }

  const updated = await updateMarketingDraft(id, {
    status: body?.status,
    notes: body?.notes === undefined ? undefined : String(body.notes).slice(0, 2000),
    textContent,
    qualityScores: textContent === undefined ? undefined : scoreMarketingText(textContent),
    versionNumber: textContent === undefined ? undefined : current.versionNumber + 1,
    postedUrl: body?.postedUrl === undefined ? undefined : String(body.postedUrl).slice(0, 500),
    copiedAt: body?.copied ? new Date().toISOString() : undefined,
    manuallyPostedAt: body?.status === "posted" ? new Date().toISOString() : undefined,
  });

  if (!updated) return NextResponse.json({ error: "Draft not found." }, { status: 404 });
  return NextResponse.json({ draft: updated });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await authorized())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  await deleteMarketingDraft(id);
  return new NextResponse(null, { status: 204 });
}
