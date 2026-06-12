"use client";

import { useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import {
  CalendarDays,
  Check,
  Clipboard,
  Download,
  Film,
  ImageIcon,
  LoaderCircle,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import { DISCLAIMER, X_CONTENT_OPTIONS } from "@/lib/marketing-config";
import type { MacroSnapshot, MarketingDraft, MarketingDraftStatus, XContentType } from "@/types";

const schedule: Array<{ day: string; type: XContentType; label: string }> = [
  { day: "Monday", type: "single", label: "DXY regime update" },
  { day: "Tuesday", type: "driver", label: "Top driver breakdown" },
  { day: "Wednesday", type: "educational", label: "Educational macro concept" },
  { day: "Thursday", type: "contrarian", label: "Confirmation / invalidation" },
  { day: "Friday", type: "weekly-recap", label: "Weekly recap" },
];

function fullCopy(draft: MarketingDraft) {
  return draft.threadPosts.length ? draft.threadPosts.join("\n\n") : draft.textContent;
}

function statusFor(type: XContentType, drafts: MarketingDraft[]) {
  return drafts.find((draft) => draft.contentType === type)?.status ?? "draft";
}

export function MarketingWorkspace({
  snapshot,
  initialDrafts,
}: {
  snapshot: MacroSnapshot;
  initialDrafts: MarketingDraft[];
}) {
  const [contentType, setContentType] = useState<XContentType>("single");
  const [drafts, setDrafts] = useState(initialDrafts);
  const [active, setActive] = useState<MarketingDraft | null>(initialDrafts[0] ?? null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [videoSlide, setVideoSlide] = useState(0);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const nextPost = schedule[Math.min(new Date().getDay() - 1, 4)] ?? schedule[0];
  const lastDraft = drafts[0];
  const selectedDraft = active ?? drafts.find((draft) => draft.contentType === contentType) ?? null;

  const weekDates = useMemo(() => {
    const now = new Date();
    const monday = new Date(now);
    const day = now.getDay() || 7;
    monday.setDate(now.getDate() - day + 1);
    return schedule.map((item, index) => ({
      ...item,
      date: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + index)
        .toISOString()
        .slice(0, 10),
    }));
  }, []);

  async function generate() {
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/admin/marketing/drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentType }),
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage(data.error ?? "Content could not be generated.");
      return;
    }
    setDrafts((current) => [data.draft, ...current]);
    setActive(data.draft);
    setMessage("Draft generated and saved.");
  }

  async function copy(value: string, label = "Copied for X.") {
    await navigator.clipboard.writeText(value);
    setMessage(label);
  }

  async function changeStatus(draft: MarketingDraft, status: MarketingDraftStatus) {
    const response = await fetch(`/api/admin/marketing/drafts/${draft.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, notes: draft.notes }),
    });
    const data = await response.json();
    if (!response.ok) return setMessage(data.error ?? "Draft could not be updated.");
    setDrafts((current) => current.map((item) => item.id === draft.id ? data.draft : item));
    setActive(data.draft);
    setMessage(status === "posted" ? "Marked as manually posted." : "Draft status updated.");
  }

  function updateNotes(notes: string) {
    if (!selectedDraft) return;
    const updated = { ...selectedDraft, notes };
    setActive(updated);
    setDrafts((current) => current.map((item) => item.id === updated.id ? updated : item));
  }

  async function removeDraft(draft: MarketingDraft) {
    const response = await fetch(`/api/admin/marketing/drafts/${draft.id}`, { method: "DELETE" });
    if (!response.ok) return setMessage("Draft could not be deleted.");
    setDrafts((current) => current.filter((item) => item.id !== draft.id));
    setActive(null);
    setMessage("Draft deleted.");
  }

  async function downloadCard() {
    if (!cardRef.current || !selectedDraft) return;
    const dataUrl = await toPng(cardRef.current, {
      width: 1600,
      height: 900,
      pixelRatio: 1,
      backgroundColor: "#08101b",
    });
    const link = document.createElement("a");
    link.download = `macro-fx-monitor-${selectedDraft.snapshotDate}.png`;
    link.href = dataUrl;
    link.click();
    setMessage("PNG downloaded.");
  }

  function playVideo() {
    if (videoPlaying) return;
    setVideoPlaying(true);
    setVideoSlide(0);
    let slide = 0;
    const timer = window.setInterval(() => {
      slide += 1;
      if (slide >= 5) {
        window.clearInterval(timer);
        setVideoPlaying(false);
        setVideoSlide(0);
      } else {
        setVideoSlide(slide);
      }
    }, 4000);
  }

  function downloadVideoConfig() {
    if (!selectedDraft) return;
    const blob = new Blob([JSON.stringify(selectedDraft.videoConfig, null, 2)], {
      type: "application/json",
    });
    const link = document.createElement("a");
    link.download = `macro-fx-video-${selectedDraft.snapshotDate}.json`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
    setMessage("Video render configuration downloaded.");
  }

  const video = selectedDraft?.videoConfig;
  const videoSlides = video ? [
    <><small>MACRO FX MONITOR</small><h3>DXY Regime Update</h3><p>{video.snapshotDate}</p></>,
    <><small>MODEL SIGNAL</small><strong>{video.score}</strong><h3>{video.bias}</h3></>,
    <><small>TOP MACRO DRIVERS</small>{video.drivers.map((driver) => <p key={driver}>{driver}</p>)}</>,
    <><small>SCENARIO CHECK</small><p><b>Confirm:</b> {video.confirmation}</p><p><b>Invalidate:</b> {video.invalidation}</p></>,
    <><small>FULL SNAPSHOT</small><h3>{video.snapshotUrl}</h3><p>{DISCLAIMER}</p></>,
  ] : [];

  return (
    <div className="marketing-workspace">
      <section className="marketing-summary">
        <div><span>Latest snapshot</span><strong>{snapshot.periodEnd}</strong></div>
        <div><span>DXY score</span><strong>{snapshot.dxyScore === null ? "Unavailable" : `${snapshot.dxyScore > 0 ? "+" : ""}${snapshot.dxyScore.toFixed(1)} / 10`}</strong></div>
        <div><span>Current bias</span><strong>{snapshot.dxyPlay.bias}</strong></div>
        <div><span>Last draft</span><strong>{lastDraft ? new Date(lastDraft.createdAt).toLocaleString() : "None saved"}</strong></div>
        <div><span>Next suggested</span><strong>{nextPost.label}</strong></div>
      </section>

      <section className="admin-panel generate-panel">
        <div className="panel-heading">
          <div><span className="eyebrow">Generate content</span><h2>Prepare the next X post</h2></div>
          <span className="manual-badge">Manual publishing only</span>
        </div>
        <div className="generate-controls">
          <label>
            Content type
            <select value={contentType} onChange={(event) => setContentType(event.target.value as XContentType)}>
              {X_CONTENT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <button type="button" onClick={generate} disabled={busy}>
            {busy ? <LoaderCircle className="spin" size={16} /> : <RefreshCw size={16} />}
            {selectedDraft?.contentType === contentType ? "Regenerate" : "Generate content"}
          </button>
        </div>
        {message ? <p className="marketing-message" role="status">{message}</p> : null}
      </section>

      {selectedDraft ? (
        <>
          <section className="admin-panel">
            <div className="panel-heading">
              <div><span className="eyebrow">Text preview</span><h2>{selectedDraft.title}</h2></div>
              <span className={`draft-status ${selectedDraft.status}`}>{selectedDraft.status}</span>
            </div>
            {selectedDraft.threadPosts.length ? (
              <div className="thread-preview">
                {selectedDraft.threadPosts.map((post, index) => (
                  <article key={post}>
                    <div><span>Post {index + 1}/4</span><small>{post.length}/280</small></div>
                    <p>{post}</p>
                    <button type="button" onClick={() => copy(post)}><Clipboard size={14} /> Copy post</button>
                  </article>
                ))}
              </div>
            ) : (
              <article className="single-post-preview">
                <div><span>X post</span><small>{selectedDraft.textContent.length}/280</small></div>
                <p>{selectedDraft.textContent}</p>
              </article>
            )}
            <div className="draft-actions">
              <button type="button" onClick={() => copy(fullCopy(selectedDraft))}><Clipboard size={15} /> {selectedDraft.threadPosts.length ? "Copy full thread" : "Copy post"}</button>
              <button type="button" onClick={() => changeStatus(selectedDraft, "draft")}><Save size={15} /> Save draft</button>
              <button type="button" onClick={() => changeStatus(selectedDraft, "ready")}><Save size={15} /> Save as ready</button>
              <button type="button" onClick={() => changeStatus(selectedDraft, "posted")}><Check size={15} /> Mark posted</button>
            </div>
            <label className="draft-notes">
              Private notes
              <textarea
                value={selectedDraft.notes}
                onChange={(event) => updateNotes(event.target.value)}
                placeholder="Add a hook variation, timing note, or manual posting reminder."
                maxLength={2000}
              />
            </label>
          </section>

          <section className="media-grid">
            <div className="admin-panel">
              <div className="panel-heading"><div><span className="eyebrow">Visual card</span><h2>X image preview</h2></div><ImageIcon size={20} /></div>
              <div className="x-card-scale">
                <div className="x-card" ref={cardRef}>
                  <div className="x-card-top"><span>MACRO FX MONITOR</span><span>{selectedDraft.snapshotDate}</span></div>
                  <div className="x-card-signal"><div><small>DXY SCORE</small><strong>{selectedDraft.imageCardData.score}</strong></div><h3>{selectedDraft.imageCardData.bias}</h3></div>
                  <div className="x-card-drivers"><small>TOP MACRO DRIVERS</small>{selectedDraft.imageCardData.drivers.map((driver) => <p key={driver}>{driver}</p>)}</div>
                  <div className="x-card-scenarios"><p><b>Confirmation:</b> {selectedDraft.imageCardData.confirmation}</p><p><b>Invalidation:</b> {selectedDraft.imageCardData.invalidation}</p></div>
                  <div className="x-card-footer"><span>{selectedDraft.imageCardData.snapshotUrl}</span><span>{DISCLAIMER}</span></div>
                </div>
              </div>
              <button className="media-button" type="button" onClick={downloadCard}><Download size={15} /> Download PNG</button>
            </div>

            <div className="admin-panel">
              <div className="panel-heading"><div><span className="eyebrow">Video template</span><h2>20-second animated preview</h2></div><Film size={20} /></div>
              <div className="video-preview">
                <div className="video-progress">{[0, 1, 2, 3, 4].map((item) => <span className={item <= videoSlide ? "active" : ""} key={item} />)}</div>
                <div className="video-slide" key={videoSlide}>{videoSlides[videoSlide]}</div>
              </div>
              <div className="draft-actions">
                <button type="button" onClick={playVideo} disabled={videoPlaying}><Film size={15} /> {videoPlaying ? "Playing..." : "Generate preview"}</button>
                <button type="button" onClick={downloadVideoConfig}><Download size={15} /> Download render config</button>
              </div>
              <p className="media-note">MP4 rendering is intentionally local for now; Vercel does not provide a reliable long-running video renderer.</p>
            </div>
          </section>
        </>
      ) : null}

      <section className="admin-panel">
        <div className="panel-heading"><div><span className="eyebrow">Weekly calendar</span><h2>Suggested X publishing plan</h2></div><CalendarDays size={20} /></div>
        <div className="marketing-calendar">
          {weekDates.map((item) => <div key={item.day}><time>{item.date}</time><strong>{item.day}</strong><span>{item.label}</span><em className={`draft-status ${statusFor(item.type, drafts)}`}>{statusFor(item.type, drafts)}</em></div>)}
        </div>
      </section>

      <section className="admin-panel">
        <div className="panel-heading"><div><span className="eyebrow">Draft library</span><h2>Saved X content</h2></div><span>{drafts.length} drafts</span></div>
        <div className="draft-library">
          {drafts.length ? drafts.map((draft) => (
            <article className={active?.id === draft.id ? "active" : ""} key={draft.id}>
              <button type="button" className="draft-open" onClick={() => setActive(draft)}>
                <span>{draft.contentType.replace("-", " ")}</span>
                <strong>{draft.title}</strong>
                <small>{new Date(draft.createdAt).toLocaleString()} | Snapshot {draft.snapshotDate}</small>
              </button>
              <span className={`draft-status ${draft.status}`}>{draft.status}</span>
              <button type="button" title="Copy" onClick={() => copy(fullCopy(draft))}><Clipboard size={14} /></button>
              <button type="button" title="Delete" onClick={() => removeDraft(draft)}><Trash2 size={14} /></button>
            </article>
          )) : <p className="empty-state">Generate your first X draft to start the library.</p>}
        </div>
      </section>
    </div>
  );
}
