import { scoreMarketingText } from "@/lib/marketing-quality";

export type ImprovementAction =
  | "shorter"
  | "clearer"
  | "professional"
  | "less-promotional"
  | "stronger-hook"
  | "remove-link"
  | "add-link"
  | "thread";

function fit(value: string, length = 280) {
  return value.length <= length ? value : `${value.slice(0, length - 3).trimEnd()}...`;
}

export function improveMarketingText(
  text: string,
  action: ImprovementAction,
  snapshotUrl: string
) {
  let result = text.trim();
  if (action === "shorter") result = fit(result, 220);
  if (action === "clearer") {
    result = result
      .replace(/\butilize\b/gi, "use")
      .replace(/\bin order to\b/gi, "to")
      .replace(/\bwith regard to\b/gi, "about");
  }
  if (action === "professional") {
    result = result
      .replace(/\b(pump|moon|crash)\b/gi, "move")
      .replace(/!+/g, ".")
      .replace(/\bfollow me\b/gi, "");
  }
  if (action === "less-promotional") {
    result = result
      .replace(/https?:\/\/\S+/g, "")
      .replace(/\b(check|visit|follow|subscribe)\b[^.!?\n]*/gi, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }
  if (action === "stronger-hook") {
    result = `What is the market actually pricing for DXY?\n\n${result}`;
  }
  if (action === "remove-link") result = result.replace(/https?:\/\/\S+/g, "").trim();
  if (action === "add-link" && !/https?:\/\//.test(result)) result = fit(`${result}\n\n${snapshotUrl}`);
  if (action === "thread") {
    const sentences = result.split(/(?<=[.!?])\s+/).filter(Boolean);
    result = sentences.map((sentence, index) => `${index + 1}/${Math.max(2, sentences.length)} ${fit(sentence, 270)}`).join("\n\n");
  }
  result = action === "thread" ? result : fit(result);
  return { text: result, scores: scoreMarketingText(result) };
}
