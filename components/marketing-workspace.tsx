"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3, CalendarDays, Check, Clipboard, Download, ExternalLink, Film,
  ImageIcon, LoaderCircle, MessageCircle, Newspaper, Plus, RefreshCw, Save,
  Search, Settings2, Sparkles, Trash2,
} from "lucide-react";
import { createMarketingCardPng } from "@/lib/marketing-card-export";
import { DISCLAIMER, X_CONTENT_OPTIONS } from "@/lib/marketing-config";
import type { PerformanceSummary } from "@/lib/marketing-analytics";
import type { CalendarDay, CalendarStatus } from "@/lib/marketing-calendar";
import { analyzeCompetitorPosts } from "@/lib/marketing-competitor-intelligence";
import type { CompetitorIntelligenceReport } from "@/lib/marketing-competitor-intelligence";
import type { WeeklyGrowthReport } from "@/lib/marketing-weekly-report";
import { MARKETING_TOPIC_BANK } from "@/lib/marketing-plan";
import { getComplianceBlockers, scoreMarketingText } from "@/lib/marketing-quality";
import { splitVoiceoverSubtitles } from "@/lib/marketing-video";
import type {
  FreshMarketContext, MacroSnapshot, ManualContextKind, MarketingDailyPlanItem,
  MarketingDraft, MarketingSettings, MarketingPlanStatus, MarketingSystemStatus,
  MarketingTone, ReplyOpportunity, ReplyOpportunityStatus, XContentType,
} from "@/types";

const imageTypes = [
  "DXY snapshot card", "Educational concept card", "CPI vs PPI comparison card",
  "Macro driver card", "Invalidation card", "What matters today card",
];
const improvements = [
  ["shorter", "Make shorter"], ["clearer", "Make clearer"],
  ["professional", "More professional"], ["less-promotional", "Less promotional"],
  ["stronger-hook", "Stronger hook"], ["remove-link", "Remove link"],
  ["add-link", "Add link"], ["thread", "Turn into thread"],
] as const;

function fullCopy(draft: MarketingDraft) {
  return draft.threadPosts.length ? draft.threadPosts.join("\n\n") : draft.textContent;
}

function scoreClass(value: number, risk = false) {
  const healthy = risk ? value < 40 : value >= 70;
  const danger = risk ? value >= 70 : value < 45;
  return healthy ? "good" : danger ? "danger" : "warning";
}

function statusLabel(status: string) {
  return status.replace(/_/g, " ");
}

function qualityBadgeClass(quality: string): string {
  if (quality === "strong" || quality === "good") return "approved";
  if (quality === "bad") return "rejected";
  return "needs_review";
}

function calendarStatusClass(status: CalendarStatus): string {
  if (status === "posted") return "posted";
  if (status === "approved") return "approved";
  if (status === "needs-review") return "needs_review";
  return "draft";
}

function calendarStatusLabel(status: CalendarStatus): string {
  if (status === "draft-exists") return "draft";
  if (status === "needs-review") return "needs review";
  return status;
}

