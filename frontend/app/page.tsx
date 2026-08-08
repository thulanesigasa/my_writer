"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Settings,
  Search,
  FileText,
  Sliders,
  Download,
  Play,
  Pause,
  Database,
  Copy,
  Check,
  Cpu,
  Layers,
  ArrowRight,
  GitCommit,
  CheckCircle,
  Zap,
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

type ActiveTab = "notes" | "editor" | "context" | "pipeline" | "settings";
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

// ── Black Standalone Footer SVGs (a bit smaller w-3.5 h-3.5, all black) ──────
function LangGraphLogo() {
  return (
    <svg className="w-3.5 h-3.5 inline-block align-middle text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
  );
}

function OpenAILogo() {
  return (
    <svg className="w-3.5 h-3.5 inline-block align-middle fill-current text-black" viewBox="0 0 24 24">
      <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.535-3.0137l.142.0852 4.783 2.7582a.771.771 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.8956zm16.0993 3.8558L12.6007 8.3829l2.02-1.1638a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.3953-.6859zm2.0107-3.0231l-.1419-.0852-4.7735-2.7582a.7758.7758 0 0 0-.7854 0L8.9072 9.2535V6.9211a.0757.0757 0 0 1 .0332-.0615l4.8303-2.7866a4.5016 4.5016 0 0 1 6.6802 4.66zM8.3061 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.052V6.0646a4.5016 4.5016 0 0 1 7.3757-3.4537l-.1419.0804L8.7036 5.4495a.7948.7948 0 0 0-.3927.6813zm1.0936-2.3655l2.6005-1.5 2.6005 1.5v3.0001l-2.6005 1.5-2.6005-1.5z"/>
    </svg>
  );
}

function RedisLogo() {
  return (
    <svg className="w-3.5 h-3.5 inline-block align-middle text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 17.5L12 22L22 17.5M2 12.5L12 17L22 12.5M12 2L2 6.5L12 11L22 6.5L12 2Z" />
    </svg>
  );
}

function PythonLogo() {
  return (
    <svg className="w-3.5 h-3.5 inline-block align-middle fill-current text-black" viewBox="0 0 24 24">
      <path d="M11.88 2C6.9 2 7.23 4.16 7.23 4.16V6.4H12V7.15H5.06S2 6.8 2 11.78c0 4.97 2.67 4.8 2.67 4.8h1.6v-2.28s-.09-2.72 2.67-2.72h4.54s2.58.04 2.58-2.5V4.66S16.5 2 11.88 2zm-1.42 1.48a.95.95 0 1 1 0 1.9.95.95 0 0 1 0-1.9z"/>
      <path d="M12.12 22c4.98 0 4.65-2.16 4.65-2.16V17.6H12v-.75h6.94S22 17.2 22 12.22c0-4.97-2.67-4.8-2.67-4.8h-1.6v2.28s.09 2.72-2.67 2.72h-4.54s-2.58-.04-2.58 2.5v4.5s-.44 2.66 4.18 2.66zm1.42-1.48a.95.95 0 1 1 0-1.9.95.95 0 0 1 0 1.9z"/>
    </svg>
  );
}

function TailwindLogo() {
  return (
    <svg className="w-3.5 h-3.5 inline-block align-middle fill-current text-black" viewBox="0 0 24 24">
      <path d="M12.001 4.8c-3.2 0-5.2 1.6-6 4.8 1.2-1.6 2.6-2.2 4.2-1.8.913.228 1.565.89 2.288 1.624C13.666 10.618 15.027 12 18.001 12c3.2 0 5.2-1.6 6-4.8-1.2 1.6-2.6 2.2-4.2 1.8-.913-.228-1.565-.89-2.288-1.624C16.337 6.182 14.976 4.8 12.001 4.8zm-6 7.2c-3.2 0-5.2 1.6-6 4.8 1.2-1.6 2.6-2.2 4.2-1.8.913.228 1.565.89 2.288 1.624C7.666 17.818 9.027 19.2 12.001 19.2c3.2 0 5.2-1.6 6-4.8-1.2 1.6-2.6 2.2-4.2 1.8-.913-.228-1.565-.89-2.288-1.624C10.337 13.382 8.976 12 6.001 12z"/>
    </svg>
  );
}

// ── Specific Custom Status & Chapter Icons ─────────────────────────────────────

