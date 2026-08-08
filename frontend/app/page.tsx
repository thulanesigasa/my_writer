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

type ActiveTab = "grid" | "reader" | "context" | "pipeline";
type FilterTab = "all" | "in_progress" | "completed";

interface SubSectionTask {
  sub_section_id?: string;
  chapter_number?: number;
  title: string;
  target_word_count?: number;
  one_sentence_summary?: string;
  writing_directive?: string;
  status?: "pending" | "in_progress" | "completed";
  draft_prose?: string;
}

// ── Apple Design Tokens & Spring Physics ──────────────────────────────────────
const ACCENT = "#007AFF"; // Apple SF Blue
const APPLE_SPRING = { type: "spring" as const, bounce: 0, duration: 0.35 };

const COVER_GRADIENTS: [string, string][] = [
  ["#007AFF", "#5856D6"], // Apple Blue → Purple
  ["#34C759", "#30B0C7"], // Apple Mint → Teal
  ["#FF9500", "#FF2D55"], // Apple Orange → Pink
  ["#5856D6", "#AF52DE"], // Apple Indigo → Magenta
  ["#00C7BE", "#30B0C7"], // Apple Teal → Cyan
];

// Default pre-populated outline for "The Power of Instinct" based on /docs/book_outline.md
const DEFAULT_CHAPTER_PLAN: SubSectionTask[] = [
  {
    sub_section_id: "sec-1",
    chapter_number: 1,
    title: "Chapter 1: The Architecture of Instinct",
    target_word_count: 2500,
    one_sentence_summary:
      "Dismantling the conflation between reflex, instinct, and intuition through Dr. Amara Osei's emergency room case study.",
    writing_directive:
      "Open with Dr. Osei's hospital ER scene. Define reflex (spinal arc), instinct (species predisposition), and intuition (rapid pattern matching).",
    status: "completed",
    draft_prose: `# Chapter 1: The Architecture of Instinct\n\n## The Emergency Room at 3:14 AM\n\nDr. Amara Osei stood at the foot of Bed 4 in the acute trauma bay. The patient, a forty-two-year-old software architect named David Vance, had arrived twenty minutes earlier complaining of non-specific abdominal discomfort. By every objective metric available to modern medicine, he was stable.\n\nHis blood pressure was 122 over 78. His pulse oxygenation registered 98 percent. His bedside ultrasound showed no free fluid in the peritoneal cavity, and his preliminary blood panel was unremarkable. Yet Dr. Osei felt an unmistakable contraction in her chest — a somatic signal earned over sixteen years of critical care.\n\n"Prepare Operating Room 3," she told the attending charge nurse.\n\n"Dr. Osei," the surgical resident hesitated, "the CT scan hasn't come back yet, and his vitals are completely within normal limits."\n\n"Prepare OR 3 now," she repeated, her voice even but unyielding.\n\nForty minutes later, while opening the abdomen, the surgical team discovered a micro-perforation of the retroperitoneal artery. Had they waited for the routine CT results to process, Mr. Vance would have hemorrhaged silently into his abdomen before dawn. What Dr. Osei experienced was not a sixth sense or mystical foresight. It was compressed expertise operating below the threshold of conscious language.`
  },
  {
    sub_section_id: "sec-2",
    chapter_number: 2,
    title: "Chapter 2: The Limbic System Myth & Reality",
    target_word_count: 2500,
    one_sentence_summary:
      "Deconstructing MacLean's Triune Brain myth using Antonio Damasio's Somatic Marker Hypothesis and Phineas Gage's clinical case.",
    writing_directive:
      "Re-examine Phineas Gage and Damasio's Iowa Gambling Task. Prove that emotion is the biological precondition for rational decision-making.",
    status: "in_progress",
    draft_prose: `# Chapter 2: The Limbic System Myth & Reality\n\n## The Iron Bar and the Illusion of Rationality\n\nOn September 13, 1848, in Cavendish, Vermont, a twenty-five-year-old railroad construction foreman named Phineas Gage suffered one of the most famous injuries in medical history. A three-foot-seven-inch tamping iron was driven directly through his left cheek, penetrating the ventromedial prefrontal cortex and exiting the top of his skull.\n\nGage survived the physical trauma. He could walk, speak, and calculate arithmetic with full retention of his intellectual memory. Yet, as his physician Dr. John Harlow famously observed, "Gage was no longer Gage." The disciplined, balanced foreman became erratic, irreverent, and utterly incapable of executing long-term plans.\n\nDecades later, neuroscientist Antonio Damasio realized what Gage's tragic case demonstrated: emotion and bodily signals (somatic markers) are not adversaries of rational choice. They are its indispensable guidance system.`
  },
  {
    sub_section_id: "sec-3",
    chapter_number: 3,
    title: "Chapter 3: Evolutionary Importance & RPD Model",
    target_word_count: 2500,
    one_sentence_summary:
      "Gary Klein's Recognition-Primed Decision model for firefighters and epigenetic transmission of ancestral survival adaptations.",
    writing_directive:
      "Explore Gary Klein's RPD model with fire commanders and the Dutch Hunger Winter epigenetics data. Show how ancestral memory informs bodily gut signals.",
    status: "pending",
  },
  {
    sub_section_id: "sec-4",
    chapter_number: 4,
    title: "Chapter 4: The Power to Destroy and Create",
    target_word_count: 2500,
    one_sentence_summary:
      "The dual nature of subcortical processing: oxytocin-driven tribalism vs. Default Mode Network creative insight.",
    writing_directive:
      "Analyze the oxytocin paradox (in-group bonding vs out-group derogation) alongside DMN mind-wandering and creative breakthroughs.",
    status: "pending",
  },
  {
    sub_section_id: "sec-5",
    chapter_number: 5,
    title: "Chapter 5: Designing for Integration & Mastery",
    target_word_count: 2500,
    one_sentence_summary:
      "Practical cognitive architecture for calibrating gut feelings, environment design, and deliberate practice.",
    writing_directive:
      "Provide actionable cognitive tools to audit, calibrate, and synthesize analytical thinking with bodily intuition.",
    status: "pending",
  }
];

