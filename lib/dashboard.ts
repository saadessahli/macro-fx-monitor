import { convictionFromDistance } from "@/lib/format";
import { DashboardAggregate, DashboardBucket, DashboardHorizonOutlook, DriverAnalysis, DriverCategory, TimeHorizon } from "@/types";

function bucketScore(drivers: DriverAnalysis[]) {
  const weightedDrivers = drivers.filter((driver) => driver.metrics.score !== null);
  const totalWeight = weightedDrivers.reduce((sum, item) => sum + item.driver.weight, 0);
  if (!totalWeight) return null;

  return Number(
    (
      weightedDrivers.reduce((sum, item) => sum + (item.metrics.score ?? 0) * item.driver.weight, 0) /
      totalWeight
    ).toFixed(1)
  );
}

function buildSummary(score: number | null, bullishCount: number, bearishCount: number) {
  if (score === null) {
    return "The dashboard does not yet have enough loaded data to produce a reliable macro dollar score.";
  }

  if (score >= 2.2) {
    return `The macro regime leans supportive for DXY across the next several months. Inflation persistence, restrictive rates, and pockets of growth resilience are producing more bullish than bearish signals (${bullishCount} vs ${bearishCount}).`;
  }

  if (score <= -2.2) {
    return `The macro regime leans softer for DXY across the next several months. Cooling inflation, weaker growth, or easier policy pressure are dominating the framework (${bearishCount} bearish drivers).`;
  }

  return `The macro regime is mixed over the next several months. The dollar backdrop is not one-sided, with bullish and bearish forces still close enough to keep the aggregate score near neutral.`;
}

function conclusionFromScore(score: number | null) {
  if (score === null) return "Neutral for DXY" as const;
  if (score >= 2.2) return "Bullish for DXY" as const;
  if (score <= -2.2) return "Bearish for DXY" as const;
  return "Neutral for DXY" as const;
}

function buildHorizonSummary(horizon: TimeHorizon, score: number | null, supportingDrivers: DriverAnalysis[]) {
  if (score === null) {
    return `The dashboard does not yet have enough data to describe a usable ${horizon} DXY outlook.`;
  }

  const direction =
    score >= 2.2 ? "bullish" : score <= -2.2 ? "bearish" : "neutral";
  const topDrivers = supportingDrivers.slice(0, 3).map((item) => item.driver.title);
  const driverText = topDrivers.length ? ` The key drivers are ${topDrivers.join(", ")}.` : "";
  const timeText =
    horizon === "1-3M"
      ? "Over the next one to three months"
      : horizon === "3-6M"
        ? "Over the next three to six months"
        : "Over the next six to twelve months";
  return `${timeText}, the dashboard is ${direction} for DXY on a weighted macro basis.${driverText}`;
}

function buildDashboardHorizons(analyses: DriverAnalysis[]): DashboardHorizonOutlook[] {
  const horizons: TimeHorizon[] = ["1-3M", "3-6M", "6-12M"];

  return horizons.map((horizon) => {
    const weightedDrivers = analyses.filter((item) => {
      const outlook = item.metrics.horizonOutlooks.find((entry) => entry.horizon === horizon);
      return outlook && outlook.score !== null;
    });

    const totalWeight = weightedDrivers.reduce((sum, item) => sum + item.driver.weight, 0);
    const score =
      totalWeight > 0
        ? Number(
            (
              weightedDrivers.reduce((sum, item) => {
                const horizonScore = item.metrics.horizonOutlooks.find((entry) => entry.horizon === horizon)?.score ?? 0;
                return sum + horizonScore * item.driver.weight;
              }, 0) / totalWeight
            ).toFixed(1)
          )
        : null;

    const supportingDrivers = [...weightedDrivers].sort((a, b) => {
      const aScore = a.metrics.horizonOutlooks.find((entry) => entry.horizon === horizon)?.score ?? 0;
      const bScore = b.metrics.horizonOutlooks.find((entry) => entry.horizon === horizon)?.score ?? 0;
      return Math.abs(bScore) - Math.abs(aScore);
    });

    return {
      horizon,
      score,
      conviction: convictionFromDistance(score),
      conclusion: conclusionFromScore(score),
      summary: buildHorizonSummary(horizon, score, supportingDrivers),
      supportingDrivers: supportingDrivers.slice(0, 4),
    };
  });
}

export function buildDashboardAggregate(analyses: DriverAnalysis[]): DashboardAggregate {
  const weighted = analyses.filter((item) => item.metrics.score !== null);
  const totalWeight = weighted.reduce((sum, item) => sum + item.driver.weight, 0);
  const score =
    totalWeight > 0
      ? Number(
          (
            weighted.reduce((sum, item) => sum + (item.metrics.score ?? 0) * item.driver.weight, 0) /
            totalWeight
          ).toFixed(1)
        )
      : null;

  const conviction = convictionFromDistance(score);
  const conclusion = conclusionFromScore(score);

  const bullishDrivers = analyses
    .filter((item) => item.metrics.score !== null && (item.metrics.score ?? 0) >= 2.2)
    .sort((a, b) => (b.metrics.score ?? 0) - (a.metrics.score ?? 0));
  const bearishDrivers = analyses
    .filter((item) => item.metrics.score !== null && (item.metrics.score ?? 0) <= -2.2)
    .sort((a, b) => (a.metrics.score ?? 10) - (b.metrics.score ?? 10));

  const categories: DriverCategory[] = ["Inflation", "Growth", "Policy", "Market"];
  const buckets: DashboardBucket[] = categories.map((category) => {
    const bucketDrivers = analyses.filter((item) => item.driver.category === category);
    const bucket = bucketScore(bucketDrivers);
    return {
      category,
      score: bucket,
      conviction: convictionFromDistance(bucket),
      drivers: bucketDrivers,
    };
  });

  const horizonOutlooks = buildDashboardHorizons(analyses);
  const baseCaseHorizon =
    [...horizonOutlooks]
      .sort((a, b) => Math.abs(b.score ?? 0) - Math.abs(a.score ?? 0))[0] ?? null;

  return {
    score,
    conviction,
    conclusion,
    summary: buildSummary(score, bullishDrivers.length, bearishDrivers.length),
    baseCaseHorizon,
    horizonOutlooks,
    bullishDrivers,
    bearishDrivers,
    strongestPositives: bullishDrivers.slice(0, 3),
    strongestNegatives: bearishDrivers.slice(0, 3),
    buckets,
  };
}
