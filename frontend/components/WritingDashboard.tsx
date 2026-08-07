"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, Play, CheckCircle2, Clock, AlertTriangle,
  ChevronRight, Loader2, FileText, Sparkles
} from "lucide-react";
import ReviewPanel from "@/components/ReviewPanel";

interface Session {
  sessionId: string;
  title: string;
  genre: string;
}

interface Props {
  session: Session;
}

type StreamStatus = "idle" | "streaming" | "hitl_pause" | "done" | "error";

interface PipelineEvent {
  node: string;
  timestamp: number;
}

const NODE_LABELS: Record<string, string> = {
  planner:            "Planning Outline",
  front_matter_writer:"Writing Front Matter",
  chapter_writer:     "Drafting Chapter",
  context_summariser: "Summarising Chapter",
  context_pruner:     "Pruning Context",
  human_review:       "Awaiting Your Review",
  back_matter_writer: "Writing Back Matter",
  router:             "Routing",
};

export default function WritingDashboard({ session }: Props) {
  const [status, setStatus]             = useState<StreamStatus>("idle");
  const [tokens, setTokens]             = useState("");
  const [currentNode, setCurrentNode]   = useState("");
  const [pipeline, setPipeline]         = useState<PipelineEvent[]>([]);
  const [wordCount, setWordCount]       = useState(0);
  const [hitlPayload, setHitlPayload]   = useState<Record<string, unknown> | null>(null);
  const [chapterNum, setChapterNum]     = useState(0);
  const [error, setError]               = useState("");

  const esRef       = useRef<EventSource | null>(null);
  const tokensRef   = useRef("");
  const outputRef   = useRef<HTMLDivElement>(null);

  // Auto-scroll prose output
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [tokens]);

  const startStream = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
    }

    setStatus("streaming");
    setError("");

    const es = new EventSource(
      `http://localhost:8000/api/stream/${session.sessionId}`
    );
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);

        if (msg.type === "token") {
          tokensRef.current += msg.content;
          setTokens(tokensRef.current);
          setWordCount(tokensRef.current.split(/\s+/).filter(Boolean).length);
        } else if (msg.type === "node_change") {
          const node = msg.node as string;
          setCurrentNode(node);
          setPipeline((prev) => [
            ...prev,
            { node, timestamp: Date.now() },
          ]);
        } else if (msg.type === "hitl_pause") {
          setHitlPayload(msg.payload);
          setChapterNum((msg.payload as Record<string, number>).chapter_number ?? 0);
          setStatus("hitl_pause");
          es.close();
        } else if (msg.type === "done") {
          setStatus("done");
          es.close();
        } else if (msg.type === "error") {
          setError(msg.message);
          setStatus("error");
          es.close();
        }
      } catch {
        /* ignore parse errors */
      }
    };

    es.onerror = () => {
      setError("Connection lost. The backend may have stopped.");
      setStatus("error");
      es.close();
    };
  }, [session.sessionId]);

  useEffect(() => {
    return () => {
      esRef.current?.close();
    };
  }, []);

  async function handleReviewSubmit(decision: string, notes: string) {
    await fetch(`http://localhost:8000/api/review/${session.sessionId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, revision_notes: notes }),
    });

    setHitlPayload(null);
    // Clear working draft on approve/reject; keep on revise
    if (decision !== "revise") {
      tokensRef.current = "";
      setTokens("");
      setWordCount(0);
    }
    // Resume stream
    startStream();
  }

  const statusConfig = {
    idle:       { label: "Ready",     color: "var(--color-text-muted)",       icon: Clock },
    streaming:  { label: "Writing…",  color: "var(--color-success)",           icon: Loader2 },
    hitl_pause: { label: "Your turn", color: "var(--color-accent-primary)",    icon: AlertTriangle },
    done:       { label: "Complete",  color: "var(--color-success)",           icon: CheckCircle2 },
    error:      { label: "Error",     color: "var(--color-error)",             icon: AlertTriangle },
  }[status];

  const StatusIcon = statusConfig.icon;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--color-bg-base)" }}>
      {/* ── Top bar ── */}
      <header
        className="flex items-center justify-between px-8 py-4 border-b"
        style={{
          borderColor: "var(--color-border)",
          background: "rgba(18,18,26,0.8)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #7c5cfc, #e879f9)" }}
          >
            <BookOpen size={14} color="white" />
          </div>
          <div>
            <p className="font-semibold text-sm">{session.title}</p>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              {session.genre} · Session {session.sessionId.slice(0, 8)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{
              background: "rgba(18,18,26,0.8)",
              border: "1px solid var(--color-border)",
              color: statusConfig.color,
            }}
          >
            <StatusIcon
              size={12}
              className={status === "streaming" ? "animate-spin" : ""}
            />
            {statusConfig.label}
          </div>

          {/* Word count */}
          <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            {wordCount.toLocaleString()} words
          </span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Left sidebar — pipeline ── */}
        <aside
          className="w-64 flex-shrink-0 border-r overflow-y-auto p-4"
          style={{
            borderColor: "var(--color-border)",
            background: "var(--color-bg-surface)",
          }}
        >
          <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "var(--color-text-muted)" }}>
            Pipeline
          </p>

          <div className="flex flex-col gap-1">
            {Object.entries(NODE_LABELS).map(([node, label]) => {
              const wasVisited = pipeline.some((e) => e.node === node);
              const isActive   = currentNode === node && status === "streaming";
              return (
                <motion.div
                  key={node}
                  className={`pipeline-node ${isActive ? "active" : wasVisited ? "done" : ""}`}
                  animate={isActive ? { x: [0, 2, 0] } : {}}
                  transition={{ repeat: Infinity, duration: 1.2 }}
                >
                  {isActive ? (
                    <Loader2 size={12} className="animate-spin flex-shrink-0" style={{ color: "var(--color-accent-primary)" }} />
                  ) : wasVisited ? (
                    <CheckCircle2 size={12} className="flex-shrink-0" style={{ color: "var(--color-success)" }} />
                  ) : (
                    <div
                      className="w-3 h-3 rounded-full border flex-shrink-0"
                      style={{ borderColor: "var(--color-border)" }}
                    />
                  )}
                  <span style={{ fontSize: "0.78rem" }}>{label}</span>
                </motion.div>
              );
            })}
          </div>

          {/* Pipeline log */}
          {pipeline.length > 0 && (
            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--color-text-muted)" }}>
                Event Log
              </p>
              <div className="flex flex-col gap-1.5">
                {pipeline.slice(-8).map((e, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-text-muted)" }}>
                    <ChevronRight size={10} />
                    <span style={{ fontSize: "0.7rem" }}>
                      {NODE_LABELS[e.node] ?? e.node}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* ── Main content ── */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Start button (idle) */}
          {status === "idle" && (
            <motion.div
              className="flex-1 flex flex-col items-center justify-center gap-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="text-center">
                <Sparkles size={48} style={{ color: "var(--color-accent-primary)", margin: "0 auto 16px" }} />
                <h2 className="text-2xl font-bold mb-2">Book plan is ready</h2>
                <p style={{ color: "var(--color-text-secondary)", fontSize: "0.95rem" }}>
                  The AI has generated your chapter outline.<br />
                  Start streaming to begin prose generation.
                </p>
              </div>
              <button
                id="btn-start-generation"
                onClick={startStream}
                className="btn-primary px-12 py-4 text-lg"
              >
                <Play size={18} />
                Begin Writing
              </button>
            </motion.div>
          )}

          {/* Prose streaming area */}
          {(status === "streaming" || status === "done" || status === "error") && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Chapter header */}
              <div
                className="flex items-center gap-3 px-8 py-4 border-b"
                style={{ borderColor: "var(--color-border)" }}
              >
                <FileText size={16} style={{ color: "var(--color-accent-primary)" }} />
                <span className="font-semibold">
                  {currentNode === "front_matter_writer"
                    ? "Front Matter"
                    : currentNode === "back_matter_writer"
                    ? "Back Matter"
                    : chapterNum > 0
                    ? `Chapter ${chapterNum}`
                    : "Generating…"}
                </span>
                {status === "streaming" && (
                  <span className="text-xs ml-auto" style={{ color: "var(--color-text-muted)" }}>
                    Live streaming
                  </span>
                )}
                {status === "done" && (
                  <span className="badge badge-active ml-auto">Complete</span>
                )}
              </div>

              {/* Prose output */}
              <div
                id="prose-output"
                ref={outputRef}
                className="flex-1 overflow-y-auto px-12 py-8"
                style={{ background: "var(--color-bg-base)" }}
              >
                <div
                  className={`prose-output max-w-3xl mx-auto ${
                    status === "streaming" ? "typing-cursor" : ""
                  }`}
                >
                  {tokens || (
                    <span style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-inter)" }}>
                      Connecting to generation stream…
                    </span>
                  )}
                </div>
              </div>

              {/* Error bar */}
              <AnimatePresence>
                {status === "error" && error && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="px-8 py-4 m-4 rounded-xl text-sm"
                    style={{
                      background: "rgba(248,113,113,0.1)",
                      border: "1px solid rgba(248,113,113,0.3)",
                      color: "var(--color-error)",
                    }}
                  >
                    <strong>Error:</strong> {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Done state */}
              {status === "done" && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-center gap-4 py-8 border-t"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  <CheckCircle2 size={20} style={{ color: "var(--color-success)" }} />
                  <span className="font-semibold" style={{ color: "var(--color-success)" }}>
                    Book generation complete!
                  </span>
                </motion.div>
              )}
            </div>
          )}

          {/* HITL Review panel */}
          <AnimatePresence>
            {status === "hitl_pause" && hitlPayload && (
              <ReviewPanel
                payload={hitlPayload}
                onSubmit={handleReviewSubmit}
              />
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
