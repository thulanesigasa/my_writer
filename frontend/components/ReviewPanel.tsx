"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, RotateCcw, XCircle, Loader2 } from "lucide-react";

interface Props {
  payload: Record<string, unknown>;
  onSubmit: (decision: string, notes: string) => Promise<void>;
}

export default function ReviewPanel({ payload, onSubmit }: Props) {
  const [decision, setDecision] = useState<"approve" | "revise" | "reject" | "">("");
  const [notes, setNotes]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleSubmit() {
    if (!decision) return;
    setLoading(true);
    try {
      await onSubmit(decision, notes);
    } finally {
      setLoading(false);
    }
  }

  const chapterNum = payload.chapter_number as number;
  const wordCount  = payload.word_count as number;
  const preview    = payload.draft_preview as string;
  const node       = payload.current_node as string;

  const actions = [
    {
      id:    "approve" as const,
      label: "Approve & Continue",
      desc:  "Accept the draft, summarise, prune, and proceed to the next chapter.",
      icon:  CheckCircle2,
      color: "var(--color-success)",
      bg:    "rgba(52, 211, 153, 0.08)",
      border:"rgba(52, 211, 153, 0.3)",
    },
    {
      id:    "revise" as const,
      label: "Request Revision",
      desc:  "Keep the draft but ask the AI to revise with your notes.",
      icon:  RotateCcw,
      color: "var(--color-warning)",
      bg:    "rgba(245, 158, 11, 0.08)",
      border:"rgba(245, 158, 11, 0.3)",
    },
    {
      id:    "reject" as const,
      label: "Reject & Restart",
      desc:  "Discard this draft entirely and re-generate from scratch.",
      icon:  XCircle,
      color: "var(--color-error)",
      bg:    "rgba(248, 113, 113, 0.08)",
      border:"rgba(248, 113, 113, 0.3)",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className="absolute inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "rgba(10,10,15,0.85)", backdropFilter: "blur(12px)" }}
    >
      <div className="glass-card w-full max-w-2xl p-8 overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div
            className="badge badge-waiting pulse-glow"
            style={{ fontSize: "0.75rem", padding: "5px 14px" }}
          >
            Human Review Required
          </div>
          <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            {node === "context_summariser"
              ? `Chapter ${chapterNum} · ${wordCount?.toLocaleString()} words drafted`
              : node}
          </span>
        </div>

        <h2 className="text-xl font-bold mb-1">
          Review Chapter {chapterNum}
        </h2>
        <p className="text-sm mb-6" style={{ color: "var(--color-text-secondary)" }}>
          The AI has completed a chapter draft. Review the preview below and make a decision.
        </p>

        {/* Preview */}
        <div
          className="rounded-xl p-5 mb-6 overflow-y-auto"
          style={{
            background: "var(--color-bg-elevated)",
            border: "1px solid var(--color-border)",
            maxHeight: "220px",
          }}
        >
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--color-text-muted)" }}>
            Draft Preview
          </p>
          <p className="prose-output text-sm" style={{ fontSize: "0.88rem", lineHeight: 1.75 }}>
            {preview}
          </p>
        </div>

        {/* Decision options */}
        <div className="flex flex-col gap-3 mb-6">
          {actions.map((a) => (
            <button
              key={a.id}
              id={`review-${a.id}`}
              type="button"
              onClick={() => setDecision(a.id)}
              className="flex items-start gap-4 p-4 rounded-xl text-left transition-all"
              style={{
                background: decision === a.id ? a.bg : "transparent",
                border: `1px solid ${decision === a.id ? a.border : "var(--color-border)"}`,
              }}
            >
              <a.icon size={18} style={{ color: a.color, flexShrink: 0, marginTop: 2 }} />
              <div>
                <p className="font-semibold text-sm mb-0.5" style={{ color: a.color }}>
                  {a.label}
                </p>
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {a.desc}
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* Revision notes */}
        {decision === "revise" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mb-6"
          >
            <label
              htmlFor="revision-notes"
              className="block text-sm font-medium mb-2"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Revision Instructions
            </label>
            <textarea
              id="revision-notes"
              className="textarea-field"
              rows={3}
              placeholder="What should the AI change? Be specific about tone, events, pacing…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </motion.div>
        )}

        {/* Submit */}
        <button
          id="btn-submit-review"
          onClick={handleSubmit}
          disabled={!decision || loading}
          className="btn-primary w-full justify-center py-3.5"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Submitting…
            </>
          ) : (
            "Submit Decision & Resume"
          )}
        </button>
      </div>
    </motion.div>
  );
}
