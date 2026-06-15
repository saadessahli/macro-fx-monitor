import "server-only";

import { createHash } from "node:crypto";
import { buildDashboardAggregate } from "@/lib/dashboard";
import { loadEconomicCalendar } from "@/lib/economic-calendar";
import { loadAllDriverAnalyses } from "@/lib/series";
import { supabaseRequest } from "@/lib/supabase";
import { MacroSnapshot, NewsletterFrequency, SnapshotDriver } from "@/types";

function toDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function snapshotDriver(item: Awaited<ReturnType<typeof loadAllDriverAnalyses>>[number]): SnapshotDriver {
  return {
    slug: item.driver.slug,
    title: item.driver.title,
    latest: item.metrics.latest,
    latestDate: item.metrics.latestDate,
    score: item.metrics.score,
    conclusion: item.metrics.conclusion,
    change: item.metrics.absoluteChange,
  };
}

function buildDxyPlay(score: number | null, conclusion: MacroSnapshot["dxyConclusion"]) {
  if (score !== null && score >= 2.2) {
    return {
      bias: "Bullish USD bias",
      expression: "Favor buying DXY pullbacks or expressing USD strength against weaker relative-rate currencies.",
      confirmation: "U.S. yields remain firm while inflation or growth releases continue to beat the cooling narrative.",
      invalidation: "A sustained decline in Treasury yields alongside softer labor and inflation data.",
      riskNote: "Treat this as a macro scenario, not a trade instruction. Position size and event risk still matter.",
    };
  }

  if (score !== null && score <= -2.2) {
    return {
      bias: "Bearish USD bias",
      expression: "Favor selling DXY rallies when softer U.S. data is confirmed by declining Treasury yields.",
      confirmation: "Disinflation and growth cooling broaden while the market prices a more dovish Fed path.",
      invalidation: "A renewed rise in yields or upside inflation surprises that restore U.S. rate support.",
      riskNote: "Treat this as a macro scenario, not a trade instruction. Position size and event risk still matter.",
    };
  }

  return {
    bias: "Neutral / tactical USD bias",
    expression: "Avoid chasing broad DXY direction; focus on event-driven ranges and relative-value setups.",
    confirmation: "The inflation, growth, and rates blocks remain mixed without a dominant macro impulse.",
    invalidation: `A decisive shift from ${conclusion.toLowerCase()} as multiple high-weight drivers align.`,
    riskNote: "Treat this as a macro scenario, not a trade instruction. Position size and event risk still matter.",
  };
}

export async function generateMacroSnapshot(frequency: NewsletterFrequency): Promise<MacroSnapshot> {
  const analyses = await loadAllDriverAnalyses();
  const aggregate = buildDashboardAggregate(analyses);
  const upcomingCalendar = await loadEconomicCalendar(frequency === "weekly" ? 14 : 35);
  const generatedAt = new Date();
  const periodStart = new Date(generatedAt);
  periodStart.setUTCDate(periodStart.getUTCDate() - (frequency === "weekly" ? 7 : 30));

  const recentReleases = analyses
    .filter(
      (item) =>
        item.metrics.latestDate &&
        item.metrics.latestDate >= toDate(periodStart) &&
        item.metrics.latestDate <= toDate(generatedAt)
    )
    .sort((a, b) => (b.metrics.latestDate ?? "").localeCompare(a.metrics.latestDate ?? ""))
    .map(snapshotDriver);

  const strongestDrivers = [...analyses]
    .filter((item) => item.metrics.score !== null)
    .sort((a, b) => Math.abs(b.metrics.score ?? 0) - Math.abs(a.metrics.score ?? 0))
    .slice(0, 5)
    .map(snapshotDriver);

  const id = createHash("sha256")
    .update(`${frequency}:${toDate(periodStart)}:${toDate(generatedAt)}`)
    .digest("hex")
    .slice(0, 16);

  return {
    id,
    frequency,
    periodStart: toDate(periodStart),
    periodEnd: toDate(generatedAt),
    generatedAt: generatedAt.toISOString(),
    title: `${frequency === "weekly" ? "Weekly" : "Monthly"} US Macro / DXY Snapshot`,
    summary: aggregate.summary,
    dxyScore: aggregate.score,
    dxyConclusion: aggregate.conclusion,
    dxyPlay: buildDxyPlay(aggregate.score, aggregate.conclusion),
    strongestDrivers,
    recentReleases,
    upcomingCalendar,
  };
}

export async function saveMacroSnapshot(snapshot: MacroSnapshot) {
  await supabaseRequest("snapshots?on_conflict=id", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: {
      id: snapshot.id,
      frequency: snapshot.frequency,
      period_start: snapshot.periodStart,
      period_end: snapshot.periodEnd,
      generated_at: snapshot.generatedAt,
      payload: snapshot,
      delivery_status: "pending",
    },
  });
}

export async function saveMacroSnapshotForMarketing(snapshot: MacroSnapshot) {
  const existing = await loadSnapshotById(snapshot.id);
  const body = {
    frequency: snapshot.frequency,
    period_start: snapshot.periodStart,
    period_end: snapshot.periodEnd,
    generated_at: snapshot.generatedAt,
    payload: snapshot,
  };

  if (existing) {
    await supabaseRequest(`snapshots?id=eq.${snapshot.id}`, {
      method: "PATCH",
      prefer: "return=minimal",
      body,
    });
    return;
  }

  await supabaseRequest("snapshots", {
    method: "POST",
    prefer: "return=minimal",
    body: {
      id: snapshot.id,
      ...body,
      delivery_status: "pending",
    },
  });
}

export async function loadSnapshotById(id: string) {
  const rows = await supabaseRequest<
    Array<{
      payload: MacroSnapshot;
      delivery_status: string;
      provider_message_id: string | null;
    }>
  >(
    `snapshots?id=eq.${id}&select=payload,delivery_status,provider_message_id&limit=1`
  );
  return rows[0] ?? null;
}

export async function markSnapshotDelivered(id: string, providerMessageId: string) {
  await supabaseRequest(`snapshots?id=eq.${id}`, {
    method: "PATCH",
    prefer: "return=minimal",
    body: {
      delivery_status: "sent",
      provider_message_id: providerMessageId,
      delivered_at: new Date().toISOString(),
    },
  });
}

export async function loadLatestSnapshot(frequency?: NewsletterFrequency) {
  const filter = frequency ? `&frequency=eq.${frequency}` : "";
  const rows = await supabaseRequest<Array<{ payload: MacroSnapshot }>>(
    `snapshots?select=payload${filter}&order=generated_at.desc&limit=1`
  );
  return rows[0]?.payload ?? null;
}

export async function loadRecentSnapshots(frequency: NewsletterFrequency, limit = 2) {
  const rows = await supabaseRequest<Array<{ payload: MacroSnapshot }>>(
    `snapshots?select=payload&frequency=eq.${frequency}&order=generated_at.desc&limit=${limit}`
  );
  return rows.map((row) => row.payload);
}
