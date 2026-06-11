import "server-only";

import { drivers } from "@/lib/drivers";
import { EconomicCalendarEvent } from "@/types";

type FredReleaseResponse = {
  releases?: Array<{ id: number; name: string }>;
};

type FredReleaseDatesResponse = {
  release_dates?: Array<{
    release_id: number;
    release_name: string;
    date: string;
  }>;
};

const highImportanceDrivers = new Set([
  "cpi",
  "core-cpi",
  "nfp",
  "unemployment-rate",
  "ism-manufacturing",
  "ism-services",
  "fed-rates",
]);

function buildFredUrl(endpoint: string, params: Record<string, string>) {
  const url = new URL(`https://api.stlouisfed.org/fred/${endpoint}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  url.searchParams.set("api_key", process.env.FRED_API_KEY ?? "");
  url.searchParams.set("file_type", "json");
  return url.toString();
}

async function fetchFred<T>(endpoint: string, params: Record<string, string>): Promise<T | null> {
  try {
    const response = await fetch(buildFredUrl(endpoint, params), {
      next: { revalidate: endpoint === "series/release" ? 86_400 : 3_600 },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function loadEconomicCalendar(days = 30): Promise<EconomicCalendarEvent[]> {
  if (!process.env.FRED_API_KEY) return [];

  const fredDrivers = drivers.filter(
    (driver) => driver.primarySeries.kind === "fred" && driver.primarySeries.seriesId
  );

  const releasePairs = await Promise.all(
    fredDrivers.map(async (driver) => {
      const payload = await fetchFred<FredReleaseResponse>("series/release", {
        series_id: driver.primarySeries.seriesId as string,
      });
      const release = payload?.releases?.[0];
      return release ? { driver, releaseId: release.id } : null;
    })
  );

  const releaseMap = new Map<number, string[]>();
  for (const pair of releasePairs) {
    if (!pair) continue;
    const slugs = releaseMap.get(pair.releaseId) ?? [];
    slugs.push(pair.driver.slug);
    releaseMap.set(pair.releaseId, slugs);
  }

  const start = new Date();
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + days);

  const payload = await fetchFred<FredReleaseDatesResponse>("releases/dates", {
    realtime_start: start.toISOString().slice(0, 10),
    realtime_end: end.toISOString().slice(0, 10),
    include_release_dates_with_no_data: "true",
    limit: "1000",
    sort_order: "asc",
  });

  return (payload?.release_dates ?? [])
    .filter((release) => releaseMap.has(release.release_id))
    .map((release) => {
      const relatedDrivers = releaseMap.get(release.release_id) ?? [];
      return {
        date: release.date,
        releaseId: release.release_id,
        releaseName: release.release_name,
        relatedDrivers,
        importance: relatedDrivers.some((slug) => highImportanceDrivers.has(slug))
          ? ("high" as const)
          : ("medium" as const),
      };
    })
    .filter(
      (event, index, events) =>
        events.findIndex(
          (candidate) =>
            candidate.date === event.date && candidate.releaseId === event.releaseId
        ) === index
    );
}
