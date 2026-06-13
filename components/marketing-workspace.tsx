"use client";

import { useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import {
  BarChart3, Check, Clipboard, Download, ExternalLink, Film, ImageIcon,
  LoaderCircle, MessageCircle, RefreshCw, Save, Search, Settings2, Sparkles,
  Trash2,
} from "lucide-react";
import { DISCLAIMER, X_CONTENT_OPTIONS } from "@/lib/marketing-config";
import { MARKETING_TOPIC_BANK } from "@/lib/marketing-plan";
import type {
  MacroSnapshot, MarketingDailyPlanItem, MarketingDraft, MarketingSettings,
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

export function MarketingWorkspace({
  snapshot,
  initialDrafts,
  initialSettings,
  initialReplies,
  dailyPlan,
  aiConfigured,
}: {
  snapshot: MacroSnapshot;
  initialDrafts: MarketingDraft[];
  initialSettings: MarketingSettings;
  initialReplies: ReplyOpportunity[];
  dailyPlan: MarketingDailyPlanItem[];
  aiConfigured: boolean;
}) {
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
  const previewCardRef = useRef<HTMLDivElement>(null);
  const exportCardRef = useRef<HTMLDivElement>(null);

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
    if (!exportCardRef.current || !active) return;
    setBusy("image");
    const dataUrl = await toPng(exportCardRef.current, {
      width: 1600, height: 900, pixelRatio: 1, backgroundColor: "#07101a",
      canvasWidth: 1600, canvasHeight: 900,
    });
    const link = document.createElement("a");
    link.download = `macro-fx-monitor-${active.snapshotDate}-${imageType.toLowerCase().replaceAll(" ", "-")}.png`;
    link.href = dataUrl;
    link.click();
    setBusy("");
    setMessage("Full-size 1600 x 900 PNG downloaded.");
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
  }

  const card = active?.imageCardData;
  const video = active?.videoConfig;
  const videoSlides = video ? [
    <><small>MACRO FX MONITOR</small><h3>{video.hook}</h3></>,
    <><small>DXY REGIME SCORE</small><strong>{video.score}</strong><h3>{video.bias}</h3></>,
    <><small>TOP MACRO DRIVERS</small>{video.drivers.map((driver) => <p key={driver}>{driver}</p>)}</>,
    <><small>SCENARIO CHECK</small><p><b>Confirmation:</b> {video.confirmation}</p><p><b>But this bias breaks if:</b> {video.invalidation}</p></>,
    <><small>FULL SOURCE-BACKED SNAPSHOT</small><h3>{video.snapshotUrl}</h3><p>{DISCLAIMER}</p></>,
  ] : [];

  return (
    <div className="marketing-workspace command-center">
      <section className="marketing-summary">
        <div><span>Latest snapshot</span><strong>{snapshot.periodEnd}</strong></div>
        <div><span>DXY score</span><strong>{snapshot.dxyScore === null ? "Unavailable" : `${snapshot.dxyScore > 0 ? "+" : ""}${snapshot.dxyScore.toFixed(1)} / 10`}</strong></div>
        <div><span>Current bias</span><strong>{snapshot.dxyPlay.bias}</strong></div>
        <div><span>Today&apos;s post target</span><strong>{settings.dailyPostTarget}</strong></div>
        <div><span>Reply opportunities</span><strong>{replies.filter((reply) => reply.status === "new").length} / {settings.dailyReplyTarget}</strong></div>
        <div><span>Writing engine</span><strong>{aiConfigured && settings.aiEnabled ? "AI + safety fallback" : "Adaptive fallback"}</strong></div>
      </section>

      {message ? <p className="marketing-message" role="status">{message}</p> : null}

      <section className="admin-panel">
        <div className="panel-heading"><div><span className="eyebrow">Daily workflow</span><h2>Today&apos;s X Growth Plan</h2></div><BarChart3 size={20} /></div>
        <div className="growth-plan">
          {dailyPlan.map((item) => (
            <article key={item.id}>
              <div><span>{item.contentType}</span><time>{item.timeWindow}</time></div>
              <h3>{item.topic}</h3><p>{item.draftText}</p>
              <small>{item.reason}</small><strong>{item.goal}</strong>
              {item.contentType !== "reply" && item.contentType !== "image" && item.contentType !== "video" ? (
                <button type="button" onClick={() => {
                  setContentType(item.contentType as XContentType);
                  setTopic(item.topic);
                  document.getElementById("marketing-generate")?.scrollIntoView({ behavior: "smooth" });
                }}>Prepare this post</button>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section className="admin-panel" id="marketing-generate">
        <div className="panel-heading"><div><span className="eyebrow">Adaptive generation</span><h2>Generate three X variations</h2></div><Sparkles size={20} /></div>
        <div className="generate-grid">
          <label>Content type<select value={contentType} onChange={(event) => setContentType(event.target.value as XContentType)}>{X_CONTENT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label>Topic<select value={topic} onChange={(event) => setTopic(event.target.value)}>{MARKETING_TOPIC_BANK.map((item) => <option key={item}>{item}</option>)}</select></label>
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
            <div className="panel-heading"><div><span className="eyebrow">Three variations</span><h2>{active.topic}</h2></div><span className={`draft-status ${active.status}`}>{active.status}</span></div>
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
            <div className="improve-actions">{improvements.map(([action, label]) => <button type="button" key={action} onClick={() => improve(action)} disabled={Boolean(busy)}>{label}</button>)}</div>
            <div className="draft-actions">
              <button type="button" onClick={() => patchDraft({ textContent: editorText }, "Edits saved as a new version.")}><Save size={15} /> Save edits</button>
              <button type="button" onClick={duplicateDraft}><RefreshCw size={15} /> Duplicate</button>
              <button type="button" onClick={() => copy(editorText)}><Clipboard size={15} /> Copy for X</button>
              <button type="button" onClick={() => patchDraft({ status: "ready" }, "Draft marked ready.")}><Check size={15} /> Mark ready</button>
              <button type="button" onClick={() => patchDraft({ status: "posted" }, "Marked as manually posted.")}><Check size={15} /> Mark posted</button>
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

      {active && card && video ? (
        <section className="admin-panel">
          <div className="panel-heading"><div><span className="eyebrow">Visual studio</span><h2>Image and 30-second video</h2></div><ImageIcon size={20} /></div>
          <label>Image card type<select value={imageType} onChange={(event) => setImageType(event.target.value)}>{imageTypes.map((item) => <option key={item}>{item}</option>)}</select></label>
          <div className="media-grid">
            <div>
              <div className="x-card-scale"><div className="x-card export-card" ref={previewCardRef}>
                <div className="x-card-top"><span>MACRO FX MONITOR</span><span>{active.snapshotDate}</span></div>
                <div className="x-card-signal"><div><small>{imageType.toUpperCase()}</small><strong>{card.score}</strong></div><h3>{card.bias}</h3></div>
                <div className="x-card-drivers"><small>WHAT MATTERS</small>{card.drivers.map((driver) => <p key={driver}>{driver}</p>)}</div>
                <div className="x-card-scenarios"><p><b>Confirmation:</b> {card.confirmation}</p><p><b>Invalidation:</b> {card.invalidation}</p></div>
                <div className="x-card-footer"><span>{card.snapshotUrl}</span><span>{DISCLAIMER}</span></div>
              </div></div>
              <div className="draft-actions"><button type="button" onClick={downloadCard} disabled={busy === "image"}><Download size={15} /> Download 1600 x 900 PNG</button><button type="button" onClick={() => copy(editorText)}><Clipboard size={15} /> Copy paired post</button></div>
            </div>
            <div>
              <div className="video-preview">
                <div className="video-progress">{[0, 1, 2, 3, 4].map((item) => <button type="button" aria-label={`Show video scene ${item + 1}`} onClick={() => setVideoSlide(item)} className={item <= videoSlide ? "active" : ""} key={item} />)}</div>
                <div className="video-slide">{videoSlides[videoSlide]}</div>
              </div>
              <label className="draft-notes">Voiceover script<textarea readOnly value={video.voiceoverScript} /></label>
              <div className="draft-actions"><button type="button" onClick={() => copy(video.voiceoverScript)}><Clipboard size={15} /> Copy voiceover</button><button type="button" onClick={downloadVideoConfig}><Download size={15} /> Download JSON config</button></div>
              <p className="media-note"><Film size={14} /> MP4 rendering remains local with <code>npm run video:render</code>. JSON is configuration, not a video.</p>
            </div>
          </div>
          <div className="export-card-host" aria-hidden="true"><div className="x-card export-card full-size" ref={exportCardRef}>
            <div className="x-card-top"><span>MACRO FX MONITOR</span><span>{active.snapshotDate}</span></div>
            <div className="x-card-signal"><div><small>{imageType.toUpperCase()}</small><strong>{card.score}</strong></div><h3>{card.bias}</h3></div>
            <div className="x-card-drivers"><small>WHAT MATTERS</small>{card.drivers.map((driver) => <p key={driver}>{driver}</p>)}</div>
            <div className="x-card-scenarios"><p><b>Confirmation:</b> {card.confirmation}</p><p><b>Invalidation:</b> {card.invalidation}</p></div>
            <div className="x-card-footer"><span>{card.snapshotUrl}</span><span>{DISCLAIMER}</span></div>
          </div></div>
        </section>
      ) : null}

      <section className="admin-panel">
        <div className="panel-heading"><div><span className="eyebrow">Search and tracking</span><h2>Draft Library</h2></div><Search size={20} /></div>
        <div className="library-filters">
          <input value={draftSearch} onChange={(event) => setDraftSearch(event.target.value)} placeholder="Search title, topic, or copy" />
          <select value={draftType} onChange={(event) => setDraftType(event.target.value)}><option value="all">All content types</option>{X_CONTENT_OPTIONS.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select>
          <select value={draftStatus} onChange={(event) => setDraftStatus(event.target.value)}><option value="all">All statuses</option><option value="draft">Draft</option><option value="ready">Ready</option><option value="posted">Posted</option></select>
        </div>
        <div className="draft-library">{filteredDrafts.map((draft) => (
          <article className={active?.id === draft.id ? "active" : ""} key={draft.id}>
            <button type="button" className="draft-open" onClick={() => selectDraft(draft)}><span>{draft.contentType} | {draft.topic}</span><strong>{draft.title}</strong><small>{new Date(draft.createdAt).toLocaleString()} | v{draft.versionNumber}{draft.copiedAt ? " | copied" : ""}{draft.manuallyPostedAt ? " | posted" : ""}</small></button>
            <span className={`draft-status ${draft.status}`}>{draft.status}</span>
            <button type="button" title="Copy" onClick={() => copy(fullCopy(draft), draft)}><Clipboard size={14} /></button>
            <button type="button" title="Delete" onClick={() => removeDraft(draft)}><Trash2 size={14} /></button>
          </article>
        ))}</div>
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
