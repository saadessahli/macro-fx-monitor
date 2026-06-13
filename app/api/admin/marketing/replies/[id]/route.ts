import { NextResponse } from "next/server";
import { getAuthenticatedUser, isAdminEmail } from "@/lib/admin";
import { updateReplyOpportunity } from "@/lib/reply-opportunities";
import type { ReplyOpportunityStatus } from "@/types";

const statuses = new Set<ReplyOpportunityStatus>(["new", "copied", "replied", "skipped"]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = await request.json().catch(() => null) as {
    status?: ReplyOpportunityStatus;
    notes?: string;
  } | null;
  if (body?.status && !statuses.has(body.status)) {
    return NextResponse.json({ error: "Invalid reply status." }, { status: 400 });
  }
  const { id } = await params;
  const updated = await updateReplyOpportunity(id, {
    status: body?.status,
    notes: body?.notes === undefined ? undefined : String(body.notes).slice(0, 2000),
    repliedAt: body?.status === "replied" ? new Date().toISOString() : undefined,
    copiedAt: body?.status === "copied" ? new Date().toISOString() : undefined,
  });
  if (!updated) return NextResponse.json({ error: "Reply opportunity not found." }, { status: 404 });
  return NextResponse.json({ reply: updated });
}
