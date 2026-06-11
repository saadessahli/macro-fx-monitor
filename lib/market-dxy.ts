import "server-only";

import { SeriesBundle } from "@/types";
import { safeNumber } from "@/lib/format";

type MarketDxyResponse = {
  points?: Array<{ date: string; value: number | string }>;
  latestSourceDate?: string;
  lastUpdated?: string;
  sourceLabel?: string;
  sourceUrl?: string;
  notes?: string[];
};

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number;
        regularMarketTime?: number;
        exchangeName?: string;
      };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{ close?: Array<number | null> }>;
      };
    }>;
  };
};

async function loadYahooDxyBundle(): Promise<SeriesBundle> {
  try {
    const response = await fetch(
      "https://query1.finance.yahoo.com/v8/finance/chart/DX-Y.NYB?interval=1d&range=5y",
      {
        headers: { "User-Agent": "Mozilla/5.0" },
        next: { revalidate: 60 },
        signal: AbortSignal.timeout(10_000),
      }
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const payload = (await response.json()) as YahooChartResponse;
    const result = payload.chart?.result?.[0];
    const timestamps = result?.timestamp ?? [];
    const closes = result?.indicators?.quote?.[0]?.close ?? [];
    const data = timestamps
      .map((timestamp, index) => ({
        date: new Date(timestamp * 1000).toISOString().slice(0, 10),
        value: closes[index] ?? Number.NaN,
      }))
      .filter((point) => Number.isFinite(point.value));

    const marketPrice = result?.meta?.regularMarketPrice;
    const marketTime = result?.meta?.regularMarketTime;
    if (Number.isFinite(marketPrice) && marketTime) {
      const currentPoint = {
        date: new Date(marketTime * 1000).toISOString().slice(0, 10),
        value: marketPrice as number,
      };
      const existingIndex = data.findIndex((point) => point.date === currentPoint.date);
      if (existingIndex >= 0) data[existingIndex] = currentPoint;
      else data.push(currentPoint);
    }

    return {
      key: "market-dxy",
      data,
      meta: {
        label: "U.S. Dollar Index (DXY)",
        sourceLabel: "Yahoo Finance / ICE Futures delayed market quote",
        sourceUrl: "https://finance.yahoo.com/quote/DX-Y.NYB/",
        units: "Index",
        latestSourceDate: data.at(-1)?.date ?? null,
        lastUpdated: marketTime ? new Date(marketTime * 1000).toISOString() : null,
        fetchedAt: new Date().toISOString(),
        refreshIntervalSeconds: 60,
        status: data.length ? "live" : "error",
        notes: [
          "Automatically refreshed delayed market quote.",
          "Configure MARKET_DXY_API_URL for a licensed real-time feed.",
        ],
      },
    };
  } catch {
    return {
      key: "market-dxy",
      data: [],
      meta: {
        label: "U.S. Dollar Index (DXY)",
        sourceLabel: "Yahoo Finance delayed market quote",
        sourceUrl: "https://finance.yahoo.com/quote/DX-Y.NYB/",
        units: "Index",
        fetchedAt: new Date().toISOString(),
        refreshIntervalSeconds: 60,
        status: "error",
        notes: ["The automatic DXY fallback is temporarily unavailable."],
      },
    };
  }
}

export async function loadMarketDxySeriesBundle(): Promise<SeriesBundle> {
  const endpoint = process.env.MARKET_DXY_API_URL;
  const token = process.env.MARKET_DXY_API_TOKEN;

  if (!endpoint) {
    return loadYahooDxyBundle();
  }

  let response: Response;
  try {
    response = await fetch(endpoint, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return loadYahooDxyBundle();
  }

  if (!response.ok) {
    return loadYahooDxyBundle();
  }

  const payload = (await response.json()) as MarketDxyResponse;

  return {
    key: "market-dxy",
    data: (payload.points ?? [])
      .map((point) => ({ date: point.date, value: safeNumber(point.value) ?? Number.NaN }))
      .filter((point) => Number.isFinite(point.value)),
    meta: {
      label: "Market DXY Adapter",
      sourceLabel: payload.sourceLabel ?? "External market DXY adapter",
      sourceUrl: payload.sourceUrl ?? endpoint,
      units: "Index",
      latestSourceDate: payload.latestSourceDate ?? null,
      lastUpdated: payload.lastUpdated ?? null,
      fetchedAt: new Date().toISOString(),
      refreshIntervalSeconds: 60,
      status: (payload.points ?? []).length ? "live" : "error",
      notes: payload.notes ?? [],
    },
  };
}
