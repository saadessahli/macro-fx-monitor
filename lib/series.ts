import "server-only";

import { driverMap, drivers } from "@/lib/drivers";
import { loadFredSeriesBundle } from "@/lib/fred";
import { loadIsmSeriesBundle } from "@/lib/ism";
import { loadMarketDxySeriesBundle } from "@/lib/market-dxy";
import { calculateDriverMetrics } from "@/lib/scoring";
import { DriverAnalysis } from "@/types";

export async function loadDriverAnalysis(slug: string): Promise<DriverAnalysis | null> {
  const driver = driverMap[slug];
  if (!driver) return null;

  let primarySeries;
  if (driver.primarySeries.kind === "fred" && driver.primarySeries.seriesId) {
    primarySeries = await loadFredSeriesBundle({
      seriesId: driver.primarySeries.seriesId,
      label: driver.primarySeries.label,
      sourceLabel: driver.primarySeries.sourceLabel,
      sourceUrl: driver.primarySeries.sourceUrl,
      units: driver.primarySeries.units,
    });
  } else if (
    driver.primarySeries.kind === "ism-hybrid" &&
    driver.primarySeries.fallbackCsvPath
  ) {
    primarySeries = await loadIsmSeriesBundle({
      key: driver.slug,
      label: driver.primarySeries.label,
      sourceLabel: driver.primarySeries.sourceLabel,
      sourceUrl: driver.primarySeries.sourceUrl,
      units: driver.primarySeries.units,
      fallbackCsvPath: driver.primarySeries.fallbackCsvPath,
      latestJsonPath: driver.primarySeries.latestJsonPath,
    });
  } else {
    return null;
  }

  const secondarySeries = driver.secondarySeries
    ? await loadMarketDxySeriesBundle()
    : null;

  return {
    driver,
    primarySeries,
    secondarySeries,
    metrics: calculateDriverMetrics(driver, primarySeries.data),
  };
}

export async function loadAllDriverAnalyses() {
  const analyses = await Promise.all(drivers.map((driver) => loadDriverAnalysis(driver.slug)));
  return analyses.filter((item): item is NonNullable<typeof item> => item !== null);
}
