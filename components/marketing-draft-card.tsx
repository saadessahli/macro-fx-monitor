"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import type { MarketingDraft } from "@/types";

export function MarketingDraftCard({ draft }: { draft: MarketingDraft }) {
  const [copied, setCopied] = useState(false);

  async function copyDraft() {
    await navigator.clipboard.writeText(draft.body);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <article className="marketing-draft-card">
      <div className="marketing-draft-head">
        <div>
          <span>{draft.channel}</span>
          <h2>{draft.title}</h2>
          <p>{draft.note}</p>
        </div>
        <button type="button" onClick={copyDraft}>
          {copied ? <Check size={15} /> : <Copy size={15} />}
          {copied ? "Copied" : "Copy for X"}
        </button>
      </div>
      <pre>{draft.body}</pre>
    </article>
  );
}
