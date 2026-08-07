"use "client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  CircleDashed,
  Brain,
  Feather,
  Layers,
  FileText,
  Zap,
  ChevronRight,
  ShieldAlert,
  Sliders,
} from "lucide-react";

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
  // State
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Ready to draft");
  const [currentNode, setCurrentNode] = useState<string>("idle");
  const [plan, setPlan] = useState<SubSectionTask[]>([]);
  const [currentTaskTitle, setCurrentTaskTitle] = useState<string>("");
  const [streamedProse, setStreamedProse] = useState<string>("");
  const [pastSummaries, setPastSummaries] = useState<string[]>([]);
  const [wordCount, setWordCount] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
    if (isGenerating && manuscriptEndRef.current) {
      manuscriptEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [streamedProse, isGenerating]);

  // Update word count automatically
  useEffect(() => {
    if (!streamedProse) {
      setWordCount(0);
      return;
    }
    const words = streamedProse.trim().split(/\s+/).filter(Boolean).length;
    setWordCount(words);
  }, [streamedProse]);

  // Function to start real-time SSE stream from FastAPI /api/write
  async function startGeneration() {
    setIsGenerating(true);
    setIsPaused(false);
    setErrorMessage(null);
    setStreamedProse("");
    setPastSummaries([]);
    setStatusMessage("Connecting to AI System...");

    // Default 5-chapter roadmap pre-load while planner agent runs
    const initialDefaultPlan: SubSectionTask[] = [
      { title: "Chapter 1.1: Defining Instinct vs. Reflex vs. Intuition", status: "pending" },
      { title: "Chapter 1.2: The Historical Psychological Context", status: "pending" },
      { title: "Chapter 1.3: Henri Bergson's Philosophy of Conscious Intuition", status: "pending" },
      { title: "Chapter 2.1: Deconstructing the Triune Brain Fallacy", status: "pending" },
      { title: "Chapter 2.2: Antonio Damasio's Somatic Marker Hypothesis", status: "pending" },
      { title: "Chapter 2.3: Gut Feelings as Rapid Data-Processing", status: "pending" },
      { title: "Chapter 3.1: Recognition-Primed Decision (RPD) in High-Stakes Environments", status: "pending" },
      { title: "Chapter 3.2: Epigenetics and Transgenerational Trauma", status: "pending" },
      { title: "Chapter 4.1: The Oxytocin Paradox & In-Group/Out-Group Bias", status: "pending" },
      { title: "Chapter 4.2: The Default Mode Network & Flow States", status: "pending" },
      { title: "Chapter 5.1: Reintegrating Logic with Somatic Markers", status: "pending" },
      { title: "Chapter 5.2: Healing Epigenetic Stress Through Environmental Design", status: "pending" },
      { title: "Chapter 5.3: Cultivating Psychological Safety for Team Innovation", status: "pending" },
    ];
    setPlan(initialDefaultPlan);

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

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error("ReadableStream not supported by response");
      }

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

              // 1. Status event
              if (data.type === "status") {
                setStatusMessage(data.message || data.status);
                if (data.current_node) {
                  setCurrentNode(data.current_node);
                }
              }

              // 2. Plan event (sub-sections generated)
              else if (data.type === "plan" && Array.isArray(data.plan)) {
                const newPlan: SubSectionTask[] = data.plan.map(
                  (item: any, idx: number) => ({
                    sub_section_id: item.sub_section_id || `Sub-${idx + 1}`,
                    title: item.title || `Sub-Section ${idx + 1}`,
                    one_sentence_summary: item.one_sentence_summary || "",
                    writing_directive: item.writing_directive || "",
                    status: idx === 0 ? "in_progress" : "pending",
                  })
                );
                setPlan(newPlan);
                if (newPlan.length > 0) {
                  setCurrentTaskTitle(newPlan[0].title);
                }
              }

              // 3. Token event (real-time streaming prose)
              else if (data.type === "token") {
                setStreamedProse((prev) => prev + data.content);
                if (data.sub_section) {
                  setCurrentTaskTitle(data.sub_section);
                  // Update plan status
                  setPlan((prevPlan) =>
                    prevPlan.map((p) =>
                      p.title === data.sub_section
                        ? { ...p, status: "in_progress" }
                        : p
                    )
                  );
                }
              }

              // 4. Replan event (sub-section finished & compressed)
              else if (data.type === "replan") {
                if (data.latest_summary) {
                  setPastSummaries((prev) => [...prev, data.latest_summary]);
                }
                if (data.next_task) {
                  setCurrentTaskTitle(data.next_task);
                  setPlan((prevPlan) =>
                    prevPlan.map((p) => {
                      if (p.status === "in_progress") {
                        return { ...p, status: "completed" };
                      }
                      if (p.title === data.next_task) {
                        return { ...p, status: "in_progress" };
                      }
                      return p;
                    })
                  );
                }
              }

              // 5. Completion event
              else if (data.type === "done") {
                setIsGenerating(false);
                setStatusMessage("Manuscript complete!");
                setCurrentNode("completed");
                setPlan((prevPlan) =>
                  prevPlan.map((p) => ({ ...p, status: "completed" }))
                );
              }

              // 6. Error event
              else if (data.type === "error") {
                setErrorMessage(data.message);
                setIsGenerating(false);
              }
            } catch (err) {
              console.warn("Failed to parse SSE JSON chunk:", rawJson, err);
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("Stream connection error:", err);
        setErrorMessage(err.message || "Connection failed");
      }
    } finally {
      setIsGenerating(false);
    }
  }

  function handleStop() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsGenerating(false);
    setStatusMessage("Generation stopped by user.");
  }

  // Calculate completed progress percentage
  const completedCount = plan.filter((p) => p.status === "completed").length;
  const progressPercent =
    plan.length > 0 ? Math.round((completedCount / plan.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Navigation Bar */}
      <header className="h-16 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-xl sticky top-0 z-50 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 p-0.5 shadow-lg shadow-cyan-500/20">
            <div className="h-full w-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Brain className="h-5 w-5 text-cyan-400" />
            </div>
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-slate-100 flex items-center gap-2">
              Scriptorium AI
              <span className="text-[10px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                LangGraph v2
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              Context-Isolated Book Generation Pipeline
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/80 text-xs font-medium text-slate-300 hover:text-white hover:border-slate-700 transition"
          >
            <Sliders className="h-3.5 w-3.5 text-cyan-400" />
            Config
          </button>

          {!isGenerating ? (
            <button
              onClick={startGeneration}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/25 transition active:scale-95"
            >
              <Play className="h-4 w-4 fill-slate-950" />
              Generate Manuscript
            </button>
          ) : (
            <button
              onClick={handleStop}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold text-xs hover:bg-rose-500/20 transition"
            >
              <Pause className="h-4 w-4 fill-rose-400" />
              Stop Generation
            </button>
          )}
        </div>
      </header>

      {/* Book Config Overlay */}
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
                  Genre & Tone
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
                  Core Premise
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
        {/* Left Sidebar: Progress Tracker */}
        <aside className="w-80 border-r border-slate-800/80 bg-slate-900/40 flex flex-col justify-between hidden md:flex shrink-0">
          <div className="p-4 flex-1 overflow-y-auto space-y-6">
            {/* Status Panel */}
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-cyan-400" />
                  Pipeline State
                </span>
                <span className="text-[11px] font-mono font-semibold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">
                  {currentNode}
                </span>
              </div>

              {/* Status Message */}
              <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
                {isGenerating ? (
                  <CircleDashed className="h-4 w-4 text-cyan-400 animate-spin shrink-0" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                )}
                <span className="truncate">{statusMessage}</span>
              </div>

              {/* Progress Bar */}
              <div>
                <div className="flex justify-between text-[11px] font-semibold text-slate-400 mb-1">
                  <span>Sub-Section Progress</span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            </div>

            {/* Sub-Section Task List */}
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-blue-400" />
                Sub-Section Execution Queue ({plan.length})
              </h2>

              <div className="space-y-2">
                {plan.map((item, index) => {
                  const isCurrent = item.status === "in_progress";
                  const isCompleted = item.status === "completed";

                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className={`p-2.5 rounded-lg border text-xs transition-all ${
                        isCurrent
                          ? "bg-cyan-950/40 border-cyan-500/50 text-cyan-100 shadow-md shadow-cyan-500/10"
                          : isCompleted
                          ? "bg-slate-900/60 border-slate-800/60 text-slate-400"
                          : "bg-slate-950/40 border-slate-800/30 text-slate-500"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {isCompleted ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" />
                        ) : isCurrent ? (
                          <CircleDashed className="h-3.5 w-3.5 text-cyan-400 animate-spin mt-0.5 shrink-0" />
                        ) : (
                          <div className="h-3.5 w-3.5 rounded-full border border-slate-700 mt-0.5 shrink-0" />
                        )}
                        <div className="flex-1 font-medium leading-tight">
                          {item.title}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Stats Footer */}
          <div className="p-4 border-t border-slate-800/80 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400 font-medium">
            <span className="flex items-center gap-1">
              <Feather className="h-3.5 w-3.5 text-cyan-400" />
              Words: <strong className="text-slate-200">{wordCount}</strong>
            </span>
            <span className="flex items-center gap-1">
              <Zap className="h-3.5 w-3.5 text-amber-400" />
              Summaries: <strong className="text-slate-200">{pastSummaries.length}</strong>
            </span>
          </div>
        </aside>

        {/* Right Main Content Area: Manuscript Page */}
        <main className="flex-1 overflow-y-auto bg-slate-950 flex flex-col items-center p-6 md:p-10 relative">
          {/* Error Banner */}
          {errorMessage && (
            <div className="w-full max-w-3xl mb-6 p-4 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-200 flex items-start gap-3 text-sm">
              <ShieldAlert className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block text-rose-300">Stream Error</strong>
                {errorMessage}
              </div>
            </div>
          )}

          {/* Manuscript Sheet */}
          <div className="w-full max-w-3xl bg-slate-900/70 border border-slate-800/90 rounded-2xl p-8 md:p-14 shadow-2xl backdrop-blur-sm space-y-6 relative min-h-[750px]">
            {/* Header / Meta */}
            <div className="border-b border-slate-800 pb-6 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-cyan-400 block mb-1">
                  {genre}
                </span>
                <h2 className="text-2xl md:text-3xl font-serif font-bold text-slate-100">
                  {bookTitle}
                </h2>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2">
                {isGenerating && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                    Drafting Live
                  </span>
                )}
              </div>
            </div>

            {/* Current Active Task Banner */}
            {currentTaskTitle && (
              <div className="py-2 px-3.5 rounded-lg bg-cyan-950/30 border border-cyan-500/20 text-xs text-cyan-300 font-medium flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                <span>Active Target: {currentTaskTitle}</span>
              </div>
            )}

            {/* Prose Content Area */}
            {!streamedProse && !isGenerating ? (
              <div className="py-24 text-center space-y-4">
                <BookOpen className="h-12 w-12 text-slate-700 mx-auto" />
                <h3 className="text-lg font-serif font-semibold text-slate-400">
                  Manuscript Page Ready
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  Click <strong>"Generate Manuscript"</strong> above to initiate the LangGraph agent pipeline. Watch real-time token streaming as the AI drafts sub-sections using the 6-step expansion framework.
                </p>
              </div>
            ) : (
              <div className="prose prose-invert prose-cyan max-w-none font-serif text-slate-300 text-base md:text-lg leading-relaxed whitespace-pre-wrap">
                {streamedProse}

                {/* Animated Typing Cursor */}
                {isGenerating && (
                  <motion.span
                    animate={{ opacity: [1, 0] }}
                    transition={{ repeat: Infinity, duration: 0.7 }}
                    className="inline-block w-2.5 h-5 ml-1 bg-cyan-400 rounded-xs align-middle"
                  />
                )}
              </div>
            )}

            {/* Pulsing AI Thinking Indicator (between sub-sections) */}
            <AnimatePresence>
              {isGenerating && currentNode === "replan_step" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="py-4 px-5 rounded-xl bg-slate-950/80 border border-cyan-500/30 flex items-center gap-3 text-xs text-cyan-300 font-mono shadow-lg shadow-cyan-500/10"
                >
                  <Brain className="h-4 w-4 text-cyan-400 animate-pulse shrink-0" />
                  <span>Summarising sub-section prose and freeing context window memory...</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div ref={manuscriptEndRef} />
          </div>
        </main>
      </div>
    </div>
  );
}
