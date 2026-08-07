"use client";

import { motion } from "framer-motion";
import { BookOpen, Zap, BrainCircuit, GitBranch } from "lucide-react";

interface Props {
  onStart: () => void;
}

const features = [
  {
    icon: BrainCircuit,
    title: "Context Anchor",
    desc: "A living story bible injected into every agent call — characters, world rules, plot threads. Zero hallucination.",
  },
  {
    icon: GitBranch,
    title: "LangGraph Pipelines",
    desc: "Directed cyclic graph with distinct front matter, chapter, and back matter workflows. Each chapter is an isolated unit of work.",
  },
  {
    icon: Zap,
    title: "Real-time Streaming",
    desc: "Watch tokens appear live via SSE as GPT-4o drafts your prose. Iterative drafting with human-in-the-loop approval gates.",
  },
  {
    icon: BookOpen,
    title: "Context Pruning",
    desc: "After each chapter, raw prose is compressed into memory and pruned — keeping the context window surgical and lean.",
  },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function LandingHero({ onStart }: Props) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-20 relative overflow-hidden">
      {/* Background orbs */}
      <div
        aria-hidden
        className="absolute top-[-200px] left-[10%] w-[600px] h-[600px] rounded-full opacity-20"
        style={{
          background:
            "radial-gradient(circle, #7c5cfc 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />
      <div
        aria-hidden
        className="absolute bottom-[-150px] right-[5%] w-[500px] h-[500px] rounded-full opacity-15"
        style={{
          background:
            "radial-gradient(circle, #e879f9 0%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />

      <motion.div
        className="relative z-10 max-w-4xl mx-auto text-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Logo mark */}
        <motion.div variants={itemVariants} className="flex justify-center mb-8">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center pulse-glow"
            style={{
              background: "linear-gradient(135deg, #7c5cfc, #e879f9)",
              boxShadow: "0 8px 40px rgba(124, 92, 252, 0.5)",
            }}
          >
            <BookOpen size={36} color="white" />
          </div>
        </motion.div>

        {/* Eyebrow */}
        <motion.p
          variants={itemVariants}
          className="text-sm font-semibold tracking-widest uppercase mb-4"
          style={{ color: "var(--color-accent-primary)" }}
        >
          Scriptorium — AI Book Writing System
        </motion.p>

        {/* Headline */}
        <motion.h1
          variants={itemVariants}
          className="text-5xl md:text-7xl font-bold mb-6 leading-tight"
        >
          Write an entire{" "}
          <span className="gradient-text">50-page book</span>
          <br />
          without losing the plot.
        </motion.h1>

        {/* Sub-headline */}
        <motion.p
          variants={itemVariants}
          className="text-lg md:text-xl mb-12 max-w-2xl mx-auto"
          style={{ color: "var(--color-text-secondary)", lineHeight: 1.7 }}
        >
          Powered by LangGraph, GPT-4o, and Redis — each chapter is an isolated
          unit of work anchored to a living story bible. You stay in the loop at
          every creative checkpoint.
        </motion.p>

        {/* CTA */}
        <motion.div variants={itemVariants} className="flex gap-4 justify-center flex-wrap">
          <button
            id="cta-start-writing"
            onClick={onStart}
            className="btn-primary text-lg px-10 py-4"
          >
            Start Writing
            <span style={{ fontSize: "1.2rem" }}>→</span>
          </button>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="btn-secondary text-base px-8 py-4"
          >
            View Architecture
          </a>
        </motion.div>

        {/* Feature cards */}
        <motion.div
          variants={containerVariants}
          className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-20 text-left"
        >
          {features.map((f) => (
            <motion.div key={f.title} variants={itemVariants} className="glass-card p-6">
              <div className="flex items-start gap-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: "rgba(124, 92, 252, 0.15)",
                    border: "1px solid rgba(124, 92, 252, 0.3)",
                  }}
                >
                  <f.icon size={18} color="var(--color-accent-primary)" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1" style={{ fontSize: "0.95rem" }}>
                    {f.title}
                  </h3>
                  <p className="text-sm" style={{ color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
                    {f.desc}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Tech stack badges */}
        <motion.div variants={itemVariants} className="flex gap-3 mt-12 justify-center flex-wrap">
          {["LangGraph", "GPT-4o", "FastAPI", "Redis", "Next.js", "Framer Motion"].map(
            (tech) => (
              <span
                key={tech}
                className="badge badge-pending"
                style={{ fontSize: "0.7rem" }}
              >
                {tech}
              </span>
            )
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
