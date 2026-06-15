import type {
  FreshMarketContext,
  MacroSnapshot,
  MarketingDailyPlanItem,
  MarketingDraft,
  MarketingIdeaCategory,
  MarketingSettings,
  XContentType,
} from "@/types";

export const MARKETING_TOPIC_BANK = [
  "DXY",
  "CPI",
  "PPI",
  "CPI vs PPI",
  "Treasury yields",
  "Fed expectations",
  "Macro regime",
  "Confirmation and invalidation",
  "Economic calendar",
  "Geopolitical risk",
  "Risk sentiment",
];

function fitPost(value: string) {
  return value.length <= 280 ? value : `${value.slice(0, 277).trimEnd()}...`;
}

function words(value: string) {
  return value.toLowerCase().match(/[a-z0-9]+/g) ?? [];
}

function similarity(left: string, right: string) {
  const a = new Set(words(left));
  const b = new Set(words(right));
  if (!a.size || !b.size) return 0;
  let overlap = 0;
  for (const word of a) if (b.has(word)) overlap += 1;
  return overlap / new Set([...a, ...b]).size;
}

function hook(value: string) {
  return value.split(/[.!?\n]/)[0]?.trim().toLowerCase() ?? "";
}

function recentMemory(drafts: MarketingDraft[], forDate: Date) {
  const cutoff = new Date(forDate);
  cutoff.setUTCDate(cutoff.getUTCDate() - 14);
  return drafts.filter((draft) => new Date(draft.createdAt) >= cutoff);
}

function timeWindow(index: number) {
  return [
    "08:00-09:00", "09:30-10:30", "11:00-12:00", "12:30-13:30",
    "14:00-15:00", "15:30-16:30", "17:00-18:00", "18:30-19:30",
    "Flexible", "Thread / evening",
  ][index] ?? "Flexible";
}

function scoreIdea(text: string, topic: string, recent: MarketingDraft[]) {
  const textSimilarity = Math.max(0, ...recent.map((draft) => similarity(text, draft.textContent)));
  const hookSimilarity = Math.max(0, ...recent.map((draft) => similarity(hook(text), hook(draft.textContent))));
  const topicCount = recent.filter((draft) => draft.topic.toLowerCase() === topic.toLowerCase()).length;
  const repetitionScore = Math.min(
    100,
    Math.round(Math.max(textSimilarity, hookSimilarity) * 80 + Math.min(topicCount, 4) * 5)
  );
  return {
    repetitionScore,
    repetitionWarning: repetitionScore >= 65
      ? "Similar to recent content. Use the suggested angle, then edit the hook before posting."
      : null,
  };
}

type Candidate = {
  category: MarketingIdeaCategory;
  contentType: XContentType;
  topic: string;
  text: string;
  reason: string;
  sourceContext: string;
  goal: MarketingDailyPlanItem["goal"];
  riskScore?: number;
};

function makeItem(candidate: Candidate, index: number, recent: MarketingDraft[]): MarketingDailyPlanItem {
  const draftText = fitPost(candidate.text);
  const memory = scoreIdea(draftText, candidate.topic, recent);
  return {
    id: `${candidate.category.replaceAll(" ", "-")}-${index}`,
    category: candidate.category,
    contentType: candidate.contentType,
    topic: candidate.topic,
    timeWindow: timeWindow(index),
    draftText,
    reason: candidate.reason,
    sourceContext: candidate.sourceContext,
    riskScore: candidate.riskScore ?? (/geopolit|headline|risk/i.test(candidate.category) ? 35 : 15),
    ...memory,
    goal: candidate.goal,
    status: "draft",
  };
}

function educationalCandidates(snapshot: MacroSnapshot): Candidate[] {
  const driver = snapshot.strongestDrivers[0];
  const driverName = driver?.title ?? "the top macro driver";
  return [
    {
      category: "educational macro concept",
      contentType: "educational",
      topic: driverName,
      text: `${driverName} matters for DXY when it changes the expected Fed path and Treasury yields. The release itself is only step one; the market reaction shows whether the macro signal is being confirmed.`,
      reason: "Explains the transmission mechanism behind the strongest current driver.",
      sourceContext: `Snapshot ${snapshot.periodEnd}: ${driverName} is a leading driver.`,
      goal: "educate",
    },
    {
      category: "educational macro concept",
      contentType: "educational",
      topic: "CPI surprise vs level",
      text: "Markets often care more about the CPI surprise than the inflation level alone. A reading can remain high but weaken DXY if it undershoots expectations and pulls Treasury yields lower.",
      reason: "Uses a distinct expectations-versus-level angle instead of repeating a basic CPI definition.",
      sourceContext: "Current inflation and rates framework.",
      goal: "educate",
    },
    {
      category: "educational macro concept",
      contentType: "driver",
      topic: "Treasury yields confirmation",
      text: `A ${snapshot.dxyPlay.bias.toLowerCase()} is more credible when Treasury yields confirm it. If yields move the other way, the disagreement is useful information rather than noise.`,
      reason: "Connects the current regime to a practical confirmation check.",
      sourceContext: `Snapshot bias: ${snapshot.dxyPlay.bias}.`,
      goal: "educate",
    },
  ];
}

