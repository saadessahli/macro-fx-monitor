import type { MarketingDraft, PostPerformance } from "@/types";
import { MARKETING_TOPIC_BANK } from "@/lib/marketing-plan";

export type TopicReport = {
  topic: string;
  postCount: number;
  totalImpressions: number;
  totalEngagement: number;
  avgEngagementRate: number;
  topQuality: string;
};

export type ContentExperiment = {
  title: string;
  rationale: string;
  suggestedTopic: string;
  suggestedContentType: string;
};

export type WeeklyGrowthReport = {
  generatedAt: string;
  dataWindowDays: number;
  totalPostsTracked: number;
  thisWeekImpressions: number;
  lastWeekImpressions: number;
  impressionsTrend: "up" | "down" | "flat" | "insufficient";
  bestTopics: TopicReport[];
  weakestTopics: TopicReport[];
  bestContentType: string | null;
  worstContentType: string | null;
  repeatRecommendations: string[];
  avoidRecommendations: string[];
  experiments: ContentExperiment[];
  nextWeekStrategy: string;
  hasEnoughData: boolean;
};

// Numeric score for resultQuality
const QUALITY_SCORE: Record<string, number> = { bad: 0, okay: 1, good: 2, strong: 3 };
const QUALITY_LABEL = ["bad", "okay", "good", "strong"];
const ALL_CONTENT_TYPES = ["single", "thread", "educational", "driver", "weekly-recap", "contrarian"];

function engagementRate(likes: number, reposts: number, replies: number, impressions: number): number {
  return ((likes + reposts + replies) / Math.max(impressions, 1)) * 100;
}

function defaultExperiments(): ContentExperiment[] {
  return [
    {
      title: `${MARKETING_TOPIC_BANK[0]} educational post`,
      rationale: `${MARKETING_TOPIC_BANK[0]} is the core topic of this dashboard — an educational post explaining the index is a strong starting point.`,
      suggestedTopic: MARKETING_TOPIC_BANK[0],
      suggestedContentType: "educational",
    },
    {
      title: `${MARKETING_TOPIC_BANK[2]} snapshot single`,
      rationale: `CPI data is a high-attention release — a timely single post around release day typically drives reach.`,
      suggestedTopic: MARKETING_TOPIC_BANK[2],
      suggestedContentType: "single",
    },
    {
      title: `${MARKETING_TOPIC_BANK[5]} thread`,
      rationale: `Fed expectations are always relevant — a thread breaking down the current outlook drives saves and profile visits.`,
      suggestedTopic: MARKETING_TOPIC_BANK[5],
      suggestedContentType: "thread",
    },
  ];
}

function buildExperiments(
  bestTopics: TopicReport[],
  typeData: Map<string, { count: number; impressions: number; engagement: number }>,
  topicTypes: Map<string, Set<string>>
): ContentExperiment[] {
  if (bestTopics.length === 0) return defaultExperiments();

  const experiments: ContentExperiment[] = [];
  const bestTypeName = [...typeData.entries()]
    .sort((a, b) => b[1].impressions - a[1].impressions)[0]?.[0] ?? "educational";

  // Experiment 1: Best topic in an untried content type
  const triedByBest = topicTypes.get(bestTopics[0].topic) ?? new Set<string>();
  const untriedType = ALL_CONTENT_TYPES.find((ct) => !triedByBest.has(ct));
  if (untriedType) {
    experiments.push({
      title: `${bestTopics[0].topic} as a ${untriedType}`,
      rationale: `Your top topic (${bestTopics[0].topic}) hasn't been tried in ${untriedType} format yet. New format × proven topic often unlocks a fresh audience segment.`,
      suggestedTopic: bestTopics[0].topic,
      suggestedContentType: untriedType,
    });
  } else {
    experiments.push({
      title: `${bestTopics[0].topic} deep-dive ${bestTypeName}`,
      rationale: `Double down on your best topic with your highest-reach format to compound what's already working.`,
      suggestedTopic: bestTopics[0].topic,
      suggestedContentType: bestTypeName,
    });
  }

  // Experiment 2: Under-explored topic from the topic bank
  const usedTopics = new Set(bestTopics.map((t) => t.topic));
  const freshTopic = MARKETING_TOPIC_BANK.find((t) => !usedTopics.has(t));
  if (freshTopic) {
    experiments.push({
      title: `Explore ${freshTopic}`,
      rationale: `${freshTopic} hasn't appeared in your tracked posts yet — testing a new topic surfaces untapped audience interest.`,
      suggestedTopic: freshTopic,
      suggestedContentType: bestTypeName,
    });
  } else if (bestTopics[1]) {
    experiments.push({
      title: `${bestTopics[1].topic} contrarian take`,
      rationale: `Challenge conventional thinking on your second-best topic. Contrarian framing typically sparks debate and boosts engagement.`,
      suggestedTopic: bestTopics[1].topic,
      suggestedContentType: "contrarian",
    });
  }

  // Experiment 3: Thread on the best topic (or second-best if already tried as thread)
  const bestThreadTopic =
    triedByBest.has("thread") && bestTopics[1] ? bestTopics[1].topic : bestTopics[0].topic;
  experiments.push({
    title: `${bestThreadTopic} educational thread`,
    rationale: `Threads drive higher saves and profile visits. Use your macro data to walk through a key concept step-by-step.`,
    suggestedTopic: bestThreadTopic,
    suggestedContentType: "thread",
  });

  // Pad to 3 with defaults if needed
  let di = 0;
  while (experiments.length < 3 && di < 3) {
    const def = defaultExperiments()[di++];
    if (!experiments.some((e) => e.suggestedTopic === def.suggestedTopic && e.suggestedContentType === def.suggestedContentType)) {
      experiments.push(def);
    }
  }

  return experiments.slice(0, 3);
}

