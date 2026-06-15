import { NextResponse } from "next/server";
import { getAuthenticatedUser, isAdminEmail } from "@/lib/admin";
import { listMarketingDrafts } from "@/lib/marketing-drafts";
import { buildDailyMarketingPlan } from "@/lib/marketing-plan";
import {
  DEFAULT_MARKETING_SETTINGS,
  getMarketingSettings,
} from "@/lib/marketing-settings";
import { buildMarketingSystemStatus } from "@/lib/marketing-system-status";
import {
  clearTodayPlan,
  checkMarketContextStorage,
  loadFreshMarketContext,
  saveTodayPlan,
} from "@/lib/market-context";
import { generateMacroSnapshot, loadLatestSnapshot } from "@/lib/snapshots";
import { checkSupabaseConnection, isSupabaseConfigured } from "@/lib/supabase";

export async function POST() {
  const user = await getAuthenticatedUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const stored = isSupabaseConfigured()
      ? await loadLatestSnapshot("weekly").catch(() => null)
      : null;
    const snapshot = stored ?? await generateMacroSnapshot("weekly");
    const [drafts, settings, marketContext] = await Promise.all([
      isSupabaseConfigured() ? listMarketingDrafts(40).catch(() => []) : [],
      isSupabaseConfigured()
        ? getMarketingSettings().catch(() => DEFAULT_MARKETING_SETTINGS)
        : DEFAULT_MARKETING_SETTINGS,
      isSupabaseConfigured() ? loadFreshMarketContext() : {
        calendarEvents: [],
        newsItems: [],
        manualNotes: [],
        calendarRefreshedAt: null,
        newsRefreshedAt: null,
        calendarApiEnabled: false,
        newsApiEnabled: false,
        calendarMode: "manual" as const,
        newsMode: "manual" as const,
      },
    ]);
    const planGeneratedAt = new Date().toISOString();
    const plan = buildDailyMarketingPlan(
      snapshot,
      drafts,
      settings,
      new Date(planGeneratedAt),
      marketContext
    );
    if (isSupabaseConfigured()) {
      await saveTodayPlan(plan, planGeneratedAt).catch((error) => {
        console.error("Daily plan persistence is unavailable", error);
      });
    }
    const systemStatus = buildMarketingSystemStatus({
      snapshot,
      snapshotSource: stored ? "supabase" : "live-fallback",
      drafts,
      settings,
      planGeneratedAt,
      supabaseConnected: await checkSupabaseConnection(),
      marketContext,
      marketContextStorageReady: await checkMarketContextStorage(),
    });

    return NextResponse.json({ ok: true, plan, systemStatus, context: marketContext });
  } catch (error) {
    console.error("Daily marketing plan generation failed", error);
    return NextResponse.json(
      { error: "Today's X plan could not be generated." },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const user = await getAuthenticatedUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    await clearTodayPlan();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Today's plan could not be cleared." }, { status: 503 });
  }
}
