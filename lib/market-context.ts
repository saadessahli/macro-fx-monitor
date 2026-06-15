import "server-only";

import { createHash } from "node:crypto";
import { loadEconomicCalendar } from "@/lib/economic-calendar";
import { supabaseRequest } from "@/lib/supabase";
import type {
  ContextImportance,
  DxyRelevance,
  FreshMarketContext,
  ManualContextKind,
  ManualContextNote,
  MarketCalendarEvent,
  MarketContextCategory,
  MarketNewsItem,
  MarketSentiment,
} from "@/types";

type CalendarRow = {
  id: string;
  event_name: string;
  country: string;
  currency: string;
  event_date: string;
  event_time: string;
  importance: ContextImportance;
  category: MarketContextCategory;
  previous: string;
  forecast: string;
  actual: string;
  source: string;
  source_url: string;
  why_it_matters: string;
  is_manual: boolean;
  refreshed_at: string;
};

type NewsRow = {
  id: string;
  headline: string;
  summary: string;
  source: string;
  url: string;
  published_at: string;
  topic: string;
  relevance_score: number;
  macro_impact_category: MarketContextCategory;
  sentiment: MarketSentiment;
  dxy_relevance: DxyRelevance;
  dxy_angle: string;
  is_manual: boolean;
  refreshed_at: string;
};

type NoteRow = {
  id: string;
  kind: ManualContextKind;
  title: string;
  details: string;
  context_date: string;
  created_at: string;
};

type CalendarProvider = {
  id: string;
  fetchEvents: () => Promise<MarketCalendarEvent[]>;
};

type NewsProvider = {
  id: string;
  fetchItems: () => Promise<MarketNewsItem[]>;
};

function hashId(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 24);
}

function toDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function categoryFor(value: string): MarketContextCategory {
  if (/\b(cpi|ppi|pce|inflation|prices?)\b/i.test(value)) return "inflation";
  if (/\b(fed|fomc|powell|rate cut|rate hike)\b/i.test(value)) return "Fed";
  if (/\b(payroll|nfp|unemployment|jobless|labor|jobs)\b/i.test(value)) return "labor";
  if (/\b(gdp|retail|ism|growth|recession)\b/i.test(value)) return "growth";
  if (/\b(treasury|yield|auction|issuance)\b/i.test(value)) return "yields";
  if (/\b(dxy|dollar|usd)\b/i.test(value)) return "USD";
  if (/\b(oil|crude|opec)\b/i.test(value)) return "oil";
  if (/\b(iran|israel|war|geopolit|tariff|trade deal)\b/i.test(value)) return "geopolitical";
  if (/\b(risk-on|risk-off|risk sentiment|equities|volatility)\b/i.test(value)) return "risk sentiment";
  return "other";
}

function whyCalendarMatters(name: string, category: MarketContextCategory) {
  const explanations: Record<MarketContextCategory, string> = {
    inflation: "Inflation surprises can reprice the expected Fed path and Treasury yields, which can move DXY.",
    Fed: "Fed communication can change rate expectations before any policy action occurs.",
    labor: "Labor data affects the growth and inflation outlook that shapes Fed expectations.",
    growth: "Growth surprises can change relative-rate expectations and demand for the dollar.",
    yields: "Treasury supply and yields can confirm or contradict the current DXY regime.",
    USD: "This event has a direct connection to broad dollar positioning.",
    "risk sentiment": "Risk sentiment can change safe-haven demand and cross-asset confirmation.",
    oil: "Oil can affect inflation expectations, risk sentiment, and the dollar through several channels.",
    geopolitical: "Geopolitical headlines matter when they move oil, yields, or broad risk sentiment.",
    other: `${name} may matter if it changes U.S. growth, inflation, or rate expectations.`,
  };
  return explanations[category];
}

function classifyNews(text: string) {
  const category = categoryFor(text);
  const riskOff = /\b(war|attack|conflict|sanction|crisis|risk-off|escalat|recession)\b/i.test(text);
  const riskOn = /\b(de-escalat|deal|ceasefire|risk-on|agreement|cooling inflation)\b/i.test(text);
  const sentiment: MarketSentiment = riskOff ? "risk-off" : riskOn ? "risk-on" : "uncertain";
  const high = /\b(fed|fomc|powell|cpi|pce|payroll|treasury|yield|dxy|usd|iran|israel|tariff|oil)\b/i.test(text);
  return {
    category,
    sentiment,
    relevanceScore: high ? 85 : 62,
    dxyRelevance: high ? ("high" as const) : ("medium" as const),
    angle: category === "geopolitical"
      ? "Markets are watching whether the headline changes oil, risk sentiment, Treasury yields, or safe-haven USD demand."
      : whyCalendarMatters("This headline", category),
  };
}