// Black Writing Icon (https://www.svgrepo.com/svg/488479/writing)
function WritingIcon({ className = "w-6 h-6 text-black" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

// In Progress Icon (https://www.svgrepo.com/svg/446775/in-progress)
function InProgressIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-amber-600 inline-block align-middle shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

// Circle Check Filled Icon (https://www.svgrepo.com/svg/500507/circle-check-filled)
function CircleCheckFilledIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-green-600 inline-block align-middle fill-current shrink-0" viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
    </svg>
  );
}

// Sketch Draft / Drafting Live Icon (https://www.svgrepo.com/svg/301272/sketch-draft)
function SketchDraftIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-orange-600 inline-block align-middle shrink-0 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  );
}

const CONTEXT_FILES = [
  { name: "story_bible.md", label: "Story Bible & Personas", size: "14.2 KB", type: "Core Thesis" },
  { name: "book_outline.md", label: "Scene Roadmap & Beats", size: "57.3 KB", type: "Outline" },
  { name: "research_database.md", label: "Neuroscience Database", size: "28.4 KB", type: "Evidence" },
  { name: "case_studies.md", label: "Clinical Case Repository", size: "32.1 KB", type: "Cases" },
  { name: "system_rules.md", label: "Style & Safety Guardrails", size: "19.5 KB", type: "Rules" },
  { name: "expansion_framework.md", label: "Section Expansion Formula", size: "11.8 KB", type: "Framework" },
];

