import "server-only";

import { randomUUID } from "node:crypto";
import { formatSignedNumber } from "@/lib/format";
import { DISCLAIMER, X_CONTENT_OPTIONS } from "@/lib/marketing-config";
import { siteConfig } from "@/lib/site";
import type {
  MacroSnapshot,
  MarketingDraft,
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

export function createMarketingDraft(
  contentType: XContentType,
  snapshot: MacroSnapshot,
  previous?: MacroSnapshot | null
): MarketingDraft {
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

  return {
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
    contentType,
    status: "draft",
    title,
    textContent,
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
      durationSeconds: 20,
      score,
      bias: snapshot.dxyPlay.bias,
      drivers: drivers.map(driverLine),
      confirmation: snapshot.dxyPlay.confirmation,
      invalidation: snapshot.dxyPlay.invalidation,
      snapshotUrl: url,
      snapshotDate: snapshot.periodEnd,
    },
    snapshotId: snapshot.id,
    snapshotDate: snapshot.periodEnd,
    manuallyPostedAt: null,
    notes: "",
  };
}