export function MarketingWorkspace({
  snapshot,
  initialDrafts,
  initialSettings,
  initialReplies,
  dailyPlan,
  initialSystemStatus,
  initialMarketContext,
  initialPerformanceSummary,
  initialWeeklyReport,
  initialCalendar,
  aiConfigured,
}: {
  snapshot: MacroSnapshot;
  initialDrafts: MarketingDraft[];
  initialSettings: MarketingSettings;
  initialReplies: ReplyOpportunity[];
  dailyPlan: MarketingDailyPlanItem[];
  initialSystemStatus: MarketingSystemStatus;
  initialMarketContext: FreshMarketContext;
  initialPerformanceSummary: PerformanceSummary;
  initialWeeklyReport: WeeklyGrowthReport;
  initialCalendar: CalendarDay[];
  aiConfigured: boolean;
}) {
  const [currentSnapshot, setCurrentSnapshot] = useState(snapshot);
  const [contentType, setContentType] = useState<XContentType>("single");
  const [topic, setTopic] = useState(MARKETING_TOPIC_BANK[0]);
  const [tone, setTone] = useState<MarketingTone>(initialSettings.defaultTone);
  const [instruction, setInstruction] = useState("");
  const [drafts, setDrafts] = useState(initialDrafts);
  const [active, setActive] = useState<MarketingDraft | null>(initialDrafts[0] ?? null);
  const [editorText, setEditorText] = useState(initialDrafts[0]?.textContent ?? "");
  const [replies, setReplies] = useState(initialReplies);
  const [settings, setSettings] = useState(initialSettings);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [draftSearch, setDraftSearch] = useState("");
  const [draftStatus, setDraftStatus] = useState("all");
  const [draftType, setDraftType] = useState("all");
  const [replyForm, setReplyForm] = useState({ originalUrl: "", author: "", postText: "" });
  const [imageType, setImageType] = useState(imageTypes[0]);
  const [performance, setPerformance] = useState({
    postedUrl: "", impressions: 0, likes: 0, replies: 0, reposts: 0,
    bookmarks: 0, profileVisits: 0, resultQuality: "okay", notes: "",
  });
  const [videoSlide, setVideoSlide] = useState(0);
  const [videoSecond, setVideoSecond] = useState(0);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [suggestedPosts, setSuggestedPosts] = useState(() => dailyPlan.map((item) => ({
    ...item,
    text: item.draftText,
  })));
  const [systemStatus, setSystemStatus] = useState(initialSystemStatus);
  const [marketContext, setMarketContext] = useState(initialMarketContext);
  const [contextForm, setContextForm] = useState({
    kind: "note" as ManualContextKind,
    title: "",
    details: "",
    contextDate: new Date().toISOString().slice(0, 10),
  });
  const [competitorInputs, setCompetitorInputs] = useState<string[]>([""]);
  const [competitorReport, setCompetitorReport] = useState<CompetitorIntelligenceReport | null>(null);
  const videoTimerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (videoTimerRef.current) window.clearInterval(videoTimerRef.current);
  }, []);

  const filteredDrafts = useMemo(() => drafts.filter((draft) => {
    const query = draftSearch.toLowerCase();
    return (!query || `${draft.title} ${draft.topic} ${draft.textContent}`.toLowerCase().includes(query))
      && (draftStatus === "all" || draft.status === draftStatus)
      && (draftType === "all" || draft.contentType === draftType);
  }), [drafts, draftSearch, draftStatus, draftType]);

  function selectDraft(draft: MarketingDraft) {
    setActive(draft);
    setEditorText(draft.textContent);
    setTopic(draft.topic);
    setTone(draft.tone);
  }

  async function generate(replace = false) {
    setBusy("generate");
    setMessage("");
    const response = await fetch("/api/admin/marketing/drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentType, topic, tone, instruction }),
    });
    const data = await response.json();
    setBusy("");
    if (!response.ok) return setMessage(data.error ?? "Content could not be generated.");
    if (replace && active) await removeDraft(active, false);
    setDrafts((current) => [data.draft, ...current.filter((item) => !replace || item.id !== active?.id)]);
    selectDraft(data.draft);
    setSystemStatus((current) => ({
      ...current,
      latestDraftAt: data.draft.createdAt,
    }));
    setMessage(aiConfigured && settings.aiEnabled
      ? "Three AI-assisted variations generated and saved."
      : "Three adaptive fallback variations generated and saved.");
  }

  async function patchDraft(changes: Record<string, unknown>, success: string) {
    if (!active) return;
    setBusy("save");
    const response = await fetch(`/api/admin/marketing/drafts/${active.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(changes),
    });
    const data = await response.json().catch(() => null);
    setBusy("");
    if (!response.ok) return setMessage(data?.error ?? "Draft could not be updated.");
    setDrafts((current) => current.map((item) => item.id === data.draft.id ? data.draft : item));
    selectDraft(data.draft);
    setMessage(success);
  }

  async function duplicateDraft() {
    if (!active) return;
    const response = await fetch(`/api/admin/marketing/drafts/${active.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ duplicate: true }),
    });
    const data = await response.json();
    if (!response.ok) return setMessage(data.error ?? "Draft could not be duplicated.");
    setDrafts((current) => [data.draft, ...current]);
    selectDraft(data.draft);
    setMessage("Draft duplicated.");
  }

  async function improve(action: string) {
    setBusy(action);
    const response = await fetch("/api/admin/marketing/improve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: editorText, action }),
    });
    const data = await response.json();
    setBusy("");
    if (!response.ok) return setMessage(data.error ?? "Improvement failed.");
    setEditorText(data.text);
    setMessage("Improvement applied. Review it, then save edits.");
  }

  async function copy(value: string, draft = active) {
    await navigator.clipboard.writeText(value);
    if (draft) {
      fetch(`/api/admin/marketing/drafts/${draft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ copied: true }),
      }).catch(() => undefined);
    }
    setMessage("Copied for manual posting on X.");
  }

  async function removeDraft(draft: MarketingDraft, notify = true) {
    const response = await fetch(`/api/admin/marketing/drafts/${draft.id}`, { method: "DELETE" });
    if (!response.ok) return setMessage("Draft could not be deleted.");
    setDrafts((current) => current.filter((item) => item.id !== draft.id));
    if (active?.id === draft.id) {
      setActive(null);
      setEditorText("");
    }
    if (notify) setMessage("Draft deleted.");
  }

  async function addReply() {
    setBusy("reply");
    const response = await fetch("/api/admin/marketing/replies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(replyForm),
    });
    const data = await response.json();
    setBusy("");
    if (!response.ok) return setMessage(data.error ?? "Reply opportunity could not be analyzed.");
    setReplies((current) => [data.reply, ...current]);
    setReplyForm({ originalUrl: "", author: "", postText: "" });
    setMessage("Three manual-review replies generated.");
  }

  async function updateReply(reply: ReplyOpportunity, status: ReplyOpportunityStatus, notes = reply.notes) {
    const response = await fetch(`/api/admin/marketing/replies/${reply.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, notes }),
    });
    const data = await response.json();
    if (!response.ok) return setMessage(data.error ?? "Reply could not be updated.");
    setReplies((current) => current.map((item) => item.id === reply.id ? data.reply : item));
  }

  async function copyReply(reply: ReplyOpportunity, text: string) {
    await navigator.clipboard.writeText(text);
    await updateReply(reply, "copied");
    setMessage("Reply copied. Nothing was posted automatically.");
  }

  async function downloadCard() {
    if (!active || !card) return;
    setBusy("image");
    try {
      const blob = await createMarketingCardPng(card, imageType);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `macro-fx-monitor-${active.snapshotDate}-${imageType.toLowerCase().replaceAll(" ", "-")}.png`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage("Full-size 1600 x 900 PNG downloaded.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The PNG could not be generated.");
    } finally {
      setBusy("");
    }
  }

  async function copySuggestedPost(id: string, text: string) {
    await navigator.clipboard.writeText(text);
    setSuggestedPosts((current) => current.map((item) =>
      item.id === id ? { ...item, status: "copied" as MarketingPlanStatus } : item
    ));
    setMessage("Suggested post copied for manual posting on X.");
  }

  function updateSuggestedPost(
    id: string,
    changes: { text?: string; status?: MarketingPlanStatus }
  ) {
    setSuggestedPosts((current) => current.map((item) =>
      item.id === id ? { ...item, ...changes } : item
    ));
  }

  function replaceSuggestedPosts(plan: MarketingDailyPlanItem[]) {
    setSuggestedPosts(plan.map((item) => ({
      ...item,
      text: item.draftText,
    })));
  }

  async function refreshSnapshot() {
    setBusy("snapshot");
    setMessage("");
    try {
      const response = await fetch("/api/admin/marketing/refresh-snapshot", {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Snapshot refresh failed.");
      setCurrentSnapshot(data.snapshot);
      replaceSuggestedPosts(data.plan);
      setSystemStatus(data.systemStatus);
      if (data.context) setMarketContext(data.context);
      setMessage(data.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Snapshot refresh failed.");
    } finally {
      setBusy("");
    }
  }

  async function refreshMarketContext(source: "calendar" | "news") {
    setBusy(source);
    setMessage("");
    try {
      const response = await fetch("/api/admin/marketing/context/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Market context could not be refreshed.");
      setMarketContext(data.context);
      setSystemStatus((current) => ({
        ...current,
        calendarRefreshedAt: data.context.calendarRefreshedAt,
        newsRefreshedAt: data.context.newsRefreshedAt,
        calendarApiEnabled: data.context.calendarApiEnabled,
        newsApiEnabled: data.context.newsApiEnabled,
        fallbackContextMode:
          data.context.calendarMode !== "provider" || data.context.newsMode !== "provider",
      }));
      setMessage(data.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Market context could not be refreshed.");
    } finally {
      setBusy("");
    }
  }

  async function addContext() {
    setBusy("context");
    setMessage("");
    try {
      const response = await fetch("/api/admin/marketing/context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contextForm),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Context could not be saved.");
      setMarketContext(data.context);
      setContextForm((current) => ({ ...current, title: "", details: "" }));
      setSystemStatus((current) => ({
        ...current,
        latestManualContextAt: data.note.createdAt,
        calendarRefreshedAt: data.context.calendarRefreshedAt,
        newsRefreshedAt: data.context.newsRefreshedAt,
      }));
      setMessage("Manual context saved. Generate today's X ideas to use it.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Context could not be saved.");
    } finally {
      setBusy("");
    }
  }

  async function saveSuggestedIdea(
    item: MarketingDailyPlanItem & { text: string },
    status: "draft" | "posted"
  ) {
    setBusy(`idea-${item.id}`);
    try {
      const response = await fetch("/api/admin/marketing/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType: item.contentType as XContentType,
          topic: item.topic,
          tone,
          instruction: item.sourceContext ?? item.reason,
          sourceText: item.text,
          status,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "The idea could not be saved.");
      setDrafts((current) => [data.draft, ...current]);
      selectDraft(data.draft);
      updateSuggestedPost(item.id, { status: status === "posted" ? "posted" : "draft" });
      setSystemStatus((current) => ({ ...current, latestDraftAt: data.draft.createdAt }));
      setMessage(status === "posted"
        ? "Saved and marked as manually posted. Nothing was sent to X."
        : "Idea saved to the private draft library.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The idea could not be saved.");
    } finally {
      setBusy("");
    }
  }

  function updateCompetitorInput(index: number, value: string) {
    setCompetitorInputs((current) => current.map((item, i) => i === index ? value : item));
  }

  function addCompetitorInput() {
    setCompetitorInputs((current) => current.length < 5 ? [...current, ""] : current);
  }

  function removeCompetitorInput(index: number) {
    setCompetitorInputs((current) => current.length > 1 ? current.filter((_, i) => i !== index) : [""]);
  }

  function runCompetitorAnalysis() {
    const report = analyzeCompetitorPosts(competitorInputs);
    setCompetitorReport(report);
    setMessage(report.postCount > 0
      ? `Analyzed ${report.postCount} post${report.postCount !== 1 ? "s" : ""}. Review the insights below.`
      : "No post content found. Paste at least one post and try again.");
  }

  async function clearTodayPlan() {
    const response = await fetch("/api/admin/marketing/plan", { method: "DELETE" });
    if (!response.ok) return setMessage("Today's generated plan could not be cleared.");
    setSuggestedPosts([]);
    setMessage("Today's generated plan cleared. Saved drafts were not deleted.");
  }

  async function generateTodayPlan() {
    setBusy("plan");
    setMessage("");
    try {
      const response = await fetch("/api/admin/marketing/plan", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Today's X plan could not be generated.");
      replaceSuggestedPosts(data.plan);
      setSystemStatus(data.systemStatus);
      setMessage("A fresh X plan was generated from the latest snapshot and recent drafts.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Today's X plan could not be generated.");
    } finally {
      setBusy("");
    }
  }

  async function saveSettings() {
    setBusy("settings");
    const response = await fetch("/api/admin/marketing/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    const data = await response.json();
    setBusy("");
    if (!response.ok) return setMessage(data.error ?? "Settings could not be saved.");
    setSettings(data.settings);
    setMessage("Marketing settings saved.");
  }

  async function savePerformance() {
    if (!active) return;
    setBusy("performance");
    const response = await fetch("/api/admin/marketing/performance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...performance, draftId: active.id }),
    });
    const data = await response.json();
    setBusy("");
    if (!response.ok) return setMessage(data.error ?? "Performance could not be saved.");
    setMessage("Manual X performance recorded.");
  }

  function downloadVideoConfig() {
    if (!active) return;
    const blob = new Blob([JSON.stringify(active.videoConfig, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.download = `macro-fx-video-${active.snapshotDate}.json`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
    setMessage("JSON configuration downloaded. This is not a video; render it locally with Remotion.");
  }

  function playVideoPreview() {
    if (videoTimerRef.current) window.clearInterval(videoTimerRef.current);
    setVideoSecond(0);
    setVideoSlide(0);
    setVideoPlaying(true);
    const startedAt = Date.now();
    videoTimerRef.current = window.setInterval(() => {
      const elapsed = Math.min(30, (Date.now() - startedAt) / 1000);
      setVideoSecond(elapsed);
      setVideoSlide(elapsed < 2 ? 0 : elapsed < 6 ? 1 : elapsed < 14 ? 2 : elapsed < 22 ? 3 : 4);
      if (elapsed >= 30) {
        if (videoTimerRef.current) window.clearInterval(videoTimerRef.current);
        videoTimerRef.current = null;
        setVideoPlaying(false);
      }
    }, 200);
  }

  const card = active?.imageCardData;
  const video = active?.videoConfig;
  const subtitleChunks = video ? splitVoiceoverSubtitles(video.voiceoverScript) : [];
  const subtitleIndex = subtitleChunks.length
    ? Math.min(subtitleChunks.length - 1, Math.floor((videoSecond / 30) * subtitleChunks.length))
    : 0;
  const videoSlides = video ? [
    <><small>MACRO FX MONITOR</small><h3>{video.hook}</h3></>,
    <><small>DXY REGIME SCORE</small><strong>{video.score}</strong><h3>{video.bias}</h3></>,
    <><small>TOP MACRO DRIVERS</small>{video.drivers.map((driver) => <p key={driver}>{driver}</p>)}</>,
    <><small>SCENARIO CHECK</small><p><b>Confirmation:</b> {video.confirmation}</p><p><b>But this bias breaks if:</b> {video.invalidation}</p></>,
    <><small>FULL SOURCE-BACKED SNAPSHOT</small><h3>{video.snapshotUrl}</h3><p>{DISCLAIMER}</p></>,
  ] : [];

  const complianceBlockers = useMemo(() => {
    if (!active) return [];
    return getComplianceBlockers(scoreMarketingText(editorText), settings, editorText);
  }, [active, editorText, settings]);

  return (
    <div className="marketing-workspace command-center">
      <section className="admin-panel system-status-panel">
        <div className="panel-heading">
          <div><span className="eyebrow">Freshness and configuration</span><h2>System status</h2></div>
          <span className={`freshness-badge ${systemStatus.snapshotStale ? "stale" : "fresh"}`}>
            {systemStatus.snapshotStale ? "Snapshot stale" : "Snapshot current"}
          </span>
        </div>
        <div className="system-status-grid">
          <div><span>App version</span><strong>{systemStatus.appVersion}{systemStatus.commitSha ? ` | ${systemStatus.commitSha}` : ""}</strong></div>
          <div><span>Build / deploy time</span><strong>{systemStatus.deployedAt ? new Date(systemStatus.deployedAt).toLocaleString() : "Not exposed by host"}</strong></div>
          <div><span>Latest snapshot</span><strong>{systemStatus.snapshotDate}</strong><small>{systemStatus.snapshotSource === "supabase" ? "Stored in Supabase" : "Generated live fallback"}</small></div>
          <div><span>Snapshot generated</span><strong>{new Date(systemStatus.snapshotGeneratedAt).toLocaleString()}</strong></div>
          <div><span>Today&apos;s plan generated</span><strong>{new Date(systemStatus.planGeneratedAt).toLocaleString()}</strong><small>Fresh plan, not a saved draft</small></div>
          <div><span>Latest saved draft</span><strong>{systemStatus.latestDraftAt ? new Date(systemStatus.latestDraftAt).toLocaleString() : "No saved drafts"}</strong></div>
          <div><span>Server time</span><strong>{new Date(systemStatus.serverTime).toLocaleString()}</strong></div>
          <div><span>Next macro calendar event</span><strong>{systemStatus.nextCalendarEvent ? `${systemStatus.nextCalendarEvent.date} | ${systemStatus.nextCalendarEvent.releaseName}` : "No event in stored window"}</strong></div>
          <div><span>Calendar context refreshed</span><strong>{systemStatus.calendarRefreshedAt ? new Date(systemStatus.calendarRefreshedAt).toLocaleString() : "Not refreshed"}</strong></div>
          <div><span>News context refreshed</span><strong>{systemStatus.newsRefreshedAt ? new Date(systemStatus.newsRefreshedAt).toLocaleString() : "Manual mode"}</strong></div>
          <div><span>Latest manual context</span><strong>{systemStatus.latestManualContextAt ? new Date(systemStatus.latestManualContextAt).toLocaleString() : "None added"}</strong></div>
        </div>
        <div className="system-flags">
          <span className={systemStatus.supabaseConnected ? "enabled" : "disabled"}>Supabase {systemStatus.supabaseConnected ? "connected" : "not configured"}</span>
          <span className={systemStatus.buttondownConfigured ? "enabled" : "disabled"}>Buttondown {systemStatus.buttondownConfigured ? "configured" : "not configured"}</span>
          <span className={systemStatus.aiEnabled ? "enabled" : "disabled"}>AI generation {systemStatus.aiEnabled ? "enabled" : "disabled"}</span>
          <span className={systemStatus.xApiDiscoveryEnabled ? "enabled" : "disabled"}>X API discovery {systemStatus.xApiDiscoveryEnabled ? "enabled" : "disabled"}</span>
          <span className={systemStatus.calendarApiEnabled ? "enabled" : "disabled"}>Calendar API {systemStatus.calendarApiEnabled ? "enabled" : marketContext.calendarMode}</span>
          <span className={systemStatus.newsApiEnabled ? "enabled" : "disabled"}>News API {systemStatus.newsApiEnabled ? "enabled" : "manual mode"}</span>
          <span className={systemStatus.marketContextStorageReady ? "enabled" : "disabled"}>Context storage {systemStatus.marketContextStorageReady ? "ready" : "migration required"}</span>
          <span className={systemStatus.fallbackContextMode ? "disabled" : "enabled"}>{systemStatus.fallbackContextMode ? "Fallback/manual context active" : "Provider context active"}</span>
        </div>
        <div className="draft-actions">
          <button type="button" onClick={refreshSnapshot} disabled={Boolean(busy)}>
            {busy === "snapshot" ? <LoaderCircle className="spin" size={15} /> : <RefreshCw size={15} />}
            Refresh latest macro snapshot
          </button>
          <button type="button" onClick={generateTodayPlan} disabled={Boolean(busy)}>
            {busy === "plan" ? <LoaderCircle className="spin" size={15} /> : <Sparkles size={15} />}
            Generate today&apos;s X plan
          </button>
        </div>
        <p className="panel-copy">Snapshot refresh updates marketing data only. It does not publish a newsletter, send email, or post on X.</p>
      </section>

      <section className="marketing-summary">
        <div><span>Latest snapshot</span><strong>{currentSnapshot.periodEnd}</strong></div>
        <div><span>DXY score</span><strong>{currentSnapshot.dxyScore === null ? "Unavailable" : `${currentSnapshot.dxyScore > 0 ? "+" : ""}${currentSnapshot.dxyScore.toFixed(1)} / 10`}</strong></div>
        <div><span>Current bias</span><strong>{currentSnapshot.dxyPlay.bias}</strong></div>
        <div><span>Today&apos;s post target</span><strong>{settings.dailyPostTarget}</strong></div>
        <div><span>Reply opportunities</span><strong>{replies.filter((reply) => reply.status === "new").length} / {settings.dailyReplyTarget}</strong></div>
        <div><span>Writing engine</span><strong>{aiConfigured && settings.aiEnabled ? "AI + safety fallback" : "Adaptive fallback"}</strong></div>
      </section>

      {message ? <p className="marketing-message" role="status">{message}</p> : null}

      <section className="admin-panel fresh-context-panel">
        <div className="panel-heading">
          <div><span className="eyebrow">Calendar, headlines, and manual notes</span><h2>Fresh Market Context</h2></div>
          <Newspaper size={20} />
        </div>
        <p className="panel-copy">Context is used only to draft ideas for manual review. Headlines are treated as context, not verified trading signals.</p>
        <div className="context-columns">
          <div className="context-column">
            <header><h3><CalendarDays size={16} /> Economic calendar</h3><button type="button" onClick={() => refreshMarketContext("calendar")} disabled={Boolean(busy)}>{busy === "calendar" ? <LoaderCircle className="spin" size={14} /> : <RefreshCw size={14} />} Refresh</button></header>
            <small>{marketContext.calendarMode === "provider" ? "Provider data" : marketContext.calendarMode === "fred-fallback" ? "FRED fallback" : "Manual entries"}</small>
            <div className="context-list">
              {marketContext.calendarEvents.slice(0, 10).map((event) => (
                <article key={event.id}>
                  <header><strong>{event.eventName}</strong><em className={`importance ${event.importance}`}>{event.importance}</em></header>
                  <p>{event.eventDate}{event.eventTime ? ` | ${event.eventTime}` : ""} | {event.category}</p>
                  {(event.previous || event.forecast || event.actual) ? <small>Previous {event.previous || "n/a"} | Forecast {event.forecast || "n/a"} | Actual {event.actual || "pending"}</small> : null}
                  <small>{event.whyItMatters}</small>
                </article>
              ))}
              {!marketContext.calendarEvents.length ? <p className="empty-context">No calendar events stored. Refresh the fallback or add a manual event.</p> : null}
            </div>
          </div>
          <div className="context-column">
            <header><h3><Newspaper size={16} /> News and geopolitical context</h3><button type="button" onClick={() => refreshMarketContext("news")} disabled={Boolean(busy)}>{busy === "news" ? <LoaderCircle className="spin" size={14} /> : <RefreshCw size={14} />} Refresh</button></header>
            <small>{marketContext.newsMode === "provider" ? "Provider headlines" : "Manual headline mode"}</small>
            <div className="context-list">
              {marketContext.newsItems.slice(0, 8).map((item) => (
                <article key={item.id}>
                  <header><strong>{item.headline}</strong><em className={`sentiment ${item.sentiment}`}>{item.sentiment}</em></header>
                  <p>{item.source} | {new Date(item.publishedAt).toLocaleString()} | relevance {item.relevanceScore}</p>
                  <small>{item.dxyAngle}</small>
                  {item.url ? <a href={item.url} target="_blank" rel="noreferrer">Open source <ExternalLink size={12} /></a> : null}
                </article>
              ))}
              {!marketContext.newsItems.length ? <p className="empty-context">No news API context is stored. Add a manual headline or geopolitical note below.</p> : null}
            </div>
          </div>
        </div>
        <div className="manual-context-form">
          <div className="generate-grid">
            <label>Context type<select value={contextForm.kind} onChange={(event) => setContextForm({ ...contextForm, kind: event.target.value as ManualContextKind })}><option value="note">Note for today</option><option value="event">Economic event</option><option value="headline">Headline</option><option value="geopolitical">Geopolitical event</option></select></label>
            <label>Date<input type="date" value={contextForm.contextDate} onChange={(event) => setContextForm({ ...contextForm, contextDate: event.target.value })} /></label>
            <label>Title<input value={contextForm.title} onChange={(event) => setContextForm({ ...contextForm, title: event.target.value })} placeholder="Markets are watching U.S.-Iran negotiations" /></label>
          </div>
          <label className="draft-notes">Details and DXY angle<textarea value={contextForm.details} onChange={(event) => setContextForm({ ...contextForm, details: event.target.value })} placeholder="Focus on possible effects through oil, risk sentiment, Treasury yields, and inflation expectations." /></label>
          <button className="media-button" type="button" onClick={addContext} disabled={busy === "context" || !contextForm.title.trim()}>{busy === "context" ? <LoaderCircle className="spin" size={15} /> : <Plus size={15} />} Add manual context</button>
        </div>
      </section>

      <section className="admin-panel">
        <div className="panel-heading"><div><span className="eyebrow">Context-aware daily workflow</span><h2>Today&apos;s X Content Ideas</h2></div><BarChart3 size={20} /></div>
        <p className="panel-copy">Up to ten ideas using the snapshot, calendar, headlines, manual notes, and 14 days of content memory. Edit everything before posting.</p>
        <div className="draft-actions">
          <button type="button" onClick={generateTodayPlan} disabled={Boolean(busy)}><Sparkles size={15} /> Generate today&apos;s X ideas</button>
          <button type="button" onClick={clearTodayPlan} disabled={!suggestedPosts.length}><Trash2 size={15} /> Clear today&apos;s generated plan</button>
        </div>
        <div className="suggested-post-grid">
          {suggestedPosts.map((item) => (
            <article key={item.id}>
              <header>
                <div><span>{item.category ?? item.topic}</span><time>{item.timeWindow}</time></div>
                <em className={`draft-status ${item.status}`}>{item.status}</em>
              </header>
              <strong className="idea-topic">{item.topic}</strong>
              <textarea
                value={item.text}
                maxLength={280}
                onChange={(event) => updateSuggestedPost(item.id, {
                  text: event.target.value,
                  status: "draft",
                })}
              />
              <div className="suggested-post-meta">
                <small>{item.text.length}/280 characters</small>
                <small>Risk {item.riskScore ?? 0}/100 | Repetition {item.repetitionScore ?? 0}/100</small>
              </div>
              <p className="idea-reason"><b>Why today:</b> {item.reason}</p>
              {item.sourceContext ? <p className="idea-source"><b>Source context:</b> {item.sourceContext}</p> : null}
              {item.repetitionWarning ? <p className="repetition-warning">{item.repetitionWarning}</p> : null}
              <div className="draft-actions">
                <button type="button" onClick={() => copySuggestedPost(item.id, item.text)}><Clipboard size={14} /> Copy</button>
                <button type="button" onClick={() => saveSuggestedIdea(item, "draft")} disabled={busy === `idea-${item.id}`}><Save size={14} /> Save draft</button>
                <button type="button" onClick={() => {
                  setContentType(item.contentType as XContentType);
                  setTopic(item.topic);
                  document.getElementById("marketing-generate")?.scrollIntoView({ behavior: "smooth" });
                }}>Generate variations</button>
                <button type="button" onClick={() => saveSuggestedIdea(item, "posted")} disabled={busy === `idea-${item.id}`}><Check size={14} /> Mark posted</button>
                <button type="button" onClick={() => updateSuggestedPost(item.id, { status: "skipped" })}>Skip</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="admin-panel" id="marketing-generate">
        <div className="panel-heading"><div><span className="eyebrow">Adaptive generation</span><h2>Generate three X variations</h2></div><Sparkles size={20} /></div>
        <div className="generate-grid">
          <label>Content type<select value={contentType} onChange={(event) => setContentType(event.target.value as XContentType)}>{X_CONTENT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label>Topic<select value={topic} onChange={(event) => setTopic(event.target.value)}>
            {!MARKETING_TOPIC_BANK.includes(topic) ? <option value={topic}>{topic}</option> : null}
            {MARKETING_TOPIC_BANK.map((item) => <option key={item}>{item}</option>)}
          </select></label>
          <label>Tone<select value={tone} onChange={(event) => setTone(event.target.value as MarketingTone)}><option value="professional">Professional</option><option value="simple">Simple</option><option value="analytical">Analytical</option><option value="direct">Direct</option></select></label>
        </div>
        <label className="draft-notes">Tell the agent what angle to use today.
          <textarea value={instruction} onChange={(event) => setInstruction(event.target.value)} maxLength={1000} placeholder="Focus on CPI and Fed expectations. Make it simple and less promotional." />
        </label>
        <div className="draft-actions">
          <button type="button" onClick={() => generate(false)} disabled={Boolean(busy)}>{busy === "generate" ? <LoaderCircle className="spin" size={15} /> : <Sparkles size={15} />} Generate as new draft</button>
          <button type="button" onClick={() => generate(true)} disabled={!active || Boolean(busy)}><RefreshCw size={15} /> Replace current draft</button>
        </div>
      </section>

      {active ? (
        <>
          <section className="admin-panel">
            <div className="panel-heading"><div><span className="eyebrow">Three variations</span><h2>{active.topic}</h2></div><span className={`draft-status ${active.status}`}>{statusLabel(active.status)}</span></div>
            <div className="variation-grid">
              {active.variations.map((variation) => (
                <article key={variation.style}>
                  <header><strong>{variation.style}</strong><small>{variation.characterCount}/280</small></header>
                  <p>{variation.text}</p><small>{variation.whyItWorks}</small>
                  <div className="mini-scores"><span>Hook {variation.scores.hook}</span><span>Clarity {variation.scores.clarity}</span><span>Risk {variation.scores.risk}</span><span>Promo {variation.scores.promotionalRisk}</span></div>
                  <button type="button" onClick={() => setEditorText(variation.text)}>Use this variation</button>
                </article>
              ))}
            </div>
          </section>

          <section className="admin-panel">
            <div className="panel-heading"><div><span className="eyebrow">Draft editor</span><h2>Edit before posting</h2></div><span>{editorText.length} characters</span></div>
            <textarea className="marketing-editor" value={editorText} onChange={(event) => setEditorText(event.target.value)} />
            <div className="quality-grid">
              {[
                ["Clarity", active.qualityScores.clarity, false], ["Relevance", active.qualityScores.relevance, false],
                ["Hook", active.qualityScores.hook, false], ["Educational", active.qualityScores.educationalValue, false],
                ["Promo risk", active.qualityScores.promotionalRisk, true], ["Advice risk", active.qualityScores.financialAdviceRisk, true],
                ["Repetition", active.qualityScores.repetitionRisk, true],
              ].map(([label, value, risk]) => <div key={String(label)}><span>{label}</span><strong className={scoreClass(Number(value), Boolean(risk))}>{value}/100</strong></div>)}
            </div>
            {active.qualityScores.warnings.length ? <ul className="quality-warnings">{active.qualityScores.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul> : null}
            <div className={`compliance-indicator ${complianceBlockers.length === 0 ? "ok" : "blocked"}`}>
              <strong>Compliance:</strong>
              <span>{complianceBlockers.length === 0 ? "OK" : "Needs revision"}</span>
            </div>
            {complianceBlockers.length > 0 && (
              <ul className="compliance-blockers">
                {complianceBlockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
              </ul>
            )}
            <div className="improve-actions">{improvements.map(([action, label]) => <button type="button" key={action} onClick={() => improve(action)} disabled={Boolean(busy)}>{label}</button>)}</div>
            <div className="draft-actions">
              <button type="button" onClick={() => patchDraft({ textContent: editorText }, "Edits saved as a new version.")}><Save size={15} /> Save edits</button>
              <button type="button" onClick={duplicateDraft}><RefreshCw size={15} /> Duplicate</button>
              <button type="button" onClick={() => copy(editorText)}><Clipboard size={15} /> Copy for X</button>
              {(active.status === "draft" || active.status === "rejected") && (
                <button type="button" onClick={() => patchDraft({ status: "needs_review" }, "Submitted for review.")} disabled={Boolean(busy)}><Check size={15} /> Submit for review</button>
              )}
              {active.status === "needs_review" && (
                <>
                  <button type="button" onClick={() => patchDraft({ status: "approved" }, "Draft approved.")} disabled={Boolean(busy)}><Check size={15} /> Approve</button>
                  <button type="button" onClick={() => patchDraft({ status: "rejected" }, "Draft rejected.")} disabled={Boolean(busy)}>Reject</button>
                  <button type="button" onClick={() => patchDraft({ status: "draft" }, "Returned to draft.")} disabled={Boolean(busy)}><RefreshCw size={15} /> Return to draft</button>
                </>
              )}
              {(active.status === "approved" || active.status === "ready") && (
                <button type="button" onClick={() => patchDraft({ status: "posted" }, "Marked as manually posted.")} disabled={Boolean(busy)}><Check size={15} /> Mark posted</button>
              )}
            </div>
            <div className="generate-grid">
              <label>Posted X URL<input value={active.postedUrl} onChange={(event) => setActive({ ...active, postedUrl: event.target.value })} placeholder="https://x.com/..." /></label>
              <label>Version<input readOnly value={active.versionNumber} /></label>
            </div>
            <label className="draft-notes">Private notes<textarea value={active.notes} onChange={(event) => setActive({ ...active, notes: event.target.value })} maxLength={2000} /></label>
            <button className="media-button" type="button" onClick={() => patchDraft({ notes: active.notes, postedUrl: active.postedUrl }, "Notes and tracking saved independently.")}>Save notes and tracking</button>
          </section>
        </>
      ) : null}

      <section className="admin-panel">
        <div className="panel-heading"><div><span className="eyebrow">Manual review only</span><h2>X Reply Opportunities</h2></div><MessageCircle size={20} /></div>
        <p className="panel-copy">Paste an X URL and/or post text. The system analyzes it and prepares replies; it never likes, follows, posts, or sends anything.</p>
        <div className="generate-grid">
          <label>X post URL<input value={replyForm.originalUrl} onChange={(event) => setReplyForm({ ...replyForm, originalUrl: event.target.value })} placeholder="https://x.com/author/status/..." /></label>
          <label>Author<input value={replyForm.author} onChange={(event) => setReplyForm({ ...replyForm, author: event.target.value })} placeholder="@author" /></label>
        </div>
        <label className="draft-notes">Original post text<textarea value={replyForm.postText} onChange={(event) => setReplyForm({ ...replyForm, postText: event.target.value })} placeholder="Paste the public post text here." /></label>
        <button className="media-button" type="button" onClick={addReply} disabled={busy === "reply"}>{busy === "reply" ? <LoaderCircle className="spin" size={15} /> : <Sparkles size={15} />} Analyze and suggest replies</button>
        <div className="reply-list">
          {replies.map((reply) => (
            <article key={reply.id}>
              <header><div><strong>{reply.author || "Unknown author"}</strong><span>{reply.detectedTopic}</span></div><em className={`draft-status ${reply.status}`}>{reply.status}</em></header>
              <blockquote>{reply.postText}</blockquote>
              <div className="mini-scores"><span>Relevance {reply.relevanceScore}</span><span>Reply quality {reply.replyQualityScore}</span><span>Promo risk {reply.promotionalRiskScore}</span></div>
              {[["Short", reply.replyShort], ["Educational", reply.replyEducational], ["Dashboard, only if natural", reply.replyDashboard]].map(([label, text]) => (
                <div className="reply-option" key={label}><small>{label}</small><p>{text}</p><button type="button" onClick={() => copyReply(reply, text)}><Clipboard size={14} /> Copy reply</button></div>
              ))}
              <div className="draft-actions">
                {reply.originalUrl ? <a href={reply.originalUrl} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Open on X</a> : null}
                <button type="button" onClick={() => updateReply(reply, "replied")}><Check size={14} /> Mark replied</button>
                <button type="button" onClick={() => updateReply(reply, "skipped")}>Skip</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="admin-panel">
        <div className="panel-heading">
          <div><span className="eyebrow">Manual analysis only · no scraping · no API calls</span><h2>Competitor Intelligence</h2></div>
          <BarChart3 size={20} />
        </div>
        <p className="panel-copy">
          Paste 1–5 public macro or competitor posts. The system analyzes topics, hooks, content angles, gaps, and differentiation opportunities.
          Analysis is rule-based and runs entirely in the browser. Nothing is copied, posted, or sent anywhere.
        </p>
        <div className="competitor-inputs">
          {competitorInputs.map((value, idx) => (
            <label key={idx} className="draft-notes">
              Post {idx + 1}
              <textarea
                value={value}
                onChange={(event) => updateCompetitorInput(idx, event.target.value)}
                placeholder="Paste a competitor or macro post here…"
                maxLength={2000}
              />
              {competitorInputs.length > 1 && (
                <div className="draft-actions">
                  <button type="button" onClick={() => removeCompetitorInput(idx)}>
                    <Trash2 size={14} /> Remove post {idx + 1}
                  </button>
                </div>
              )}
            </label>
          ))}
        </div>
        <div className="draft-actions">
          {competitorInputs.length < 5 && (
            <button type="button" onClick={addCompetitorInput}>
              <Plus size={15} /> Add another post
            </button>
          )}
          <button
            type="button"
            className="media-button"
            onClick={runCompetitorAnalysis}
            disabled={competitorInputs.every((v) => !v.trim())}
          >
            <Sparkles size={15} /> Analyze posts
          </button>
        </div>

        {competitorReport && competitorReport.postCount > 0 && (
          <div className="competitor-report">
            <div className="context-columns">
              <div className="context-column">
                <h3>Common topics ({competitorReport.commonTopics.length})</h3>
                {competitorReport.commonTopics.length ? (
                  <ul className="clean-list">
                    {competitorReport.commonTopics.map((topic) => <li key={topic}>{topic}</li>)}
                  </ul>
                ) : <p className="panel-copy">No recognizable macro topics detected.</p>}
              </div>
              <div className="context-column">
                <h3>Strongest hooks detected</h3>
                <div className="context-list">
                  {competitorReport.strongestHooks.map((hook) => (
                    <article key={hook.type}>
                      <header>
                        <strong>{hook.type}</strong>
                        <em className={`draft-status ${hook.strength === "strong" ? "approved" : hook.strength === "moderate" ? "needs_review" : "draft"}`}>
                          {hook.strength}
                        </em>
                      </header>
                      <small>&ldquo;{hook.example}&rdquo;</small>
                    </article>
                  ))}
                  {!competitorReport.strongestHooks.length && (
                    <p className="panel-copy">No recognizable hook patterns detected.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="context-columns">
              <div className="context-column">
                <h3>Content angles used</h3>
                {competitorReport.contentAngles.length ? (
                  <ul className="clean-list">
                    {competitorReport.contentAngles.map((angle) => <li key={angle}>{angle}</li>)}
                  </ul>
                ) : <p className="panel-copy">No specific content angles detected.</p>}
              </div>
              <div className="context-column">
                <h3>What makes these posts engaging</h3>
                <ul className="clean-list">
                  {competitorReport.engagementFactors.map((factor) => <li key={factor}>{factor}</li>)}
                </ul>
              </div>
            </div>

            <div className="context-columns">
              <div className="context-column">
                <h3>Weak points and gaps</h3>
                <ul className="quality-warnings">
                  {[...competitorReport.weakPoints, ...competitorReport.gaps].map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="context-column">
                <h3>Opportunities for your DXY dashboard</h3>
                <ul className="clean-list">
                  {competitorReport.opportunities.map((opp) => <li key={opp}>{opp}</li>)}
                </ul>
              </div>
            </div>

            <h3>5 differentiated post ideas you could create</h3>
            <div className="context-list">
              {competitorReport.differentiatedPostIdeas.map((idea, idx) => (
                <article key={idx}>
                  <header><strong>Idea {idx + 1}</strong></header>
                  <p>{idea}</p>
                </article>
              ))}
            </div>

            <h3>3 safe reply angles you could use manually</h3>
            <div className="context-list">
              {competitorReport.safeReplyAngles.map((angle, idx) => (
                <article key={idx}>
                  <header><strong>Reply angle {idx + 1}</strong></header>
                  <p>{angle}</p>
                </article>
              ))}
            </div>

            <p className="idea-reason">
              <strong>Compliance:</strong> {competitorReport.complianceNote}
            </p>
          </div>
        )}
      </section>

      {active && card && video ? (
        <section className="admin-panel">
          <div className="panel-heading"><div><span className="eyebrow">Visual studio</span><h2>Image and 30-second video</h2></div><ImageIcon size={20} /></div>
          <label>Image card type<select value={imageType} onChange={(event) => setImageType(event.target.value)}>{imageTypes.map((item) => <option key={item}>{item}</option>)}</select></label>
          <div className="media-grid">
            <div>
              <div className="x-card-scale"><div className="x-card export-card">
                <div className="x-card-top"><span>MACRO FX MONITOR</span><span>{active.snapshotDate}</span></div>
                <div className="x-card-signal"><div><small>{imageType.toUpperCase()}</small><strong>{card.score}</strong></div><h3>{card.bias}</h3></div>
                <div className="x-card-drivers"><small>WHAT MATTERS</small>{card.drivers.map((driver) => <p key={driver}>{driver}</p>)}</div>
                <div className="x-card-scenarios"><p><b>Confirmation:</b> {card.confirmation}</p><p><b>Invalidation:</b> {card.invalidation}</p></div>
                <div className="x-card-footer"><span>{card.snapshotUrl}</span><span>{DISCLAIMER}</span></div>
              </div></div>
              <div className="draft-actions"><button type="button" onClick={downloadCard} disabled={busy === "image"}><Download size={15} /> Download 1600 x 900 PNG</button><button type="button" onClick={() => copy(editorText)}><Clipboard size={15} /> Copy paired post</button></div>
            </div>
            <div>
              <div className="video-preview upgraded-video-preview">
                <div className="video-timecode"><span>{videoSecond.toFixed(1)}s</span><span>30.0s</span></div>
                <div className="video-progress timeline">{[0, 1, 2, 3, 4].map((item) => <button type="button" aria-label={`Show video scene ${item + 1}`} onClick={() => {
                  const seconds = [0, 2, 6, 14, 22][item];
                  setVideoSecond(seconds);
                  setVideoSlide(item);
                }} className={item <= videoSlide ? "active" : ""} key={item} />)}</div>
                <div className={`video-slide video-scene-${videoSlide}`} key={videoSlide}>{videoSlides[videoSlide]}</div>
                {video.subtitlesEnabled && subtitleChunks.length ? <div className="video-subtitle">{subtitleChunks[subtitleIndex]}</div> : null}
              </div>
              <div className="video-status-row">
                <span className={video.subtitlesEnabled ? "enabled" : "disabled"}>Subtitles {video.subtitlesEnabled ? "enabled" : "disabled"}</span>
                <span className={video.musicEnabled && video.musicUrl ? "enabled" : "disabled"}>Music {video.musicEnabled && video.musicUrl ? "enabled" : "disabled"}</span>
              </div>
              <button className="media-button" type="button" onClick={playVideoPreview} disabled={videoPlaying}><Film size={15} /> {videoPlaying ? "Playing 30-second preview..." : "Play animated preview"}</button>
              <label className="draft-notes">Generated voiceover script
                <textarea className="voiceover-script" readOnly value={video.voiceoverScript} />
                <small>{video.voiceoverScript.trim().split(/\s+/).filter(Boolean).length} words | Target: 45-75 words</small>
              </label>
              <div className="draft-actions"><button type="button" onClick={() => copy(video.voiceoverScript)}><Clipboard size={15} /> Copy voiceover</button><button type="button" onClick={downloadVideoConfig}><Download size={15} /> Download JSON config</button></div>
              <div className="local-render-panel">
                <strong>Generate the real MP4 locally</strong>
                <p>JSON is not a video. To generate MP4 locally, replace <code>remotion/sample-props.json</code> and run <code>npm run video:render</code>.</p>
                <div><code>npm run video:render</code><button type="button" onClick={() => copy("npm run video:render")}><Clipboard size={14} /> Copy command</button></div>
                <p>MP4 output: <code>out/macro-fx-update.mp4</code></p>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="admin-panel">
        <div className="panel-heading"><div><span className="eyebrow">Search and tracking</span><h2>Draft Library</h2></div><Search size={20} /></div>
        <div className="library-filters">
          <input value={draftSearch} onChange={(event) => setDraftSearch(event.target.value)} placeholder="Search title, topic, or copy" />
          <select value={draftType} onChange={(event) => setDraftType(event.target.value)}><option value="all">All content types</option>{X_CONTENT_OPTIONS.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select>
          <select value={draftStatus} onChange={(event) => setDraftStatus(event.target.value)}><option value="all">All statuses</option><option value="draft">Draft</option><option value="needs_review">Needs review</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="ready">Ready (legacy)</option><option value="posted">Posted</option></select>
        </div>
        <div className="draft-library">{filteredDrafts.map((draft) => (
          <article className={active?.id === draft.id ? "active" : ""} key={draft.id}>
            <button type="button" className="draft-open" onClick={() => selectDraft(draft)}><span>{draft.contentType} | {draft.topic}</span><strong>{draft.title}</strong><small>{new Date(draft.createdAt).toLocaleString()} | v{draft.versionNumber}{draft.copiedAt ? " | copied" : ""}{draft.manuallyPostedAt ? " | posted" : ""}</small></button>
            <span className={`draft-status ${draft.status}`}>{statusLabel(draft.status)}</span>
            <button type="button" title="Copy" onClick={() => copy(fullCopy(draft), draft)}><Clipboard size={14} /></button>
            <button type="button" title="Delete" onClick={() => removeDraft(draft)}><Trash2 size={14} /></button>
          </article>
        ))}</div>
      </section>

      <section className="admin-panel">
        <div className="panel-heading">
          <div><span className="eyebrow">From recorded post data</span><h2>Performance Analytics</h2></div>
          <BarChart3 size={20} />
        </div>
        {initialPerformanceSummary.totalTracked === 0 ? (
          <p className="panel-copy">No performance data yet. Record your first post using the section below to start tracking.</p>
        ) : (
          <>
            <div className="system-status-grid">
              <div><span>Posts tracked</span><strong>{initialPerformanceSummary.totalTracked}</strong></div>
              <div><span>Total impressions</span><strong>{initialPerformanceSummary.totalImpressions.toLocaleString()}</strong></div>
              <div><span>Total likes</span><strong>{initialPerformanceSummary.totalLikes.toLocaleString()}</strong></div>
              <div><span>Total reposts</span><strong>{initialPerformanceSummary.totalReposts.toLocaleString()}</strong></div>
              <div><span>Total replies</span><strong>{initialPerformanceSummary.totalReplies.toLocaleString()}</strong></div>
              <div><span>Total bookmarks</span><strong>{initialPerformanceSummary.totalBookmarks.toLocaleString()}</strong></div>
              <div><span>Avg engagement</span><strong>{initialPerformanceSummary.avgEngagementRate.toFixed(1)}%</strong></div>
              <div><span>Best topic</span><strong>{initialPerformanceSummary.bestTopic ?? "—"}</strong></div>
            </div>
            {initialPerformanceSummary.bestContentType && (
              <p className="panel-copy">Best content type by impressions: <strong>{initialPerformanceSummary.bestContentType}</strong></p>
            )}
            {initialPerformanceSummary.highImpressionsLowEngagement.length > 0 && (
              <>
                <p className="panel-copy">High reach, low engagement — consider revising the CTA or format:</p>
                <ul className="quality-warnings">
                  {initialPerformanceSummary.highImpressionsLowEngagement.map((item) => (
                    <li key={item.id}>{item.url || "No URL recorded"} — {item.impressions.toLocaleString()} impressions, {item.engagement.toFixed(1)}% engagement</li>
                  ))}
                </ul>
              </>
            )}
            {initialPerformanceSummary.lowImpressionsGoodEngagement.length > 0 && (
              <>
                <p className="panel-copy">Low reach, strong engagement — worth repeating or reposting:</p>
                <ul className="clean-list">
                  {initialPerformanceSummary.lowImpressionsGoodEngagement.map((item) => (
                    <li key={item.id}>{item.url || "No URL recorded"} — {item.impressions.toLocaleString()} impressions, rated {item.quality}</li>
                  ))}
                </ul>
              </>
            )}
            <p className="idea-reason"><strong>Recommendation:</strong> {initialPerformanceSummary.recommendation}</p>
          </>
        )}
      </section>

      <section className="admin-panel">
        <div className="panel-heading">
          <div><span className="eyebrow">Based on all recorded post data</span><h2>Weekly Growth Report</h2></div>
          <BarChart3 size={20} />
        </div>
        {!initialWeeklyReport.hasEnoughData ? (
          <>
            <p className="panel-copy">
              Record at least 3 posts to unlock the full weekly growth report. Here are suggested starting experiments:
            </p>
            <div className="growth-plan">
              {initialWeeklyReport.experiments.map((exp, i) => (
                <article key={exp.suggestedTopic + i}>
                  <div><span>Experiment {i + 1}</span><em className="draft-status draft">{exp.suggestedContentType}</em></div>
                  <strong>{exp.title}</strong>
                  <small>{exp.suggestedTopic}</small>
                  <small>{exp.rationale}</small>
                </article>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="system-status-grid">
              <div><span>This week impressions</span><strong>{initialWeeklyReport.thisWeekImpressions.toLocaleString()}</strong></div>
              <div><span>Last week impressions</span><strong>{initialWeeklyReport.lastWeekImpressions.toLocaleString()}</strong></div>
              <div>
                <span>Impression trend</span>
                <strong>
                  {initialWeeklyReport.impressionsTrend === "up" ? "↑ Up" :
                   initialWeeklyReport.impressionsTrend === "down" ? "↓ Down" :
                   initialWeeklyReport.impressionsTrend === "flat" ? "→ Flat" : "Insufficient data"}
                </strong>
              </div>
              <div><span>Data window</span><strong>{initialWeeklyReport.dataWindowDays} day{initialWeeklyReport.dataWindowDays !== 1 ? "s" : ""} tracked</strong></div>
            </div>
            {initialWeeklyReport.bestTopics.length > 0 && (
              <div className="context-columns">
                <div className="context-column">
                  <h3>Best topics</h3>
                  <div className="context-list">
                    {initialWeeklyReport.bestTopics.map((t) => (
                      <article key={t.topic}>
                        <header>
                          <strong>{t.topic}</strong>
                          <em className={`draft-status ${qualityBadgeClass(t.topQuality)}`}>{t.topQuality}</em>
                        </header>
                        <small>{t.totalImpressions.toLocaleString()} impressions across {t.postCount} post{t.postCount !== 1 ? "s" : ""}</small>
                        <small>{t.avgEngagementRate.toFixed(1)}% avg engagement</small>
                      </article>
                    ))}
                  </div>
                </div>
                <div className="context-column">
                  <h3>Weakest topics</h3>
                  {initialWeeklyReport.weakestTopics.length === 0 ? (
                    <p className="panel-copy">Post across more topics to see comparisons here.</p>
                  ) : (
                    <div className="context-list">
                      {initialWeeklyReport.weakestTopics.map((t) => (
                        <article key={t.topic}>
                          <header>
                            <strong>{t.topic}</strong>
                            <em className={`draft-status ${qualityBadgeClass(t.topQuality)}`}>{t.topQuality}</em>
                          </header>
                          <small>{t.totalImpressions.toLocaleString()} impressions across {t.postCount} post{t.postCount !== 1 ? "s" : ""}</small>
                          <small>{t.avgEngagementRate.toFixed(1)}% avg engagement</small>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            {initialWeeklyReport.bestContentType && (
              <p className="panel-copy">
                Best content type: <strong>{initialWeeklyReport.bestContentType}</strong>
                {initialWeeklyReport.worstContentType ? ` · Weakest: ${initialWeeklyReport.worstContentType}` : ""}
              </p>
            )}
            <div className="context-columns">
              <div className="context-column">
                <h3>Repeat next week</h3>
                <ul className="clean-list">
                  {initialWeeklyReport.repeatRecommendations.map((r) => <li key={r}>{r}</li>)}
                </ul>
              </div>
              <div className="context-column">
                <h3>Avoid next week</h3>
                <ul className="quality-warnings">
                  {initialWeeklyReport.avoidRecommendations.map((a) => <li key={a}>{a}</li>)}
                </ul>
              </div>
            </div>
            <p className="panel-copy">Recommended experiments for next week:</p>
            <div className="growth-plan">
              {initialWeeklyReport.experiments.map((exp, i) => (
                <article key={exp.suggestedTopic + i}>
                  <div><span>Experiment {i + 1}</span><em className="draft-status draft">{exp.suggestedContentType}</em></div>
                  <strong>{exp.title}</strong>
                  <small>{exp.suggestedTopic}</small>
                  <small>{exp.rationale}</small>
                </article>
              ))}
            </div>
            <p className="idea-reason"><strong>Next week strategy:</strong> {initialWeeklyReport.nextWeekStrategy}</p>
          </>
        )}
      </section>

      <section className="admin-panel">
        <div className="panel-heading">
          <div><span className="eyebrow">Next 7 days · display only</span><h2>Content Calendar</h2></div>
          <CalendarDays size={20} />
        </div>
        <p className="panel-copy">
          Suggested content for the next 7 days based on your performance data and topic bank.
          Generate and edit the drafts using the section above — this calendar does not post anything automatically.
        </p>
        <div className="context-list">
          {initialCalendar.map((day, i) => (
            <article key={day.date}>
              <header>
                <strong>{day.dayLabel} — {day.topic}</strong>
                <div>
                  <em className={`draft-status ${calendarStatusClass(day.status)}`}>
                    {calendarStatusLabel(day.status)}
                  </em>
                  {" "}
                  <em className="draft-status draft">{day.contentType}</em>
                </div>
              </header>
              <small>{day.date}</small>
              <small>Angle: {day.suggestedAngle}</small>
              <small>CTA: {day.suggestedCta}</small>
              <small>{day.reason}</small>
            </article>
          ))}
        </div>
      </section>

      {active ? <section className="admin-panel">
        <div className="panel-heading"><div><span className="eyebrow">Manual learning loop</span><h2>Record X Performance</h2></div><BarChart3 size={20} /></div>
        <p className="panel-copy">Record results later so future versions can learn which topics and formats perform best.</p>
        <div className="settings-grid">
          <label>Posted URL<input value={performance.postedUrl} onChange={(event) => setPerformance({ ...performance, postedUrl: event.target.value })} /></label>
          {(["impressions", "likes", "replies", "reposts", "bookmarks", "profileVisits"] as const).map((field) => (
            <label key={field}>{field.replace(/([A-Z])/g, " $1")}<input type="number" min="0" value={performance[field]} onChange={(event) => setPerformance({ ...performance, [field]: Number(event.target.value) })} /></label>
          ))}
          <label>Result quality<select value={performance.resultQuality} onChange={(event) => setPerformance({ ...performance, resultQuality: event.target.value })}><option value="bad">Bad</option><option value="okay">Okay</option><option value="good">Good</option><option value="strong">Strong</option></select></label>
        </div>
        <label className="draft-notes">Performance notes<textarea value={performance.notes} onChange={(event) => setPerformance({ ...performance, notes: event.target.value })} /></label>
        <button className="media-button" type="button" onClick={savePerformance} disabled={busy === "performance"}><Save size={15} /> Save performance</button>
      </section> : null}

      <section className="admin-panel">
        <div className="panel-heading"><div><span className="eyebrow">Command center controls</span><h2>Marketing Settings</h2></div><Settings2 size={20} /></div>
        <div className="settings-grid">
          <label>Default tone<select value={settings.defaultTone} onChange={(event) => setSettings({ ...settings, defaultTone: event.target.value as MarketingTone })}><option value="professional">Professional</option><option value="simple">Simple</option><option value="analytical">Analytical</option><option value="direct">Direct</option></select></label>
          <label>Daily post target<input type="number" min="1" max="10" value={settings.dailyPostTarget} onChange={(event) => setSettings({ ...settings, dailyPostTarget: Number(event.target.value) })} /></label>
          <label>Daily reply target<input type="number" min="1" max="50" value={settings.dailyReplyTarget} onChange={(event) => setSettings({ ...settings, dailyReplyTarget: Number(event.target.value) })} /></label>
          <label>Link frequency<select value={settings.linkUsageFrequency} onChange={(event) => setSettings({ ...settings, linkUsageFrequency: event.target.value as MarketingSettings["linkUsageFrequency"] })}><option value="never">Never</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
          <label>Promotion risk limit<input type="number" min="0" max="100" value={settings.promotionalLevelLimit} onChange={(event) => setSettings({ ...settings, promotionalLevelLimit: Number(event.target.value) })} /></label>
          <label>Target audience<input value={settings.targetAudience} onChange={(event) => setSettings({ ...settings, targetAudience: event.target.value })} /></label>
          <label>Default CTA<input value={settings.defaultCta} onChange={(event) => setSettings({ ...settings, defaultCta: event.target.value })} /></label>
          <label>Blocked words<input value={settings.blockedWords.join(", ")} onChange={(event) => setSettings({ ...settings, blockedWords: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} /></label>
        </div>
        <div className="settings-toggles">
          <label><input type="checkbox" checked={settings.aiEnabled} onChange={(event) => setSettings({ ...settings, aiEnabled: event.target.checked })} /> AI generation</label>
          <label><input type="checkbox" checked={settings.xApiDiscoveryEnabled} onChange={(event) => setSettings({ ...settings, xApiDiscoveryEnabled: event.target.checked })} /> X API discovery</label>
          <label><input type="checkbox" checked={settings.manualFallbackEnabled} onChange={(event) => setSettings({ ...settings, manualFallbackEnabled: event.target.checked })} /> Manual reply fallback</label>
          <label><input type="checkbox" checked={settings.videoMusicEnabled} onChange={(event) => setSettings({ ...settings, videoMusicEnabled: event.target.checked })} /> Video music</label>
          <label><input type="checkbox" checked={settings.subtitlesEnabled} onChange={(event) => setSettings({ ...settings, subtitlesEnabled: event.target.checked })} /> Subtitles</label>
        </div>
        <button className="media-button" type="button" onClick={saveSettings} disabled={busy === "settings"}><Save size={15} /> Save settings</button>
      </section>
    </div>
  );
}
