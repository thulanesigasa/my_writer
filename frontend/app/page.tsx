"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ─────────────────────────────────────────────────────────────────────
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
  title: string;
  target_word_count?: number;
  one_sentence_summary?: string;
  writing_directive?: string;
  status?: "pending" | "in_progress" | "completed";
}

// ── Apple Design Colors & Spring Physics ──────────────────────────────────────
const ACCENT = "#007AFF"; // Apple SF Blue

// Critically damped Apple spring default (bounce: 0, duration: 0.35s)
const APPLE_SPRING = { type: "spring" as const, bounce: 0, duration: 0.35 };

const COVER_GRADIENTS: [string, string][] = [
  ["#007AFF", "#5856D6"], // Apple Blue → Purple
  ["#34C759", "#30B0C7"], // Apple Mint → Teal
  ["#FF9500", "#FF2D55"], // Apple Orange → Pink
  ["#5856D6", "#AF52DE"], // Apple Indigo → Magenta
  ["#00C7BE", "#30B0C7"], // Apple Teal → Cyan
  ["#FF3B30", "#FF9500"], // Apple Red → Orange
  ["#32ADE6", "#007AFF"], // Apple Sky → Blue
  ["#AF52DE", "#5856D6"], // Apple Purple → Indigo
];

// ── Status Pill Component (Apple Style) ───────────────────────────────────────
function StatusPill({ status }: { status?: string }) {
  const isDone = status === "completed";
  const isLive = status === "in_progress";

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-tight transition-all">
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          isDone
            ? "bg-emerald-500"
            : isLive
            ? "bg-amber-500 animate-pulse"
            : "bg-stone-300"
        }`}
      />
      <span
        className={
          isDone
            ? "text-emerald-700 font-bold uppercase tracking-wider text-[9px]"
            : isLive
            ? "text-amber-700 font-bold uppercase tracking-wider text-[9px]"
            : "text-stone-500 uppercase tracking-wider text-[9px]"
        }
      >
        {isDone ? "Done" : isLive ? "Live" : "Queued"}
      </span>
    </div>
  );
}

// ── Chapter Cover (Apple Aesthetic Geometry + Watermark) ──────────────────────
function SectionCover({ index }: { index: number }) {
  const [a, b] = COVER_GRADIENTS[index % COVER_GRADIENTS.length];
  const num = String(index + 1).padStart(2, "0");

  return (
    <div
      className="relative w-full h-full overflow-hidden rounded-t-2xl"
      style={{ background: `linear-gradient(135deg, ${a}, ${b})` }}
    >
      {/* Geometry / Light Mesh */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 240 180"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="210" cy="150" r="90" fill="white" opacity="0.08" />
        <circle cx="20" cy="20" r="60" fill="white" opacity="0.05" />
        {Array.from({ length: 7 }).map((_, i) => (
          <line
            key={`v${i}`}
            x1={i * 40}
            y1="0"
            x2={i * 40}
            y2="180"
            stroke="white"
            strokeWidth="0.5"
            opacity="0.1"
          />
        ))}
      </svg>

      {/* Watermark Section Number */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span
          className="font-black text-white leading-none select-none tabular-nums tracking-tighter"
          style={{ fontSize: "6.5rem", opacity: 0.12 }}
        >
          {num}
        </span>
      </div>

      {/* Subtle Bottom Light Edge */}
      <div
        className="absolute bottom-0 left-0 right-0 px-4 py-2.5 flex items-center justify-between"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.3), transparent)" }}
      >
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/80">
          Section {num}
        </span>
      </div>
    </div>
  );
}

// ── Section Card Component (Apple Glass / Squircle) ───────────────────────────
function SectionCard({
  item,
  index,
  isReviewMode,
  onApprove,
  onProseClick,
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
      initial={{ opacity: 0, scale: 0.95, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ ...APPLE_SPRING, delay: index * 0.03 }}
      className={`bg-white rounded-2xl border flex flex-col overflow-hidden transition-all duration-200 apple-pressable ${
        isActive
          ? "border-[#007AFF] ring-4 ring-blue-50 shadow-md"
          : "border-stone-200/80 shadow-sm hover:shadow-md hover:border-stone-300"
      }`}
    >
      {/* Cover Header */}
      <div className="relative h-44 flex-shrink-0">
        <SectionCover index={index} />

        {/* Status Badge Overlay */}
        <div className="absolute top-3.5 right-3.5 bg-white/90 backdrop-blur-md rounded-full shadow-sm">
          <StatusPill status={item.status} />
        </div>

        {/* Prose View Shortcut */}
        {(item.status === "completed" || item.status === "in_progress") && onProseClick && (
          <button
            onClick={onProseClick}
            className="absolute bottom-3.5 right-3.5 px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white text-[11px] font-bold uppercase tracking-wider transition apple-pressable"
          >
            View Prose
          </button>
        )}
      </div>

      {/* Card Content */}
      <div className="p-5 flex flex-col flex-1 justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-stone-900 leading-snug line-clamp-2 mb-1.5 apple-heading">
            {item.title}
          </h3>

          {item.one_sentence_summary && (
            <p className="text-xs text-stone-500 leading-relaxed line-clamp-2">
              {item.one_sentence_summary}
            </p>
          )}
        </div>

        {/* Word count & status label */}
        <div className="flex items-center justify-between text-xs text-stone-400 font-medium pt-2 border-t border-stone-100">
          <span className="capitalize text-stone-500">{item.status ?? "pending"}</span>
          <span className="font-mono tabular-nums text-stone-600 font-semibold">{wc} words</span>
        </div>

        {/* Action Button */}
        {isActive && onApprove ? (
          <button
            onClick={onApprove}
            className="w-full py-2.5 rounded-xl text-white font-bold text-xs uppercase tracking-widest transition apple-pressable shadow-sm"
            style={{ backgroundColor: ACCENT }}
          >
            Approve &amp; Draft
          </button>
        ) : item.status === "completed" ? (
          <div className="w-full py-2 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-xs uppercase tracking-widest text-center">
            Completed
          </div>
        ) : item.status === "in_progress" ? (
          <div className="w-full py-2 rounded-xl bg-amber-50 text-amber-700 font-bold text-xs uppercase tracking-widest text-center">
            Drafting...
          </div>
        ) : (
          <div className="w-full py-2 rounded-xl bg-stone-100/70 text-stone-400 font-semibold text-xs uppercase tracking-widest text-center">
            Queued
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Main Page Component ───────────────────────────────────────────────────────
export default function HomePage() {
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("Ready to draft");
  const [currentNode, setCurrentNode] = useState<string>("idle");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [plan, setPlan] = useState<SubSectionTask[]>([]);
  const [currentTaskTitle, setCurrentTaskTitle] = useState<string>("");
  const [streamedProse, setStreamedProse] = useState<string>("");
  const [pastSummaries, setPastSummaries] = useState<string[]>([]);
  const [wordCount, setWordCount] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editableTaskTitle, setEditableTaskTitle] = useState<string>("");
  const [editableDirective, setEditableDirective] = useState<string>("");
  const [bookTitle, setBookTitle] = useState("The Power of Instinct");
  const [genre, setGenre] = useState("Popular Neuroscience & Leadership");
  const [premise, setPremise] = useState(
    "Instinct is not the enemy of good thinking — it is the compressed intelligence of lived experience."
  );
  const [showConfig, setShowConfig] = useState(false);
  const [viewTab, setViewTab] = useState<ViewTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showProseView, setShowProseView] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const proseEnd = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (pipelineStatus === "drafting") proseEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [streamedProse, pipelineStatus]);

  useEffect(() => {
    setWordCount(streamedProse.trim().split(/\s+/).filter(Boolean).length);
  }, [streamedProse]);

  // ── SSE Stream Listener ─────────────────────────────────────────────────────
  async function readSSEStream(response: Response) {
    if (!response.body) return;
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

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
              if (d.current_node === "plan_step") setPipelineStatus("planning");
              else if (d.current_node === "research_step") setPipelineStatus("researching");
              else if (d.current_node === "execute_step") setPipelineStatus("drafting");
              else if (d.current_node === "replan_step") setPipelineStatus("summarizing");
              else if (
                ["front_matter_step", "back_matter_step", "compile_book_step"].includes(
                  d.current_node
                )
              )
                setPipelineStatus("compiling");
            }
          } else if (d.type === "plan" && Array.isArray(d.plan)) {
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
          } else if (d.type === "hitl_pause") {
            setPipelineStatus("waiting_for_approval");
            setStatusMessage("Paused — human review required");
            if (d.thread_id) setSessionId(d.thread_id);
            if (d.target_task) setCurrentTaskTitle(d.target_task);
            if (d.plan?.[0]) {
              setEditableTaskTitle(d.plan[0].title || "");
              setEditableDirective(d.plan[0].writing_directive || "");
            }
          } else if (d.type === "token") {
            setPipelineStatus("drafting");
            setStreamedProse((prev) => prev + d.content);
            if (d.sub_section) {
              setCurrentTaskTitle(d.sub_section);
              setPlan((prev) =>
                prev.map((p) =>
                  p.title === d.sub_section ? { ...p, status: "in_progress" } : p
                )
              );
            }
          } else if (d.type === "replan") {
            if (d.latest_summary) setPastSummaries((prev) => [...prev, d.latest_summary]);
            if (d.next_task) {
              setCurrentTaskTitle(d.next_task);
              setEditableTaskTitle(d.next_task);
              setPlan((prev) =>
                prev.map((p) => {
                  if (p.status === "in_progress") return { ...p, status: "completed" };
                  if (p.title === d.next_task) return { ...p, status: "in_progress" };
                  return p;
                })
              );
            }
          } else if (d.type === "done") {
            setPipelineStatus("completed");
            setStatusMessage("Book generation complete.");
            setPlan((prev) => prev.map((p) => ({ ...p, status: "completed" })));
          } else if (d.type === "error") {
            setErrorMessage(d.message);
            setPipelineStatus("idle");
          }
        } catch {}
      }
    }
  }

  // ── Handlers ────────────────────────────────────────────────────────────────
  async function startGeneration() {
    setPipelineStatus("planning");
    setErrorMessage(null);
    setStreamedProse("");
    setPastSummaries([]);
    setShowProseView(false);
    setPlan([]);
    setStatusMessage("Connecting to AI Pipeline...");
    abortRef.current = new AbortController();
    try {
      const res = await fetch("/api/write", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({
          title: bookTitle,
          genre,
          premise,
          target_audience: "Leaders, Executives, and Personal Growth Seekers",
          total_chapters: 5,
        }),
        signal: abortRef.current.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await readSSEStream(res);
    } catch (e: any) {
      if (e.name !== "AbortError") {
        setErrorMessage(e.message);
        setPipelineStatus("idle");
      }
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
        i === 0
          ? {
              ...p,
              title: editableTaskTitle || p.title,
              writing_directive: editableDirective || p.writing_directive,
            }
          : p
      );
      setPlan(updatedPlan);
    }
    try {
      const res = await fetch("/api/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({
          thread_id: sessionId,
          plan: updatedPlan,
          past_steps: pastSummaries,
        }),
        signal: abortRef.current.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await readSSEStream(res);
    } catch (e: any) {
      if (e.name !== "AbortError") {
        setErrorMessage(e.message);
        setPipelineStatus("waiting_for_approval");
      }
    }
  }

  function handleStop() {
    abortRef.current?.abort();
    setPipelineStatus("idle");
    setStatusMessage("Generation paused.");
  }

  // ── Derived Stats ───────────────────────────────────────────────────────────
  const completedCount = plan.filter((p) => p.status === "completed").length;
  const inProgressCount = plan.filter((p) => p.status === "in_progress").length;
  const pendingCount = plan.filter((p) => p.status === "pending").length;
  const progressPercent = plan.length > 0 ? Math.round((completedCount / plan.length) * 100) : 0;
  const isRunning = ["planning", "researching", "drafting", "summarizing", "compiling"].includes(
    pipelineStatus
  );

  const filteredPlan = plan.filter((p) => {
    if (viewTab === "in_progress" && p.status === "pending") return false;
    if (viewTab === "completed" && p.status !== "completed") return false;
    if (searchQuery && !p.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen font-sans flex flex-col bg-[#F2F2F7]">
      {/* ── Apple Translucent Glass Header ────────────────────────────────────── */}
      <header className="h-20 apple-glass sticky top-0 z-50 flex items-center justify-between px-8 shadow-sm">
        {/* Brand Title */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-blue-500/20">
            S
          </div>
          <div>
            <p className="text-lg font-bold text-stone-900 leading-tight tracking-tight apple-heading">
              Scriptorium
            </p>
            <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-widest">
              AI Book Writer
            </p>
          </div>
        </div>

        {/* Search Input */}
        <div className="flex-1 max-w-sm mx-8">
          <input
            type="text"
            placeholder="Search sections..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2.5 rounded-full border border-stone-200/80 bg-white/70 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:border-[#007AFF] focus:ring-4 focus:ring-blue-100/60 transition"
          />
        </div>

        {/* Primary Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="px-4 py-2.5 rounded-full border border-stone-200 bg-white/80 hover:bg-white text-sm font-semibold text-stone-700 transition apple-pressable"
          >
            {showConfig ? "Done" : "Config"}
          </button>

          {pipelineStatus === "completed" && sessionId && (
            <a
              href={`http://localhost:8000/api/download/${sessionId}`}
              download
              className="px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition apple-pressable shadow-sm"
            >
              Download
            </a>
          )}

          {isRunning ? (
            <button
              onClick={handleStop}
              className="px-5 py-2.5 rounded-full border border-rose-300 bg-rose-50 text-rose-600 font-bold text-sm hover:bg-rose-100 transition apple-pressable"
            >
              Pause
            </button>
          ) : pipelineStatus === "waiting_for_approval" ? (
            <button
              onClick={() => resumeGeneration(false)}
              className="px-6 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition apple-pressable shadow-sm"
            >
              Approve
            </button>
          ) : (
            <button
              onClick={startGeneration}
              className="px-6 py-2.5 rounded-full text-white font-bold text-sm transition apple-pressable shadow-md shadow-blue-500/20"
              style={{ backgroundColor: ACCENT }}
            >
              Generate
            </button>
          )}
        </div>
      </header>

      {/* ── Translucent Config Drawer ────────────────────────────────────────── */}
      <AnimatePresence>
        {showConfig && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={APPLE_SPRING}
            className="bg-white/90 backdrop-blur-xl border-b border-stone-200 overflow-hidden"
          >
            <div className="px-8 py-6 grid grid-cols-3 gap-6 max-w-4xl mx-auto">
              {[
                { label: "Book Title", val: bookTitle, set: setBookTitle },
                { label: "Genre", val: genre, set: setGenre },
                { label: "Premise", val: premise, set: setPremise },
              ].map(({ label, val, set }) => (
                <div key={label}>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-stone-400 mb-2">
                    {label}
                  </label>
                  <input
                    value={val}
                    onChange={(e) => set(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:border-[#007AFF]"
                  />
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Error Banner ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="mx-8 mt-4 px-6 py-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-between"
          >
            <span className="text-sm font-semibold text-rose-700">{errorMessage}</span>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-xs font-bold text-rose-500 hover:text-rose-800 uppercase tracking-wider"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main View Layer ──────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Sidebar (30% Surface White) ────────────────────────────────────── */}
        <aside className="w-72 shrink-0 bg-white/80 backdrop-blur-lg border-r border-stone-200/80 hidden md:flex flex-col px-6 py-8 gap-8 overflow-y-auto">
          {/* Pipeline Status */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-3">
              Pipeline Status
            </p>
            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-100 flex items-center gap-3">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  isRunning
                    ? "bg-blue-500 animate-pulse"
                    : pipelineStatus === "completed"
                    ? "bg-emerald-500"
                    : "bg-stone-300"
                }`}
              />
              <span className="text-sm font-semibold text-stone-700 leading-snug">
                {statusMessage}
              </span>
            </div>

            {currentNode !== "idle" && (
              <p className="mt-2 text-xs font-mono text-stone-400 px-3 py-1 bg-stone-100 rounded-lg">
                {currentNode}
              </p>
            )}

            {plan.length > 0 && (
              <div className="mt-5">
                <div className="flex justify-between text-xs text-stone-400 mb-2 font-medium">
                  <span>Progress</span>
                  <span className="font-bold text-stone-700">{progressPercent}%</span>
                </div>
                <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: ACCENT }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={APPLE_SPRING}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-stone-100" />

          {/* Section Filter */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-3">
              Sections
            </p>
            <div className="space-y-1">
              {[
                { label: "All Sections", count: plan.length, tab: "all" as ViewTab },
                { label: "In Progress", count: inProgressCount, tab: "in_progress" as ViewTab },
                { label: "Completed", count: completedCount, tab: "completed" as ViewTab },
                { label: "Queued", count: pendingCount, tab: "all" as ViewTab },
              ].map(({ label, count, tab }, i) => (
                <button
                  key={i}
                  onClick={() => setViewTab(tab)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-semibold transition apple-pressable ${
                    viewTab === tab && i < 3
                      ? "bg-blue-50 text-[#007AFF]"
                      : "text-stone-600 hover:bg-stone-50"
                  }`}
                >
                  <span>{label}</span>
                  {count > 0 && (
                    <span className="text-xs font-mono bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full">
                      {count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-stone-100" />

          {/* HITL Review Panel */}
          <AnimatePresence>
            {pipelineStatus === "waiting_for_approval" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={APPLE_SPRING}
                className="p-5 rounded-2xl bg-amber-50/80 border border-amber-200/80 space-y-4"
              >
                <p className="text-xs font-bold uppercase tracking-widest text-amber-700">
                  Review Required
                </p>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Review and edit the upcoming section before proceeding.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-amber-700 mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={editableTaskTitle}
                      onChange={(e) => setEditableTaskTitle(e.target.value)}
                      className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-sm text-stone-900 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  {editableDirective && (
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-amber-700 mb-1">
                        Directive
                      </label>
                      <textarea
                        rows={3}
                        value={editableDirective}
                        onChange={(e) => setEditableDirective(e.target.value)}
                        className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-sm text-stone-900 focus:outline-none focus:border-amber-400 resize-none"
                      />
                    </div>
                  )}
                </div>

                <button
                  onClick={() => resumeGeneration(false)}
                  className="w-full py-2.5 rounded-xl text-white font-bold text-xs uppercase tracking-widest transition apple-pressable shadow-sm"
                  style={{ backgroundColor: ACCENT }}
                >
                  Approve &amp; Draft
                </button>
                <button
                  onClick={() => resumeGeneration(true)}
                  className="w-full py-2.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold text-xs uppercase tracking-widest transition apple-pressable"
                >
                  Edit &amp; Continue
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Stats Footer */}
          <div className="mt-auto pt-6 border-t border-stone-100 space-y-2 text-xs text-stone-500">
            <div className="flex justify-between">
              <span>Words drafted</span>
              <span className="font-bold text-stone-800 tabular-nums">
                {wordCount.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Summaries saved</span>
              <span className="font-bold text-stone-800 tabular-nums">{pastSummaries.length}</span>
            </div>
          </div>
        </aside>

        {/* ── Main Canvas (60% Canvas Off-White #F2F2F7) ──────────────────────── */}
        <main className="flex-1 overflow-y-auto flex flex-col">
          {/* Header Bar */}
          <div className="bg-white/80 backdrop-blur-md border-b border-stone-200/80 px-8 py-5 flex items-center justify-between shrink-0">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-1">
                {genre}
              </p>
              <h1 className="text-2xl font-bold text-stone-900 tracking-tight apple-heading">
                {bookTitle}
              </h1>
            </div>

            <div className="flex items-center gap-3">
              {/* Tab Selector */}
              <div className="flex bg-stone-100 p-1 rounded-full text-xs font-bold">
                {(["all", "in_progress", "completed"] as ViewTab[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setViewTab(t)}
                    className={`px-4 py-1.5 rounded-full transition capitalize apple-pressable ${
                      viewTab === t
                        ? "bg-white text-[#007AFF] shadow-sm"
                        : "text-stone-500 hover:text-stone-800"
                    }`}
                  >
                    {t.replace("_", " ")}
                  </button>
                ))}
              </div>

              {streamedProse && (
                <button
                  onClick={() => setShowProseView(!showProseView)}
                  className="px-4 py-2 rounded-full border border-stone-200 bg-white text-xs font-bold text-stone-700 hover:bg-stone-50 transition apple-pressable"
                >
                  {showProseView ? "Grid View" : "Prose View"}
                </button>
              )}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 p-8">
            {/* ── Idle State ── */}
            {pipelineStatus === "idle" && plan.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full py-24 text-center max-w-lg mx-auto">
                <div
                  className="w-24 h-24 rounded-3xl mb-8 flex items-center justify-center shadow-lg shadow-blue-500/10"
                  style={{ background: "linear-gradient(135deg, #007AFF, #5856D6)" }}
                >
                  <span className="text-5xl font-black text-white">S</span>
                </div>
                <h2 className="text-3xl font-bold text-stone-900 mb-3 tracking-tight apple-heading">
                  Ready to Write
                </h2>
                <p className="text-base text-stone-500 leading-relaxed mb-10">
                  Start the AI pipeline to plan, research, and draft your manuscript with step-by-step human oversight.
                </p>
                <button
                  onClick={startGeneration}
                  className="px-8 py-3.5 rounded-full text-white font-bold text-base uppercase tracking-widest shadow-lg shadow-blue-500/20 transition apple-pressable"
                  style={{ backgroundColor: ACCENT }}
                >
                  Generate Manuscript
                </button>
              </div>
            )}

            {/* ── Planning State ── */}
            {pipelineStatus === "planning" && plan.length === 0 && (
              <div className="flex flex-col items-center justify-center py-32 text-center">
                <div
                  className="w-20 h-20 rounded-3xl mb-6 flex items-center justify-center shadow-md shadow-blue-500/10"
                  style={{ background: "linear-gradient(135deg, #007AFF, #5856D6)" }}
                >
                  <motion.span
                    className="text-2xl font-black text-white"
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ repeat: Infinity, duration: 1.4 }}
                  >
                    AI
                  </motion.span>
                </div>
                <p className="text-lg font-bold text-stone-800 mb-2 apple-heading">
                  Planning Manuscript...
                </p>
                <p className="text-sm text-stone-400">Constructing sub-section outline</p>
              </div>
            )}

            {/* ── Prose View Mode ── */}
            {showProseView && streamedProse && (
              <div className="max-w-3xl mx-auto">
                <div className="bg-white rounded-3xl border border-stone-200/80 shadow-sm p-10 md:p-14">
                  <div className="flex items-start justify-between mb-8 pb-6 border-b border-stone-100 gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-1">
                        Current Draft
                      </p>
                      <h2 className="text-2xl font-bold text-stone-900 apple-heading">
                        {currentTaskTitle}
                      </h2>
                    </div>
                    {pipelineStatus === "drafting" && (
                      <span
                        className="shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest text-white shadow-sm"
                        style={{ backgroundColor: ACCENT }}
                      >
                        Live
                      </span>
                    )}
                  </div>

                  <div className="apple-serif text-stone-800 leading-[1.9] text-lg whitespace-pre-wrap">
                    {streamedProse}
                    {pipelineStatus === "drafting" && (
                      <motion.span
                        animate={{ opacity: [1, 0] }}
                        transition={{ repeat: Infinity, duration: 0.65 }}
                        className="inline-block w-2.5 h-6 ml-1 align-middle rounded-sm"
                        style={{ backgroundColor: ACCENT }}
                      />
                    )}
                  </div>
                  <div ref={proseEnd} />
                </div>

                {pipelineStatus === "completed" && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 p-6 rounded-3xl border border-emerald-200 bg-emerald-50/80 flex items-center justify-between gap-6"
                  >
                    <div>
                      <p className="text-sm font-bold uppercase tracking-widest text-emerald-800 mb-0.5">
                        Book Generation Complete
                      </p>
                      <p className="text-sm text-emerald-700">
                        Manuscript compiled and ready for download.
                      </p>
                    </div>
                    <a
                      href={`http://localhost:8000/api/download/${sessionId}`}
                      download
                      className="shrink-0 px-6 py-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition apple-pressable shadow-sm"
                    >
                      Download .md
                    </a>
                  </motion.div>
                )}
              </div>
            )}

            {/* ── Section Grid View ── */}
            {!showProseView && plan.length > 0 && (
              <>
                {filteredPlan.length === 0 ? (
                  <div className="flex items-center justify-center py-24">
                    <p className="text-base text-stone-400">No sections match filter.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredPlan.map((item) => {
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

                {/* Completion Banner */}
                {pipelineStatus === "completed" && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={APPLE_SPRING}
                    className="mt-10 p-8 rounded-3xl text-white flex items-center justify-between shadow-xl shadow-blue-500/10"
                    style={{ background: `linear-gradient(135deg, ${ACCENT}, #5856D6)` }}
                  >
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-blue-200 mb-2">
                        Pipeline Complete
                      </p>
                      <p className="text-3xl font-black tracking-tight apple-heading mb-1">
                        {bookTitle}
                      </p>
                      <p className="text-sm text-blue-100">
                        {plan.length} sections · {wordCount.toLocaleString()} words
                      </p>
                    </div>
                    <a
                      href={`http://localhost:8000/api/download/${sessionId}`}
                      download
                      className="shrink-0 px-8 py-3.5 rounded-full bg-white text-blue-600 font-bold text-sm uppercase tracking-widest hover:bg-blue-50 transition apple-pressable shadow-md"
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
