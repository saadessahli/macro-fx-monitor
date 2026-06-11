import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";
import { ObservationPoint, SeriesBundle } from "@/types";

type IsmSeriesKey = "ism-manufacturing" | "ism-services";

type LatestIsmPayload = {
  date: string;
  value: number;
  notes?: string[];
  sourceUrl?: string;
};

const liveIsmSources: Record<
  IsmSeriesKey,
  { url: string; descriptionPattern: RegExp }
> = {
  "ism-manufacturing": {
    url: "https://tradingeconomics.com/united-states/business-confidence",
    descriptionPattern:
      /Business Confidence in the United States .+? to ([\d.]+) points in ([A-Za-z]+).+? of (\d{4})/i,
  },
  "ism-services": {
    url: "https://tradingeconomics.com/united-states/non-manufacturing-pmi",
    descriptionPattern:
      /(?:ISM )?(?:Non[- ]?)?Manufacturing PMI in the United States .+? to ([\d.]+) points in ([A-Za-z]+).+? of (\d{4})/i,
  },
};

const monthNumbers: Record<string, string> = {
  january: "01",
  february: "02",
  march: "03",
  april: "04",
  may: "05",
  june: "06",
  july: "07",
  august: "08",
  september: "09",
  october: "10",
  november: "11",
  december: "12",
};

function parseCsv(text: string): ObservationPoint[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length <= 1) return [];

  return lines
    .slice(1)
    .map((line) => {
      const [date, value] = line.split(",");
      const cleanDate = (date ?? "").trim().replace(/^"|"$/g, "");
      const cleanValue = (value ?? "").trim().replace(/^"|"$/g, "");
      return { date: cleanDate, value: Number(cleanValue) };
    })
    .filter((row) => row.date && Number.isFinite(row.value))
    .sort((a, b) => a.date.localeCompare(b.date));
}

async function readIfExists(filePath: string) {
  try {
    return await fs.readFile(path.join(process.cwd(), filePath), "utf8");
  } catch {
    return null;
  }
}

function decodeHtml(value: string) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

async function loadLiveIsmRelease(key: string): Promise<LatestIsmPayload | null> {
  const source = liveIsmSources[key as IsmSeriesKey];
  if (!source) return null;

  try {
    const response = await fetch(source.url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; USMacroDxyDashboard/1.0; +https://fred.stlouisfed.org/)",
      },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return null;

    const html = await response.text();
    const description =
      html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i)?.[1] ?? "";
    const match = decodeHtml(description).match(source.descriptionPattern);
    if (!match) return null;

    const value = Number(match[1]);
    const month = monthNumbers[match[2].toLowerCase()];
    const year = match[3];
    if (!Number.isFinite(value) || !month || !year) return null;

    return {
      date: `${year}-${month}-01`,
      value,
      sourceUrl: source.url,
      notes: [
        "Latest release fetched automatically from Trading Economics and cross-referenced to the official ISM release.",
      ],
    };
  } catch {
    return null;
  }
}

export async function loadIsmSeriesBundle({
  key,
  label,
  sourceLabel,
  sourceUrl,
  units,
  fallbackCsvPath,
  latestJsonPath,
}: {
  key: string;
  label: string;
  sourceLabel: string;
  sourceUrl?: string;
  units: string;
  fallbackCsvPath: string;
  latestJsonPath?: string;
}): Promise<SeriesBundle> {
  const csvText = await readIfExists(fallbackCsvPath);
  const fallbackData = csvText ? parseCsv(csvText) : [];
  const latestText = latestJsonPath ? await readIfExists(latestJsonPath) : null;
  const localOverride = latestText ? (JSON.parse(latestText) as LatestIsmPayload) : null;
  const liveOverride = await loadLiveIsmRelease(key);
  const latestOverride =
    liveOverride && (!localOverride || liveOverride.date >= localOverride.date)
      ? liveOverride
      : localOverride;

  const merged = [...fallbackData];
  const notes: string[] = [];
  let status: SeriesBundle["meta"]["status"] = fallbackData.length ? "fallback" : "error";

  if (latestOverride?.date && Number.isFinite(latestOverride.value)) {
    const existingIndex = merged.findIndex((row) => row.date === latestOverride.date);
    if (existingIndex >= 0) {
      merged[existingIndex] = { date: latestOverride.date, value: latestOverride.value };
    } else {
      merged.push({ date: latestOverride.date, value: latestOverride.value });
      merged.sort((a, b) => a.date.localeCompare(b.date));
    }

    status = liveOverride && latestOverride === liveOverride ? "live" : "fallback";
    if (latestOverride.notes?.length) {
      notes.push(...latestOverride.notes);
    }
  } else if (fallbackData.length) {
    notes.push("Using local historical ISM dataset. Add the optional latest JSON override when a new official release arrives.");
  } else {
    notes.push("No local ISM dataset found yet. Add the historical CSV to enable chart history.");
  }

  return {
    key,
    data: merged,
    meta: {
      label,
      sourceLabel,
      sourceUrl: latestOverride?.sourceUrl ?? sourceUrl,
      units,
      latestSourceDate: merged.at(-1)?.date ?? null,
      lastUpdated: liveOverride && latestOverride === liveOverride ? new Date().toISOString() : null,
      fetchedAt: new Date().toISOString(),
      refreshIntervalSeconds: 300,
      status,
      notes,
    },
  };
}
