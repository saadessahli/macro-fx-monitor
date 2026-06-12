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
    notes: draft.notes,
  };
}

export async function listMarketingDrafts(limit = 30) {
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
  changes: Pick<MarketingDraft, "status" | "notes" | "manuallyPostedAt">
) {
  const rows = await supabaseRequest<MarketingDraftRow[]>(
    `marketing_drafts?id=eq.${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      prefer: "return=representation",
      body: {
        status: changes.status,
        notes: changes.notes,
        manually_posted_at: changes.manuallyPostedAt,
        updated_at: new Date().toISOString(),
      },
    }
  );
  return rows[0] ? fromRow(rows[0]) : null;
}

export async function deleteMarketingDraft(id: string) {
  await supabaseRequest(`marketing_drafts?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    prefer: "return=minimal",
  });
}
