import "server-only";

import { randomUUID } from "node:crypto";
import { supabaseRequest } from "@/lib/supabase";
import type { PostPerformance } from "@/types";

type PerformanceRow = {
  id: string;
  draft_id: string | null;
  reply_opportunity_id: string | null;
  posted_url: string;
  impressions: number;
  likes: number;
  replies: number;
  reposts: number;
  bookmarks: number;
  profile_visits: number;
  result_quality: PostPerformance["resultQuality"];
  notes: string;
  created_at: string;
  updated_at: string;
};

function fromRow(row: PerformanceRow): PostPerformance {
  return {
    id: row.id,
    draftId: row.draft_id,
    replyOpportunityId: row.reply_opportunity_id,
    postedUrl: row.posted_url,
    impressions: row.impressions,
    likes: row.likes,
    replies: row.replies,
    reposts: row.reposts,
    bookmarks: row.bookmarks,
    profileVisits: row.profile_visits,
    resultQuality: row.result_quality,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listPostPerformance() {
  const rows = await supabaseRequest<PerformanceRow[]>(
    "post_performance?select=*&order=created_at.desc&limit=200"
  );
  return rows.map(fromRow);
}

export async function savePostPerformance(
  input: Omit<PostPerformance, "id" | "createdAt" | "updatedAt">
) {
  const now = new Date().toISOString();
  const rows = await supabaseRequest<PerformanceRow[]>("post_performance", {
    method: "POST",
    prefer: "return=representation",
    body: {
      id: randomUUID(),
      draft_id: input.draftId,
      reply_opportunity_id: input.replyOpportunityId,
      posted_url: input.postedUrl,
      impressions: input.impressions,
      likes: input.likes,
      replies: input.replies,
      reposts: input.reposts,
      bookmarks: input.bookmarks,
      profile_visits: input.profileVisits,
      result_quality: input.resultQuality,
      notes: input.notes,
      created_at: now,
      updated_at: now,
    },
  });
  return fromRow(rows[0]);
}