function buildStrategy(
  bestTopics: TopicReport[],
  bestContentType: string | null,
  trend: WeeklyGrowthReport["impressionsTrend"],
  experiments: ContentExperiment[]
): string {
  const parts: string[] = [];

  if (trend === "up") {
    parts.push("Impressions are trending up — maintain your current posting cadence.");
  } else if (trend === "down") {
    parts.push("Impressions dipped this week — try posting at different times or refreshing your topic mix.");
  } else if (trend === "flat") {
    parts.push("Impressions are stable — a good time to test a new format to break through the plateau.");
  } else {
    parts.push("Build a week-over-week baseline by posting and recording consistently.");
  }

  if (bestTopics[0] && bestContentType) {
    parts.push(`Lead with ${bestTopics[0].topic} in ${bestContentType} format as your anchor content.`);
  }

  if (experiments[0]) {
    parts.push(`Run at least one experiment — try "${experiments[0].title}" to discover new reach potential.`);
  }

  return parts.join(" ");
}

export function buildWeeklyGrowthReport(
  records: PostPerformance[],
  drafts: MarketingDraft[]
): WeeklyGrowthReport {
  const generatedAt = new Date().toISOString();

  if (records.length < 3) {
    return {
      generatedAt,
      dataWindowDays: 0,
      totalPostsTracked: records.length,
      thisWeekImpressions: 0,
      lastWeekImpressions: 0,
      impressionsTrend: "insufficient",
      bestTopics: [],
      weakestTopics: [],
      bestContentType: null,
      worstContentType: null,
      repeatRecommendations: [],
      avoidRecommendations: [],
      experiments: defaultExperiments(),
      nextWeekStrategy: "Record at least 3 posts to generate a personalised weekly strategy.",
      hasEnoughData: false,
    };
  }

  const draftById = new Map(drafts.map((d) => [d.id, d]));
  const now = new Date();

  // Data window: oldest record to now
  const oldestMs = Math.min(...records.map((r) => new Date(r.createdAt).getTime()));
  const dataWindowDays = Math.max(1, Math.round((now.getTime() - oldestMs) / (1000 * 60 * 60 * 24)));

  // Week-over-week impressions
  const thisWeekStart = new Date(now);
  thisWeekStart.setUTCDate(thisWeekStart.getUTCDate() - 7);
  const lastWeekStart = new Date(now);
  lastWeekStart.setUTCDate(lastWeekStart.getUTCDate() - 14);

  let thisWeekImpressions = 0;
  let lastWeekImpressions = 0;
  for (const r of records) {
    const d = new Date(r.createdAt);
    if (d >= thisWeekStart) thisWeekImpressions += r.impressions;
    else if (d >= lastWeekStart) lastWeekImpressions += r.impressions;
  }

  const impressionsTrend: WeeklyGrowthReport["impressionsTrend"] =
    thisWeekImpressions === 0 && lastWeekImpressions === 0
      ? "insufficient"
      : thisWeekImpressions > lastWeekImpressions * 1.05
        ? "up"
        : thisWeekImpressions < lastWeekImpressions * 0.95
          ? "down"
          : "flat";

  // Per-topic and per-content-type aggregation
  type TData = { postCount: number; totalImpressions: number; totalEngagement: number; qualityScores: number[] };
  type CData = { count: number; impressions: number; engagement: number };
  const topicData = new Map<string, TData>();
  const typeData = new Map<string, CData>();
  const topicTypes = new Map<string, Set<string>>();

  for (const r of records) {
    const draft = r.draftId ? draftById.get(r.draftId) : undefined;
    if (!draft) continue;

    const eng = r.likes + r.reposts + r.replies;

    const td = topicData.get(draft.topic) ?? { postCount: 0, totalImpressions: 0, totalEngagement: 0, qualityScores: [] };
    td.postCount++;
    td.totalImpressions += r.impressions;
    td.totalEngagement += eng;
    td.qualityScores.push(QUALITY_SCORE[r.resultQuality] ?? 1);
    topicData.set(draft.topic, td);

    const cd = typeData.get(draft.contentType) ?? { count: 0, impressions: 0, engagement: 0 };
    cd.count++;
    cd.impressions += r.impressions;
    cd.engagement += eng;
    typeData.set(draft.contentType, cd);

    if (!topicTypes.has(draft.topic)) topicTypes.set(draft.topic, new Set());
    topicTypes.get(draft.topic)!.add(draft.contentType);
  }

  // Build sorted topic reports
  const topicReports: TopicReport[] = [...topicData.entries()].map(([topic, td]) => ({
    topic,
    postCount: td.postCount,
    totalImpressions: td.totalImpressions,
    totalEngagement: td.totalEngagement,
    avgEngagementRate:
      Math.round(engagementRate(0, 0, td.totalEngagement, td.totalImpressions) * 10) / 10,
    topQuality: QUALITY_LABEL[Math.max(...td.qualityScores)] ?? "okay",
  }));

  const byImpressions = [...topicReports].sort((a, b) => b.totalImpressions - a.totalImpressions);
  const bestTopics = byImpressions.slice(0, 3);
  const weakestTopics = byImpressions.length > 3 ? byImpressions.slice(-3).reverse() : [];

  // Content type ranking by average impressions per post
  const sortedTypes = [...typeData.entries()].sort(
    (a, b) => b[1].impressions / b[1].count - a[1].impressions / a[1].count
  );
  const bestContentType = sortedTypes[0]?.[0] ?? null;
  const worstContentType = sortedTypes.length > 1 ? sortedTypes[sortedTypes.length - 1][0] : null;

  // Repeat recommendations
  const repeatRecommendations: string[] = [];
  if (bestTopics[0]) {
    repeatRecommendations.push(
      `Continue posting on ${bestTopics[0].topic} — your strongest topic by total reach.`
    );
  }
  if (bestContentType) {
    repeatRecommendations.push(
      `${bestContentType} format consistently reaches the widest audience — keep using it.`
    );
  }
  const byEngagement = [...topicReports].sort((a, b) => b.avgEngagementRate - a.avgEngagementRate);
  if (byEngagement[0] && byEngagement[0].topic !== bestTopics[0]?.topic) {
    repeatRecommendations.push(
      `${byEngagement[0].topic} drives the highest engagement rate (${byEngagement[0].avgEngagementRate.toFixed(1)}%) — great for replies and saves.`
    );
  }

  // Avoid recommendations
  const avoidRecommendations: string[] = [];
  const topImpressions = bestTopics[0]?.totalImpressions ?? 1;
  const poorTopics = topicReports.filter(
    (t) =>
      t.topQuality === "bad" ||
      (t.topQuality === "okay" && t.totalImpressions < topImpressions * 0.3)
  );
  if (poorTopics[0]) {
    avoidRecommendations.push(
      `Deprioritise ${poorTopics[0].topic} — consistently low reach and quality.`
    );
  }
  if (worstContentType && worstContentType !== bestContentType) {
    avoidRecommendations.push(
      `${worstContentType} posts have the lowest average impressions — test a different format instead.`
    );
  }
  if (avoidRecommendations.length === 0) {
    avoidRecommendations.push(
      "No clear underperformers yet — keep recording data to identify patterns to avoid."
    );
  }

  const experiments = buildExperiments(bestTopics, typeData, topicTypes);
  const nextWeekStrategy = buildStrategy(bestTopics, bestContentType, impressionsTrend, experiments);

  return {
    generatedAt,
    dataWindowDays,
    totalPostsTracked: records.length,
    thisWeekImpressions,
    lastWeekImpressions,
    impressionsTrend,
    bestTopics,
    weakestTopics,
    bestContentType,
    worstContentType,
    repeatRecommendations,
    avoidRecommendations,
    experiments,
    nextWeekStrategy,
    hasEnoughData: true,
  };
}
