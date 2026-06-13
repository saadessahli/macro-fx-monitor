import type { MarketingVideoConfig } from "@/types";

function compactClause(value: string, maxWords = 14) {
  const words = value
    .replace(/\s+/g, " ")
    .replace(/[.]+$/, "")
    .trim()
    .split(" ")
    .filter(Boolean);
  return words.length <= maxWords ? words.join(" ") : `${words.slice(0, maxWords).join(" ")}...`;
}

export function generateVideoVoiceover(
  video: Pick<
    MarketingVideoConfig,
    "score" | "bias" | "drivers" | "confirmation" | "invalidation"
  >
) {
  const driverNames = video.drivers
    .slice(0, 3)
    .map((driver) => driver.split(":")[0].trim())
    .filter(Boolean);
  const script = [
    "Here is what is driving the dollar today.",
    `Macro FX Monitor shows ${video.bias.toLowerCase()}, with the DXY score at ${video.score}.`,
    `The strongest drivers are ${driverNames.join(", ") || "not currently available"}.`,
    `Confirmation would come from ${compactClause(video.confirmation)}.`,
    `But this bias breaks if ${compactClause(video.invalidation)}.`,
    "Educational research only, not investment advice.",
  ].join(" ");

  return script;
}

export function splitVoiceoverSubtitles(script: string, maxWords = 9) {
  const words = script.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const chunks: string[] = [];
  for (let index = 0; index < words.length; index += maxWords) {
    chunks.push(words.slice(index, index + maxWords).join(" "));
  }
  return chunks;
}

export function normalizeVideoConfig(
  video: Partial<MarketingVideoConfig> & Pick<
    MarketingVideoConfig,
    "score" | "bias" | "drivers" | "confirmation" | "invalidation" | "snapshotUrl" | "snapshotDate"
  >
): MarketingVideoConfig {
  const normalized: MarketingVideoConfig = {
    title: video.title ?? "DXY Regime Update",
    durationSeconds: Math.max(20, Math.min(30, video.durationSeconds ?? 30)),
    score: video.score,
    bias: video.bias,
    drivers: video.drivers.slice(0, 3),
    confirmation: video.confirmation,
    invalidation: video.invalidation,
    snapshotUrl: video.snapshotUrl,
    snapshotDate: video.snapshotDate,
    hook: video.hook?.trim() || "Here is what is driving the dollar today.",
    voiceoverScript: "",
    musicEnabled: video.musicEnabled ?? false,
    musicUrl: video.musicUrl ?? "",
    musicVolume: Math.max(0, Math.min(1, video.musicVolume ?? 0.08)),
    subtitlesEnabled: video.subtitlesEnabled ?? true,
    voiceoverUrl: video.voiceoverUrl ?? "",
  };
  normalized.voiceoverScript =
    video.voiceoverScript?.trim() || generateVideoVoiceover(normalized);
  return normalized;
}
