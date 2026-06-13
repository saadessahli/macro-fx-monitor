import "server-only";

import { supabaseRequest } from "@/lib/supabase";
import type { MarketingDraft, MarketingDraftStatus } from "@/types";

type MarketingDraftRow = {
  id: string;
  created_at: string;
  updated_at: string;
  content_type: MarketingDraft["contentType"];
  title: string;
  text_content: string;
  thread_posts: string[];
  image_card_data: MarketingDraft["imageCardData"];
  video_config: MarketingDraft["videoConfig"];
  snapshot_id: string;
  snapshot_date: string;
  status: MarketingDraftStatus;
  manually_posted_at: string | null;
  copied_at: string | null;
  topic: string | null;
  tone: MarketingDraft["tone"] | null;
  instruction: string | null;
  variations: MarketingDraft["variations"] | null;
  quality_scores: MarketingDraft["qualityScores"] | null;
  version_number: number | null;
  posted_url: string | null;
  notes: string | null;
};

function fromRow(row: MarketingDraftRow): MarketingDraft {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    contentType: row.content_type,
    title: row.title,
    textContent: row.text_content,
    threadPosts: row.thread_posts ?? [],
    imageCardData: row.image_card_data,
    videoConfig: row.video_config,
    snapshotId: row.snapshot_id,
    snapshotDate: row.snapshot_date,
    status: row.status,
    manuallyPostedAt: row.manually_posted_at,
    copiedAt: row.copied_at ?? null,
    topic: row.topic ?? "DXY",
    tone: row.tone ?? "professional",
    instruction: row.instruction ?? "",
    variations: row.variations ?? [],
    qualityScores: row.quality_scores ?? {
      clarity: 0, relevance: 0, hook: 0, educationalValue: 0,
      promotionalRisk: 0, financialAdviceRisk: 0, repetitionRisk: 0, risk: 0, warnings: [],
    },
    versionNumber: row.version_number ?? 1,
    postedUrl: row.posted_url ?? "",
    notes: row.notes ?? "",
  };
}

function toRow(draft: MarketingDraft) {
  return {
    id: draft.id,
    created_at: draft.createdAt,
    updated_at: draft.updatedAt,
    content_type: draft.contentType,
    title: draft.title,
    text_content: draft.textContent,
    thread_posts: draft.threadPosts,
    image_card_data: draft.imageCardData,
    video_config: draft.videoConfig,
    snapshot_id: draft.snapshotId,
    snapshot_date: draft.snapshotDate,
    status: draft.status,
    manually_posted_at: draft.manuallyPostedAt,
    copied_at: draft.copiedAt,
    topic: draft.topic,
    tone: draft.tone,
    instruction: draft.instruction,
    variations: draft.variations,
    quality_scores: draft.qualityScores,
    version_number: draft.versionNumber,
    posted_url: draft.postedUrl,
    notes: draft.notes,
  };
}

export async function listMarketingDrafts(limit = 100) {
  const rows = await supabaseRequest<MarketingDraftRow[]>(
    `marketing_drafts?select=*&order=created_at.desc&limit=${limit}`
  );
  return rows.map(fromRow);
}

export async function saveMarketingDraft(draft: MarketingDraft) {
  const rows = await supabaseRequest<MarketingDraftRow[]>("marketing_drafts", {
    method: "POST",
    prefer: "return=representation",
    body: toRow(draft),
  });
  return fromRow(rows[0]);
}

export async function updateMarketingDraft(
  id: string,
  changes: Partial<Pick<
    MarketingDraft,
    "status" | "notes" | "manuallyPostedAt" | "copiedAt" | "textContent" |
    "threadPosts" | "qualityScores" | "versionNumber" | "postedUrl" | "topic" | "tone"
  >>
) {
  const body: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (changes.status !== undefined) body.status = changes.status;
  if (changes.notes !== undefined) body.notes = changes.notes;
  if (changes.manuallyPostedAt !== undefined) body.manually_posted_at = changes.manuallyPostedAt;
  if (changes.copiedAt !== undefined) body.copied_at = changes.copiedAt;
  if (changes.textContent !== undefined) body.text_content = changes.textContent;
  if (changes.threadPosts !== undefined) body.thread_posts = changes.threadPosts;
  if (changes.qualityScores !== undefined) body.quality_scores = changes.qualityScores;
  if (changes.versionNumber !== undefined) body.version_number = changes.versionNumber;
  if (changes.postedUrl !== undefined) body.posted_url = changes.postedUrl;
  if (changes.topic !== undefined) body.topic = changes.topic;
  if (changes.tone !== undefined) body.tone = changes.tone;
  const rows = await supabaseRequest<MarketingDraftRow[]>(
    `marketing_drafts?id=eq.${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      prefer: "return=representation",
      body,
    }
  );
  return rows[0] ? fromRow(rows[0]) : null;
}

export async function getMarketingDraft(id: string) {
  const rows = await supabaseRequest<MarketingDraftRow[]>(
    `marketing_drafts?select=*&id=eq.${encodeURIComponent(id)}&limit=1`
  );
  return rows[0] ? fromRow(rows[0]) : null;
}

export async function saveDraftVersion(draft: MarketingDraft) {
  await supabaseRequest("marketing_draft_versions", {
    method: "POST",
    prefer: "return=minimal",
    body: {
      draft_id: draft.id,
      version_number: draft.versionNumber,
      text_content: draft.textContent,
      thread_posts: draft.threadPosts,
      quality_scores: draft.qualityScores,
    },
  });
}

export async function duplicateMarketingDraft(draft: MarketingDraft) {
  const now = new Date().toISOString();
  return saveMarketingDraft({
    ...draft,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    status: "draft",
    manuallyPostedAt: null,
    copiedAt: null,
    postedUrl: "",
    versionNumber: 1,
    title: `${draft.title} (copy)`,
  });
}

export async function deleteMarketingDraft(id: string) {
  await supabaseRequest(`marketing_drafts?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    prefer: "return=minimal",
  });
}