function fromCalendarRow(row: CalendarRow): MarketCalendarEvent {
  return {
    id: row.id,
    eventName: row.event_name,
    country: row.country,
    currency: row.currency,
    eventDate: row.event_date,
    eventTime: row.event_time,
    importance: row.importance,
    category: row.category,
    previous: row.previous,
    forecast: row.forecast,
    actual: row.actual,
    source: row.source,
    sourceUrl: row.source_url,
    whyItMatters: row.why_it_matters,
    isManual: row.is_manual,
    refreshedAt: row.refreshed_at,
  };
}

function fromNewsRow(row: NewsRow): MarketNewsItem {
  return {
    id: row.id,
    headline: row.headline,
    summary: row.summary,
    source: row.source,
    url: row.url,
    publishedAt: row.published_at,
    topic: row.topic,
    relevanceScore: row.relevance_score,
    macroImpactCategory: row.macro_impact_category,
    sentiment: row.sentiment,
    dxyRelevance: row.dxy_relevance,
    dxyAngle: row.dxy_angle,
    isManual: row.is_manual,
    refreshedAt: row.refreshed_at,
  };
}

function fromNoteRow(row: NoteRow): ManualContextNote {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    details: row.details,
    contextDate: row.context_date,
    createdAt: row.created_at,
  };
}

export function calendarProviderEnabled() {
  return process.env.ECONOMIC_CALENDAR_ENABLED !== "false"
    && Boolean(process.env.ECONOMIC_CALENDAR_API_KEY)
    && (process.env.ECONOMIC_CALENDAR_PROVIDER ?? "").toLowerCase() === "finnhub";
}

export function newsProviderEnabled() {
  return process.env.NEWS_ENABLED !== "false"
    && Boolean(process.env.NEWS_API_KEY)
    && (process.env.NEWS_PROVIDER ?? "").toLowerCase() === "newsapi";
}

export async function checkMarketContextStorage() {
  const tables = [
    "economic_calendar_events",
    "market_news_context",
    "manual_market_context",
    "marketing_daily_plans",
  ];
  const checks = await Promise.all(tables.map((table) =>
    supabaseRequest(`${table}?select=*&limit=0`).then(() => true).catch(() => false)
  ));
  return checks.every(Boolean);
}

async function fetchFinnhubCalendar(): Promise<MarketCalendarEvent[]> {
  if (!calendarProviderEnabled()) return [];
  const from = new Date();
  const to = new Date(from);
  to.setUTCDate(to.getUTCDate() + 14);
  const url = new URL("https://finnhub.io/api/v1/calendar/economic");
  url.searchParams.set("from", toDate(from));
  url.searchParams.set("to", toDate(to));
  url.searchParams.set("token", process.env.ECONOMIC_CALENDAR_API_KEY as string);
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`Calendar provider returned ${response.status}.`);
  const payload = await response.json() as {
    economicCalendar?: Array<Record<string, unknown>>;
  };
  const refreshedAt = new Date().toISOString();
  return (payload.economicCalendar ?? [])
    .filter((item) => String(item.country ?? "").toUpperCase() === "US")
    .map((item) => {
      const name = String(item.event ?? "US economic event");
      const category = categoryFor(name);
      const impact = String(item.impact ?? "").toLowerCase();
      const importance: ContextImportance = impact.includes("high")
        ? "high"
        : impact.includes("low") ? "low" : "medium";
      const time = String(item.time ?? "");
      const date = time.slice(0, 10) || toDate(from);
      return {
        id: `finnhub-${hashId(`${name}:${time}`)}`,
        eventName: name,
        country: "US",
        currency: "USD",
        eventDate: date,
        eventTime: time.includes("T") ? time.slice(11, 16) : "",
        importance,
        category,
        previous: String(item.prev ?? ""),
        forecast: String(item.estimate ?? ""),
        actual: String(item.actual ?? ""),
        source: "Finnhub",
        sourceUrl: "https://finnhub.io/docs/api/economic-calendar",
        whyItMatters: whyCalendarMatters(name, category),
        isManual: false,
        refreshedAt,
      };
    });
}

