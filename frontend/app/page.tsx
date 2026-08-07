"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── Zero icon imports — text-only UI ─────────────────────────────────────────

type PipelineStatus =
  | "idle"
  | "planning"
  | "waiting_for_approval"
  | "researching"
  | "drafting"
  | "summarizing"
  | "compiling"
  | "completed";

type ViewTab = "all" | "in_progress" | "completed";

interface SubSectionTask {
  sub_section_id?: string;
  chapter_number?: number;
  title: string;
  target_word_count?: number;
  one_sentence_summary?: string;
  writing_directive?: string;
  status?: "pending" | "in_progress" | "completed";
}

// ── 60-30-10 design tokens ────────────────────────────────────────────────────
// 60%  #F5F4F0  — warm off-white  — body background
// 30%  #FFFFFF  — pure white      — header, sidebar, cards
// 10%  #3730A3  — deep indigo     — CTAs, active states, accents

const BG_MAIN = "#F5F4F0";
const ACCENT = "#3730A3";

// ── Chapter cover gradients (text-based covers, no icons) ─────────────────────
const COVER_GRADIENTS: [string, string][] = [
  ["#3730A3", "#1D4ED8"],
  ["#0F4C81", "#1E3A5F"],
  ["#064E3B", "#065F46"],
  ["#7C2D12", "#92400E"],
  ["#831843", "#9F1239"],
  ["#1E1B4B", "#312E81"],
  ["#134E4A", "#0F766E"],
  ["#4C1D95", "#5B21B6"],
  ["#14532D", "#166534"],
  ["#1E3A5F", "#0284C7"],
];

// ── Tiny status dot (CSS only, no icon) ───────────────────────────────────────
function Dot({ status }: { status?: string }) {
  const color =
    status === "completed"
      ? "bg-emerald-500"
      : status === "in_progress"
      ? "bg-amber-400 animate-pulse"
      : "bg-stone-300";
  return <span className={`inline-block h-1.5 w-1.5 rounded-full flex-shrink-0 ${color}`} />;
}

// ── Section Cover — gradient bg + large watermark number + geometry ───────────
function SectionCover({ index }: { index: number }) {
  const [a, b] = COVER_GRADIENTS[index % COVER_GRADIENTS.length];
  const num = String(index + 1).padStart(2, "0");

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      style={{ background: `linear-gradient(145deg, ${a}, ${b})` }}
    >
      {/* Geometric SVG pattern — no icons, just shapes */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 200 160"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="170" cy="140" r="80" fill="white" opacity="0.05" />
        <circle cx="10"  cy="20"  r="45" fill="white" opacity="0.04" />
        {Array.from({ length: 7 }).map((_, i) => (
          <line key={`v${i}`} x1={i * 34} y1="0" x2={i * 34} y2="160"
            stroke="white" strokeWidth="0.4" opacity="0.12" />
        ))}
        {Array.from({ length: 6 }).map((_, i) => (
          <line key={`h${i}`} x1="0" y1={i * 30} x2="200" y2={i * 30}
            stroke="white" strokeWidth="0.4" opacity="0.08" />
        ))}
      </svg>

      {/* Watermark number */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span
          className="font-black text-white leading-none select-none tabular-nums"
          style={{ fontSize: "5.5rem", opacity: 0.09 }}
        >
          {num}
        </span>
      </div>

      {/* Bottom label strip */}
      <div
        className="absolute bottom-0 left-0 right-0 px-4 py-2.5"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.38), transparent)" }}
      >
        <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-white/60 block">
          Section {num}
        </span>
      </div>
    </div>
  );
}

