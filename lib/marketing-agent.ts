import "server-only";

import { randomUUID } from "node:crypto";
import { formatSignedNumber } from "@/lib/format";
import { generateAiVariations } from "@/lib/marketing-ai";
import { DISCLAIMER, X_CONTENT_OPTIONS } from "@/lib/marketing-config";
import { scoreMarketingText } from "@/lib/marketing-quality";
import { siteConfig } from "@/lib/site";
import type {
  MacroSnapshot,
  MarketingDraft,
  MarketingSettings,
  MarketingTone,
  MarketingVariation,
  SnapshotDriver,
  XContentType,
} from "@/types";

function fitPost(value: string, maxLength = 280) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 3).trimEnd()}...`;
}

function withDisclaimer(value: string, maxLength = 280) {
  const suffix = `\n\n${DISCLAIMER}`;
  return `${fitPost(value, maxLength - suffix.length)}${suffix}`;
}

function scoreLabel(snapshot: MacroSnapshot) {
  return snapshot.dxyScore === null
    ? "unavailable"
    : `${formatSignedNumber(snapshot.dxyScore, 1)} / 10`;
}

function driverLine(driver: SnapshotDriver) {
  const score = driver.score === null ? "unscored" : formatSignedNumber(driver.score, 1);
  return `${driver.title}: ${driver.conclusion.toLowerCase()} (${score})`;
}

function educationalCopy(driver?: SnapshotDriver) {
  const title = driver?.title ?? "macro regime scores";
  const explanations: Record<string, string> = {
    CPI: "CPI shapes inflation expectations. A hotter reading can keep Fed policy tighter and support U.S. yields, which may strengthen the dollar.",
    PPI: "PPI tracks price pressure earlier in the production chain. Persistent producer inflation can feed expectations for tighter Fed policy and firmer yields.",
    "Core PPI": "Core PPI removes volatile food and energy components, helping reveal underlying producer-price pressure and its potential path into Fed expectations.",
  };
  return explanations[title]
    ?? `${title} matters for DXY because it can change the expected path of U.S. growth, inflation, Fed policy, and Treasury yields relative to other economies.`;
}

function changeCopy(current: MacroSnapshot, previous?: MacroSnapshot | null) {
  if (!previous) return "A previous stored snapshot is unavailable, so no week-over-week comparison is shown.";
  if (current.dxyScore === null || previous.dxyScore === null) {
    return "One of the comparison scores is unavailable.";
  }
  const change = current.dxyScore - previous.dxyScore;
  const direction = change > 0 ? "strengthened" : change < 0 ? "softened" : "was unchanged";
  return `The DXY score ${direction} from ${formatSignedNumber(previous.dxyScore, 1)} to ${formatSignedNumber(current.dxyScore, 1)}.`;
}

function threadPosts(snapshot: MacroSnapshot) {
  const score = scoreLabel(snapshot);
  const drivers = snapshot.strongestDrivers.slice(0, 3);
  const url = `${siteConfig.url}/snapshot`;
  return [
    fitPost(`1/4 Macro FX Monitor | DXY regime update\n\nScore: ${score}\nBias: ${snapshot.dxyPlay.bias}\nSnapshot: ${snapshot.periodEnd}`),
    fitPost(`2/4 Strongest macro drivers\n\n${drivers.map((driver) => `- ${driverLine(driver)}`).join("\n") || "Driver data is unavailable."}`),
    fitPost(`3/4 Confirmation\n${snapshot.dxyPlay.confirmation}\n\nInvalidation\n${snapshot.dxyPlay.invalidation}`),
    fitPost(`4/4 Full source-backed snapshot:\n${url}\n\n${DISCLAIMER}`),
  ];
}

function fallbackVariations(
  base: string,
  topic: string,
  snapshot: MacroSnapshot,
  recentTexts: string[]
): MarketingVariation[] {
  const topDriver = snapshot.strongestDrivers[0]?.title ?? topic;
  const candidates: Array<Pick<MarketingVariation, "style" | "text" | "whyItWorks">> = [
    {
      style: "conservative",
      text: base,
      whyItWorks: "Leads with the current source-backed regime and avoids exaggerated claims.",
    },
    {
      style: "educational",
      text: withDisclaimer(
        `${topic} matters because markets react to how it changes Fed expectations, Treasury yields, and the relative USD outlook. Current DXY bias: ${snapshot.dxyPlay.bias}.`
      ),
      whyItWorks: "Explains the transmission mechanism in plain language.",
    },
    {
      style: "engagement",
      text: withDisclaimer(
        `What matters more for DXY right now: ${topDriver}, Fed expectations, or yields?\n\nThe current model bias is ${snapshot.dxyPlay.bias.toLowerCase()}, but confirmation still matters.`
      ),
      whyItWorks: "Uses a focused question without hype or a forced promotional link.",
    },
  ];

  return candidates.map((variation) => ({
    ...variation,
    characterCount: variation.text.length,
    scores: scoreMarketingText(variation.text, recentTexts),
  }));
}

export async function createMarketingDraft(
  contentType: XContentType,
  snapshot: MacroSnapshot,
  previous: MacroSnapshot | null,
  options: {
    topic: string;
    tone: MarketingTone;
    instruction: string;
    recentTexts: string[];
    settings: MarketingSettings;
  }
): Promise<MarketingDraft> {
  const now = new Date().toISOString();
  const score = scoreLabel(snapshot);
  const url = `${siteConfig.url}/snapshot`;
  const topDriver = snapshot.strongestDrivers[0];
  const drivers = snapshot.strongestDrivers.slice(0, 3);
  let title = X_CONTENT_OPTIONS.find((option) => option.value === contentType)?.label ?? "X post";
  let textContent = "";
  let posts: string[] = [];

  if (contentType === "thread") {
    posts = threadPosts(snapshot);
    textContent = posts.join("\n\n---\n\n");
  } else if (contentType === "single") {
    const suffix = `\n\n${url}`;
    const hook = `DXY regime: ${snapshot.dxyPlay.bias}. Score: ${score}.`;
    const driver = topDriver ? ` Key driver: ${driverLine(topDriver)}.` : " Key driver data is unavailable.";
    textContent = withDisclaimer(`${hook}${driver}${suffix}`);
  } else if (contentType === "educational") {
    title = `Why ${topDriver?.title ?? "macro regimes"} matter for DXY`;
    textContent = withDisclaimer(`${title}\n\n${educationalCopy(topDriver)}\n\nSource snapshot: ${snapshot.periodEnd}`);
  } else if (contentType === "driver") {
    title = `${topDriver?.title ?? "Top driver"} breakdown`;
    textContent = withDisclaimer(topDriver
      ? `${topDriver.title} is currently the strongest model driver: ${driverLine(topDriver)}. Latest source date: ${topDriver.latestDate ?? "unavailable"}.\n\n${url}`
      : `Top-driver data is unavailable for the ${snapshot.periodEnd} snapshot.`);
  } else if (contentType === "weekly-recap") {
    textContent = withDisclaimer(`Weekly DXY recap\n\n${changeCopy(snapshot, previous)} Current bias: ${snapshot.dxyPlay.bias}. Strongest driver: ${topDriver?.title ?? "unavailable"}.\n\n${url}`);
  } else {
    title = "What could invalidate the current DXY bias?";
    textContent = withDisclaimer(`${title}\n\nCurrent bias: ${snapshot.dxyPlay.bias}.\nRisk condition: ${snapshot.dxyPlay.invalidation}\n\nThis is a scenario check, not a prediction.`);
  }

  const aiVariations = await generateAiVariations({
    contentType,
    topic: options.topic,
    tone: options.tone,
    instruction: options.instruction,
    snapshot,
    recentTexts: options.recentTexts,
    settings: options.settings,
  }).catch(() => null);
  const variations = aiVariations
    ? aiVariations.map((variation) => ({
        ...variation,
        text: contentType === "thread" ? variation.text : fitPost(variation.text),
        characterCount: variation.text.length,
        scores: scoreMarketingText(variation.text, options.recentTexts),
      }))
    : fallbackVariations(textContent, options.topic, snapshot, options.recentTexts);
  const selectedText = variations[0]?.text ?? textContent;
  const qualityScores = scoreMarketingText(
    contentType === "thread" ? posts.join("\n\n") : selectedText,
    options.recentTexts
  );
  const videoHook =
    variations.find((variation) => variation.style === "engagement")?.text.split("\n")[0]
    ?? "Here is what is driving the dollar today.";
  const voiceoverScript = `${videoHook} The current DXY score is ${score}, with a ${snapshot.dxyPlay.bias.toLowerCase()}. The top drivers are ${drivers.map((driver) => driver.title).join(", ") || "currently unavailable"}. The confirmation signal is ${snapshot.dxyPlay.confirmation} The key invalidation is ${snapshot.dxyPlay.invalidation} Educational research only, not investment advice.`;

  return {
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
    contentType,
    status: "draft",
    title,
    textContent: contentType === "thread" ? textContent : selectedText,
    threadPosts: posts,
    imageCardData: {
      score,
      bias: snapshot.dxyPlay.bias,
      drivers: drivers.map(driverLine),
      confirmation: snapshot.dxyPlay.confirmation,
      invalidation: snapshot.dxyPlay.invalidation,
      snapshotUrl: url,
      snapshotDate: snapshot.periodEnd,
    },
    videoConfig: {
      title: "DXY Regime Update",
      durationSeconds: 30,
      score,
      bias: snapshot.dxyPlay.bias,
      drivers: drivers.map(driverLine),
      confirmation: snapshot.dxyPlay.confirmation,
      invalidation: snapshot.dxyPlay.invalidation,
      snapshotUrl: url,
      snapshotDate: snapshot.periodEnd,
      hook: fitPost(videoHook, 110),
      voiceoverScript,
      musicEnabled: options.settings.videoMusicEnabled,
      musicUrl: "",
      musicVolume: 0.08,
      subtitlesEnabled: options.settings.subtitlesEnabled,
      voiceoverUrl: "",
    },
    snapshotId: snapshot.id,
    snapshotDate: snapshot.periodEnd,
    manuallyPostedAt: null,
    copiedAt: null,
    topic: options.topic,
    tone: options.tone,
    instruction: options.instruction,
    variations,
    qualityScores,
    versionNumber: 1,
    postedUrl: "",
    notes: "",
  };
}
