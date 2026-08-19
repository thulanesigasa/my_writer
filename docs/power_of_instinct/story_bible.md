# Book Objective

> **Goal:** Produce a coherent, well-structured 50-page (≈ 12,500 word) non-fiction / narrative book in approximately 10–12 chapters, each ≈ 1,000–1,500 words.
>
> **Target Audience:** Ambitious early-to-mid career professionals (25–40) who want a rigorous, systems-thinking approach to personal growth, decision-making, and building a meaningful career. Readers are intelligent, time-poor, and sceptical of hollow self-help clichés.
>
> **Tone & Voice:** Clear, authoritative, and warm. Think *Thinking, Fast and Slow* meets *The Pragmatic Programmer* — precise language, concrete examples, zero filler.
>
> **Format:** Narrative non-fiction with structured frameworks. Each chapter opens with a short story or scenario, introduces one core concept, provides a repeatable framework, and closes with a 3-bullet action summary.

---

# Global Rules

The AI **must** follow these rules on every single generation call, without exception.

1. **No new characters or inventions.** Do not introduce people, organisations, case studies, statistics, or named frameworks that are not already present in this story bible or explicitly requested in the chapter outline. When in doubt, omit rather than fabricate.

2. **Maintain the author's voice.** Every sentence must match the tone defined above. Avoid:
   - Hollow affirmations ("You've got this!", "This is a journey!")
   - Excessive adverbs and filler phrases ("very", "essentially", "it's important to note")
   - Passive-voice overuse; prefer active, direct sentences.

3. **One concept per chapter.** Do not bleed concepts from one chapter into another unless the outline explicitly links them.

4. **Honour the outline.** The chapter outline in this file is the binding contract. The AI may add texture, examples, and prose — it may not change the chapter's core argument or skip a key event.

5. **No hallucinated citations.** Do not quote books, studies, or people unless they appear in the Key Definitions section below. Prefer "research suggests" or "studies show" over fabricated citations.

6. **Consistent terminology.** Always use the exact term defined in the Key Definitions section. Do not paraphrase defined terms (e.g., use "Second-Order Thinking" not "thinking about consequences").

7. **Context window discipline.** You will only ever receive the compressed summary of previous chapters, not the raw text. Treat each chapter summary as the canonical truth of what happened before.

8. **Chapter length target:** Each chapter draft must reach 1,000–1,500 words before requesting summarisation. Do not stop early.

---

# Outline

> **Note:** Fill in the chapter-by-chapter beats below. Each entry must contain: `chapter_number`, `title`, `one_sentence_summary`, and `key_events` (3–5 bullet points). The planner agent will use this outline as its binding contract.

## Chapter 1 — [Title Placeholder]

- **One-sentence summary:** [What this chapter argues or reveals]
- **Key events / beats:**
  - [ ] Opening scenario: [describe]
  - [ ] Core concept introduced: [name it]
  - [ ] Framework presented: [describe]
  - [ ] Action summary: [3 bullets]

## Chapter 2 — [Title Placeholder]

- **One-sentence summary:** [What this chapter argues or reveals]
- **Key events / beats:**
  - [ ] Opening scenario: [describe]
  - [ ] Core concept introduced: [name it]
  - [ ] Framework presented: [describe]
  - [ ] Action summary: [3 bullets]

## Chapter 3 — [Title Placeholder]

*(Continue this pattern for all chapters. The planner will generate the full outline automatically from your premise — edit this section to override or lock down specific beats.)*

---

# Key Definitions

> Definitions in this section are **canonical**. The AI must use these exact terms and definitions every time they appear. Do not rephrase, do not simplify.

| Term | Definition |
|---|---|
| **Context Anchor** | The central, immutable story bible injected into every agent call to prevent plot drift and hallucination. |
| **Second-Order Thinking** | The discipline of asking "and then what?" at least twice before committing to a decision — thinking past the immediate consequence to the downstream effects. |
| **Working Memory Budget** | The maximum number of tokens actively held in a single LLM context window for one generation call. Capped at the model's context limit. |
| **Unit of Work** | One discrete, atomic task assigned to a single agent call — e.g., drafting a single chapter segment, or summarising one completed chapter. |
| *(Add more terms as your book develops)* | *(Definition)* |

---

# Characters / Personas

> *For narrative non-fiction: define the archetypes or composite personas used as illustrative characters. For pure non-fiction, leave this section empty or use it for key real-world figures.*

| Name | Role | Notes |
|---|---|---|
| *(e.g.) Alex* | Composite protagonist — early-career professional | Used in opening scenarios to ground abstract concepts |
| *(Add more)* | | |

---

# World / Setting

> *For non-fiction: describe the real-world context the book inhabits (industry, time period, cultural backdrop). For fiction: full worldbuilding entries.*

- **Time period:** Contemporary (2020s)
- **Industry context:** Knowledge work — tech, consulting, finance, creative industries
- **Assumed reader baseline:** University-educated; familiar with basic productivity concepts; frustrated by advice that doesn't survive contact with reality

---

# Revision Notes

> Use this section to record changes made to the story bible after generation has begun. The AI will treat the most recent entry as authoritative.

| Date | Change | Reason |
|---|---|---|
| *(YYYY-MM-DD)* | *(What changed)* | *(Why)* |
