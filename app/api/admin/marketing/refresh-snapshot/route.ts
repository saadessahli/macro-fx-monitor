import { NextResponse } from "next/server";
import { getAuthenticatedUser, isAdminEmail } from "@/lib/admin";
import { listMarketingDrafts } from "@/lib/marketing-drafts";
import { buildDailyMarketingPlan } from "@/lib/marketing-plan";
import { getMarketingSettings } from "@/lib/marketing-settings";
import { buildMarketingSystemStatus } from "@/lib/marketing-system-status";
import {
  generateMacroSnapshot,
  saveMacroSnapshotForMarketing,
} from "@/lib/snapshots";
import { checkSupabaseConnection, isSupabaseConfigured } from "@/lib/supabase";

export async function POST() {
  const user = await getAuthenticatedUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase must be configured to persist a refreshed snapshot." },
      { status: 503 }
    );
  }

  try {
    const snapshot = await generateMacroSnapshot("weekly");
    await saveMacroSnapshotForMarketing(snapshot);
    const [drafts, settings] = await Promise.all([
      listMarketingDrafts(40),
      getMarketingSettings(),
    ]);
    const planGeneratedAt = new Date().toISOString();
    const plan = buildDailyMarketingPlan(snapshot, drafts, settings, new Date(planGeneratedAt));
    const systemStatus = buildMarketingSystemStatus({
      snapshot,
      snapshotSource: "supabase",
      drafts,
      settings,
      planGeneratedAt,
      supabaseConnected: await checkSupabaseConnection(),
    });

    return NextResponse.json({
      ok: true,
      snapshot,
      plan,
      systemStatus,
      message: "Latest macro snapshot refreshed for the marketing agent. No newsletter was published.",
    });
  } catch (error) {
    console.error("Marketing snapshot refresh failed", error);
    return NextResponse.json(
      { error: "The macro snapshot could not be refreshed." },
      { status: 500 }
    );
  }
}
