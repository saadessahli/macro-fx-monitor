import type { Metadata } from "next";
import { Activity, CalendarDays, Megaphone, ShieldCheck } from "lucide-react";
import { MarketingDraftCard } from "@/components/marketing-draft-card";
import { buildMarketingDrafts } from "@/lib/marketing-agent";
import { generateMacroSnapshot, loadLatestSnapshot } from "@/lib/snapshots";
import { isSupabaseConfigured } from "@/lib/supabase";

export const metadata: Metadata = {
  title: "Marketing Agent",
};

export const dynamic = "force-dynamic";

export default async function MarketingAgentPage() {
  const stored = isSupabaseConfigured()
    ? await loadLatestSnapshot("weekly").catch(() => null)
    : null;
  const snapshot = stored ?? await generateMacroSnapshot("weekly");
  const drafts = buildMarketingDrafts(snapshot);

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div>
          <span className="eyebrow">Private feature</span>
          <h1>Marketing Agent</h1>
          <p>
            Turn the latest source-backed macro snapshot into review-ready campaign drafts.
            Nothing is published automatically.
          </p>
        </div>
        <div className="agent-status"><ShieldCheck size={16} /> Review-only mode</div>
      </header>

      <section className="agent-context-grid" aria-label="Campaign context">
        <div>
          <Activity size={18} />
          <span>Current bias</span>
          <strong>{snapshot.dxyPlay.bias}</strong>
        </div>
        <div>
          <Megaphone size={18} />
          <span>Draft channels</span>
          <strong>{drafts.length}</strong>
        </div>
        <div>
          <CalendarDays size={18} />
          <span>Snapshot period</span>
          <strong>{snapshot.periodEnd}</strong>
        </div>
      </section>

      <section className="marketing-draft-grid">
        {drafts.map((draft) => (
          <MarketingDraftCard key={draft.id} draft={draft} />
        ))}
      </section>
    </div>
  );
}
