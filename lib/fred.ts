import "server-only";

import { ObservationPoint, SeriesBundle } from "@/types";
import { safeNumber } from "@/lib/format";

type FredObservationResponse = {
  observations?: Array<{ date: string; value: string }>;
};

type FredSeriesResponse = {
  seriess?: Array<{ last_updated?: string; notes?: string }>;
};

const lastSuccessfulBundles = new Map<string, SeriesBundle>();

function getFredApiKey() {
  return process.env.FRED_API_KEY;
}

function buildFredUrl(endpoint: string, params: Record<string, string>) {
  const url = new URL(`https://api.stlouisfed.org/fred/${endpoint}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  url.searchParams.set("file_type", "json");
  url.searchParams.set("api_key", getFredApiKey() ?? "");
  return url.toString();
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function loadFredSeriesBundle({
  seriesId,
  label,
  sourceLabel,
  sourceUrl,
  units,
}: {
  seriesId: string;
  label: string;
  sourceLabel: string;
  sourceUrl?: string;
  units: string;
}): Promise<SeriesBundle> {
  const apiKey = getFredApiKey();

  if (!apiKey) {
    return {
      key: seriesId,
      data: [],
      meta: {
        label,
        sourceLabel,
        sourceUrl,
        units,
        fetchedAt: new Date().toISOString(),
        refreshIntervalSeconds: 300,
        status: "error",
        notes: ["Missing FRED_API_KEY in .env.local."],
      },
    };
  }

  const [observationsResponse, seriesResponse] = await Promise.all([
    fetchJson<FredObservationResponse>(
      buildFredUrl("series/observations", {
        series_id: seriesId,
        sort_order: "asc",
        observation_start: "1990-01-01",
      })
    ),
    fetchJson<FredSeriesResponse>(
      buildFredUrl("series", {
        series_id: seriesId,
      })
    ),
  ]);

  const data: ObservationPoint[] = (observationsResponse?.observations ?? [])
    .map((item) => ({
      date: item.date,
      value: safeNumber(item.value) ?? Number.NaN,
    }))
    .filter((item) => Number.isFinite(item.value));

  const lastUpdated = seriesResponse?.seriess?.[0]?.last_updated ?? null;
  const latestSourceDate = data.at(-1)?.date ?? null;

  if (!data.length) {
    const staleBundle = lastSuccessfulBundles.get(seriesId);
    if (staleBundle) {
      return {
        ...staleBundle,
        meta: {
          ...staleBundle.meta,
          fetchedAt: new Date().toISOString(),
          status: "fallback",
          notes: [
            ...(staleBundle.meta.notes ?? []),
            "FRED is temporarily unavailable. Showing the last successful response.",
          ],
        },
      };
    }
  }

  const bundle: SeriesBundle = {
    key: seriesId,
    data,
    meta: {
      label,
      sourceLabel,
      sourceUrl,
      units,
      latestSourceDate,
      lastUpdated,
      fetchedAt: new Date().toISOString(),
      refreshIntervalSeconds: 300,
      status: data.length ? "live" : "error",
      notes: data.length ? [] : ["FRED returned no observations for this series."],
    },
  };

  if (data.length) {
    lastSuccessfulBundles.set(seriesId, bundle);
  }

  return bundle;
}
