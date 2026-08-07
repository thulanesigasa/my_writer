"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Sparkles,
  Play,
  Pause,
  CheckCircle2,
  CircleDashed,
  Brain,
  Feather,
  Layers,
  FileText,
  Zap,
  ShieldAlert,
  Sliders,
  Edit3,
  Check,
  ArrowRight,
  Eye,
} from "lucide-react";

type PipelineStatus =
  | "idle"
  | "planning"
  | "waiting_for_approval"
  | "drafting"
  | "summarizing"
  | "completed";

interface SubSectionTask {
  sub_section_id?: string;
  chapter_number?: number;
  sub_section_number?: number;
  title: string;
  target_word_count?: number;
  one_sentence_summary?: string;
  key_events?: string[];
  writing_directive?: string;
  status?: "pending" | "in_progress" | "completed";
}

export default function HomePage() {
  // Pipeline State
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("Ready to draft");
  const [currentNode, setCurrentNode] = useState<string>("idle");
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Data State
  const [plan, setPlan] = useState<SubSectionTask[]>([]);
  const [currentTaskTitle, setCurrentTaskTitle] = useState<string>("");
  const [streamedProse, setStreamedProse] = useState<string>("");
  const [pastSummaries, setPastSummaries] = useState<string[]>([]);
  const [wordCount, setWordCount] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Review Mode Editable State
  const [editableTaskTitle, setEditableTaskTitle] = useState<string>("");
  const [editableDirective, setEditableDirective] = useState<string>("");
  const [editableSummary, setEditableSummary] = useState<string>("");

  // Form Config
  const [bookTitle, setBookTitle] = useState("The Power of Instinct");
  const [genre, setGenre] = useState("Popular Neuroscience & Leadership");
  const [premise, setPremise] = useState(
    "Instinct is not the enemy of good thinking — it is the compressed intelligence of lived experience."
  );
  const [showConfig, setShowConfig] = useState(false);

  // Refs
  const abortControllerRef = useRef<AbortController | null>(null);
  const manuscriptEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll manuscript smoothly as tokens arrive
  useEffect(() => {
    if (pipelineStatus === "drafting" && manuscriptEndRef.current) {
      manuscriptEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [streamedProse, pipelineStatus]);

  // Update word count
  useEffect(() => {
    if (!streamedProse) {
      setWordCount(0);
      return;
    }
    const words = streamedProse.trim().split(/\s+/).filter(Boolean).length;
    setWordCount(words);
  }, [streamedProse]);

  // Read SSE stream helper
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
        if (trimmed.startsWith("data: ")) {
          const rawJson = trimmed.slice(6);
          try {
            const data = JSON.parse(rawJson);

            if (data.session_id && !sessionId) {
              setSessionId(data.session_id);
            }

            // 1. Status event
            if (data.type === "status") {
              setStatusMessage(data.message || data.status);
              if (data.current_node) {
                setCurrentNode(data.current_node);
                if (data.current_node === "plan_step") setPipelineStatus("planning");
                else if (data.current_node === "execute_step") setPipelineStatus("drafting");
                else if (data.current_node === "replan_step") setPipelineStatus("summarizing");
              }
            }

            // 2. Plan event
            else if (data.type === "plan" && Array.isArray(data.plan)) {
              const newPlan: SubSectionTask[] = data.plan.map((item: any, idx: number) => ({
                sub_section_id: item.sub_section_id || `Sub-${idx + 1}`,
                title: item.title || `Sub-Section ${idx + 1}`,
                one_sentence_summary: item.one_sentence_summary || "",
                writing_directive: item.writing_directive || "",
                status: idx === 0 ? "in_progress" : "pending",
              }));
              setPlan(newPlan);
              if (newPlan.length > 0) {
                setCurrentTaskTitle(newPlan[0].title);
                setEditableTaskTitle(newPlan[0].title);
                setEditableDirective(newPlan[0].writing_directive || "");
              }
            }

            // 3. HITL Interrupt / Pause event
            else if (data.type === "hitl_pause") {
              setPipelineStatus("waiting_for_approval");
              setStatusMessage("Review Mode: AI paused for human approval before drafting.");
              setCurrentNode("human_review");
              if (data.thread_id) setSessionId(data.thread_id);
              if (data.target_task) setCurrentTaskTitle(data.target_task);

              if (data.plan && Array.isArray(data.plan) && data.plan.length > 0) {
                const currentTask = data.plan[0];
                setEditableTaskTitle(currentTask.title || "");
                setEditableDirective(currentTask.writing_directive || "");
              }
              if (data.past_steps && Array.isArray(data.past_steps) && data.past_steps.length > 0) {
                setEditableSummary(data.past_steps[data.past_steps.length - 1]);
              }
            }

            // 4. Token stream event
            else if (data.type === "token") {
              setPipelineStatus("drafting");
              setStreamedProse((prev) => prev + data.content);
              if (data.sub_section) {
                setCurrentTaskTitle(data.sub_section);
                setPlan((prevPlan) =>
                  prevPlan.map((p) =>
                    p.title === data.sub_section ? { ...p, status: "in_progress" } : p
                  )
                );
              }
            }

            // 5. Replan event
            else if (data.type === "replan") {
              if (data.latest_summary) {
                setPastSummaries((prev) => [...prev, data.latest_summary]);
                setEditableSummary(data.latest_summary);
              }
              if (data.next_task) {
                setCurrentTaskTitle(data.next_task);
                setEditableTaskTitle(data.next_task);
                setPlan((prevPlan) =>
                  prevPlan.map((p) => {
                    if (p.status === "in_progress") return { ...p, status: "completed" };
                    if (p.title === data.next_task) return { ...p, status: "in_progress" };
                    return p;
                  })
                );
              }
            }

            // 6. Complete event
            else if (data.type === "done") {
              setPipelineStatus("completed");
              setStatusMessage("Book generation complete!");
              setCurrentNode("completed");
              setPlan((prevPlan) => prevPlan.map((p) => ({ ...p, status: "completed" })));
            }

            // 7. Error event
            else if (data.type === "error") {
              setErrorMessage(data.message);
              setPipelineStatus("idle");
            }
          } catch (err) {
            console.warn("SSE chunk parse warning:", err);
          }
        }
      }
    }
  }

  // 1. Initialise / Start Generation
  async function startGeneration() {
    setPipelineStatus("planning");
    setErrorMessage(null);
    setStreamedProse("");
    setPastSummaries([]);
    setStatusMessage("Connecting to AI System...");

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch("/api/write", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          title: bookTitle,
          genre: genre,
          premise: premise,
          target_audience: "Leaders, Executives, and Personal Growth Seekers",
          total_chapters: 5,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
      await readSSEStream(response);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setErrorMessage(err.message || "Failed to start stream");
        setPipelineStatus("idle");
      }
    }
  }

  // 2. Resume Endpoint Call (Approve & Draft / Edit & Continue)
  async function resumeGeneration(applyEdits: boolean = false) {
    if (!sessionId) {
      setErrorMessage("No active session ID found to resume.");
      return;
    }

    setPipelineStatus("drafting");
    setStatusMessage("Resuming generation...");
    setErrorMessage(null);

    abortControllerRef.current = new AbortController();

    // Prepare updated plan / state
    let updatedPlan = plan;
    if (applyEdits && plan.length > 0) {
      updatedPlan = plan.map((p, idx) =>
        idx === 0
          ? {
              ...p,
              title: editableTaskTitle || p.title,
              writing_directive: editableDirective || p.writing_directive,
            }
          : p
      );
      setPlan(updatedPlan);
    }

    let updatedSummaries = pastSummaries;
    if (applyEdits && editableSummary && pastSummaries.length > 0) {
      updatedSummaries = [...pastSummaries];
      updatedSummaries[updatedSummaries.length - 1] = editableSummary;
      setPastSummaries(updatedSummaries);
    }

    try {
      const response = await fetch("/api/resume", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          thread_id: sessionId,
          plan: updatedPlan,
          past_steps: updatedSummaries,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
      await readSSEStream(response);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setErrorMessage(err.message || "Failed to resume stream");
        setPipelineStatus("waiting_for_approval");
      }
    }
  }

  function handleStop() {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    setPipelineStatus("idle");
    setStatusMessage("Generation paused by user.");
  }

  const completedCount = plan.filter((p) => p.status === "completed").length;
  const progressPercent = plan.length > 0 ? Math.round((completedCount / plan.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Header */}
      <header className="h-16 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-xl sticky top-0 z-50 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 p-0.5 shadow-lg shadow-cyan-500/20">
            <div className="h-full w-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Brain className="h-5 w-5 text-cyan-400" />
            </div>
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-100 flex items-center gap-2">
              Scriptorium AI
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                HITL Redis Checkpoint
              </span>
            </h1>
            <p className="text-xs text-slate-400">Context-Isolated SSE Pipeline with Review Gates</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/80 text-xs font-medium text-slate-300 hover:text-white"
          >
            <Sliders className="h-3.5 w-3.5 text-cyan-400" /> Config
          </button>

          {pipelineStatus === "idle" || pipelineStatus === "completed" ? (
            <button
              onClick={startGeneration}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/25"
            >
              <Play className="h-4 w-4 fill-slate-950" /> Generate Manuscript
            </button>
          ) : pipelineStatus === "waiting_for_approval" ? (
            <button
              onClick={() => resumeGeneration(false)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/25"
            >
              <Check className="h-4 w-4 stroke-[3]" /> Approve & Resume
            </button>
          ) : (
            <button
              onClick={handleStop}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold text-xs"
            >
              <Pause className="h-4 w-4 fill-rose-400" /> Pause Pipeline
            </button>
          )}
        </div>
      </header>

      {/* Config Drawer */}
      <AnimatePresence>
        {showConfig && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-b border-slate-800 bg-slate-900/90 px-6 py-4 backdrop-blur-md"
          >
            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Book Title
                </label>
                <input
                  type="text"
                  value={bookTitle}
                  onChange={(e) => setBookTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Genre
                </label>
                <input
                  type="text"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Premise
                </label>
                <input
                  type="text"
                  value={premise}
                  onChange={(e) => setPremise(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Progress Tracker & HITL Review Controls */}
        <aside className="w-80 border-r border-slate-800/80 bg-slate-900/40 flex flex-col justify-between hidden md:flex shrink-0 p-4 space-y-6">
          <div className="space-y-4 overflow-y-auto pr-1">
            {/* Status Panel */}
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-cyan-400" /> State Node
                </span>
                <span
                  className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded border ${
                    pipelineStatus === "waiting_for_approval"
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                      : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                  }`}
                >
                  {currentNode}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
                {pipelineStatus === "waiting_for_approval" ? (
                  <Eye className="h-4 w-4 text-amber-400 animate-pulse" />
                ) : pipelineStatus === "drafting" || pipelineStatus === "planning" ? (
                  <CircleDashed className="h-4 w-4 text-cyan-400 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                )}
                <span className="truncate">{statusMessage}</span>
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-semibold text-slate-400 mb-1">
                  <span>Sub-Section Progress</span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                    animate={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* HITL Review Mode Card (when paused at interrupt_before) */}
            <AnimatePresence>
              {pipelineStatus === "waiting_for_approval" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/40 text-amber-100 space-y-3 shadow-xl"
                >
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
                    <Edit3 className="h-4 w-4" /> Review Mode Active
                  </div>
                  <p className="text-xs text-amber-200/80 leading-relaxed">
                    The AI completed planning / memory compression and is paused at the checkpoint. Edit the target sub-section or summary below, then approve.
                  </p>

                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold text-amber-300 uppercase block">
                      Target Sub-Section Title
                    </label>
                    <input
                      type="text"
                      value={editableTaskTitle}
                      onChange={(e) => setEditableTaskTitle(e.target.value)}
                      className="w-full bg-slate-950 border border-amber-500/30 rounded-lg px-2.5 py-1 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
                    />

                    {editableDirective && (
                      <>
                        <label className="text-[11px] font-semibold text-amber-300 uppercase block pt-1">
                          Writing Directive
                        </label>
                        <textarea
                          rows={3}
                          value={editableDirective}
                          onChange={(e) => setEditableDirective(e.target.value)}
                          className="w-full bg-slate-950 border border-amber-500/30 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400 font-sans"
                        />
                      </>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-2 pt-1">
                    <button
                      onClick={() => resumeGeneration(false)}
                      className="w-full py-2 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition"
                    >
                      <Check className="h-3.5 w-3.5 stroke-[3]" /> Approve & Draft Next Section
                    </button>
                    <button
                      onClick={() => resumeGeneration(true)}
                      className="w-full py-2 px-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-semibold text-xs flex items-center justify-center gap-1.5 transition"
                    >
                      <ArrowRight className="h-3.5 w-3.5" /> Edit & Continue
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Sub-Sections List */}
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-blue-400" /> Sub-Section Queue ({plan.length})
              </h2>
              <div className="space-y-2">
                {plan.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-lg border text-xs ${
                      item.status === "in_progress"
                        ? "bg-cyan-950/40 border-cyan-500/50 text-cyan-100"
                        : item.status === "completed"
                        ? "bg-slate-900/60 border-slate-800 text-slate-400"
                        : "bg-slate-950/40 border-slate-800/30 text-slate-500"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {item.status === "completed" ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" />
                      ) : item.status === "in_progress" ? (
                        <CircleDashed className="h-3.5 w-3.5 text-cyan-400 animate-spin mt-0.5 shrink-0" />
                      ) : (
                        <div className="h-3.5 w-3.5 rounded-full border border-slate-700 mt-0.5 shrink-0" />
                      )}
                      <span className="font-medium">{item.title}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-between text-xs text-slate-400 font-medium">
            <span>Words: <strong className="text-slate-200">{wordCount}</strong></span>
            <span>Summaries: <strong className="text-slate-200">{pastSummaries.length}</strong></span>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-slate-950 flex flex-col items-center p-6 md:p-10">
          {errorMessage && (
            <div className="w-full max-w-3xl mb-6 p-4 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-200 flex items-start gap-3 text-sm">
              <ShieldAlert className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block text-rose-300">Stream Error</strong>
                {errorMessage}
              </div>
            </div>
          )}

          <div className="w-full max-w-3xl bg-slate-900/70 border border-slate-800 rounded-2xl p-8 md:p-14 shadow-2xl space-y-6 min-h-[750px] relative">
            <div className="border-b border-slate-800 pb-6 flex justify-between items-center">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-cyan-400 block mb-1">
                  {genre}
                </span>
                <h2 className="text-2xl md:text-3xl font-serif font-bold text-slate-100">
                  {bookTitle}
                </h2>
              </div>
              {pipelineStatus === "drafting" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" /> Drafting Live
                </span>
              )}
            </div>

            {currentTaskTitle && (
              <div className="py-2 px-3.5 rounded-lg bg-cyan-950/30 border border-cyan-500/20 text-xs text-cyan-300 font-medium flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                <span>Active Target: {currentTaskTitle}</span>
              </div>
            )}

            {!streamedProse && pipelineStatus === "idle" ? (
              <div className="py-24 text-center space-y-4">
                <BookOpen className="h-12 w-12 text-slate-700 mx-auto" />
                <h3 className="text-lg font-serif font-semibold text-slate-400">
                  Manuscript Page Ready
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Click <strong>"Generate Manuscript"</strong> to start the LangGraph pipeline with Redis checkpointer and HITL approval checkpoints.
                </p>
              </div>
            ) : (
              <div className="prose prose-invert prose-cyan max-w-none font-serif text-slate-300 text-base md:text-lg leading-relaxed whitespace-pre-wrap">
                {streamedProse}
                {pipelineStatus === "drafting" && (
                  <motion.span
                    animate={{ opacity: [1, 0] }}
                    transition={{ repeat: Infinity, duration: 0.7 }}
                    className="inline-block w-2.5 h-5 ml-1 bg-cyan-400 align-middle"
                  />
                )}
              </div>
            )}

            {pipelineStatus === "summarizing" && (
              <div className="py-4 px-5 rounded-xl bg-slate-950/80 border border-cyan-500/30 flex items-center gap-3 text-xs text-cyan-300 font-mono">
                <Brain className="h-4 w-4 text-cyan-400 animate-pulse" />
                <span>Compressing completed sub-section memory...</span>
              </div>
            )}

            <div ref={manuscriptEndRef} />
          </div>
        </main>
      </div>
    </div>
  );
}
