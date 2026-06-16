import type { MarketingDraft } from "@/types";
import type { WeeklyGrowthReport } from "@/lib/marketing-weekly-report";
import { MARKETING_TOPIC_BANK } from "@/lib/marketing-plan";

export type CalendarStatus = "planned" | "draft-exists" | "needs-review" | "approved" | "posted";

export type CalendarDay = {
  date: string;
  dayLabel: string;
  topic: string;
  contentType: string;
  suggestedAngle: string;
  suggestedCta: string;
  status: CalendarStatus;
  reason: string;
};

const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Ensures every 7-day plan has 1 educational, 1 weekly-recap, 1 thread, 1 driver, 3 singles
const CONTENT_TYPE_ROTATION = [
  "single",
  "educational",
  "single",
  "thread",
  "driver",
  "single",
  "weekly-recap",
];

// Topics that work best as the anchor for a weekly-recap post
const RECAP_TOPICS = ["Macro regime", "Economic calendar", "Risk sentiment"];

const TOPIC_ANGLES: Record<string, string[]> = {
  "DXY": [
    "Where the dollar index sits relative to key macro levels",
    "What current DXY direction signals for risk assets",
    "Dollar strength vs. softening: mapping the macro backdrop",
  ],
  "CPI": [
    "Breaking down the latest CPI reading — what markets are focused on",
    "Core vs. headline CPI: the number that moves rates",
    "CPI expectations vs. reality — how markets are positioning",
  ],
  "PPI": [
    "Producer prices as a leading indicator for CPI",
    "What the latest PPI reading means for inflation expectations",
    "PPI divergence from CPI — what it signals for the Fed",
  ],
  "CPI vs PPI": [
    "The spread between producer and consumer prices explained",
    "When CPI and PPI diverge — what historically follows",
    "Margin compression vs. inflation pass-through: the dynamic right now",
  ],
  "Treasury yields": [
    "Where yields are sitting and what it means for risk assets",
    "The 2s10s spread and what the yield curve is signalling now",
    "Real yields vs. nominal yields — the rate market's key tension",
  ],
  "Fed expectations": [
    "What the Fed funds futures market is pricing in for the next meeting",
    "Breaking down the latest Fed commentary — hawkish or dovish shift?",
    "Rate expectations: where the market sits vs. where it might go",
  ],
  "Macro regime": [
    "Which macro regime we are in right now — and what it means for positioning",
    "Growth vs. inflation trade-off: mapping the current environment",
    "Regime shifts and what historically follows the current setup",
  ],
  "Confirmation and invalidation": [
    "Key levels that would confirm or invalidate the current macro view",
    "What would change the macro thesis — the signals to watch this week",
    "Setting up confirmations and invalidations for the week ahead",
  ],
  "Economic calendar": [
    "Key data releases this week and how to interpret them",
    "Economic calendar breakdown — what matters most and why",
    "Previewing the week's macro prints and their market implications",
  ],
  "Geopolitical risk": [
    "How current geopolitical developments are flowing through macro",
    "Risk-off vs. risk-on: mapping geopolitical uncertainty right now",
    "Where geopolitical risk premium shows up in markets",
  ],
  "Risk sentiment": [
    "Reading risk appetite from cross-asset signals",
    "Where investors are positioned right now — risk on or risk off",
    "Volatility, spreads, and positioning: the full risk picture",
  ],
};

const TOPIC_CTAS: Record<string, string[]> = {
  "DXY": [
    "Watching this level this week — are you?",
    "What's your view on dollar direction here?",
    "How are you reading the DXY setup?",
  ],
  "CPI": [
    "What's your read on the next print?",
    "How are you positioned around this data?",
    "Agree or disagree with the consensus call?",
  ],
  "PPI": [
    "How are you reading the PPI trend?",
    "Inflation cooling or sticky — drop your view.",
    "What's your take on the PPI signal here?",
  ],
  "CPI vs PPI": [
    "Which number matters more to you right now — CPI or PPI?",
    "Margin compression or pass-through — share your read.",
    "How are you interpreting the spread?",
  ],
  "Treasury yields": [
    "What yield level are you watching most closely?",
    "Rates higher for longer or a pivot incoming — your view?",
    "What changes your yield outlook?",
  ],
  "Fed expectations": [
    "How many cuts are you pricing in by year-end?",
    "Hawkish hold or gradual easing — what's your base case?",
    "What would change your Fed view?",
  ],
  "Macro regime": [
    "How are you adjusting your framework for this regime?",
    "Agree with this read on the regime — or not?",
    "What's the key signal you're watching for a regime shift?",
  ],
  "Confirmation and invalidation": [
    "What level would change your view?",
    "Which signal are you watching most closely this week?",
    "What would invalidate the current setup for you?",
  ],
  "Economic calendar": [
    "Which release matters most to you this week?",
    "What's your base case for the data?",
    "Which data point are you positioned around?",
  ],
  "Geopolitical risk": [
    "How much of this is priced in, in your view?",
    "Are you adjusting positioning for geopolitical risk?",
    "Risk-off or looking through it — your read?",
  ],
  "Risk sentiment": [
    "Risk on or risk off right now — what's your read?",
    "What cross-asset signal are you watching?",
    "How are you reading positioning here?",
  ],
};

