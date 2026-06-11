import type { Metadata } from "next";
import { SnapshotView } from "@/components/snapshot-view";
import { generateMacroSnapshot, loadLatestSnapshot } from "@/lib/snapshots";
import { isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Latest Macro / DXY Snapshot",
  description: "The latest US macro regime review, upcoming economic calendar, and conditional DXY playbook.",
};

export default async function SnapshotPage() {
  const stored = isSupabaseConfigured() ? await loadLatestSnapshot("weekly").catch(() => null) : null;
  const snapshot = stored ?? await generateMacroSnapshot("weekly");
  return <SnapshotView snapshot={snapshot} />;
}
