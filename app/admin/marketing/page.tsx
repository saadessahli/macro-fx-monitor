import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { MarketingWorkspace } from "@/components/marketing-workspace";
import { listMarketingDrafts } from "@/lib/marketing-drafts";
import { isMarketingAiConfigured } from "@/lib/marketing-ai";
import { buildDailyMarketingPlan } from "@/lib/marketing-plan";
import { DEFAULT_MARKETING_SETTINGS, getMarketingSettings } from "@/lib/marketing-settings";
import { listReplyOpportunities } from "@/lib/reply-opportunities";
import { generateMacroSnapshot, loadLatestSnapshot } from "@/lib/snapshots";
import { isSupabaseConfigured } from "@/lib/supabase";

export const metadata: Metadata = {
  title: "X Marketing Agent",
};

export const dynamic = "force-dynamic";

export default async function MarketingAgentPage() {
  const stored = isSupabaseConfigured()
    ? await loadLatestSnapshot("weekly").catch(() => null)
    : null;
  const snapshot = stored ?? await generateMacroSnapshot("weekly");
  const drafts = isSupabaseConfigured()
    ? await listMarketingDrafts().catch(() => [])
    : [];
  const settings = isSupabaseConfigured()
    ? await getMarketingSettings().catch(() => DEFAULT_MARKETING_SETTINGS)
    : DEFAULT_MARKETING_SETTINGS;
  const replies = isSupabaseConfigured()
    ? await listReplyOpportunities().catch(() => [])
    : [];
  const dailyPlan = buildDailyMarketingPlan(snapshot, drafts, settings);

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div>
          <span className="eyebrow">Private workspace</span>
          <h1>X Marketing Agent</h1>
          <p>
            Generate, review, export, and manage source-backed X content.
            Nothing is connected to the X API or published automatically.
          </p>
        </div>
        <div className="agent-status"><ShieldCheck size={16} /> Admin only</div>
      </header>
      <MarketingWorkspace
        snapshot={snapshot}
        initialDrafts={drafts}
        initialSettings={settings}
        initialReplies={replies}
        dailyPlan={dailyPlan}
        aiConfigured={isMarketingAiConfigured(settings)}
      />
    </div>
  );
}
