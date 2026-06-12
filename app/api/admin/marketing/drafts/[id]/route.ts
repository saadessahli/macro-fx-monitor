import { NextResponse } from "next/server";
import { getAuthenticatedUser, isAdminEmail } from "@/lib/admin";
import { deleteMarketingDraft, updateMarketingDraft } from "@/lib/marketing-drafts";
import type { MarketingDraftStatus } from "@/types";

const statuses = new Set<MarketingDraftStatus>(["draft", "ready", "posted"]);

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
  } | null;
  if (!body?.status || !statuses.has(body.status)) {
    return NextResponse.json({ error: "Invalid draft status." }, { status: 400 });
  }

  const { id } = await params;
  const updated = await updateMarketingDraft(id, {
    status: body.status,
    notes: String(body.notes ?? "").slice(0, 2000),
    manuallyPostedAt: body.status === "posted" ? new Date().toISOString() : null,
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
