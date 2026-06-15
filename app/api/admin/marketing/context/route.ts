import { NextResponse } from "next/server";
import { getAuthenticatedUser, isAdminEmail } from "@/lib/admin";
import {
  addManualContext,
  loadFreshMarketContext,
} from "@/lib/market-context";
import type { ManualContextKind } from "@/types";

async function authorized() {
  const user = await getAuthenticatedUser();
  return Boolean(user && isAdminEmail(user.email));
}

export async function GET() {
  if (!(await authorized())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  return NextResponse.json({ context: await loadFreshMarketContext() });
}

export async function POST(request: Request) {
  if (!(await authorized())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = await request.json().catch(() => null) as {
    kind?: ManualContextKind;
    title?: string;
    details?: string;
    contextDate?: string;
  } | null;
  const allowed = new Set<ManualContextKind>(["note", "event", "headline", "geopolitical"]);
  if (!body?.kind || !allowed.has(body.kind)) {
    return NextResponse.json({ error: "Choose a valid context type." }, { status: 400 });
  }
  try {
    const note = await addManualContext({
      kind: body.kind,
      title: String(body.title ?? ""),
      details: String(body.details ?? ""),
      contextDate: String(body.contextDate ?? new Date().toISOString().slice(0, 10)),
    });
    return NextResponse.json({
      note,
      context: await loadFreshMarketContext(),
    }, { status: 201 });
  } catch (error) {
    console.error("Manual market context could not be saved", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Context could not be saved." },
      { status: 503 }
    );
  }
}
