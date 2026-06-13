import "server-only";

import { supabaseRequest } from "@/lib/supabase";
import type { MarketingSettings } from "@/types";

export const DEFAULT_MARKETING_SETTINGS: MarketingSettings = {
  defaultTone: "professional",
  dailyPostTarget: 3,
  dailyReplyTarget: 10,
  defaultDisclaimer: "Educational research only. Not investment advice.",
  linkUsageFrequency: "low",
  promotionalLevelLimit: 35,
  preferredTopics: ["DXY", "CPI", "Fed expectations", "Treasury yields"],
  blockedTopics: [],
  blockedWords: ["buy", "sell", "guaranteed", "pump"],
  targetAudience: "Macro traders, FX traders, market watchers, and finance students",
  defaultCta: "Read the full source-backed snapshot.",
  aiEnabled: true,
  xApiDiscoveryEnabled: false,
  manualFallbackEnabled: true,
  videoMusicEnabled: false,
  subtitlesEnabled: true,
};

type SettingsRow = {
  settings: Partial<MarketingSettings>;
};

export async function getMarketingSettings() {
  const rows = await supabaseRequest<SettingsRow[]>(
    "marketing_settings?select=settings&id=eq.default&limit=1"
  );
  return { ...DEFAULT_MARKETING_SETTINGS, ...(rows[0]?.settings ?? {}) };
}

export async function saveMarketingSettings(settings: MarketingSettings) {
  const rows = await supabaseRequest<SettingsRow[]>("marketing_settings?on_conflict=id", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    body: {
      id: "default",
      settings,
      updated_at: new Date().toISOString(),
    },
  });
  return { ...DEFAULT_MARKETING_SETTINGS, ...(rows[0]?.settings ?? settings) };
}

