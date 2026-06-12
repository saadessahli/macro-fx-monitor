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

export function buildMarketingDrafts(snapshot: MacroSnapshot): MarketingDraft[] {
  const drivers = topDrivers(snapshot);
  const driverBullets = drivers.map((driver) => `• ${driverLine(driver)}`).join("\n");
  const score = snapshot.dxyScore === null ? "mixed" : `${formatSignedNumber(snapshot.dxyScore, 1)} / 10`;
  const dashboardUrl = `${siteConfig.url}/dashboard`;
  const snapshotUrl = `${siteConfig.url}/snapshot`;

  return [
    {
      id: "linkedin",
      channel: "LinkedIn",
      title: "Weekly macro regime update",
      note: "Professional, evidence-led launch post with a direct dashboard link.",
      body: `The latest Macro FX Monitor update is live.

The current US macro mix points to a ${snapshot.dxyPlay.bias.toLowerCase()}, with an aggregate DXY score of ${score}.

The strongest signals in the model:
${driverBullets || "• The model remains broadly balanced across its major drivers."}

What I am watching next:
${snapshot.dxyPlay.confirmation}

What would invalidate the view:
${snapshot.dxyPlay.invalidation}

Explore the free, source-backed dashboard:
${dashboardUrl}

This is educational macro research, not investment advice.

#Macroeconomics #FederalReserve #DXY #TreasuryYields #DataAnalytics`,
    },
    {
      id: "x-thread",
      channel: "X thread",
      title: "Four-post macro thread",
      note: "Compact thread structure for a fast weekly distribution cadence.",
      body: `1/4 The latest Macro FX Monitor regime update is live.

DXY score: ${score}
Bias: ${snapshot.dxyPlay.bias}

2/4 The strongest model drivers:
${drivers.map((driver) => `- ${driverLine(driver)}`).join("\n") || "- Macro signals remain mixed."}

3/4 Confirmation:
${snapshot.dxyPlay.confirmation}

Invalidation:
${snapshot.dxyPlay.invalidation}

4/4 Full source-backed snapshot:
${snapshotUrl}

Educational research only. Not investment advice.`,
    },
    {
      id: "newsletter-teaser",
      channel: "Newsletter teaser",
      title: "Weekly review preview",
      note: "Short preview for Buttondown, a landing page, or a direct message.",
      body: `This week in Macro FX Monitor

The dashboard currently reads ${snapshot.dxyConclusion.toLowerCase()}, with a DXY score of ${score}.

Inside the latest review:
• The highest-conviction macro drivers
• The releases that could change the regime
• Confirmation and invalidation conditions for the current USD bias

Current framing: ${snapshot.dxyPlay.expression}

Read the latest snapshot:
${snapshotUrl}

Free weekly research. Unsubscribe anytime.`,
    },
  ];
}
