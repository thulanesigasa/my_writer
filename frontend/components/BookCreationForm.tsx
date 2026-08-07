"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, BookOpen } from "lucide-react";

interface Props {
  onBack: () => void;
  onSuccess: (session: { sessionId: string; title: string; genre: string }) => void;
}

const GENRE_OPTIONS = [
  "Sci-Fi Thriller",
  "Fantasy Adventure",
  "Literary Fiction",
  "Mystery / Noir",
  "Romance",
  "Historical Fiction",
  "Horror",
  "Non-Fiction / Narrative",
];

export default function BookCreationForm({ onBack, onSuccess }: Props) {
  const [title, setTitle]         = useState("");
  const [genre, setGenre]         = useState("");
  const [premise, setPremise]     = useState("");
  const [audience, setAudience]   = useState("general adult readers");
  const [chapters, setChapters]   = useState(10);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!genre || !premise.trim()) {
      setError("Genre and premise are required.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8000/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || undefined,
          genre,
          premise,
          target_audience: audience,
          total_chapters: chapters,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Failed to create book session");
      }

      const data = await res.json();
      onSuccess({
        sessionId: data.session_id,
        title: data.title || title || "Untitled",
        genre,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-20">
      {/* Background orb */}
      <div
        aria-hidden
        className="fixed top-0 right-0 w-[800px] h-[800px] pointer-events-none"
        style={{
          background: "radial-gradient(circle at top right, rgba(124,92,252,0.12) 0%, transparent 60%)",
        }}
      />

      <motion.div
        className="w-full max-w-2xl relative z-10"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <button
          id="btn-back-to-landing"
          onClick={onBack}
          className="flex items-center gap-2 mb-8 text-sm transition-colors"
          style={{ color: "var(--color-text-muted)" }}
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <div className="glass-card p-10">
          <div className="flex items-center gap-3 mb-8">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #7c5cfc, #e879f9)" }}
            >
              <BookOpen size={18} color="white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">New Book Project</h1>
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                Configure your AI book-writing session
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {/* Title */}
            <div>
              <label htmlFor="field-title" className="block text-sm font-medium mb-2" style={{ color: "var(--color-text-secondary)" }}>
                Book Title <span style={{ color: "var(--color-text-muted)" }}>(optional — AI will generate one if blank)</span>
              </label>
              <input
                id="field-title"
                className="input-field"
                placeholder="e.g. The Silent Meridian"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Genre */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--color-text-secondary)" }}>
                Genre <span style={{ color: "var(--color-error)" }}>*</span>
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {GENRE_OPTIONS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    id={`genre-${g.toLowerCase().replace(/\s+/g, "-")}`}
                    onClick={() => setGenre(g)}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                    style={{
                      border: "1px solid",
                      borderColor: genre === g ? "var(--color-accent-primary)" : "var(--color-border)",
                      background: genre === g ? "rgba(124,92,252,0.15)" : "transparent",
                      color: genre === g ? "var(--color-accent-primary)" : "var(--color-text-muted)",
                    }}
                  >
                    {g}
                  </button>
                ))}
              </div>
              <input
                id="field-genre-custom"
                className="input-field"
                placeholder="Or type a custom genre…"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
              />
            </div>

            {/* Premise */}
            <div>
              <label htmlFor="field-premise" className="block text-sm font-medium mb-2" style={{ color: "var(--color-text-secondary)" }}>
                Premise / Elevator Pitch <span style={{ color: "var(--color-error)" }}>*</span>
              </label>
              <textarea
                id="field-premise"
                className="textarea-field"
                placeholder="In 2–3 sentences: who is your protagonist, what do they want, and what stands in their way?"
                rows={4}
                value={premise}
                onChange={(e) => setPremise(e.target.value)}
              />
            </div>

            {/* Audience */}
            <div>
              <label htmlFor="field-audience" className="block text-sm font-medium mb-2" style={{ color: "var(--color-text-secondary)" }}>
                Target Audience
              </label>
              <input
                id="field-audience"
                className="input-field"
                placeholder="e.g. young adult, general adult, academic…"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
              />
            </div>

            {/* Chapter count */}
            <div>
              <label htmlFor="field-chapters" className="block text-sm font-medium mb-2" style={{ color: "var(--color-text-secondary)" }}>
                Number of Chapters: <strong style={{ color: "var(--color-accent-primary)" }}>{chapters}</strong>
              </label>
              <input
                id="field-chapters"
                type="range"
                min={3}
                max={25}
                value={chapters}
                onChange={(e) => setChapters(Number(e.target.value))}
                className="w-full accent-violet-500"
              />
              <div className="flex justify-between text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
                <span>3 chapters</span>
                <span>~{chapters * 2000} words estimated</span>
                <span>25 chapters</span>
              </div>
            </div>

            {/* Error */}
            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm px-4 py-3 rounded-xl"
                style={{
                  background: "rgba(248,113,113,0.1)",
                  border: "1px solid rgba(248,113,113,0.3)",
                  color: "var(--color-error)",
                }}
              >
                {error}
              </motion.p>
            )}

            {/* Submit */}
            <button
              id="btn-create-book"
              type="submit"
              disabled={loading}
              className="btn-primary justify-center py-4"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Creating session &amp; planning outline…
                </>
              ) : (
                <>
                  <BookOpen size={18} />
                  Generate Book Plan
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
