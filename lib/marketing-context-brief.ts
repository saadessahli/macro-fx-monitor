import "server-only";

import { buildPerformanceSummary } from "@/lib/marketing-analytics";
import { buildContentCalendar, type CalendarDay } from "@/lib/marketing-calendar";
import { buildWeeklyGrowthReport } from "@/lib/marketing-weekly-report";
import type { MarketingDraft, PostPerformance } from "@/types";

export type ContextBrief = {
  bestTopic: string | null;
  bestContentType: string | null;
  repeatTopics: string[];
  avoidTopics: string[];
  todayCalendarEntry: CalendarDay | null;
  compactText: string;
};

export function buildContextBrief(
  records: PostPerformance[],
  drafts: MarketingDraft[]
): ContextBrief {
  const summary = buildPerformanceSummary(records, drafts);
  const weeklyReport = buildWeeklyGrowthReport(records, drafts);
  const calendar = buildContentCalendar(drafts, weeklyReport);

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayCalendarEntry = calendar.find((d) => d.date === todayStr) ?? calendar[0] ?? null;

  const repeatTopics = weeklyReport.bestTopics.map((t) => t.topic);
  // Only flag topics that are genuinely poor — bad quality or <1% engagement
  const avoidTopics = weeklyReport.weakestTopics
    .filter((t) => t.topQuality === "bad" || t.avgEngagementRate < 1)
    .map((t) => t.topic);

  const parts: string[] = [];

  if (summary.totalTracked > 0) {
    if (summary.bestTopic) {
      parts.push(
        `Best topic by reach: ${summary.bestTopic} (${summary.totalTracked} posts tracked, ${summary.avgEngagementRate.toFixed(1)}% avg engagement).`
      );
    }
    if (summary.bestContentType) {
      parts.push(`Best format by impressions: ${summary.bestContentType}.`);
    }
    if (weeklyReport.impressionsTrend !== "insufficient") {
      parts.push(`Impression trend this week: ${weeklyReport.impressionsTrend}.`);
    }
    if (repeatTopics.length > 0) {
      parts.push(`Prioritise these topics: ${repeatTopics.join(", ")}.`);
    }
    if (avoidTopics.length > 0) {
      parts.push(`Deprioritise these topics: ${avoidTopics.join(", ")}.`);
    }
  } else {
    parts.push(
      "No performance data yet — use the macro snapshot and topic bank as primary signals."
    );
  }

  if (todayCalendarEntry) {
    parts.push(
      `Today's content plan: ${todayCalendarEntry.topic} (${todayCalendarEntry.contentType}).` +
      ` Suggested angle: "${todayCalendarEntry.suggestedAngle}".` +
      ` Suggested CTA: "${todayCalendarEntry.suggestedCta}".`
    );
  }

  return {
    bestTopic: summary.bestTopic,
    bestContentType: summary.bestContentType,
    repeatTopics,
    avoidTopics,
    todayCalendarEntry,
    compactText: parts.join(" ").slice(0, 600),
  };
}