function getAngle(topic: string, dayIndex: number): string {
  const angles = TOPIC_ANGLES[topic];
  if (angles && angles.length > 0) return angles[dayIndex % angles.length];
  return `A closer look at ${topic} and what it means for the macro picture`;
}

function getCta(topic: string, dayIndex: number): string {
  const ctas = TOPIC_CTAS[topic];
  if (ctas && ctas.length > 0) return ctas[dayIndex % ctas.length];
  const defaults = [
    "Thoughts?",
    "How are you reading this?",
    "Agree or disagree?",
    "What level are you watching?",
    "Drop your view below.",
  ];
  return defaults[dayIndex % defaults.length];
}

function inferStatus(topic: string, drafts: MarketingDraft[]): CalendarStatus {
  const matches = drafts.filter((d) => d.topic === topic);
  if (matches.length === 0) return "planned";
  if (matches.some((d) => d.status === "posted")) return "posted";
  if (matches.some((d) => d.status === "approved")) return "approved";
  if (matches.some((d) => d.status === "needs_review" || d.status === "ready")) return "needs-review";
  return "draft-exists";
}

function buildReason(
  topic: string,
  contentType: string,
  dayIndex: number,
  bestTopicNames: string[],
  experimentTopicNames: string[]
): string {
  const isBest = bestTopicNames.includes(topic);
  const isExperiment = experimentTopicNames.includes(topic);

  if (contentType === "weekly-recap") {
    return "Weekly recaps work well towards the end of the week — they synthesise the macro story and drive saves.";
  }
  if (contentType === "educational") {
    return `Educational posts on ${topic} drive saves and profile visits — positioned mid-week when engagement tends to peak.`;
  }
  if (contentType === "thread") {
    return `Threads are ideal for breaking down ${topic} step-by-step — they drive follows and profile visits.`;
  }
  if (contentType === "driver") {
    return `Driver breakdowns give context behind a market move — great for positioning ${topic} as the core insight.`;
  }
  if (isBest) {
    return `${topic} is your best-performing topic by reach — leading with a single post on day ${dayIndex + 1} maximises impressions.`;
  }
  if (isExperiment) {
    return `${topic} is an under-explored topic — testing it helps identify untapped audience interest.`;
  }
  return `${topic} adds variety to the week's content mix and keeps your audience engaged across macro themes.`;
}

export function buildContentCalendar(
  drafts: MarketingDraft[],
  weeklyReport: WeeklyGrowthReport,
  startDate = new Date()
): CalendarDay[] {
  // Build deduplicated priority list: best → experiments → full bank
  const seen = new Set<string>();
  const priorityTopics: string[] = [];

  for (const t of weeklyReport.bestTopics) {
    if (!seen.has(t.topic)) { seen.add(t.topic); priorityTopics.push(t.topic); }
  }
  for (const exp of weeklyReport.experiments) {
    if (!seen.has(exp.suggestedTopic)) { seen.add(exp.suggestedTopic); priorityTopics.push(exp.suggestedTopic); }
  }
  for (const t of MARKETING_TOPIC_BANK) {
    if (!seen.has(t)) { seen.add(t); priorityTopics.push(t); }
  }

  const bestTopicNames = weeklyReport.bestTopics.map((t) => t.topic);
  const experimentTopicNames = weeklyReport.experiments.map((e) => e.suggestedTopic);

  // Build 7-topic sequence, no consecutive repeats
  const topicSequence: string[] = [];
  let cursor = 0;

  for (let i = 0; i < 7; i++) {
    const prev = topicSequence[topicSequence.length - 1] ?? "";
    let chosen = priorityTopics[cursor % priorityTopics.length];
    if (chosen === prev && priorityTopics.length > 1) {
      cursor++;
      chosen = priorityTopics[cursor % priorityTopics.length];
    }
    topicSequence.push(chosen);
    cursor++;
  }

  // Override day 6 (weekly-recap slot) with a dedicated recap-friendly topic
  const recapTopic = RECAP_TOPICS.find((t) => t !== topicSequence[5]) ?? RECAP_TOPICS[0];
  topicSequence[6] = recapTopic;

  // Build the calendar
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const topic = topicSequence[i];
    const contentType = CONTENT_TYPE_ROTATION[i];

    return {
      date: d.toISOString().slice(0, 10),
      dayLabel: DAY_LABELS[d.getDay()],
      topic,
      contentType,
      suggestedAngle: getAngle(topic, i),
      suggestedCta: getCta(topic, i),
      status: inferStatus(topic, drafts),
      reason: buildReason(topic, contentType, i, bestTopicNames, experimentTopicNames),
    };
  });
}