export default function DashboardPage() {
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("Ready to generate");
  const [currentNode, setCurrentNode] = useState<string>("idle");
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  // Clean initial state (no mock data!)
  const [plan, setPlan] = useState<SubSectionTask[]>([]);
  const [activeTaskTitle, setActiveTaskTitle] = useState<string>("");
  const [streamedProse, setStreamedProse] = useState<string>("");
  const [pastSummaries, setPastSummaries] = useState<string[]>([]);
  const [wordCount, setWordCount] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Form / Edit states
  const [editableTaskTitle, setEditableTaskTitle] = useState<string>("");
  const [editableDirective, setEditableDirective] = useState<string>("");
  const [bookTitle, setBookTitle] = useState("The Power of Instinct");
  const [genre, setGenre] = useState("Popular Neuroscience & Leadership");
  const [premise, setPremise] = useState(
    "Instinct is not the enemy of good thinking — it is the compressed intelligence of lived experience."
  );

  const [activeTab, setActiveTab] = useState<ActiveTab>("notes");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const abortRef = useRef<AbortController | null>(null);
  const proseEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (pipelineStatus === "drafting") {
      proseEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [streamedProse, pipelineStatus]);

  useEffect(() => {
    const computed = streamedProse.trim().split(/\s+/).filter(Boolean).length;
    if (computed > 0) setWordCount(computed);
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
              setActiveTaskTitle(p[0].title);
              setEditableTaskTitle(p[0].title);
              setEditableDirective(p[0].writing_directive || "");
            }
          } else if (d.type === "hitl_pause") {
            setPipelineStatus("waiting_for_approval");
            setStatusMessage("Paused — human review required");
            if (d.thread_id) setSessionId(d.thread_id);
            if (d.target_task) setActiveTaskTitle(d.target_task);
            if (d.plan?.[0]) {
              setEditableTaskTitle(d.plan[0].title || "");
              setEditableDirective(d.plan[0].writing_directive || "");
            }
          } else if (d.type === "token") {
            setPipelineStatus("drafting");
            setStreamedProse((prev) => prev + d.content);
            if (d.sub_section) {
              setActiveTaskTitle(d.sub_section);
              setPlan((prev) =>
                prev.map((p) =>
                  p.title === d.sub_section ? { ...p, status: "in_progress" } : p
                )
              );
            }
          } else if (d.type === "replan") {
            if (d.latest_summary) setPastSummaries((prev) => [...prev, d.latest_summary]);
            if (d.next_task) {
              setActiveTaskTitle(d.next_task);
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

  // ── Actions ────────────────────────────────────────────────────────────────
  async function startGeneration() {
    setPipelineStatus("planning");
    setErrorMessage(null);
    setStreamedProse("");
    setPastSummaries([]);
    setActiveTab("editor");
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
    setActiveTab("editor");
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

  const handleCopyProse = () => {
    navigator.clipboard.writeText(streamedProse);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const navItems = [
    { id: "notes" as ActiveTab, label: "My Chapters", icon: BookOpen },
    { id: "editor" as ActiveTab, label: "Draft Reader", icon: FileText },
    { id: "context" as ActiveTab, label: "Context Bible (6)", icon: Database },
    { id: "pipeline" as ActiveTab, label: "Pipeline Inspector", icon: Sliders },
    { id: "settings" as ActiveTab, label: "Book Settings", icon: Settings },
  ];

  const pipelineNodes = [
    { name: "plan_step", role: "GPT-4o-mini generates 5-chapter sub-section JSON plan", tech: "GPT-4o-mini" },
    { name: "human_review", role: "HITL Interruption — User approves or edits next chapter directive", tech: "Human Review" },
    { name: "research_step", role: "Tavily Search Agent gathers empirical studies & case facts", tech: "Tavily API" },
    { name: "execute_step", role: "GPT-4o drafts 2,500-word prose & streams tokens live via SSE", tech: "GPT-4o" },
    { name: "replan_step", role: "GPT-4o-mini compresses draft into 150-word summary, clears context", tech: "GPT-4o-mini" },
    { name: "front_matter_step", role: "Generates Preface, Note on Neuroscience, Table of Contents", tech: "GPT-4o" },
    { name: "back_matter_step", role: "Generates Conclusion, Glossary, Acknowledgments", tech: "GPT-4o" },
    { name: "compile_book_step", role: "Compiles full manuscript to backend/output/<Title>_Final.md", tech: "Disk I/O" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans text-black">
      {/* ── LEFT SIDEBAR (ts-industries style) ───────────────────────────────── */}
      <aside className="w-64 bg-white border-r border-black/10 flex flex-col hidden md:flex">
        {/* Brand - ts-industries */}
        <div className="p-6 border-b border-black/10">
          <span className="text-xl font-bold tracking-tight text-black block">
            ts-industries
          </span>
          <span className="text-xs font-semibold text-orange-600 tracking-wider uppercase">
            Scriptorium Writer
          </span>
        </div>

        {/* Navigation Items with 150ms Sliding Active Pill */}
        <div className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors z-10 ${
                  isActive ? "text-orange-600 font-semibold" : "text-black/70 hover:text-black"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeSidebarTabPill"
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="absolute inset-0 bg-orange-50 rounded-xl -z-10"
                  />
                )}
                <Icon className="w-5 h-5" />
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Sidebar Status Widget */}
        <div className="p-6 border-t border-black/10 bg-black/[0.02]">
          <div className="flex items-center gap-2 mb-2">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                isRunning
                  ? "bg-orange-500 animate-pulse"
                  : pipelineStatus === "completed"
                  ? "bg-green-500"
                  : "bg-black/20"
              }`}
            />
            <span className="text-xs font-bold text-black uppercase tracking-wider">
              {pipelineStatus}
            </span>
          </div>

          <p className="text-xs text-black/60 leading-snug mb-3">{statusMessage}</p>

          <div className="space-y-1">
            <div className="flex justify-between text-xs font-semibold text-black/70">
              <span>Overall Progress</span>
              <span className="text-orange-600 font-bold">{progressPercent}%</span>
            </div>
            <div className="w-full h-2 bg-black/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT AREA ────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Mobile Header */}
        <header className="md:hidden bg-white border-b border-black/10 p-4 flex items-center justify-between">
          <div>
            <span className="text-lg font-bold tracking-tight text-black">ts-industries</span>
            <span className="text-xs font-bold text-orange-600 ml-2">Scriptorium</span>
          </div>
          <button
            onClick={() => setActiveTab(activeTab === "notes" ? "editor" : "notes")}
            className="p-2 border border-black/10 rounded-lg text-xs font-semibold"
          >
            Switch View
          </button>
        </header>

        {/* Main Content Container */}
        <div className="flex-1 p-4 sm:p-8 max-w-6xl mx-auto w-full space-y-8 flex flex-col">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-black/10 pb-6">
            <div>
              <p className="text-xs font-bold text-orange-600 uppercase tracking-widest mb-1">
                {genre}
              </p>
              <h1 className="text-3xl font-bold text-black mb-1">{bookTitle}</h1>
              <p className="text-sm text-black/60">{premise}</p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {pipelineStatus === "completed" && sessionId && (
                <a
                  href={`http://localhost:8000/api/download/${sessionId}`}
                  download
                  className="inline-flex items-center gap-2 px-5 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors shadow-sm text-sm"
                >
                  <Download className="w-4 h-4" />
                  Download Manuscript
                </a>
              )}

              {isRunning ? (
                <button
                  onClick={handleStop}
                  className="inline-flex items-center gap-2 px-5 py-3 bg-red-50 hover:bg-red-100 text-red-600 font-semibold rounded-xl transition-colors text-sm"
                >
                  <Pause className="w-4 h-4" />
                  Pause
                </button>
              ) : pipelineStatus === "waiting_for_approval" ? (
                <button
                  onClick={() => resumeGeneration(false)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors shadow-sm text-sm"
                >
                  <Play className="w-4 h-4" />
                  Approve Next Chapter
                </button>
              ) : (
                /* Pure text button (no icon) */
                <button
                  onClick={startGeneration}
                  className="inline-flex items-center justify-center px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors shadow-sm text-sm active:scale-95"
                >
                  Generate Manuscript
                </button>
              )}
            </div>
          </div>

          {/* Error Notice */}
          {errorMessage && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between text-sm text-red-700">
              <span>{errorMessage}</span>
              <button
                onClick={() => setErrorMessage(null)}
                className="font-bold text-red-500 hover:text-red-800 text-xs uppercase"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* ── TAB 1: MY CHAPTERS (Notes Grid) ─────────────────────────────── */}
          {activeTab === "notes" && (
            <div className="space-y-6 flex-1">
              {/* Search & Filter Row */}
              <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
                <div className="relative flex-1 max-w-lg">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-black/40" />
                  <input
                    type="text"
                    placeholder="Search chapters by title or keywords..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white border border-black/10 rounded-2xl focus:outline-none focus:border-orange-500 transition-colors shadow-sm text-black text-sm"
                  />
                </div>

                {/* Segmented Filter Control with 150ms Sliding Active Pill */}
                <div className="relative flex items-center p-1 bg-black/5 rounded-xl self-start sm:self-auto">
                  {(["all", "in_progress", "completed"] as FilterTab[]).map((tab) => {
                    const isActive = filterTab === tab;
                    return (
                      <button
                        key={tab}
                        onClick={() => setFilterTab(tab)}
                        className={`relative px-5 py-2 rounded-lg text-xs font-semibold capitalize transition-colors z-10 ${
                          isActive ? "text-black" : "text-black/60 hover:text-black"
                        }`}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="activeFilterPill"
                            transition={{ duration: 0.15, ease: "easeOut" }}
                            className="absolute inset-0 bg-white rounded-lg shadow-sm -z-10"
                          />
                        )}
                        {tab.replace("_", " ")}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cards Grid or Clean Empty State when no chapters generated */}
              {plan.length === 0 ? (
                <div className="bg-white border border-black/10 rounded-3xl p-12 text-center max-w-xl mx-auto my-8 space-y-4 shadow-sm">
                  <div className="w-16 h-16 bg-black/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <WritingIcon className="w-8 h-8 text-black" />
                  </div>
                  <h3 className="text-xl font-bold text-black">No Chapters Generated Yet</h3>
                  <p className="text-sm text-black/60 leading-relaxed">
                    Click <span className="font-semibold text-black">Generate Manuscript</span> above to launch the AI Plan-and-Execute pipeline.
                  </p>
                  <button
                    onClick={startGeneration}
                    className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl text-sm transition-colors shadow-sm"
                  >
                    Generate Manuscript
                  </button>
                </div>
              ) : (
                <div className="grid md:grid-cols-3 gap-6">
                  {filteredPlan.map((ch, idx) => {
                    const isDone = ch.status === "completed";
                    const isLive = ch.status === "in_progress";

                    return (
                      <div
                        key={ch.sub_section_id || idx}
                        onClick={() => {
                          setActiveTaskTitle(ch.title);
                          if (ch.draft_prose) setStreamedProse(ch.draft_prose);
                          setActiveTab("editor");
                        }}
                        className="bg-white border border-black/10 rounded-2xl p-6 hover:border-orange-500 transition-all cursor-pointer group shadow-sm flex flex-col justify-between"
                      >
                        <div>
                          {/* Black Writing SVG Icon (https://www.svgrepo.com/svg/488479/writing) */}
                          <div className="w-12 h-12 bg-black/5 rounded-xl flex items-center justify-center mb-4 group-hover:bg-black group-hover:text-white transition-colors">
                            <WritingIcon className="w-6 h-6 text-black group-hover:text-white transition-colors" />
                          </div>

                          <h3 className="text-lg font-bold text-black mb-1 group-hover:text-orange-600 transition-colors leading-snug">
                            {ch.title}
                          </h3>

                          <p className="text-sm text-black/60 mb-4 line-clamp-3 leading-relaxed">
                            {ch.one_sentence_summary || ch.writing_directive}
                          </p>
                        </div>

                        <div className="pt-4 border-t border-black/5 flex items-center justify-between text-xs font-medium text-black/40">
                          <span>{(ch.target_word_count || 2500).toLocaleString()} words</span>

                          {isDone ? (
                            <span className="text-green-700 bg-green-50 px-2.5 py-1 rounded-md font-semibold flex items-center gap-1.5">
                              <CircleCheckFilledIcon />
                              Completed
                            </span>
                          ) : isLive ? (
                            <span className="text-orange-700 bg-orange-50 px-2.5 py-1 rounded-md font-semibold flex items-center gap-1.5">
                              <SketchDraftIcon />
                              Drafting Live
                            </span>
                          ) : (
                            <span className="text-black/60 bg-black/5 px-2.5 py-1 rounded-md font-semibold flex items-center gap-1.5">
                              <InProgressIcon />
                              Queued
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── TAB 2: DRAFT READER ─────────────────────────────────────────── */}
          {activeTab === "editor" && (
            <div className="max-w-4xl mx-auto space-y-6 flex-1 w-full">
              <div className="bg-white border border-black/10 rounded-3xl p-8 sm:p-12 shadow-sm space-y-6">
                <div className="flex items-center justify-between pb-6 border-b border-black/10">
                  <div>
                    <span className="text-xs font-bold text-orange-600 uppercase tracking-widest block mb-1">
                      Active Manuscript Chapter
                    </span>
                    <h2 className="text-2xl font-bold text-black">
                      {activeTaskTitle || "No Active Chapter"}
                    </h2>
                  </div>

                  {streamedProse && (
                    <button
                      onClick={handleCopyProse}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-black/5 hover:bg-black/10 text-black font-semibold rounded-xl text-xs transition-colors"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 text-green-600" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy Markdown
                        </>
                      )}
                    </button>
                  )}
                </div>

                <div className="prose-reader whitespace-pre-wrap">
                  {streamedProse || (
                    <p className="text-black/40 italic">
                      No prose streamed yet. Click "Generate Manuscript" to start the pipeline.
                    </p>
                  )}
                  {pipelineStatus === "drafting" && (
                    <span className="inline-block w-2 h-5 ml-1 bg-orange-500 animate-pulse align-middle" />
                  )}
                </div>
                <div ref={proseEndRef} />
              </div>
            </div>
          )}

          {/* ── TAB 3: CONTEXT BIBLE (6 Anchor Files) ────────────────────────── */}
          {activeTab === "context" && (
            <div className="max-w-4xl mx-auto space-y-6 flex-1 w-full">
              <div>
                <h2 className="text-2xl font-bold text-black mb-1">Context Anchor Knowledge Database</h2>
                <p className="text-black/60">
                  These 6 Markdown documents in the <code className="bg-black/5 px-2 py-0.5 rounded text-orange-600 font-mono text-sm">/docs</code> folder are injected into every LLM prompt to eliminate hallucination.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {CONTEXT_FILES.map((file, idx) => (
                  <div
                    key={idx}
                    className="bg-white border border-black/10 rounded-2xl p-6 shadow-sm hover:border-orange-500 transition-colors flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-md">
                          {file.type}
                        </span>
                        <span className="text-xs font-mono text-black/40">{file.size}</span>
                      </div>
                      <h3 className="text-lg font-bold text-black mb-1">{file.label}</h3>
                      <p className="text-xs font-mono text-black/50">/docs/{file.name}</p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-black/5 flex items-center justify-between text-xs font-medium text-black/50">
                      <span>Status: System Anchor</span>
                      <span className="text-green-600 font-bold flex items-center gap-1">
                        <CircleCheckFilledIcon /> Active Memory
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── TAB 4: REDESIGNED PIPELINE INSPECTOR ──────────────────────────── */}
          {activeTab === "pipeline" && (
            <div className="max-w-4xl mx-auto space-y-6 flex-1 w-full">
              <div>
                <h2 className="text-2xl font-bold text-black mb-1">LangGraph Execution Architecture</h2>
                <p className="text-black/60">
                  Real-time node execution graph with Redis checkpoint persistence and Human-in-the-Loop review points.
                </p>
              </div>

              <div className="bg-white border border-black/10 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
                <div className="relative pl-6 space-y-4 before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-black/10">
                  {pipelineNodes.map((step, i) => {
                    const isActive = currentNode === step.name;
                    return (
                      <div
                        key={i}
                        className={`relative p-5 rounded-2xl border transition-all ${
                          isActive
                            ? "bg-orange-50/80 border-orange-500 text-black shadow-md ring-2 ring-orange-200"
                            : "bg-white border-black/10 text-black/80 hover:border-black/20"
                        }`}
                      >
                        {/* Timeline Node Dot */}
                        <div
                          className={`absolute -left-9 top-6 w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${
                            isActive
                              ? "bg-orange-500 border-orange-500 text-white animate-pulse"
                              : "bg-white border-black/30 text-black/60"
                          }`}
                        >
                          {i + 1}
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm text-black">
                              {step.name}
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-black/5 text-black/70 px-2 py-0.5 rounded-md">
                              {step.tech}
                            </span>
                          </div>

                          {isActive && (
                            <span className="self-start sm:self-auto px-3 py-1 bg-orange-500 text-white rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
                              <Zap className="w-3 h-3 fill-current" />
                              Active Step
                            </span>
                          )}
                        </div>

                        <p className="text-sm text-black/70 leading-relaxed font-sans">
                          {step.role}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 5: BOOK SETTINGS ─────────────────────────────────────────── */}
          {activeTab === "settings" && (
            <div className="max-w-4xl mx-auto space-y-6 flex-1 w-full">
              <div>
                <h2 className="text-2xl font-bold text-black mb-1">Book Configuration</h2>
                <p className="text-black/60">Configure metadata for your book project.</p>
              </div>

              <div className="bg-white border border-black/10 rounded-3xl p-8 shadow-sm space-y-6">
                <div>
                  <label className="block text-sm font-bold text-black uppercase tracking-wider mb-2">
                    Book Title
                  </label>
                  <input
                    type="text"
                    value={bookTitle}
                    onChange={(e) => setBookTitle(e.target.value)}
                    className="w-full p-4 bg-black/5 border border-transparent rounded-2xl focus:bg-white focus:border-orange-500 focus:outline-none transition-colors text-black font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-black uppercase tracking-wider mb-2">
                    Genre / Field
                  </label>
                  <input
                    type="text"
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    className="w-full p-4 bg-black/5 border border-transparent rounded-2xl focus:bg-white focus:border-orange-500 focus:outline-none transition-colors text-black font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-black uppercase tracking-wider mb-2">
                    Core Premise & Thesis
                  </label>
                  <textarea
                    rows={4}
                    value={premise}
                    onChange={(e) => setPremise(e.target.value)}
                    className="w-full p-4 bg-black/5 border border-transparent rounded-2xl focus:bg-white focus:border-orange-500 focus:outline-none transition-colors text-black font-medium resize-none"
                  />
                </div>

                <div className="pt-4 border-t border-black/10 flex justify-end">
                  <button
                    onClick={() => {
                      alert("Settings updated successfully!");
                      setActiveTab("notes");
                    }}
                    className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors shadow-sm text-sm"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── FOOTER WITH BLACK STANDALONE SVGs & BULLETS ───────────────────── */}
          <footer className="mt-auto pt-8 border-t border-black/10 text-xs text-black/60 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="font-bold text-black text-sm">ts-industries</span>
              <span className="text-orange-600 font-bold">•</span>
              <span className="font-medium text-black/70">Scriptorium AI Book Writer Pipeline</span>
            </div>

            {/* Standalone black SVGs separated by • bullets */}
            <div className="flex items-center justify-center gap-3 text-black">
              <LangGraphLogo />
              <span className="font-bold text-black/40">•</span>
              <OpenAILogo />
              <span className="font-bold text-black/40">•</span>
              <RedisLogo />
              <span className="font-bold text-black/40">•</span>
              <PythonLogo />
              <span className="font-bold text-black/40">•</span>
              <TailwindLogo />
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}
