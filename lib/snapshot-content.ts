import { formatNumber, formatSignedNumber } from "@/lib/format";
import { siteConfig } from "@/lib/site";
import { MacroSnapshot } from "@/types";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

export function snapshotToMarkdown(snapshot: MacroSnapshot) {
  const recent =
    snapshot.recentReleases.length > 0
      ? snapshot.recentReleases
          .map(
            (driver) =>
              `- **${driver.title}:** ${formatNumber(driver.latest, 2)} as of ${formatDate(
                driver.latestDate ?? snapshot.periodEnd
              )}; DXY score ${formatSignedNumber(driver.score, 1)}.`
          )
          .join("\n")
      : "- No tracked series published a new observation during this period.";

  const drivers = snapshot.strongestDrivers
    .map(
      (driver) =>
        `- **${driver.title}:** ${driver.conclusion} (${formatSignedNumber(driver.score, 1)}).`
    )
    .join("\n");

  const calendar =
    snapshot.upcomingCalendar.length > 0
      ? snapshot.upcomingCalendar
          .slice(0, 10)
          .map(
            (event) =>
              `- **${formatDate(event.date)}:** ${event.releaseName} (${event.importance} importance).`
          )
          .join("\n")
      : "- No tracked release dates are currently available.";

  return `# ${snapshot.title}

**Period:** ${formatDate(snapshot.periodStart)} to ${formatDate(snapshot.periodEnd)}

## Executive view

${snapshot.summary}

**Aggregate DXY score:** ${formatSignedNumber(snapshot.dxyScore, 1)} / 10  
**Regime:** ${snapshot.dxyConclusion}

## What changed

${recent}

## Strongest macro drivers

${drivers}

## The DXY playbook

**Bias:** ${snapshot.dxyPlay.bias}

**Expression:** ${snapshot.dxyPlay.expression}

**Confirmation:** ${snapshot.dxyPlay.confirmation}

**Invalidation:** ${snapshot.dxyPlay.invalidation}

**Risk note:** ${snapshot.dxyPlay.riskNote}

## Upcoming economic calendar

${calendar}

[Open the live dashboard](${siteConfig.url}/dashboard)

---

This product uses the FRED® API but is not endorsed or certified by the Federal Reserve Bank of St. Louis. This publication is educational and is not financial advice.
`;
}
