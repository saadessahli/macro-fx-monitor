import "server-only";

import { formatSignedNumber } from "@/lib/format";
import { siteConfig } from "@/lib/site";
import type { MacroSnapshot, MarketingDraft, SnapshotDriver } from "@/types";

function driverLine(driver: SnapshotDriver) {
  const score = driver.score === null ? "unscored" : formatSignedNumber(driver.score, 1);
  return `${driver.title}: ${driver.conclusion.toLowerCase()} (${score})`;
}

function topDrivers(snapshot: MacroSnapshot) {
  return snapshot.strongestDrivers.slice(0, 3);
}

function fitXPost(value: string, maxLength = 280) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 3).trimEnd()}...`;
}

export function buildXDrafts(snapshot: MacroSnapshot): MarketingDraft[] {
  const drivers = topDrivers(snapshot);
  const score = snapshot.dxyScore === null
    ? "mixed"
    : `${formatSignedNumber(snapshot.dxyScore, 1)} / 10`;
  const snapshotUrl = `${siteConfig.url}/snapshot`;
  const thread = [
    fitXPost(`1/4 The latest Macro FX Monitor regime update is live.

DXY score: ${score}
Bias: ${snapshot.dxyPlay.bias}`),
    fitXPost(`2/4 The strongest model drivers:
${drivers.map((driver) => `- ${driverLine(driver)}`).join("\n") || "- Macro signals remain mixed."}`),
    fitXPost(`3/4 Confirmation:
${snapshot.dxyPlay.confirmation}

Invalidation:
${snapshot.dxyPlay.invalidation}`),
    fitXPost(`4/4 Full source-backed snapshot:
${snapshotUrl}

Educational research only. Not investment advice.`),
  ];
  const singlePostSuffix = `\n\nFull snapshot: ${snapshotUrl}\n\nEducational research only.`;
  const singlePostPrefix = `Macro FX Monitor: ${snapshot.dxyPlay.bias} | DXY score ${score}\n\n`;
  const conclusionLimit = 280 - singlePostPrefix.length - singlePostSuffix.length;
  const singlePost = `${singlePostPrefix}${fitXPost(
    snapshot.dxyConclusion,
    Math.max(conclusionLimit, 3)
  )}${singlePostSuffix}`;

  return [
    {
      id: "x-thread",
      channel: "X thread",
      title: "Four-post macro thread",
      note: "A compact weekly thread ready for review and publishing on X.",
      body: thread.join("\n\n"),
    },
    {
      id: "x-single",
      channel: "X post",
      title: "Short single post",
      note: "A concise standalone update ready to publish on X.",
      body: singlePost,
    },
    {
      id: "x-visual-card",
      channel: "X visual card",
      title: "Optional card copy",
      note: "Short text hierarchy for an optional image attached to the X post.",
      body: `MACRO FX MONITOR

DXY REGIME
${snapshot.dxyPlay.bias.toUpperCase()}

MODEL SCORE
${score}

CURRENT READ
${snapshot.dxyConclusion}

${snapshot.periodEnd}`,
    },
  ];
}