async function fetchFredFallbackCalendar(): Promise<MarketCalendarEvent[]> {
  const refreshedAt = new Date().toISOString();
  return (await loadEconomicCalendar(14)).map((event) => {
    const category = categoryFor(`${event.releaseName} ${event.relatedDrivers.join(" ")}`);
    return {
      id: `fred-${event.releaseId}-${event.date}`,
      eventName: event.releaseName,
      country: "US",
      currency: "USD",
      eventDate: event.date,
      eventTime: "",
      importance: event.importance,
      category,
      previous: "",
      forecast: "",
      actual: "",
      source: "FRED",
      sourceUrl: "https://fred.stlouisfed.org/releases/calendar",
      whyItMatters: whyCalendarMatters(event.releaseName, category),
      isManual: false,
      refreshedAt,
    };
  });
}

async function fetchNewsApi(): Promise<MarketNewsItem[]> {
  if (!newsProviderEnabled()) return [];
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - 2);
  const url = new URL("https://newsapi.org/v2/everything");
  url.searchParams.set(
    "q",
    '(Fed OR FOMC OR Powell OR inflation OR "Treasury yields" OR DXY OR USD OR oil OR Iran OR Israel OR tariffs OR recession OR "labor market")'
  );
  url.searchParams.set("searchIn", "title,description");
  url.searchParams.set("from", from.toISOString());
  url.searchParams.set("language", "en");
  url.searchParams.set("sortBy", "publishedAt");
  url.searchParams.set("pageSize", "30");
  const response = await fetch(url, {
    cache: "no-store",
    headers: { "X-Api-Key": process.env.NEWS_API_KEY as string },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`News provider returned ${response.status}.`);
  const payload = await response.json() as {
    articles?: Array<{
      source?: { name?: string };
      title?: string;
      description?: string;
      url?: string;
      publishedAt?: string;
    }>;
  };
  const refreshedAt = new Date().toISOString();
  return (payload.articles ?? []).flatMap((article) => {
    const headline = String(article.title ?? "").trim();
    if (!headline || headline === "[Removed]") return [];
    const classified = classifyNews(`${headline} ${article.description ?? ""}`);
    return [{
      id: `newsapi-${hashId(article.url || `${headline}:${article.publishedAt}`)}`,
      headline,
      summary: String(article.description ?? ""),
      source: String(article.source?.name ?? "NewsAPI source"),
      url: String(article.url ?? ""),
      publishedAt: String(article.publishedAt ?? refreshedAt),
      topic: classified.category,
      relevanceScore: classified.relevanceScore,
      macroImpactCategory: classified.category,
      sentiment: classified.sentiment,
      dxyRelevance: classified.dxyRelevance,
      dxyAngle: classified.angle,
      isManual: false,
      refreshedAt,
    }];
  });
}

const finnhubCalendarProvider: CalendarProvider = {
  id: "finnhub",
  fetchEvents: fetchFinnhubCalendar,
};

const fredCalendarFallback: CalendarProvider = {
  id: "fred-fallback",
  fetchEvents: fetchFredFallbackCalendar,
};

const newsApiProvider: NewsProvider = {
  id: "newsapi",
  fetchItems: fetchNewsApi,
};

async function upsertCalendar(events: MarketCalendarEvent[]) {
  if (!events.length) return;
  await supabaseRequest("economic_calendar_events?on_conflict=id", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: events.map((event) => ({
      id: event.id,
      event_name: event.eventName,
      country: event.country,
      currency: event.currency,
      event_date: event.eventDate,
      event_time: event.eventTime,
      importance: event.importance,
      category: event.category,
      previous: event.previous,
      forecast: event.forecast,
      actual: event.actual,
      source: event.source,
      source_url: event.sourceUrl,
      why_it_matters: event.whyItMatters,
      is_manual: event.isManual,
      refreshed_at: event.refreshedAt,
    })),
  });
}

async function upsertNews(items: MarketNewsItem[]) {
  if (!items.length) return;
  await supabaseRequest("market_news_context?on_conflict=id", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: items.map((item) => ({
      id: item.id,
      headline: item.headline,
      summary: item.summary,
      source: item.source,
      url: item.url,
      published_at: item.publishedAt,
      topic: item.topic,
      relevance_score: item.relevanceScore,
      macro_impact_category: item.macroImpactCategory,
      sentiment: item.sentiment,
      dxy_relevance: item.dxyRelevance,
      dxy_angle: item.dxyAngle,
      is_manual: item.isManual,
      refreshed_at: item.refreshedAt,
    })),
  });
}

export async function refreshCalendarContext() {
  const provider = calendarProviderEnabled()
    ? finnhubCalendarProvider
    : fredCalendarFallback;
  const events = await provider.fetchEvents();
  await upsertCalendar(events);
  return {
    events,
    mode: provider.id === "finnhub" ? ("provider" as const) : ("fred-fallback" as const),
  };
}