// Context Anchor Docs available in /docs folder
const CONTEXT_DOCS = [
  { name: "story_bible.md", title: "Story Bible & Personas", words: "3,400 words", tag: "Core Thesis" },
  { name: "book_outline.md", title: "Scene-by-Scene Roadmap", words: "12,500 words", tag: "Outline" },
  { name: "research_database.md", title: "Neuroscience Studies", words: "5,100 words", tag: "Evidence" },
  { name: "case_studies.md", title: "Clinical Case Repository", words: "4,200 words", tag: "Narrative" },
  { name: "system_rules.md", title: "Style & Hallucination Guardrails", words: "2,800 words", tag: "Rules" },
  { name: "expansion_framework.md", title: "Section Expansion Formula", words: "1,900 words", tag: "Framework" },
];

// ── Helper Components ─────────────────────────────────────────────────────────

function StatusPill({ status }: { status?: string }) {
  const isDone = status === "completed";
  const isLive = status === "in_progress";

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-tight">
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          isDone ? "bg-emerald-500" : isLive ? "bg-amber-500 animate-pulse" : "bg-stone-300"
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
        {isDone ? "Completed" : isLive ? "In Progress" : "Queued"}
      </span>
    </div>
  );
}

function SectionCover({ index }: { index: number }) {
  const [a, b] = COVER_GRADIENTS[index % COVER_GRADIENTS.length];
  const num = String(index + 1).padStart(2, "0");

  return (
    <div
      className="relative w-full h-full overflow-hidden rounded-t-2xl"
      style={{ background: `linear-gradient(135deg, ${a}, ${b})` }}
    >
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

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span
          className="font-black text-white leading-none select-none tabular-nums tracking-tighter"
          style={{ fontSize: "6.5rem", opacity: 0.12 }}
        >
          {num}
        </span>
      </div>

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
          <button
            onClick={onProseClick}
            className="w-full py-2 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-xs uppercase tracking-widest text-center hover:bg-emerald-100 transition apple-pressable"
          >
            Read Draft
          </button>
        ) : item.status === "in_progress" ? (
          <button
            onClick={onProseClick}
            className="w-full py-2 rounded-xl bg-amber-50 text-amber-700 font-bold text-xs uppercase tracking-widest text-center hover:bg-amber-100 transition apple-pressable"
          >
            Drafting Live...
          </button>
        ) : (
          <div className="w-full py-2 rounded-xl bg-stone-100/70 text-stone-400 font-semibold text-xs uppercase tracking-widest text-center">
            Queued
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Main Dashboard Component ──────────────────────────────────────────────────
export default function HomePage() {
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("Ready to write");
  const [currentNode, setCurrentNode] = useState<string>("idle");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [plan, setPlan] = useState<SubSectionTask[]>(DEFAULT_CHAPTER_PLAN);
  const [currentTaskTitle, setCurrentTaskTitle] = useState<string>(DEFAULT_CHAPTER_PLAN[1].title);
  const [streamedProse, setStreamedProse] = useState<string>(DEFAULT_CHAPTER_PLAN[0].draft_prose || "");
  const [pastSummaries, setPastSummaries] = useState<string[]>([
    "Chapter 1 summarized: Defined reflex vs instinct vs intuition through Dr. Osei trauma ER case."
  ]);
  const [wordCount, setWordCount] = useState<number>(3150);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editableTaskTitle, setEditableTaskTitle] = useState<string>(DEFAULT_CHAPTER_PLAN[1].title);
  const [editableDirective, setEditableDirective] = useState<string>(DEFAULT_CHAPTER_PLAN[1].writing_directive || "");
  const [bookTitle, setBookTitle] = useState("The Power of Instinct");
  const [genre, setGenre] = useState("Popular Neuroscience & Leadership");
  const [premise, setPremise] = useState(
    "Instinct is not the enemy of good thinking — it is the compressed intelligence of lived experience."
  );
  
  const [activeTab, setActiveTab] = useState<ActiveTab>("grid");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showConfig, setShowConfig] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const proseEnd = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (pipelineStatus === "drafting") proseEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [streamedProse, pipelineStatus]);

  useEffect(() => {
    const computed = streamedProse.trim().split(/\s+/).filter(Boolean).length;
    if (computed > 0) setWordCount(2500 + computed);
  }, [streamedProse]);

  // ── SSE Stream Reader ───────────────────────────────────────────────────────
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

  // ── Actions ─────────────────────────────────────────────────────────────────
  async function startGeneration() {
    setPipelineStatus("planning");
    setErrorMessage(null);
    setStreamedProse("");
    setPastSummaries([]);
    setActiveTab("reader");
    setStatusMessage("Connecting to LangGraph Pipeline...");
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
    setActiveTab("reader");
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

  // ── Derived Values ──────────────────────────────────────────────────────────
  const completedCount = plan.filter((p) => p.status === "completed").length;
  const inProgressCount = plan.filter((p) => p.status === "in_progress").length;
  const pendingCount = plan.filter((p) => p.status === "pending").length;
  const progressPercent = plan.length > 0 ? Math.round((completedCount / plan.length) * 100) : 0;
  const isRunning = ["planning", "researching", "drafting", "summarizing", "compiling"].includes(
    pipelineStatus
  );

  const filteredPlan = plan.filter((p) => {
    if (filterTab === "in_progress" && p.status === "pending") return false;
    if (filterTab === "completed" && p.status !== "completed") return false;
    if (searchQuery && !p.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen font-sans flex flex-col bg-[#F2F2F7]">
      {/* ── Apple Translucent Glass Header ────────────────────────────────────── */}
      <header className="h-20 apple-glass sticky top-0 z-50 flex items-center justify-between px-8 shadow-sm">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-blue-500/20">
            S
          </div>
          <div>
            <p className="text-lg font-bold text-stone-900 leading-tight tracking-tight apple-heading">
              Scriptorium
            </p>
            <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-widest">
              AI Book Writer &amp; Workspace
            </p>
          </div>
        </div>

        {/* Workspace Segmented View Switcher */}
        <div className="flex bg-stone-200/60 p-1 rounded-full text-xs font-bold shadow-inner">
          <button
            onClick={() => setActiveTab("grid")}
            className={`px-5 py-2 rounded-full transition apple-pressable ${
              activeTab === "grid"
                ? "bg-white text-[#007AFF] shadow-sm font-extrabold"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            Chapter Grid
          </button>
          <button
            onClick={() => setActiveTab("reader")}
            className={`px-5 py-2 rounded-full transition apple-pressable ${
              activeTab === "reader"
                ? "bg-white text-[#007AFF] shadow-sm font-extrabold"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            Manuscript Reader
          </button>
          <button
            onClick={() => setActiveTab("context")}
            className={`px-5 py-2 rounded-full transition apple-pressable ${
              activeTab === "context"
                ? "bg-white text-[#007AFF] shadow-sm font-extrabold"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            Context Bible (6)
          </button>
          <button
            onClick={() => setActiveTab("pipeline")}
            className={`px-5 py-2 rounded-full transition apple-pressable ${
              activeTab === "pipeline"
                ? "bg-white text-[#007AFF] shadow-sm font-extrabold"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            Pipeline Inspector
          </button>
        </div>

        {/* Global Primary Actions */}
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
              Download .md
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
              Approve Next
            </button>
          ) : (
            <button
              onClick={startGeneration}
              className="px-6 py-2.5 rounded-full text-white font-bold text-sm transition apple-pressable shadow-md shadow-blue-500/20"
              style={{ backgroundColor: ACCENT }}
            >
              Start Pipeline
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

      {/* ── Main Workspace Body ──────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Sidebar (30% Surface White) ────────────────────────────────────── */}
        <aside className="w-80 shrink-0 bg-white/80 backdrop-blur-lg border-r border-stone-200/80 hidden lg:flex flex-col px-6 py-8 gap-8 overflow-y-auto">
          {/* Pipeline Metric Widget */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-3">
              Manuscript Pipeline
            </p>
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-3">
              <div className="flex items-center gap-3">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    isRunning
                      ? "bg-blue-500 animate-pulse"
                      : pipelineStatus === "completed"
                      ? "bg-emerald-500"
                      : "bg-amber-500"
                  }`}
                />
                <span className="text-sm font-bold text-stone-800 leading-snug">
                  {statusMessage}
                </span>
              </div>

              {currentNode !== "idle" && (
                <p className="text-xs font-mono text-stone-500 px-3 py-1.5 bg-white rounded-lg border border-stone-200/60">
                  Node: {currentNode}
                </p>
              )}

              <div className="pt-2 border-t border-stone-200/60">
                <div className="flex justify-between text-xs text-stone-500 mb-1.5 font-semibold">
                  <span>Overall Completion</span>
                  <span className="text-stone-800 font-bold">{progressPercent}%</span>
                </div>
                <div className="h-2 bg-stone-200/60 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: ACCENT }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={APPLE_SPRING}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-stone-100" />

          {/* Quick Chapter Nav */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-3">
              Book Structure (5 Chapters)
            </p>
            <div className="space-y-1.5">
              {plan.map((ch, idx) => (
                <button
                  key={ch.sub_section_id || idx}
                  onClick={() => {
                    setCurrentTaskTitle(ch.title);
                    if (ch.draft_prose) setStreamedProse(ch.draft_prose);
                    setActiveTab("reader");
                  }}
                  className={`w-full text-left p-3 rounded-xl transition text-xs flex items-center justify-between apple-pressable ${
                    currentTaskTitle === ch.title
                      ? "bg-blue-50/80 border border-blue-200/80 text-[#007AFF] font-bold"
                      : "bg-stone-50/50 hover:bg-stone-100/70 border border-transparent text-stone-700 font-medium"
                  }`}
                >
                  <span className="truncate pr-2">{ch.title}</span>
                  <StatusPill status={ch.status} />
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
                className="p-5 rounded-2xl bg-amber-50/90 border border-amber-200 space-y-4"
              >
                <p className="text-xs font-bold uppercase tracking-widest text-amber-800">
                  Review Required
                </p>
                <p className="text-xs text-amber-900 leading-relaxed">
                  Review upcoming section instructions before authorizing generation.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-amber-800 mb-1">
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
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-amber-800 mb-1">
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
                  className="w-full py-2.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs uppercase tracking-widest transition apple-pressable"
                >
                  Edit &amp; Continue
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Stats Footer */}
          <div className="mt-auto pt-6 border-t border-stone-100 space-y-2 text-xs text-stone-500">
            <div className="flex justify-between">
              <span>Total Drafted Words</span>
              <span className="font-bold text-stone-800 tabular-nums">
                {wordCount.toLocaleString()} words
              </span>
            </div>
            <div className="flex justify-between">
              <span>Target Manuscript Length</span>
              <span className="font-bold text-stone-800 tabular-nums">12,500 words (50 pgs)</span>
            </div>
          </div>
        </aside>

        {/* ── Main Canvas (60% Off-White #F2F2F7) ─────────────────────────────── */}
        <main className="flex-1 overflow-y-auto flex flex-col">
          {/* Sub Header */}
          <div className="bg-white/80 backdrop-blur-md border-b border-stone-200/80 px-8 py-4 flex items-center justify-between shrink-0">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-0.5">
                {genre}
              </p>
              <h1 className="text-xl font-bold text-stone-900 tracking-tight apple-heading">
                {bookTitle}
              </h1>
            </div>

            {/* Filter Pill Controls */}
            {activeTab === "grid" && (
              <div className="flex bg-stone-100 p-1 rounded-full text-xs font-bold">
                {(["all", "in_progress", "completed"] as FilterTab[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilterTab(t)}
                    className={`px-4 py-1.5 rounded-full transition capitalize apple-pressable ${
                      filterTab === t
                        ? "bg-white text-[#007AFF] shadow-sm font-extrabold"
                        : "text-stone-500 hover:text-stone-800"
                    }`}
                  >
                    {t.replace("_", " ")}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Canvas Tab Content */}
          <div className="flex-1 p-8">
            {/* ── TAB 1: Chapter Grid ── */}
            {activeTab === "grid" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-stone-900 apple-heading">
                      Manuscript Chapters
                    </h2>
                    <p className="text-xs text-stone-500">
                      Click any section card to preview draft prose or modify directives.
                    </p>
                  </div>
                  <div className="text-xs font-bold text-stone-500 bg-white border border-stone-200 px-4 py-2 rounded-full shadow-sm">
                    {completedCount} / {plan.length} Chapters Completed
                  </div>
                </div>

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
                        onProseClick={() => {
                          setCurrentTaskTitle(item.title);
                          if (item.draft_prose) setStreamedProse(item.draft_prose);
                          setActiveTab("reader");
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── TAB 2: Manuscript Reader / Editor ── */}
            {activeTab === "reader" && (
              <div className="max-w-3xl mx-auto">
                <div className="bg-white rounded-3xl border border-stone-200/80 shadow-sm p-10 md:p-14">
                  <div className="flex items-start justify-between mb-8 pb-6 border-b border-stone-100 gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-1">
                        Active Chapter Draft
                      </p>
                      <h2 className="text-2xl font-bold text-stone-900 apple-heading">
                        {currentTaskTitle}
                      </h2>
                    </div>
                    <div className="flex items-center gap-2">
                      {pipelineStatus === "drafting" ? (
                        <span
                          className="px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest text-white shadow-sm"
                          style={{ backgroundColor: ACCENT }}
                        >
                          Streaming Live
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(streamedProse);
                            alert("Copied manuscript prose to clipboard!");
                          }}
                          className="px-4 py-2 rounded-full border border-stone-200 text-xs font-bold text-stone-700 hover:bg-stone-50 transition apple-pressable"
                        >
                          Copy Markdown
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="apple-serif text-stone-800 leading-[1.9] text-lg whitespace-pre-wrap">
                    {streamedProse || (
                      <span className="text-stone-400 italic">
                        No draft prose streaming yet. Click "Start Pipeline" or "Approve Next" in the header to generate this chapter.
                      </span>
                    )}
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
              </div>
            )}

            {/* ── TAB 3: Context Bible ── */}
            {activeTab === "context" && (
              <div className="max-w-4xl mx-auto">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-stone-900 apple-heading">
                    Persistent Context Anchor Knowledge Files
                  </h2>
                  <p className="text-xs text-stone-500">
                    These 6 files are loaded into GPT-4o's system prompt to prevent hallucination across chapter runs.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {CONTEXT_DOCS.map((doc, idx) => (
                    <div
                      key={idx}
                      className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-sm hover:shadow-md transition apple-pressable flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-widest bg-blue-50 text-[#007AFF] px-2.5 py-1 rounded-full">
                            {doc.tag}
                          </span>
                          <span className="text-xs font-mono text-stone-400">{doc.words}</span>
                        </div>
                        <h3 className="text-base font-bold text-stone-900 mb-1 apple-heading">
                          {doc.title}
                        </h3>
                        <p className="text-xs font-mono text-stone-500">/docs/{doc.name}</p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500 font-semibold">
                        <span>Status: Active Anchor</span>
                        <span className="text-[#007AFF] font-bold">Loaded into Memory</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── TAB 4: Pipeline Inspector ── */}
            {activeTab === "pipeline" && (
              <div className="max-w-3xl mx-auto">
                <div className="bg-white rounded-3xl border border-stone-200/80 p-8 shadow-sm space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-stone-900 apple-heading mb-1">
                      LangGraph Execution Graph
                    </h2>
                    <p className="text-xs text-stone-500">
                      State machine flow with Redis persistence checkpoints and Human-in-the-Loop review nodes.
                    </p>
                  </div>

                  <div className="space-y-3 font-mono text-xs">
                    {[
                      { node: "plan_step", desc: "GPT-4o-mini generates sub-section JSON task queue" },
                      { node: "human_review", desc: "HITL Interruption — user approves/edits task before execution" },
                      { node: "research_step", desc: "Tavily Web Search gathers live empirical facts & case studies" },
                      { node: "execute_step", desc: "GPT-4o drafts 1,200–2,500 word prose & streams tokens via SSE" },
                      { node: "replan_step", desc: "GPT-4o-mini compresses draft into 150-word summary, appends to full_manuscript" },
                      { node: "front_matter_step", desc: "Generates Preface, Title Page, Table of Contents" },
                      { node: "back_matter_step", desc: "Generates Conclusion, Glossary, Acknowledgments" },
                      { node: "compile_book_step", desc: "Writes complete manuscript to backend/output/<Title>_Final.md" },
                    ].map((step, idx) => (
                      <div
                        key={idx}
                        className={`p-4 rounded-xl border flex items-center justify-between ${
                          currentNode === step.node
                            ? "bg-blue-50 border-[#007AFF] text-[#007AFF] font-bold shadow-sm"
                            : "bg-stone-50 border-stone-200/60 text-stone-700"
                        }`}
                      >
                        <div>
                          <span className="font-bold font-mono">{idx + 1}. {step.node}</span>
                          <p className="font-sans text-xs text-stone-500 mt-0.5">{step.desc}</p>
                        </div>
                        {currentNode === step.node && (
                          <span className="px-2.5 py-1 bg-blue-500 text-white rounded-full text-[10px] font-bold uppercase tracking-wider">
                            Active
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
