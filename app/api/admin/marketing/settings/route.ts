import { NextResponse } from "next/server";
import { getAuthenticatedUser, isAdminEmail } from "@/lib/admin";
import {
  DEFAULT_MARKETING_SETTINGS,
  getMarketingSettings,
  saveMarketingSettings,
} from "@/lib/marketing-settings";
import type { MarketingSettings } from "@/types";

async function authorized() {
  const user = await getAuthenticatedUser();
  return Boolean(user && isAdminEmail(user.email));
}

export async function GET() {
  if (!(await authorized())) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  return NextResponse.json({
    settings: await getMarketingSettings().catch(() => DEFAULT_MARKETING_SETTINGS),
  });
}

export async function PUT(request: Request) {
  if (!(await authorized())) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const body = await request.json().catch(() => null) as MarketingSettings | null;
  if (!body) return NextResponse.json({ error: "Invalid settings." }, { status: 400 });
  const settings: MarketingSettings = {
    ...DEFAULT_MARKETING_SETTINGS,
    ...body,
    dailyPostTarget: Math.max(1, Math.min(10, Number(body.dailyPostTarget) || 3)),
    dailyReplyTarget: Math.max(1, Math.min(50, Number(body.dailyReplyTarget) || 10)),
    promotionalLevelLimit: Math.max(0, Math.min(100, Number(body.promotionalLevelLimit) || 35)),
    preferredTopics: (body.preferredTopics ?? []).map(String).slice(0, 30),
    blockedTopics: (body.blockedTopics ?? []).map(String).slice(0, 30),
    blockedWords: (body.blockedWords ?? []).map(String).slice(0, 100),
  };
  return NextResponse.json({ settings: await saveMarketingSettings(settings) });
}

