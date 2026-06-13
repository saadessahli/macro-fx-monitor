import type {
  MacroSnapshot,
  MarketingDailyPlanItem,
  MarketingDraft,
  MarketingSettings,
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
];

function fitPost(value: string) {
  return value.length <= 280 ? value : `${value.slice(0, 277).trimEnd()}...`;
}

function suggestedCopy(topic: string, snapshot: MacroSnapshot) {
  const bias = snapshot.dxyPlay.bias.toLowerCase();
  const copy: Record<string, string> = {
    DXY: `DXY is a relative-value signal, not a standalone forecast. Today the model shows ${bias}. The useful question is whether U.S. yields and Fed expectations confirm that regime. Educational research only.`,
    CPI: `CPI matters for DXY when it changes the expected Fed path. Hotter inflation can support yields and the dollar; softer inflation can weaken that chain. The current model bias is ${bias}.`,
    PPI: `PPI tracks inflation pressure earlier in the production chain. Its DXY impact usually comes through Fed expectations and Treasury yields, not the headline alone. Current model bias: ${bias}.`,
    "PPI vs CPI": "PPI and CPI answer different questions. PPI tracks producer prices; CPI tracks consumer prices. For DXY, the key is which release changes Fed expectations and U.S. yields most.",
    "Treasury yields": `Treasury yields are a key confirmation signal for DXY. A macro bias is stronger when yields move in the same direction and weaker when the rates market disagrees. Current bias: ${bias}.`,
    "Fed expectations": "The dollar often moves before a Fed decision because markets continuously reprice the expected policy path. Data matters for DXY when it changes those expectations and Treasury yields.",
    "Macro regime": `A macro regime score summarizes several drivers; it is not a prediction. The current DXY score is ${snapshot.dxyScore === null ? "unavailable" : `${snapshot.dxyScore > 0 ? "+" : ""}${snapshot.dxyScore.toFixed(1)} / 10`}, with a ${bias}. Confirmation still matters.`,
    "Confirmation and invalidation": `A useful macro view needs confirmation and invalidation. Confirmation: ${snapshot.dxyPlay.confirmation} The bias weakens if ${snapshot.dxyPlay.invalidation}`,
  };
  return fitPost(copy[topic] ?? copy.DXY);
}

export function buildDailyMarketingPlan(
  snapshot: MacroSnapshot,
  drafts: MarketingDraft[],
  settings: MarketingSettings
): MarketingDailyPlanItem[] {
  const recentTopics = new Set(drafts.slice(0, 8).map((draft) => draft.topic.toLowerCase()));
  const allowedTopics = MARKETING_TOPIC_BANK.filter((topic) =>
    !settings.blockedTopics.some((blocked) => topic.toLowerCase().includes(blocked.toLowerCase()))
  );
  const allowed = allowedTopics.length >= 2 ? allowedTopics : MARKETING_TOPIC_BANK;
  const dayOffset = Math.floor(new Date(`${snapshot.periodEnd}T00:00:00Z`).getTime() / 86_400_000);
  const rotated = allowed.map((_, index) => allowed[(index + dayOffset) % allowed.length]);
  const preferred = rotated.filter((topic) => settings.preferredTopics.some((item) =>
    topic.toLowerCase().includes(item.toLowerCase())
  ));
  const ordered = [...preferred, ...rotated].filter((topic, index, all) => all.indexOf(topic) === index);
  const fresh = ordered.filter((topic) => !recentTopics.has(topic.toLowerCase()));
  const selected = [...fresh, ...ordered.filter((topic) => !fresh.includes(topic))]
    .slice(0, Math.max(2, Math.min(3, settings.dailyPostTarget)));
  const windows = ["8:00-10:00", "12:00-14:00", "16:00-18:00"];

  const recentTexts = new Set(drafts.slice(0, 20).map((draft) => draft.textContent.trim()));
  return selected.map((topic, index): MarketingDailyPlanItem => {
    const baseCopy = suggestedCopy(topic, snapshot);
    const draftText = recentTexts.has(baseCopy)
      ? fitPost(`${baseCopy} Latest snapshot: ${snapshot.periodEnd}.`)
      : baseCopy;
    return {
      id: `education-${index}`,
      contentType: topic === "CPI" || topic === "PPI" || topic === "Treasury yields"
        ? "driver"
        : "educational",
      topic,
      timeWindow: windows[index] ?? windows[2],
      draftText,
      reason: recentTopics.has(topic.toLowerCase())
        ? "Rotation fallback with refreshed snapshot context."
        : "Rotated away from topics used in recent drafts.",
      goal: "educate",
      status: "draft",
    };
  });
}