// ── Section Card ──────────────────────────────────────────────────────────────
function SectionCard({
  item, index, isReviewMode, onApprove, onProseClick,
}: {
  item: SubSectionTask;
  index: number;
  isReviewMode: boolean;
  onApprove?: () => void;
  onProseClick?: () => void;
}) {
  const wc = (item.target_word_count ?? 1200).toLocaleString();
  const isActive = isReviewMode && item.status === "in_progress";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={`bg-white rounded-xl border flex flex-col overflow-hidden transition-all duration-200 hover:shadow-md ${
        isActive
          ? "border-indigo-700 ring-2 ring-indigo-100 shadow-md"
          : "border-stone-200 shadow-sm"
      }`}
    >
      {/* Cover */}
      <div className="relative h-36 flex-shrink-0">
        <SectionCover index={index} />

        {/* Status badge — text only */}
        <div className="absolute top-3 right-3">
          {item.status === "completed" ? (
            <span className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[9px] font-bold uppercase tracking-widest">
              Done
            </span>
          ) : item.status === "in_progress" ? (
            <span className="px-2 py-0.5 rounded bg-amber-500 text-white text-[9px] font-bold uppercase tracking-widest">
              Live
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded bg-black/20 backdrop-blur-sm text-white/80 text-[9px] font-semibold uppercase tracking-widest">
              Queue
            </span>
          )}
        </div>

        {/* View prose shortcut */}
        {(item.status === "completed" || item.status === "in_progress") && onProseClick && (
          <button
            onClick={onProseClick}
            className="absolute bottom-3 right-3 px-2 py-0.5 rounded bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white text-[9px] font-semibold uppercase tracking-widest transition"
          >
            View
          </button>
        )}
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="text-sm font-semibold text-stone-900 leading-snug line-clamp-2 mb-1.5">
          {item.title}
        </h3>
        {item.one_sentence_summary && (
          <p className="text-[11px] text-stone-400 leading-relaxed line-clamp-2 mb-3">
            {item.one_sentence_summary}
          </p>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-2 mt-auto mb-3 text-[10px] text-stone-400">
          <Dot status={item.status} />
          <span className="capitalize">{item.status ?? "pending"}</span>
          <span className="ml-auto font-mono">{wc} words</span>
        </div>

        {/* CTA — text only, no icons */}
        {isActive && onApprove ? (
          <button
            onClick={onApprove}
            className="w-full py-2 rounded-lg text-white font-bold text-[10px] uppercase tracking-widest transition"
            style={{ background: ACCENT }}
          >
            Approve &amp; Draft
          </button>
        ) : item.status === "completed" ? (
          <div className="w-full py-2 rounded-lg bg-stone-50 border border-stone-100 text-emerald-600 font-semibold text-[10px] uppercase tracking-widest text-center">
            Complete
          </div>
        ) : item.status === "in_progress" ? (
          <div className="w-full py-2 rounded-lg bg-amber-50 border border-amber-100 text-amber-600 font-semibold text-[10px] uppercase tracking-widest text-center">
            Drafting
          </div>
        ) : (
          <div className="w-full py-2 rounded-lg bg-stone-50 border border-stone-100 text-stone-400 font-medium text-[10px] uppercase tracking-widest text-center">
            Queued
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus>("idle");
  const [statusMessage, setStatusMessage]   = useState("Ready to draft");
  const [currentNode, setCurrentNode]       = useState<string>("idle");
  const [sessionId, setSessionId]           = useState<string | null>(null);
  const [plan, setPlan]                     = useState<SubSectionTask[]>([]);
  const [currentTaskTitle, setCurrentTaskTitle] = useState<string>("");
  const [streamedProse, setStreamedProse]   = useState<string>("");
  const [pastSummaries, setPastSummaries]   = useState<string[]>([]);
  const [wordCount, setWordCount]           = useState<number>(0);
  const [errorMessage, setErrorMessage]     = useState<string | null>(null);
  const [editableTaskTitle, setEditableTaskTitle] = useState<string>("");
  const [editableDirective, setEditableDirective] = useState<string>("");
  const [bookTitle, setBookTitle]           = useState("The Power of Instinct");
  const [genre, setGenre]                   = useState("Popular Neuroscience & Leadership");
  const [premise, setPremise]               = useState("Instinct is not the enemy of good thinking — it is the compressed intelligence of lived experience.");
  const [showConfig, setShowConfig]         = useState(false);
  const [viewTab, setViewTab]               = useState<ViewTab>("all");
  const [searchQuery, setSearchQuery]       = useState("");
  const [showProseView, setShowProseView]   = useState(false);

  const abortRef  = useRef<AbortController | null>(null);
  const proseEnd  = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (pipelineStatus === "drafting" && proseEnd.current) {
      proseEnd.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [streamedProse, pipelineStatus]);

  useEffect(() => {
    setWordCount(streamedProse.trim().split(/\s+/).filter(Boolean).length);
  }, [streamedProse]);

  // ── SSE stream reader ───────────────────────────────────────────────────────
  async function readSSEStream(response: Response) {
    if (!response.body) return;
    const reader  = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer    = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const t = line.trim();
        if (!t.startsWith("data: ")) continue;
        try {
          const d = JSON.parse(t.slice(6));
          if (d.session_id && !sessionId) setSessionId(d.session_id);

          if (d.type === "status") {
            setStatusMessage(d.message || d.status);
            if (d.current_node) {
              setCurrentNode(d.current_node);
              if (d.current_node === "plan_step")    setPipelineStatus("planning");
              else if (d.current_node === "research_step") setPipelineStatus("researching");
              else if (d.current_node === "execute_step")  setPipelineStatus("drafting");
              else if (d.current_node === "replan_step")   setPipelineStatus("summarizing");
              else if (["front_matter_step","back_matter_step","compile_book_step"].includes(d.current_node))
                setPipelineStatus("compiling");
            }
          }
          else if (d.type === "plan" && Array.isArray(d.plan)) {
            const p: SubSectionTask[] = d.plan.map((it: any, idx: number) => ({
              sub_section_id: it.sub_section_id || `sub-${idx}`,
              title: it.title || `Section ${idx + 1}`,
              one_sentence_summary: it.one_sentence_summary || "",
              writing_directive: it.writing_directive || "",
              target_word_count: it.target_word_count || 1200,
              status: idx === 0 ? "in_progress" : "pending",
            }));
            setPlan(p);
            if (p[0]) {
              setCurrentTaskTitle(p[0].title);
              setEditableTaskTitle(p[0].title);
              setEditableDirective(p[0].writing_directive || "");
            }
          }
          else if (d.type === "hitl_pause") {
            setPipelineStatus("waiting_for_approval");
            setStatusMessage("Paused — review required");
            if (d.thread_id) setSessionId(d.thread_id);
            if (d.target_task) setCurrentTaskTitle(d.target_task);
            if (d.plan?.[0]) {
              setEditableTaskTitle(d.plan[0].title || "");
              setEditableDirective(d.plan[0].writing_directive || "");
            }
          }
          else if (d.type === "token") {
            setPipelineStatus("drafting");
            setStreamedProse(prev => prev + d.content);
            if (d.sub_section) {
              setCurrentTaskTitle(d.sub_section);
              setPlan(prev =>
                prev.map(p => p.title === d.sub_section ? { ...p, status: "in_progress" } : p)
              );
            }
          }
          else if (d.type === "replan") {
            if (d.latest_summary) setPastSummaries(prev => [...prev, d.latest_summary]);
            if (d.next_task) {
              setCurrentTaskTitle(d.next_task);
              setEditableTaskTitle(d.next_task);
              setPlan(prev =>
                prev.map(p => {
                  if (p.status === "in_progress") return { ...p, status: "completed" };
                  if (p.title === d.next_task)    return { ...p, status: "in_progress" };
                  return p;
                })
              );
            }
          }
          else if (d.type === "done") {
            setPipelineStatus("completed");
            setStatusMessage("Book generation complete.");
            setPlan(prev => prev.map(p => ({ ...p, status: "completed" })));
          }
          else if (d.type === "error") {
            setErrorMessage(d.message);
            setPipelineStatus("idle");
          }
        } catch {}
      }
    }
  }

  // ── Actions ─────────────────────────────────────────────────────────────────
  async function startGeneration() {
    setPipelineStatus("planning");
    setErrorMessage(null);
    setStreamedProse("");
    setPastSummaries([]);
    setShowProseView(false);
    setPlan([]);
    setStatusMessage("Connecting...");
    abortRef.current = new AbortController();
    try {
      const res = await fetch("/api/write", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({ title: bookTitle, genre, premise,
          target_audience: "Leaders, Executives, and Personal Growth Seekers",
          total_chapters: 5 }),
        signal: abortRef.current.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await readSSEStream(res);
    } catch (e: any) {
      if (e.name !== "AbortError") { setErrorMessage(e.message); setPipelineStatus("idle"); }
    }
  }

  async function resumeGeneration(applyEdits = false) {
    if (!sessionId) return;
    setPipelineStatus("drafting");
    setErrorMessage(null);
    abortRef.current = new AbortController();
    let updatedPlan = plan;
    if (applyEdits && plan.length > 0) {
      updatedPlan = plan.map((p, i) =>
        i === 0 ? { ...p, title: editableTaskTitle || p.title, writing_directive: editableDirective || p.writing_directive } : p
      );
      setPlan(updatedPlan);
    }
    try {
      const res = await fetch("/api/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({ thread_id: sessionId, plan: updatedPlan, past_steps: pastSummaries }),
        signal: abortRef.current.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await readSSEStream(res);
    } catch (e: any) {
      if (e.name !== "AbortError") { setErrorMessage(e.message); setPipelineStatus("waiting_for_approval"); }
    }
  }

  function handleStop() {
    abortRef.current?.abort();
    setPipelineStatus("idle");
    setStatusMessage("Generation paused by user.");
  }

  // ── Derived values ───────────────────────────────────────────────────────────
  const completedCount   = plan.filter(p => p.status === "completed").length;
  const inProgressCount  = plan.filter(p => p.status === "in_progress").length;
  const pendingCount     = plan.filter(p => p.status === "pending").length;
  const progressPercent  = plan.length > 0 ? Math.round((completedCount / plan.length) * 100) : 0;
  const isRunning        = ["planning","researching","drafting","summarizing","compiling"].includes(pipelineStatus);

  const filteredPlan = plan.filter(p => {
    if (viewTab === "in_progress" && p.status === "pending")    return false;
    if (viewTab === "completed"   && p.status !== "completed")  return false;
    if (searchQuery && !p.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen font-sans flex flex-col selection:bg-indigo-100" style={{ backgroundColor: BG_MAIN }}>

      {/* ── HEADER ─────────────────────────────────────── 30% white */}
      <header className="h-16 bg-white border-b border-stone-200 sticky top-0 z-50 flex items-center gap-5 px-6 shadow-sm">
        {/* Wordmark */}
        <div className="shrink-0">
          <p className="text-sm font-black tracking-tight text-stone-900 leading-none uppercase">Scriptorium</p>
          <p className="text-[9px] font-medium text-stone-400 leading-none mt-0.5 uppercase tracking-widest">AI Book Writer</p>
        </div>

        {/* Search */}
        <div className="flex-1 max-w-xs mx-auto">
          <input
            type="text"
            placeholder="Search sections..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-stone-200 bg-stone-50 text-[12px] text-stone-700 placeholder-stone-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 transition"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-auto shrink-0">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="px-3 py-2 rounded-lg border border-stone-200 text-stone-500 hover:text-stone-800 hover:border-stone-300 text-[11px] font-semibold uppercase tracking-wide transition"
          >
            {showConfig ? "Close" : "Config"}
          </button>

          {pipelineStatus === "completed" && sessionId && (
            <a
              href={`http://localhost:8000/api/download/${sessionId}`}
              download
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] uppercase tracking-widest transition"
            >
              Download
            </a>
          )}

          {isRunning ? (
            <button
              onClick={handleStop}
              className="px-4 py-2 rounded-lg border border-rose-300 text-rose-500 font-bold text-[11px] uppercase tracking-widest hover:bg-rose-50 transition"
            >
              Pause
            </button>
          ) : pipelineStatus === "waiting_for_approval" ? (
            <button
              onClick={() => resumeGeneration(false)}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] uppercase tracking-widest transition"
            >
              Approve
            </button>
          ) : (
            <button
              onClick={startGeneration}
              className="px-5 py-2 rounded-lg text-white font-bold text-[11px] uppercase tracking-widest transition hover:opacity-90"
              style={{ backgroundColor: ACCENT }}
            >
              Generate
            </button>
          )}
        </div>
      </header>

      {/* ── CONFIG DRAWER ─────────────────────────────── 30% white */}
      <AnimatePresence>
        {showConfig && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-white border-b border-stone-200 overflow-hidden"
          >
            <div className="px-6 py-5 grid grid-cols-3 gap-5 max-w-4xl">
              {[
                { label: "Book Title", val: bookTitle, set: setBookTitle },
                { label: "Genre", val: genre, set: setGenre },
                { label: "Premise", val: premise, set: setPremise },
              ].map(({ label, val, set }) => (
                <div key={label}>
                  <label className="block text-[9px] font-bold uppercase tracking-[0.2em] text-stone-400 mb-1.5">
                    {label}
                  </label>
                  <input
                    value={val}
                    onChange={e => set(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ERROR BANNER ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mx-6 mt-4 px-5 py-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between text-sm text-rose-700"
          >
            <span>{errorMessage}</span>
            <button
              onClick={() => setErrorMessage(null)}
              className="ml-4 text-xs font-semibold text-rose-400 hover:text-rose-700 uppercase tracking-wide"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── BODY ──────────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── SIDEBAR ──────────────────────────── 30% white */}
        <aside className="w-56 shrink-0 bg-white border-r border-stone-100 hidden md:flex flex-col p-5 gap-6 overflow-y-auto">

          {/* Pipeline block */}
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-stone-400 mb-3">Pipeline</p>
            <div className="flex items-start gap-2">
              <Dot status={isRunning ? "in_progress" : pipelineStatus === "completed" ? "completed" : "pending"} />
              <span className="text-[11px] text-stone-600 leading-snug">{statusMessage}</span>
            </div>
            {currentNode !== "idle" && (
              <p className="mt-1.5 ml-3.5 text-[10px] font-mono text-stone-400 bg-stone-50 px-2 py-1 rounded">
                {currentNode}
              </p>
            )}
            {plan.length > 0 && (
              <div className="mt-4">
                <div className="flex justify-between text-[10px] text-stone-400 mb-1">
                  <span>Progress</span>
                  <span className="font-semibold text-stone-600">{progressPercent}%</span>
                </div>
                <div className="h-1 bg-stone-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: ACCENT }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ type: "spring", stiffness: 50 }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-stone-100" />

          {/* Filter block */}
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-stone-400 mb-2">Filter</p>
            <div className="space-y-0.5">
              {([
                { label: "All Sections",  count: plan.length,    tab: "all"         },
                { label: "In Progress",   count: inProgressCount, tab: "in_progress" },
                { label: "Completed",     count: completedCount,  tab: "completed"   },
                { label: "Queued",        count: pendingCount,    tab: "all"         },
              ] as { label: string; count: number; tab: ViewTab }[]).map(({ label, count, tab }, i) => (
                <button
                  key={i}
                  onClick={() => setViewTab(tab)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-[11px] transition ${
                    viewTab === tab && i < 3
                      ? "font-semibold"
                      : "text-stone-500 hover:bg-stone-50"
                  }`}
                  style={viewTab === tab && i < 3 ? { color: ACCENT, backgroundColor: "#EDE9FE" } : {}}
                >
                  <span>{label}</span>
                  {count > 0 && (
                    <span className="text-[9px] font-mono bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded">
                      {count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-stone-100" />

          {/* HITL Review block */}
          <AnimatePresence>
            {pipelineStatus === "waiting_for_approval" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-3"
              >
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-600">
                  Review Required
                </p>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  Edit the next section then approve for drafting.
                </p>
                <div className="space-y-2">
                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-wide text-amber-600 mb-1">Title</label>
                    <input
                      type="text"
                      value={editableTaskTitle}
                      onChange={e => setEditableTaskTitle(e.target.value)}
                      className="w-full bg-white border border-amber-200 rounded-lg px-2.5 py-1.5 text-xs text-stone-800 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  {editableDirective && (
                    <div>
                      <label className="block text-[9px] font-bold uppercase tracking-wide text-amber-600 mb-1">Directive</label>
                      <textarea
                        rows={2}
                        value={editableDirective}
                        onChange={e => setEditableDirective(e.target.value)}
                        className="w-full bg-white border border-amber-200 rounded-lg px-2.5 py-1.5 text-xs text-stone-800 focus:outline-none focus:border-amber-400 resize-none"
                      />
                    </div>
                  )}
                </div>
                <button
                  onClick={() => resumeGeneration(false)}
                  className="w-full py-2 rounded-lg text-white font-bold text-[10px] uppercase tracking-widest transition hover:opacity-90"
                  style={{ backgroundColor: ACCENT }}
                >
                  Approve & Draft
                </button>
                <button
                  onClick={() => resumeGeneration(true)}
                  className="w-full py-2 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-700 font-bold text-[10px] uppercase tracking-widest transition"
                >
                  Edit & Continue
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom stats */}
          <div className="mt-auto pt-4 border-t border-stone-100 space-y-1.5">
            <div className="flex justify-between text-[11px] text-stone-500">
              <span>Words drafted</span>
              <span className="font-semibold text-stone-700 tabular-nums">{wordCount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-[11px] text-stone-500">
              <span>Summaries saved</span>
              <span className="font-semibold text-stone-700 tabular-nums">{pastSummaries.length}</span>
            </div>
          </div>
        </aside>

        {/* ── MAIN ──────────────────────── 60% warm off-white (#F5F4F0) */}
        <main className="flex-1 overflow-y-auto flex flex-col">

          {/* Book header bar — white strip */}
          <div className="bg-white border-b border-stone-100 px-6 py-4 flex items-center justify-between shrink-0">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-stone-400 mb-0.5">{genre}</p>
              <h1 className="text-lg font-black text-stone-900 tracking-tight">{bookTitle}</h1>
            </div>

            <div className="flex items-center gap-2">
              {/* Text-only tabs */}
              <div className="flex border border-stone-200 rounded-lg overflow-hidden text-[11px] font-semibold">
                {(["all", "in_progress", "completed"] as ViewTab[]).map((t, i) => (
                  <button
                    key={t}
                    onClick={() => setViewTab(t)}
                    className="px-4 py-2 transition capitalize border-r border-stone-200 last:border-0"
                    style={
                      viewTab === t
                        ? { backgroundColor: ACCENT, color: "#fff" }
                        : { color: "#78716c", backgroundColor: "#fff" }
                    }
                  >
                    {t.replace("_", " ")}
                  </button>
                ))}
              </div>

              {/* Prose / Grid toggle */}
              {streamedProse && (
                <button
                  onClick={() => setShowProseView(!showProseView)}
                  className="px-3 py-2 rounded-lg border border-stone-200 text-[11px] font-semibold text-stone-600 hover:bg-stone-50 transition uppercase tracking-wide"
                >
                  {showProseView ? "Grid" : "Prose"}
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-6">

            {/* Idle empty state */}
            {pipelineStatus === "idle" && plan.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full py-20 text-center">
                <div
                  className="w-20 h-20 rounded-2xl mb-6 flex items-center justify-center"
                  style={{ background: "linear-gradient(145deg, #EDE9FE, #C7D2FE)" }}
                >
                  <span className="text-3xl font-black" style={{ color: ACCENT }}>S</span>
                </div>
                <h2 className="text-xl font-black text-stone-800 mb-2 tracking-tight">Ready to Write</h2>
                <p className="text-sm text-stone-400 max-w-sm mb-8 leading-relaxed">
                  Click <strong>Generate</strong> to start the AI pipeline. The planner will break your book into sub-sections and draft each one with your approval before proceeding.
                </p>
                <button
                  onClick={startGeneration}
                  className="px-7 py-3 rounded-xl text-white font-bold text-sm uppercase tracking-widest shadow-lg shadow-indigo-200 transition hover:opacity-90"
                  style={{ backgroundColor: ACCENT }}
                >
                  Generate Manuscript
                </button>
              </div>
            )}

            {/* Planning spinner state */}
            {pipelineStatus === "planning" && plan.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div
                  className="w-16 h-16 rounded-2xl mb-5 flex items-center justify-center"
                  style={{ background: "linear-gradient(145deg, #EDE9FE, #C7D2FE)" }}
                >
                  <motion.span
                    className="text-2xl font-black"
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ repeat: Infinity, duration: 1.6 }}
                    style={{ color: ACCENT }}
                  >
                    AI
                  </motion.span>
                </div>
                <p className="text-sm font-semibold text-stone-700 mb-1">Planning your manuscript...</p>
                <p className="text-xs text-stone-400">Generating a detailed sub-section breakdown</p>
              </div>
            )}

            {/* Prose view */}
            {showProseView && streamedProse && (
              <div className="max-w-3xl mx-auto">
                <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-8 md:p-12">
                  <div className="flex items-center justify-between mb-6 pb-5 border-b border-stone-100">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400 mb-0.5">Current Draft</p>
                      <h2 className="text-base font-bold text-stone-800">{currentTaskTitle}</h2>
                    </div>
                    {pipelineStatus === "drafting" && (
                      <span
                        className="px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest text-white"
                        style={{ backgroundColor: ACCENT }}
                      >
                        Live
                      </span>
                    )}
                  </div>
                  <div className="font-serif text-stone-700 leading-[1.85] text-[15px] whitespace-pre-wrap">
                    {streamedProse}
                    {pipelineStatus === "drafting" && (
                      <motion.span
                        animate={{ opacity: [1, 0] }}
                        transition={{ repeat: Infinity, duration: 0.65 }}
                        className="inline-block w-2 h-4 ml-0.5 align-middle rounded-sm"
                        style={{ backgroundColor: ACCENT }}
                      />
                    )}
                  </div>
                  <div ref={proseEnd} />
                </div>

                {/* Compiling state */}
                {pipelineStatus === "compiling" && (
                  <div className="mt-4 p-4 rounded-xl border border-indigo-100 bg-indigo-50 flex items-center gap-3">
                    <motion.span
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ repeat: Infinity, duration: 1.4 }}
                      className="text-xs font-black uppercase tracking-widest"
                      style={{ color: ACCENT }}
                    >
                      Compiling
                    </motion.span>
                    <span className="text-xs text-indigo-600">{statusMessage}</span>
                  </div>
                )}

                {/* Completed state */}
                {pipelineStatus === "completed" && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-5 rounded-xl border border-emerald-200 bg-emerald-50 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-black text-emerald-800 uppercase tracking-wide">Book Complete</p>
                      <p className="text-[11px] text-emerald-600 mt-0.5">Your manuscript is compiled and ready to download.</p>
                    </div>
                    <a
                      href={`http://localhost:8000/api/download/${sessionId}`}
                      download
                      className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] uppercase tracking-widest transition"
                    >
                      Download .md
                    </a>
                  </motion.div>
                )}
              </div>
            )}

            {/* Grid view */}
            {!showProseView && plan.length > 0 && (
              <>
                {filteredPlan.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <p className="text-sm text-stone-400">No sections match this filter.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {filteredPlan.map(item => {
                      const gi = plan.indexOf(item);
                      return (
                        <SectionCard
                          key={item.sub_section_id || gi}
                          item={item}
                          index={gi}
                          isReviewMode={pipelineStatus === "waiting_for_approval"}
                          onApprove={() => resumeGeneration(false)}
                          onProseClick={() => setShowProseView(true)}
                        />
                      );
                    })}
                  </div>
                )}

                {/* Completion banner */}
                {pipelineStatus === "completed" && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-8 p-6 rounded-2xl text-white flex items-center justify-between shadow-lg"
                    style={{ background: `linear-gradient(135deg, ${ACCENT}, #1D4ED8)` }}
                  >
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-200 mb-1">
                        Pipeline Complete
                      </p>
                      <p className="text-lg font-black leading-tight">{bookTitle}</p>
                      <p className="text-sm text-indigo-200 mt-0.5">
                        {plan.length} sections · {wordCount.toLocaleString()} words
                      </p>
                    </div>
                    <a
                      href={`http://localhost:8000/api/download/${sessionId}`}
                      download
                      className="px-6 py-3 rounded-xl bg-white font-bold text-sm uppercase tracking-widest hover:bg-indigo-50 transition"
                      style={{ color: ACCENT }}
                    >
                      Download Manuscript
                    </a>
                  </motion.div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
