import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { MarketingWorkspace } from "@/components/marketing-workspace";
import { listMarketingDrafts } from "@/lib/marketing-drafts";
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
      <MarketingWorkspace snapshot={snapshot} initialDrafts={drafts} />
    </div>
  );
}
