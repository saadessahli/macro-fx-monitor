import "server-only";

import packageJson from "@/package.json";
import { isButtondownConfigured } from "@/lib/buttondown";
import { isMarketingAiConfigured } from "@/lib/marketing-ai";
import type {
  MacroSnapshot,
  MarketingDraft,
  MarketingSettings,
  MarketingSystemStatus,
} from "@/types";

export function buildMarketingSystemStatus({
  snapshot,
  snapshotSource,
  drafts,
  settings,
  planGeneratedAt,
  supabaseConnected,
}: {
  snapshot: MacroSnapshot;
  snapshotSource: MarketingSystemStatus["snapshotSource"];
  drafts: MarketingDraft[];
  settings: MarketingSettings;
  planGeneratedAt: string;
  supabaseConnected: boolean;
}): MarketingSystemStatus {
  const serverTime = new Date();
  const generatedAt = new Date(snapshot.generatedAt);
  const staleAfterMs = 8 * 24 * 60 * 60 * 1000;

  return {
    appVersion: packageJson.version,
    commitSha: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? null,
    deployedAt: process.env.VERCEL_DEPLOYMENT_CREATED_AT ?? process.env.APP_BUILD_TIME ?? null,
    serverTime: serverTime.toISOString(),
    snapshotDate: snapshot.periodEnd,
    snapshotGeneratedAt: snapshot.generatedAt,
    snapshotSource,
    snapshotStale:
      !Number.isFinite(generatedAt.getTime())
      || serverTime.getTime() - generatedAt.getTime() > staleAfterMs,
    latestDraftAt: drafts[0]?.createdAt ?? null,
    planGeneratedAt,
    nextCalendarEvent: snapshot.upcomingCalendar[0] ?? null,
    supabaseConnected,
    buttondownConfigured: isButtondownConfigured(),
    aiEnabled: isMarketingAiConfigured(settings),
    // Settings and credentials exist for future use, but no discovery adapter is active.
    xApiDiscoveryEnabled: false,
  };
}