export async function refreshNewsContext() {
  if (!newsProviderEnabled()) return { items: [], mode: "manual" as const };
  const items = await newsApiProvider.fetchItems();
  await upsertNews(items);
  return { items, mode: "provider" as const };
}

export async function loadFreshMarketContext(): Promise<FreshMarketContext> {
  const today = new Date();
  const weekEnd = new Date(today);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
  const newsStart = new Date(today);
  newsStart.setUTCDate(newsStart.getUTCDate() - 7);
  const [calendarRows, newsRows, noteRows] = await Promise.all([
    supabaseRequest<CalendarRow[]>(
      `economic_calendar_events?select=*&event_date=gte.${toDate(today)}&event_date=lte.${toDate(weekEnd)}&order=event_date.asc,event_time.asc&limit=50`
    ).catch(() => []),
    supabaseRequest<NewsRow[]>(
      `market_news_context?select=*&published_at=gte.${newsStart.toISOString()}&order=relevance_score.desc,published_at.desc&limit=30`
    ).catch(() => []),
    supabaseRequest<NoteRow[]>(
      `manual_market_context?select=*&context_date=gte.${toDate(newsStart)}&order=created_at.desc&limit=30`
    ).catch(() => []),
  ]);
  const calendarEvents = calendarRows.map(fromCalendarRow);
  const newsItems = newsRows.map(fromNewsRow);
  const manualNotes = noteRows.map(fromNoteRow);
  return {
    calendarEvents,
    newsItems,
    manualNotes,
    calendarRefreshedAt: calendarEvents[0]?.refreshedAt ?? null,
    newsRefreshedAt: newsItems[0]?.refreshedAt ?? null,
    calendarApiEnabled: calendarProviderEnabled(),
    newsApiEnabled: newsProviderEnabled(),
    calendarMode: calendarProviderEnabled()
      ? "provider"
      : calendarEvents.some((event) => !event.isManual) ? "fred-fallback" : "manual",
    newsMode: newsProviderEnabled() ? "provider" : "manual",
  };
}

export async function addManualContext(input: {
  kind: ManualContextKind;
  title: string;
  details: string;
  contextDate: string;
}) {
  const title = input.title.trim().slice(0, 240);
  const details = input.details.trim().slice(0, 1200);
  if (!title) throw new Error("A title or context note is required.");
  const now = new Date().toISOString();
  if (input.kind === "event") {
    const category = categoryFor(`${title} ${details}`);
    await upsertCalendar([{
      id: `manual-${hashId(`${title}:${input.contextDate}:${now}`)}`,
      eventName: title,
      country: "US",
      currency: "USD",
      eventDate: input.contextDate,
      eventTime: "",
      importance: "high",
      category,
      previous: "",
      forecast: "",
      actual: "",
      source: "Manual admin context",
      sourceUrl: "",
      whyItMatters: details || whyCalendarMatters(title, category),
      isManual: true,
      refreshedAt: now,
    }]);
  } else if (input.kind === "headline" || input.kind === "geopolitical") {
    const classified = classifyNews(`${title} ${details}`);
    await upsertNews([{
      id: `manual-${hashId(`${title}:${now}`)}`,
      headline: title,
      summary: details,
      source: "Manual admin context",
      url: "",
      publishedAt: now,
      topic: input.kind === "geopolitical" ? "geopolitical" : classified.category,
      relevanceScore: input.kind === "geopolitical" ? 90 : classified.relevanceScore,
      macroImpactCategory: input.kind === "geopolitical" ? "geopolitical" : classified.category,
      sentiment: classified.sentiment,
      dxyRelevance: "high",
      dxyAngle: classified.angle,
      isManual: true,
      refreshedAt: now,
    }]);
  }
  const rows = await supabaseRequest<NoteRow[]>("manual_market_context", {
    method: "POST",
    prefer: "return=representation",
    body: {
      kind: input.kind,
      title,
      details,
      context_date: input.contextDate,
    },
  });
  return fromNoteRow(rows[0]);
}

export async function clearTodayPlan() {
  await supabaseRequest(`marketing_daily_plans?plan_date=eq.${toDate(new Date())}`, {
    method: "DELETE",
    prefer: "return=minimal",
  });
}

export async function saveTodayPlan(items: unknown[], generatedAt: string) {
  await supabaseRequest("marketing_daily_plans?on_conflict=plan_date", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: {
      plan_date: toDate(new Date(generatedAt)),
      generated_at: generatedAt,
      items,
    },
  });
}
