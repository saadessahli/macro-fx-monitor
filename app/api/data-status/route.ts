import { NextResponse } from "next/server";
import { loadAllDriverAnalyses } from "@/lib/series";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const analyses = await loadAllDriverAnalyses();

  const sources = analyses.map(({ driver, primarySeries, secondarySeries, metrics }) => ({
    driver: driver.slug,
    label: driver.title,
    frequency: driver.frequency,
    value: metrics.latest,
    observationDate: metrics.latestDate,
    sourceStatus: primarySeries.meta.status,
    sourceLabel: primarySeries.meta.sourceLabel,
    sourceLastUpdated: primarySeries.meta.lastUpdated ?? null,
    checkedAt: primarySeries.meta.fetchedAt ?? null,
    refreshIntervalSeconds: primarySeries.meta.refreshIntervalSeconds ?? null,
    secondarySource: secondarySeries
      ? {
          value: secondarySeries.data.at(-1)?.value ?? null,
          observationDate: secondarySeries.meta.latestSourceDate ?? null,
          sourceStatus: secondarySeries.meta.status,
          sourceLabel: secondarySeries.meta.sourceLabel,
          sourceLastUpdated: secondarySeries.meta.lastUpdated ?? null,
          checkedAt: secondarySeries.meta.fetchedAt ?? null,
        }
      : null,
  }));

  return NextResponse.json(
    {
      checkedAt: new Date().toISOString(),
      healthy: sources.every((source) => source.value !== null && source.sourceStatus !== "error"),
      sources,
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
