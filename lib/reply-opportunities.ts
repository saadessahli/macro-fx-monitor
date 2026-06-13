import "server-only";

import { randomUUID } from "node:crypto";
import { scoreMarketingText } from "@/lib/marketing-quality";
import { supabaseRequest } from "@/lib/supabase";
import type { MacroSnapshot, ReplyOpportunity } from "@/types";

type ReplyRow = {
  id: string;
  created_at: string;
  updated_at: string;
  original_url: string;
  author: string;
  post_text: string;
  detected_topic: string;
  relevance_score: number;
  reply_short: string;
  reply_educational: string;
  reply_dashboard: string;
  reply_quality_score: number;
  promotional_risk_score: number;
  status: ReplyOpportunity["status"];
  replied_at: string | null;
  copied_at: string | null;
  notes: string | null;
};

function fromRow(row: ReplyRow): ReplyOpportunity {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    originalUrl: row.original_url,
    author: row.author,
    postText: row.post_text,
    detectedTopic: row.detected_topic,
    relevanceScore: row.relevance_score,
    replyShort: row.reply_short,
    replyEducational: row.reply_educational,
    replyDashboard: row.reply_dashboard,
    replyQualityScore: row.reply_quality_score,
    promotionalRiskScore: row.promotional_risk_score,
    status: row.status,
    repliedAt: row.replied_at,
    copiedAt: row.copied_at,
    notes: row.notes ?? "",
  };
}

function detectTopic(text: string) {
  const topics = ["Core CPI", "Core PPI", "CPI", "PPI", "Treasury yields", "Fed", "FOMC", "DXY", "USD", "inflation", "labor", "growth"];
  return topics.find((topic) => text.toLowerCase().includes(topic.toLowerCase())) ?? "Macro / DXY";
}

export function createReplyOpportunity(
  input: { originalUrl: string; author: string; postText: string },
  snapshot: MacroSnapshot
): ReplyOpportunity {
  const now = new Date().toISOString();
  const topic = detectTopic(input.postText);
  const topDriver = snapshot.strongestDrivers[0]?.title ?? "the macro data";
  const short = `The key is whether Treasury yields and Fed expectations confirm the move. The headline alone rarely explains the full DXY reaction.`;
  const educational = `${topic} matters most when it changes the expected Fed path and U.S. yields. That transmission is usually more important for DXY than the release in isolation.`;
  const dashboard = `Useful distinction. The current source-backed DXY snapshot also shows ${topDriver} as a leading driver, with confirmation and invalidation conditions rather than a fixed prediction.`;
  const quality = scoreMarketingText(educational);
  return {
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
    originalUrl: input.originalUrl,
    author: input.author,
    postText: input.postText,
    detectedTopic: topic,
    relevanceScore: scoreMarketingText(input.postText).relevance,
    replyShort: short,
    replyEducational: educational,
    replyDashboard: dashboard,
    replyQualityScore: Math.round((quality.clarity + quality.relevance + quality.educationalValue) / 3),
    promotionalRiskScore: scoreMarketingText(dashboard).promotionalRisk,
    status: "new",
    repliedAt: null,
    copiedAt: null,
    notes: "",
  };
}

export async function listReplyOpportunities(limit = 100) {
  const rows = await supabaseRequest<ReplyRow[]>(
    `reply_opportunities?select=*&order=created_at.desc&limit=${limit}`
  );
  return rows.map(fromRow);
}

export async function saveReplyOpportunity(reply: ReplyOpportunity) {
  const rows = await supabaseRequest<ReplyRow[]>("reply_opportunities", {
    method: "POST",
    prefer: "return=representation",
    body: {
      id: reply.id,
      created_at: reply.createdAt,
      updated_at: reply.updatedAt,
      original_url: reply.originalUrl,
      author: reply.author,
      post_text: reply.postText,
      detected_topic: reply.detectedTopic,
      relevance_score: reply.relevanceScore,
      reply_short: reply.replyShort,
      reply_educational: reply.replyEducational,
      reply_dashboard: reply.replyDashboard,
      reply_quality_score: reply.replyQualityScore,
      promotional_risk_score: reply.promotionalRiskScore,
      status: reply.status,
      replied_at: reply.repliedAt,
      copied_at: reply.copiedAt,
      notes: reply.notes,
    },
  });
  return fromRow(rows[0]);
}

export async function updateReplyOpportunity(
  id: string,
  changes: Partial<Pick<ReplyOpportunity, "status" | "notes" | "repliedAt" | "copiedAt">>
) {
  const body: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (changes.status !== undefined) body.status = changes.status;
  if (changes.notes !== undefined) body.notes = changes.notes;
  if (changes.repliedAt !== undefined) body.replied_at = changes.repliedAt;
  if (changes.copiedAt !== undefined) body.copied_at = changes.copiedAt;
  const rows = await supabaseRequest<ReplyRow[]>(
    `reply_opportunities?id=eq.${encodeURIComponent(id)}`,
    { method: "PATCH", prefer: "return=representation", body }
  );
  return rows[0] ? fromRow(rows[0]) : null;
}
