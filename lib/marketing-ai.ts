import "server-only";

import type { ContextBrief } from "@/lib/marketing-context-brief";
import type {
  MacroSnapshot,
  MarketingSettings,
  MarketingTone,
  MarketingVariation,
  XContentType,
} from "@/types";

type AiGenerationInput = {
  contentType: XContentType;
  topic: string;
  tone: MarketingTone;
  instruction: string;
  snapshot: MacroSnapshot;
  recentTexts: string[];
  settings: MarketingSettings;
  contextBrief?: ContextBrief;
};

export function isMarketingAiConfigured(settings?: MarketingSettings) {
  return Boolean(
    process.env.AI_ENABLED !== "false" &&
    settings?.aiEnabled !== false &&
    process.env.OPENAI_API_KEY
  );
}

export async function generateAiVariations(
  input: AiGenerationInput
): Promise<Array<Pick<MarketingVariation, "style" | "text" | "whyItWorks">> | null> {
  if (!isMarketingAiConfigured(input.settings)) return null;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.AI_MODEL || "gpt-5-mini",
      input: [
        {
          role: "system",
          content:
            "You write concise, source-backed X posts for Macro FX Monitor. Never give buy/sell advice, signals, promises, or guaranteed predictions. Use only supplied facts. Each non-thread post must fit 280 characters. Avoid spam, hype, repeated hooks, and forced links.",
        },
        {
          role: "user",
          content: JSON.stringify({
            task: "Return three distinct X-ready variations.",
            styles: ["conservative", "educational", "engagement"],
            contentType: input.contentType,
            topic: input.topic,
            tone: input.tone,
            instruction: input.instruction,
            snapshot: input.snapshot,
            recentTexts: input.recentTexts.slice(0, 15),
            audience: input.settings.targetAudience,
            linkUsage: input.settings.linkUsageFrequency,
            disclaimer: input.settings.defaultDisclaimer,
            blockedWords: input.settings.blockedWords,
            performanceContext: input.contextBrief?.compactText ?? null,
          }),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "marketing_variations",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["variations"],
            properties: {
              variations: {
                type: "array",
                minItems: 3,
                maxItems: 3,
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["style", "text", "whyItWorks"],
                  properties: {
                    style: {
                      type: "string",
                      enum: ["conservative", "educational", "engagement"],
                    },
                    text: { type: "string" },
                    whyItWorks: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) return null;
  const payload = await response.json() as {
    output_text?: string;
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  };
  const raw = payload.output_text
    ?? payload.output?.flatMap((item) => item.content ?? []).find((item) => item.type === "output_text")?.text;
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as {
      variations?: Array<Pick<MarketingVariation, "style" | "text" | "whyItWorks">>;
    };
    return parsed.variations?.length === 3 ? parsed.variations : null;
  } catch {
    return null;
  }
}
