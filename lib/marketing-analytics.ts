import type { MarketingDraft, PostPerformance } from "@/types";

export type PerformanceSummary = {
  totalTracked: number;
  totalImpressions: number;
  totalLikes: number;
  totalReplies: number;
  totalReposts: number;
  totalBookmarks: number;
  avgEngagementRate: number;
  bestTopic: string | null;
  bestContentType: string | null;
  highImpressionsLowEngagement: Array<{
    id: string;
    url: string;
    impressions: number;
    engagement: number;
  }>;
  lowImpressionsGoodEngagement: Array<{
    id: string;
    url: string;
    impressions: number;
    quality: string;
  }>;
  recommendation: string;
};

const EMPTY: PerformanceSummary = {
  totalTracked: 0,
  totalImpressions: 0,
  totalLikes: 0,
  totalReplies: 0,
  totalReposts: 0,
  totalBookmarks: 0,
  avgEngagementRate: 0,
  bestTopic: null,
  bestContentType: null,
  highImpressionsLowEngagement: [],
  lowImpressionsGoodEngagement: [],
  recommendation: "No performance data yet. Record your first post using the section below to start tracking.",
};

function engagementRate(r: PostPerformance): number {
  return ((r.likes + r.reposts + r.replies) / Math.max(r.impressions, 1)) * 100;
}

export function buildPerformanceSummary(
  records: PostPerformance[],
  drafts: MarketingDraft[]
): PerformanceSummary {
  if (records.length === 0) return EMPTY;

  const draftById = new Map(drafts.map((d) => [d.id, d]));

  let totalImpressions = 0;
  let totalLikes = 0;
  let totalReplies = 0;
  let totalReposts = 0;
  let totalBookmarks = 0;

  for (const r of records) {
    totalImpressions += r.impressions;
    totalLikes += r.likes;
    totalReplies += r.replies;
    totalReposts += r.reposts;
    totalBookmarks += r.bookmarks;
  }

  const avgEngagementRate = totalImpressions > 0
    ? ((totalLikes + totalReposts + totalReplies) / totalImpressions) * 100
    : 0;

  const avgImpressions = totalImpressions / records.length;

  // Topic and content-type breakdown — only for records linked to a known draft
  const topicImpressions = new Map<string, number>();
  const typeImpressions = new Map<string, number>();

  for (const r of records) {
    if (!r.draftId) continue;
    const draft = draftById.get(r.draftId);
    if (!draft) continue;
    topicImpressions.set(draft.topic, (topicImpressions.get(draft.topic) ?? 0) + r.impressions);
    typeImpressions.set(draft.contentType, (typeImpressions.get(draft.contentType) ?? 0) + r.impressions);
  }

  const bestTopic =
    [...topicImpressions.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const bestContentType =
    [...typeImpressions.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // High impressions (above average) but low engagement (< 1.5%)
  const highImpressionsLowEngagement = records
    .filter((r) => r.impressions > avgImpressions && engagementRate(r) < 1.5)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 3)
    .map((r) => ({
      id: r.id,
      url: r.postedUrl,
      impressions: r.impressions,
      engagement: engagementRate(r),
    }));

  // Low impressions (below average) but manually rated good/strong
  const lowImpressionsGoodEngagement = records
    .filter(
      (r) =>
        r.impressions < avgImpressions &&
        (r.resultQuality === "good" || r.resultQuality === "strong")
    )
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 3)
    .map((r) => ({
      id: r.id,
      url: r.postedUrl,
      impressions: r.impressions,
      quality: r.resultQuality,
    }));

  // Deterministic recommendation text
  let recommendation = "Keep recording performance data to build a clearer picture over time.";
  if (bestTopic && bestContentType) {
    recommendation = `Your strongest reach came from ${bestTopic} posts in ${bestContentType} format — prioritise this combination next week.`;
    if (highImpressionsLowEngagement.length > 0) {
      recommendation += " Some high-reach posts had low engagement; try ending with a clearer question or call to action.";
    }
    if (lowImpressionsGoodEngagement.length > 0) {
      recommendation += " A few lower-reach posts rated good or strong — consider repeating or reposting at a higher-traffic time.";
    }
  } else if (topicImpressions.size === 0) {
    recommendation =
      "Link posts to drafts when recording performance to unlock topic and format insights.";
  }

  return {
    totalTracked: records.length,
    totalImpressions,
    totalLikes,
    totalReplies,
    totalReposts,
    totalBookmarks,
    avgEngagementRate: Math.round(avgEngagementRate * 10) / 10,
    bestTopic,
    bestContentType,
    highImpressionsLowEngagement,
    lowImpressionsGoodEngagement,
    recommendation,
  };
}
