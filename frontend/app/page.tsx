"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, BookOpen, Sparkles, Play, Pause, CheckCircle2, CircleDashed,
  Layers, FileText, Zap, ShieldAlert, Edit3, Check, ArrowRight, Eye,
  Download, Search, Lightbulb, Globe, FlaskConical, Users, TrendingUp,
  Heart, Award, Bookmark, ChevronRight, Atom, Cpu, Microscope,
  Star, Clock, Pen, Telescope, Flame, Network, SlidersHorizontal, X
} from "lucide-react";

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
  chapter_number?: number;
  title: string;
  target_word_count?: number;
  one_sentence_summary?: string;
  writing_directive?: string;
  status?: "pending" | "in_progress" | "completed";
}

// ── Chapter Cover Data ────────────────────────────────────────────────────────
const SECTION_ICONS = [
  Brain, Lightbulb, Globe, Network, FlaskConical, Users, TrendingUp,
  Heart, Award, Bookmark, Atom, Cpu, Microscope, Pen, Telescope, Flame,
];

const GRADIENTS = [
  { a: "#7C3AED", b: "#4F46E5" }, // violet → indigo
  { a: "#0EA5E9", b: "#0369A1" }, // sky → blue
  { a: "#10B981", b: "#0F766E" }, // emerald → teal
  { a: "#F59E0B", b: "#B45309" }, // amber → orange
  { a: "#EF4444", b: "#BE185D" }, // red → pink
  { a: "#8B5CF6", b: "#6D28D9" }, // violet dark
  { a: "#06B6D4", b: "#0E7490" }, // cyan
  { a: "#F43F5E", b: "#9F1239" }, // rose → deep
  { a: "#84CC16", b: "#4D7C0F" }, // lime
  { a: "#A855F7", b: "#7E22CE" }, // purple
];

