import type { MarketingQualityScores, MarketingSettings } from "@/types";

const advicePatterns = [
  /\b(buy|sell|long|short)\b/i,
  /\bguaranteed?\b/i,
  /\bwill (pump|moon|surge|crash)\b/i,
  /\b(can't|cannot) lose\b/i,
];

const promotionalPatterns = [
  /\bfollow me\b/i,
  /\bcheck my dashboard\b/i,
  /\bsubscribe now\b/i,
  /\bdon't miss\b/i,
];

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
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

export function scoreMarketingText(
  text: string,
  recentTexts: string[] = []
): MarketingQualityScores {
  const length = text.length;
  const sentenceCount = Math.max(1, (text.match(/[.!?]/g) ?? []).length);
  const wordCount = Math.max(1, words(text).length);
  const averageSentenceLength = wordCount / sentenceCount;
  const adviceRisk = advicePatterns.some((pattern) => pattern.test(text)) ? 90 : 4;
  const promotionalHits = promotionalPatterns.filter((pattern) => pattern.test(text)).length;
  const linkCount = (text.match(/https?:\/\//g) ?? []).length;
  const repetition = Math.max(0, ...recentTexts.map((recent) => similarity(text, recent)));
  const hasQuestionOrContrast = /[?]|\b(but|however|why|what|key)\b/i.test(text);
  const hasMacroTerms = /\b(DXY|USD|CPI|PPI|Fed|yield|inflation|growth|labor|macro)\b/i.test(text);
  const clarity = clamp(100 - Math.max(0, averageSentenceLength - 18) * 3 - Math.max(0, length - 260));
  const hook = clamp(45 + (hasQuestionOrContrast ? 25 : 0) + (text.split("\n")[0].length < 90 ? 12 : 0));
  const educationalValue = clamp(45 + (/\bbecause|means|matters|depends|changes\b/i.test(text) ? 30 : 0));
  const promotionalRisk = clamp(8 + promotionalHits * 35 + linkCount * 12);
  const repetitionRisk = clamp(repetition * 100);
  const warnings: string[] = [];

  if (length > 280) warnings.push("Text exceeds X's 280-character limit.");
  if (adviceRisk >= 50) warnings.push("Possible financial-advice or guaranteed-prediction language.");
  if (promotionalRisk >= 50) warnings.push("Copy may sound too promotional.");
  if (repetitionRisk >= 65) warnings.push("Copy is too similar to a recent draft.");
  if (clarity < 55) warnings.push("Copy may be difficult to scan.");
  if (!hasMacroTerms) warnings.push("The macro relevance is unclear.");

  return {
    clarity,
    relevance: hasMacroTerms ? 92 : 45,
    hook,
    educationalValue,
    promotionalRisk,
    financialAdviceRisk: adviceRisk,
    repetitionRisk,
    risk: clamp(Math.max(adviceRisk, promotionalRisk, repetitionRisk)),
    warnings,
  };
}

export function hasBlockingMarketingRisk(scores: MarketingQualityScores) {
  return scores.financialAdviceRisk >= 75;
}

export function getComplianceBlockers(
  scores: MarketingQualityScores,
  settings: Pick<MarketingSettings, "promotionalLevelLimit" | "blockedWords">,
  text = ""
): string[] {
  const blockers: string[] = [];
  if (scores.financialAdviceRisk >= 75) {
    blockers.push(
      "Financial advice or guaranteed-prediction language detected. Remove buy/sell/long/short/guaranteed language before marking ready."
    );
  }
  if (scores.promotionalRisk > settings.promotionalLevelLimit) {
    blockers.push(
      `Promotional risk score (${scores.promotionalRisk}/100) exceeds the configured limit of ${settings.promotionalLevelLimit}/100.`
    );
  }
  const lower = text.toLowerCase();
  for (const word of settings.blockedWords) {
    const trimmed = word.trim();
    if (trimmed && lower.includes(trimmed.toLowerCase())) {
      blockers.push(`Blocked word detected: "${trimmed}".`);
    }
  }
  return blockers;
}

