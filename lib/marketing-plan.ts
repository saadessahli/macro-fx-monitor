import type {
  MacroSnapshot,
  MarketingDailyPlanItem,
  MarketingDraft,
  MarketingSettings,
} from "@/types";

export const MARKETING_TOPIC_BANK = [
  "What is DXY?",
  "Why CPI matters for DXY",
  "Why PPI matters for DXY",
  "CPI vs PPI",
  "Why Treasury yields matter",
  "Why Fed expectations matter",
  "Why macro bias is not a prediction",
  "What invalidates a macro bias",
  "Why growth data matters",
  "Why labor data matters",
  "Why USD reacts to risk sentiment",
  "Why confirmation matters",
  "Why the dollar can move before Fed decisions",
  "What a macro regime score means",
  "How inflation changes rate expectations",
  "Why producer inflation can matter before consumer inflation",
];

export function buildDailyMarketingPlan(
  snapshot: MacroSnapshot,
  drafts: MarketingDraft[],
  settings: MarketingSettings
): MarketingDailyPlanItem[] {
  const recentTopics = new Set(drafts.slice(0, 12).map((draft) => draft.topic));
  const topics = [
    ...MARKETING_TOPIC_BANK.filter((topic) => settings.preferredTopics.some((preferred) =>
      topic.toLowerCase().includes(preferred.toLowerCase())
    )),
    ...MARKETING_TOPIC_BANK,
  ].filter((topic, index, all) =>
    all.indexOf(topic) === index &&
    !recentTopics.has(topic) &&
    !settings.blockedTopics.some((blocked) => topic.toLowerCase().includes(blocked.toLowerCase()))
  );
  const selected = topics.slice(0, Math.max(2, Math.min(3, settings.dailyPostTarget)));
  const windows = ["8:00-10:00", "12:00-14:00", "16:00-18:00"];

  const items = selected.map((topic, index): MarketingDailyPlanItem => ({
    id: `education-${index}`,
    contentType: index === 0 ? "educational" : index === 1 ? "driver" : "contrarian",
    topic,
    timeWindow: windows[index] ?? windows[2],
    draftText: `${topic} Explain the mechanism through Fed expectations, yields, and the dollar without making a prediction.`,
    reason: "Rotates through the topic bank while avoiding topics used in recent drafts.",
    goal: index === 2 ? "engage" : "educate",
    status: "draft",
  }));

  items.push({
    id: "snapshot",
    contentType: "single",
    topic: "Current DXY regime",
    timeWindow: "After a material data release",
    draftText: `Current DXY score: ${snapshot.dxyScore ?? "unavailable"}. Bias: ${snapshot.dxyPlay.bias}.`,
    reason: "Use only when the dashboard has a timely, material update.",
    goal: "drive dashboard visits",
    status: "draft",
  });
  items.push({
    id: "image",
    contentType: "image",
    topic: "Visual macro summary",
    timeWindow: "Best educational post window",
    draftText: "Pair one educational post with a mobile-readable visual card.",
    reason: "A visual summary can improve comprehension without adding hype.",
    goal: "build credibility",
    status: "draft",
  });
  items.push({
    id: "video",
    contentType: "video",
    topic: "30-second Macro Signal Update",
    timeWindow: "Optional, 1-2 times per week",
    draftText: "Hook, score, top drivers, confirmation, invalidation, and disclaimer.",
    reason: "Use video selectively when the regime or drivers materially change.",
    goal: "engage",
    status: "draft",
  });

  return items;
}