// ── Section Cover SVG ─────────────────────────────────────────────────────────
function SectionCover({ index }: { index: number }) {
  const g = GRADIENTS[index % GRADIENTS.length];
  const id = `sg-${index}`;
  const Icon = SECTION_ICONS[index % SECTION_ICONS.length];

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* SVG background with gradient and pattern */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 140 180" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={g.a} />
            <stop offset="100%" stopColor={g.b} />
          </linearGradient>
          <pattern id={`dots-${index}`} x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
            <circle cx="1.5" cy="1.5" r="1" fill="white" opacity="0.18" />
          </pattern>
        </defs>
        {/* Base gradient */}
        <rect width="140" height="180" fill={`url(#${id})`} />
        {/* Dot pattern overlay */}
        <rect width="140" height="180" fill={`url(#dots-${index})`} />
        {/* Decorative arc */}
        <circle cx="120" cy="155" r="55" fill="white" opacity="0.06" />
        <circle cx="10" cy="20" r="35" fill="white" opacity="0.04" />
        {/* Top left section number label */}
        <rect x="8" y="8" width="30" height="14" rx="4" fill="black" opacity="0.18" />
        <text x="12" y="18.5" fontFamily="monospace" fontSize="8" fontWeight="bold" fill="white" opacity="0.85">
          §{String(index + 1).padStart(2, "0")}
        </text>
        {/* Icon container circle */}
        <circle cx="70" cy="90" r="28" fill="white" opacity="0.12" />
      </svg>
      {/* Lucide icon overlaid in center */}
      <div className="absolute inset-0 flex items-center justify-center">
        <Icon className="h-11 w-11 text-white drop-shadow-md" strokeWidth={1.5} />
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
  const wc = item.target_word_count ?? 1200;
  const stars = item.status === "completed" ? 5 : item.status === "in_progress" ? 3 : 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      className={`bg-white rounded-2xl border overflow-hidden hover:shadow-md transition-all duration-200 flex flex-col ${
        isReviewMode && item.status === "in_progress"
          ? "border-violet-400 ring-2 ring-violet-100 shadow-md"
          : "border-slate-100 shadow-sm"
      }`}
    >
      {/* Cover */}
      <div className="h-40 relative flex-shrink-0">
        <SectionCover index={index} />
        {/* Status badge */}
        <div className="absolute top-2.5 right-2.5">
          {item.status === "completed" ? (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold shadow">
              <CheckCircle2 className="h-2.5 w-2.5" /> Done
            </span>
          ) : item.status === "in_progress" ? (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold shadow">
              <CircleDashed className="h-2.5 w-2.5 animate-spin" /> Live
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full bg-white/30 text-white text-[10px] font-semibold backdrop-blur-sm">
              Queued
            </span>
          )}
        </div>
        {/* Prose button overlay for completed/drafting */}
        {(item.status === "completed" || item.status === "in_progress") && onProseClick && (
          <button
            onClick={onProseClick}
            className="absolute bottom-2.5 right-2.5 p-1.5 rounded-lg bg-white/20 backdrop-blur-sm hover:bg-white/30 transition text-white"
            title="View prose"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2 mb-1.5">
          {item.title}
        </h3>
        {item.one_sentence_summary && (
          <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mb-3">
            {item.one_sentence_summary}
          </p>
        )}

        {/* Stars / progress indicator */}
        <div className="flex items-center gap-1 mb-3 mt-auto">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`h-3 w-3 ${i < stars ? "fill-amber-400 text-amber-400" : "text-slate-200 fill-slate-100"}`}
            />
          ))}
          <span className="text-[10px] text-slate-400 ml-1.5">{wc.toLocaleString()} words</span>
        </div>

        {/* CTA */}
        {isReviewMode && item.status === "in_progress" && onApprove ? (
          <button
            onClick={onApprove}
            className="w-full py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm shadow-violet-200"
          >
            <Check className="h-3.5 w-3.5 stroke-[3]" /> Approve & Draft
          </button>
        ) : item.status === "completed" ? (
          <div className="w-full py-2 rounded-xl bg-emerald-50 text-emerald-600 font-semibold text-xs flex items-center justify-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" /> Complete
          </div>
        ) : item.status === "in_progress" ? (
          <div className="w-full py-2 rounded-xl bg-amber-50 text-amber-600 font-semibold text-xs flex items-center justify-center gap-1.5">
            <CircleDashed className="h-3.5 w-3.5 animate-spin" /> Drafting...
          </div>
        ) : (
          <div className="w-full py-2 rounded-xl bg-slate-50 text-slate-400 font-medium text-xs flex items-center justify-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> Queued
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
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

  const abortControllerRef = useRef<AbortController | null>(null);
  const proseEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (pipelineStatus === "drafting" && proseEndRef.current) {
      proseEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [streamedProse, pipelineStatus]);

  useEffect(() => {
    setWordCount(streamedProse.trim().split(/\s+/).filter(Boolean).length);
  }, [streamedProse]);

  async function readSSEStream(response: Response) {
    if (!response.body) throw new Error("ReadableStream not supported");
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
        const trimmed = line.trim();
        if (!trimmed.startsWith("data: ")) continue;
        try {
          const data = JSON.parse(trimmed.slice(6));
          if (data.session_id && !sessionId) setSessionId(data.session_id);

          if (data.type === "status") {
            setStatusMessage(data.message || data.status);
            if (data.current_node) {
              setCurrentNode(data.current_node);
              if (data.current_node === "plan_step") setPipelineStatus("planning");
              else if (data.current_node === "research_step") setPipelineStatus("researching");
              else if (data.current_node === "execute_step") setPipelineStatus("drafting");
              else if (data.current_node === "replan_step") setPipelineStatus("summarizing");
              else if (["front_matter_step", "back_matter_step", "compile_book_step"].includes(data.current_node))
                setPipelineStatus("compiling");
            }
          } else if (data.type === "plan" && Array.isArray(data.plan)) {
            const newPlan: SubSectionTask[] = data.plan.map((item: any, idx: number) => ({
              sub_section_id: item.sub_section_id || `sub-${idx}`,
              title: item.title || `Section ${idx + 1}`,
              one_sentence_summary: item.one_sentence_summary || "",
              writing_directive: item.writing_directive || "",
              target_word_count: item.target_word_count || 1200,
              status: idx === 0 ? "in_progress" : "pending",
            }));
            setPlan(newPlan);
            if (newPlan.length > 0) {
              setCurrentTaskTitle(newPlan[0].title);
              setEditableTaskTitle(newPlan[0].title);
              setEditableDirective(newPlan[0].writing_directive || "");
            }
          } else if (data.type === "hitl_pause") {
            setPipelineStatus("waiting_for_approval");
            setStatusMessage("Paused — human review required");
            if (data.thread_id) setSessionId(data.thread_id);
            if (data.target_task) setCurrentTaskTitle(data.target_task);
            if (data.plan?.[0]) {
              setEditableTaskTitle(data.plan[0].title || "");
              setEditableDirective(data.plan[0].writing_directive || "");
            }
          } else if (data.type === "token") {
            setPipelineStatus("drafting");
            setStreamedProse((prev) => prev + data.content);
            if (data.sub_section) {
              setCurrentTaskTitle(data.sub_section);
              setPlan((prev) =>
                prev.map((p) =>
                  p.title === data.sub_section ? { ...p, status: "in_progress" } : p
                )
              );
            }
          } else if (data.type === "replan") {
            if (data.latest_summary) setPastSummaries((prev) => [...prev, data.latest_summary]);
            if (data.next_task) {
              setCurrentTaskTitle(data.next_task);
              setEditableTaskTitle(data.next_task);
              setPlan((prev) =>
                prev.map((p) => {
                  if (p.status === "in_progress") return { ...p, status: "completed" };
                  if (p.title === data.next_task) return { ...p, status: "in_progress" };
                  return p;
                })
              );
            }
          } else if (data.type === "done") {
            setPipelineStatus("completed");
            setStatusMessage("Book generation complete!");
            setPlan((prev) => prev.map((p) => ({ ...p, status: "completed" })));
          } else if (data.type === "error") {
            setErrorMessage(data.message);
            setPipelineStatus("idle");
          }
        } catch {}
      }
    }
  }

  async function startGeneration() {
    setPipelineStatus("planning");
    setErrorMessage(null);
    setStreamedProse("");
    setPastSummaries([]);
    setShowProseView(false);
    setPlan([]);
    setStatusMessage("Connecting to AI system...");
    abortControllerRef.current = new AbortController();
    try {
      const res = await fetch("/api/write", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({
          title: bookTitle, genre, premise,
          target_audience: "Leaders, Executives, and Personal Growth Seekers",
          total_chapters: 5,
        }),
        signal: abortControllerRef.current.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await readSSEStream(res);
    } catch (err: any) {
      if (err.name !== "AbortError") { setErrorMessage(err.message); setPipelineStatus("idle"); }
    }
  }

  async function resumeGeneration(applyEdits = false) {
    if (!sessionId) return;
    setPipelineStatus("drafting");
    setErrorMessage(null);
    abortControllerRef.current = new AbortController();
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
        signal: abortControllerRef.current.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await readSSEStream(res);
    } catch (err: any) {
      if (err.name !== "AbortError") { setErrorMessage(err.message); setPipelineStatus("waiting_for_approval"); }
    }
  }

  function handleStop() {
    abortControllerRef.current?.abort();
    setPipelineStatus("idle");
    setStatusMessage("Generation paused by user.");
  }

  const completedCount = plan.filter((p) => p.status === "completed").length;
  const inProgressCount = plan.filter((p) => p.status === "in_progress").length;
  const pendingCount = plan.filter((p) => p.status === "pending").length;
  const progressPercent = plan.length > 0 ? Math.round((completedCount / plan.length) * 100) : 0;
  const isRunning = ["planning", "researching", "drafting", "summarizing", "compiling"].includes(pipelineStatus);

  const filteredPlan = plan.filter((p) => {
    if (viewTab === "in_progress" && p.status === "pending") return false;
    if (viewTab === "completed" && p.status !== "completed") return false;
    if (searchQuery && !p.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col selection:bg-violet-200">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-50 flex items-center gap-4 px-6 shadow-sm">
        <div className="flex items-center gap-3 shrink-0">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-md shadow-violet-300">
            <Brain className="h-5 w-5 text-white" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-bold text-slate-900">Scriptorium</p>
            <p className="text-[10px] text-slate-400">AI Book Writer</p>
          </div>
        </div>

        {/* Search */}
        <div className="flex-1 max-w-sm mx-auto relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search sections..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          />
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 ml-auto shrink-0">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="p-2 rounded-xl text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition"
            title="Config"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>

          {pipelineStatus === "completed" && sessionId && (
            <a
              href={`http://localhost:8000/api/download/${sessionId}`}
              download
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition shadow-sm"
            >
              <Download className="h-3.5 w-3.5" /> Download
            </a>
          )}

          {isRunning ? (
            <button onClick={handleStop} className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-500 font-bold text-xs transition hover:bg-rose-100">
              <Pause className="h-3.5 w-3.5 fill-rose-500" /> Pause
            </button>
          ) : pipelineStatus === "waiting_for_approval" ? (
            <button onClick={() => resumeGeneration(false)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition shadow-sm">
              <Check className="h-3.5 w-3.5 stroke-[3]" /> Approve
            </button>
          ) : (
            <button onClick={startGeneration} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-sm shadow-md shadow-violet-200 hover:shadow-lg hover:brightness-105 transition">
              <Play className="h-3.5 w-3.5 fill-white" /> Generate
            </button>
          )}
        </div>
      </header>

      {/* ── Config Drawer ───────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showConfig && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-white border-b border-slate-200 overflow-hidden"
          >
            <div className="px-6 py-4 grid grid-cols-3 gap-4 max-w-4xl">
              {[
                { label: "Book Title", val: bookTitle, set: setBookTitle },
                { label: "Genre", val: genre, set: setGenre },
                { label: "Premise", val: premise, set: setPremise },
              ].map(({ label, val, set }) => (
                <div key={label}>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">{label}</label>
                  <input
                    value={val}
                    onChange={(e) => set(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-violet-400"
                  />
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Error Banner ────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mx-6 mt-3 px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-3 text-sm text-rose-700"
          >
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span className="flex-1">{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)}><X className="h-4 w-4 text-rose-400 hover:text-rose-600" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left Sidebar */}
        <aside className="w-60 shrink-0 bg-white border-r border-slate-100 hidden md:flex flex-col p-5 gap-6 overflow-y-auto">

          {/* Pipeline state */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <Zap className="h-3 w-3 text-violet-500" /> Pipeline
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full shrink-0 ${isRunning ? "bg-emerald-400 animate-pulse" : pipelineStatus === "waiting_for_approval" ? "bg-amber-400 animate-pulse" : "bg-slate-300"}`} />
                <span className="text-xs text-slate-600 truncate">{statusMessage}</span>
              </div>
              {currentNode !== "idle" && (
                <div className="ml-4 text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">
                  {currentNode}
                </div>
              )}
            </div>
            {plan.length > 0 && (
              <div className="mt-3">
                <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                  <span>Progress</span><span className="font-bold">{progressPercent}%</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500"
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ type: "spring", stiffness: 50 }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-slate-100" />

          {/* Section filter */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-violet-600 mb-2 flex items-center gap-1.5">
              <Layers className="h-3 w-3" /> Sections
            </p>
            <div className="space-y-0.5">
              {[
                { label: "All Sections", count: plan.length, tab: "all" as ViewTab, active: true },
                { label: "In Progress", count: inProgressCount, tab: "in_progress" as ViewTab, active: false },
                { label: "Completed", count: completedCount, tab: "completed" as ViewTab, active: false },
                { label: "Queued", count: pendingCount, tab: "all" as ViewTab, active: false },
              ].map(({ label, count, tab }, i) => (
                <button
                  key={i}
                  onClick={() => setViewTab(tab)}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs hover:bg-violet-50 transition group"
                >
                  <span className={`group-hover:text-violet-700 ${viewTab === tab && i < 3 ? "text-violet-700 font-semibold" : "text-slate-600"}`}>
                    {label}
                  </span>
                  {count > 0 && (
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">
                      {count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-100" />

          {/* HITL Review Panel */}
          <AnimatePresence>
            {pipelineStatus === "waiting_for_approval" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 space-y-3"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700">
                  <Eye className="h-3.5 w-3.5" /> Review Mode
                </div>
                <p className="text-[11px] text-amber-600 leading-relaxed">
                  Edit the next section details then approve.
                </p>
                <input
                  type="text"
                  value={editableTaskTitle}
                  onChange={(e) => setEditableTaskTitle(e.target.value)}
                  className="w-full bg-white border border-amber-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-amber-400"
                  placeholder="Section title..."
                />
                {editableDirective && (
                  <textarea
                    rows={2}
                    value={editableDirective}
                    onChange={(e) => setEditableDirective(e.target.value)}
                    className="w-full bg-white border border-amber-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-amber-400 resize-none"
                  />
                )}
                <button
                  onClick={() => resumeGeneration(false)}
                  className="w-full py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <Check className="h-3 w-3 stroke-[3]" /> Approve & Draft
                </button>
                <button
                  onClick={() => resumeGeneration(true)}
                  className="w-full py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <Edit3 className="h-3 w-3" /> Edit & Continue
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom stats */}
          <div className="mt-auto pt-4 border-t border-slate-100 space-y-1.5">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Words drafted</span>
              <span className="font-bold text-slate-700">{wordCount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>Chapter summaries</span>
              <span className="font-bold text-slate-700">{pastSummaries.length}</span>
            </div>
          </div>
        </aside>

        {/* ── Main Content ──────────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto flex flex-col">

          {/* Toolbar bar */}
          <div className="bg-white border-b border-slate-100 px-6 py-3.5 flex items-center justify-between shrink-0">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-violet-500 mb-0.5">{genre}</p>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">{bookTitle}</h1>
            </div>

            <div className="flex items-center gap-2">
              {/* Tabs */}
              <div className="flex bg-slate-100 rounded-xl p-1 gap-0.5 text-xs">
                {(["all", "in_progress", "completed"] as ViewTab[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setViewTab(t)}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition capitalize ${viewTab === t ? "bg-white text-violet-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    {t.replace("_", " ")}
                  </button>
                ))}
              </div>

              {/* Prose toggle */}
              {streamedProse && (
                <button
                  onClick={() => setShowProseView(!showProseView)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
                >
                  <FileText className="h-3.5 w-3.5" />
                  {showProseView ? "Grid" : "Prose"}
                </button>
              )}
            </div>
          </div>

          {/* Content area */}
          <div className="flex-1 p-6">

            {/* IDLE: no plan yet */}
            {pipelineStatus === "idle" && plan.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full py-20 text-center">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center mb-6 shadow-inner">
                  <BookOpen className="h-11 w-11 text-violet-300" strokeWidth={1.5} />
                </div>
                <h2 className="text-xl font-bold text-slate-700 mb-2">Manuscript Ready</h2>
                <p className="text-sm text-slate-400 max-w-sm mb-7 leading-relaxed">
                  Click <strong>Generate</strong> to start the pipeline. The AI will plan, research, and draft your book section by section with your approval at each stage.
                </p>
                <button
                  onClick={startGeneration}
                  className="flex items-center gap-2 px-7 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-sm shadow-lg shadow-violet-200 hover:shadow-xl hover:brightness-105 transition"
                >
                  <Sparkles className="h-4 w-4" /> Generate Manuscript
                </button>
              </div>
            )}

            {/* Planning spinner */}
            {pipelineStatus === "planning" && plan.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24">
                <div className="relative mb-5">
                  <div className="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center">
                    <Brain className="h-8 w-8 text-violet-400" strokeWidth={1.5} />
                  </div>
                  <CircleDashed className="h-5 w-5 text-violet-500 animate-spin absolute -bottom-1.5 -right-1.5 bg-white rounded-full p-0.5" />
                </div>
                <p className="text-sm font-semibold text-slate-600 mb-1">Planning your manuscript...</p>
                <p className="text-xs text-slate-400">Generating a detailed sub-section breakdown</p>
              </div>
            )}

            {/* Prose View */}
            {showProseView && streamedProse && (
              <div className="max-w-3xl mx-auto">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 md:p-12">
                  <div className="flex items-center justify-between mb-6 pb-5 border-b border-slate-100">
                    <h2 className="text-lg font-semibold text-slate-800 font-serif">{currentTaskTitle || "Current Draft"}</h2>
                    {pipelineStatus === "drafting" && (
                      <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" /> Live
                      </span>
                    )}
                  </div>
                  <div className="font-serif text-slate-700 leading-relaxed text-[15px] whitespace-pre-wrap">
                    {streamedProse}
                    {pipelineStatus === "drafting" && (
                      <motion.span
                        animate={{ opacity: [1, 0] }}
                        transition={{ repeat: Infinity, duration: 0.65 }}
                        className="inline-block w-2 h-4 ml-0.5 bg-violet-500 align-middle rounded-sm"
                      />
                    )}
                  </div>
                  <div ref={proseEndRef} />
                </div>

                {/* Status notifications below prose */}
                {pipelineStatus === "compiling" && (
                  <div className="mt-4 p-4 rounded-2xl bg-violet-50 border border-violet-200 flex items-center gap-3">
                    <CircleDashed className="h-5 w-5 text-violet-500 animate-spin shrink-0" />
                    <p className="text-sm font-semibold text-violet-700">{statusMessage}</p>
                  </div>
                )}
                {pipelineStatus === "completed" && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                      <div>
                        <p className="font-bold text-emerald-800 text-sm">Book Complete!</p>
                        <p className="text-xs text-emerald-600">Your manuscript is compiled and ready.</p>
                      </div>
                    </div>
                    <a
                      href={`http://localhost:8000/api/download/${sessionId}`}
                      download
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm rounded-xl transition"
                    >
                      <Download className="h-4 w-4" /> Download .md
                    </a>
                  </motion.div>
                )}
              </div>
            )}

            {/* Grid View */}
            {!showProseView && plan.length > 0 && (
              <>
                {filteredPlan.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <FileText className="h-10 w-10 text-slate-200 mb-3" />
                    <p className="text-sm text-slate-400">No sections match this filter.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {filteredPlan.map((item) => {
                      const globalIdx = plan.indexOf(item);
                      return (
                        <SectionCard
                          key={item.sub_section_id || globalIdx}
                          item={item}
                          index={globalIdx}
                          isReviewMode={pipelineStatus === "waiting_for_approval"}
                          onApprove={() => resumeGeneration(false)}
                          onProseClick={() => setShowProseView(true)}
                        />
                      );
                    })}
                  </div>
                )}

                {/* Book Complete banner at bottom of grid */}
                {pipelineStatus === "completed" && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 p-5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 flex items-center justify-between text-white shadow-lg shadow-violet-200"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-bold">Book Generation Complete!</p>
                        <p className="text-sm text-violet-200">All {plan.length} sections drafted · {wordCount.toLocaleString()} words</p>
                      </div>
                    </div>
                    <a
                      href={`http://localhost:8000/api/download/${sessionId}`}
                      download
                      className="flex items-center gap-2 px-5 py-2.5 bg-white text-violet-700 font-bold text-sm rounded-xl hover:bg-violet-50 transition shadow"
                    >
                      <Download className="h-4 w-4" /> Download Manuscript
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