export function buildDailyMarketingPlan(
  snapshot: MacroSnapshot,
  drafts: MarketingDraft[],
  settings: MarketingSettings,
  forDate = new Date(),
  context?: FreshMarketContext
): MarketingDailyPlanItem[] {
  const recent = recentMemory(drafts, forDate);
  const today = forDate.toISOString().slice(0, 10);
  const events = context?.calendarEvents ?? [];
  const news = context?.newsItems ?? [];
  const notes = context?.manualNotes ?? [];
  const todayEvents = events.filter((event) => event.eventDate === today);
  const nextEvents = [...todayEvents, ...events.filter((event) => event.eventDate !== today)].slice(0, 2);
  const topNews = news.slice(0, 2);
  const candidates: Candidate[] = educationalCandidates(snapshot);

  for (const event of nextEvents) {
    const released = Boolean(event.actual);
    candidates.push({
      category: released ? "event reaction" : "event preview",
      contentType: "driver",
      topic: event.eventName,
      text: released
        ? `${event.eventName} is out${event.actual ? ` at ${event.actual}` : ""}. For DXY, the next question is whether Treasury yields and Fed expectations confirm the initial reaction. One headline is not the full macro chain.`
        : `${event.eventName} is ${event.eventDate === today ? "today" : `scheduled for ${event.eventDate}`}. For DXY, watch the surprise versus forecast, then whether Treasury yields and Fed expectations confirm the move.`,
      reason: released
        ? "Reacts to a recorded release without treating the first market move as final."
        : "Previews a scheduled event that is currently relevant.",
      sourceContext: `${event.source}: ${event.eventName}; previous ${event.previous || "n/a"}; forecast ${event.forecast || "n/a"}; actual ${event.actual || "pending"}.`,
      goal: "build credibility",
    });
  }

  for (const item of topNews) {
    const uncertain = item.sentiment === "uncertain" || item.macroImpactCategory === "geopolitical";
    candidates.push({
      category: item.macroImpactCategory === "geopolitical"
        ? "geopolitical context"
        : "event reaction",
      contentType: "single",
      topic: item.topic,
      text: `${uncertain ? "Markets are watching" : "Current market context:"} ${item.headline.replace(/[.!?]+$/, "")}. For DXY, focus on whether the story changes ${item.macroImpactCategory === "oil" ? "oil and inflation expectations" : "risk sentiment, Treasury yields, or Fed pricing"}.`,
      reason: "Uses a recent headline while keeping the claim conditional and market-focused.",
      sourceContext: `${item.source}, ${new Date(item.publishedAt).toISOString().slice(0, 10)}: ${item.headline}`,
      goal: "engage",
      riskScore: item.macroImpactCategory === "geopolitical" ? 42 : 28,
    });
  }

  const manual = notes[0];
  if (manual && !candidates.some((candidate) => candidate.sourceContext.includes(manual.title))) {
    candidates.push({
      category: manual.kind === "geopolitical" ? "geopolitical context" : "event preview",
      contentType: "single",
      topic: manual.title,
      text: `${manual.kind === "geopolitical" ? "Markets are watching" : "Today’s macro focus:"} ${manual.title.replace(/[.!?]+$/, "")}. ${manual.details || "For DXY, the useful test is whether yields, Fed expectations, and risk sentiment confirm the narrative."}`,
      reason: "Uses the latest administrator-supplied context for today.",
      sourceContext: `Manual context: ${manual.title}`,
      goal: "engage",
      riskScore: manual.kind === "geopolitical" ? 45 : 25,
    });
  }

  candidates.push({
    category: "dashboard snapshot",
    contentType: "single",
    topic: "DXY regime",
    text: `Macro FX Monitor: DXY score ${snapshot.dxyScore === null ? "unavailable" : `${snapshot.dxyScore > 0 ? "+" : ""}${snapshot.dxyScore.toFixed(1)} / 10`}. Bias: ${snapshot.dxyPlay.bias}. The score is a scenario framework, not a prediction. Confirmation still matters.`,
    reason: "Provides one restrained snapshot post without forcing a dashboard link.",
    sourceContext: `Latest stored snapshot: ${snapshot.periodEnd}.`,
    goal: "drive dashboard visits",
  });
  candidates.push({
    category: "confirmation / invalidation",
    contentType: "contrarian",
    topic: "Confirmation and invalidation",
    text: `Current DXY view: ${snapshot.dxyPlay.bias}. Confirmation requires ${snapshot.dxyPlay.confirmation.toLowerCase()} The setup weakens if ${snapshot.dxyPlay.invalidation.toLowerCase()}`,
    reason: "Frames the view as conditional rather than certain.",
    sourceContext: `Snapshot scenario checks from ${snapshot.periodEnd}.`,
    goal: "build credibility",
  });

  const headlineDriven = topNews.some((item) =>
    item.sentiment === "risk-off" || item.macroImpactCategory === "geopolitical"
  ) || notes.some((note) => note.kind === "geopolitical");
  if (headlineDriven) {
    candidates.push({
      category: "risk management reminder",
      contentType: "contrarian",
      topic: "Headline risk",
      text: "Headline-driven markets can move quickly and reverse just as quickly. Separate confirmed facts from developing reports, watch oil and yields for confirmation, and avoid treating the first DXY move as a guaranteed trend.",
      reason: "Adds a safety-focused post because current context is headline-driven.",
      sourceContext: "Recent geopolitical or risk-off context.",
      goal: "build credibility",
      riskScore: 18,
    });
  }

  candidates.push({
    category: "thread idea",
    contentType: "thread",
    topic: "Three DXY checks this week",
    text: `Thread idea: 3 things to watch for DXY this week: 1) ${nextEvents[0]?.eventName ?? "the next major U.S. release"}, 2) Treasury-yield confirmation, and 3) whether current headlines change Fed expectations or risk sentiment.`,
    reason: "Combines calendar, rates, and current context into a structured thread.",
    sourceContext: nextEvents[0]
      ? `Calendar: ${nextEvents[0].eventName}; snapshot ${snapshot.periodEnd}.`
      : `Snapshot ${snapshot.periodEnd} and current macro framework.`,
    goal: "educate",
  });
  candidates.push({
    category: "risk management reminder",
    contentType: "contrarian",
    topic: "Macro uncertainty",
    text: "A macro score is a structured scenario, not certainty. When data, yields, and headlines disagree, reducing confidence is often more useful than forcing a stronger DXY prediction.",
    reason: "Provides a reusable safety principle without telling anyone to buy or sell.",
    sourceContext: `Current snapshot confidence framework for ${snapshot.periodEnd}.`,
    goal: "build credibility",
    riskScore: 12,
  });
  candidates.push({
    category: "educational macro concept",
    contentType: "educational",
    topic: "DXY relative value",
    text: "DXY is relative value: strong U.S. data does not automatically mean a stronger dollar if other economies surprise more or markets already priced the U.S. outcome. Expectations and relative rates matter.",
    reason: "Adds a different educational angle when recent posts have covered individual releases.",
    sourceContext: "Core DXY methodology.",
    goal: "educate",
  });

  const blocked = settings.blockedTopics.map((item) => item.toLowerCase());
  const filtered = candidates.filter((candidate) =>
    !blocked.some((item) => candidate.topic.toLowerCase().includes(item))
  );
  const unique: Candidate[] = [];
  for (const candidate of filtered) {
    const tooClose = unique.some((item) => similarity(candidate.text, item.text) >= 0.7);
    if (!tooClose) unique.push(candidate);
  }
  return unique
    .map((candidate, index) => makeItem(candidate, index, recent))
    .sort((left, right) => {
      const leftContext = /event|geopolitical/.test(left.category ?? "") ? -20 : 0;
      const rightContext = /event|geopolitical/.test(right.category ?? "") ? -20 : 0;
      return (left.repetitionScore ?? 0) + leftContext
        - ((right.repetitionScore ?? 0) + rightContext);
    })
    .slice(0, 10)
    .map((item, index) => ({ ...item, timeWindow: timeWindow(index) }));
}
