# Scriptorium — AI Book Writer

An automated, human-in-the-loop book-writing pipeline built on LangGraph, FastAPI, and Next.js. The system uses a Plan-and-Execute architecture to draft a full non-fiction book from a single premise, section by section, with a live SSE stream to the browser and Redis-backed checkpointing so the user can review, edit, and approve each sub-section before the AI drafts it.

---

## Architecture Overview

```
Next.js Frontend (port 3000)
        |
        |  SSE  /  REST
        v
FastAPI Backend (port 8000)
        |
        v
LangGraph StateGraph
        |
  plan_step
        |
  research_step  <----- Tavily web search
        |
  [INTERRUPT]  <------- Human-in-the-loop review gate
        |
  execute_step  <------ GPT-4o prose drafting
        |
  replan_step   <------ GPT-4o-mini summarisation + full_manuscript append
        |
  (loop or...)
        |
  front_matter_step  -> Title Page, Copyright, TOC, Introduction
        |
  back_matter_step   -> Conclusion, Acknowledgments, Glossary
        |
  compile_book_step  -> writes output/<Title>_Final.md to disk
        |
       END
```

---

## Repository Structure

```
my_writer/
|-- README.md
|-- docs/                          Context Anchor Markdown files
|   |-- story_bible.md
|   |-- research_database.md
|   |-- book_outline.md
|   |-- case_studies.md
|   |-- expansion_framework.md
|   |-- audience_personas.md
|   |-- stylistic_examples.md
|   |-- system_rules.md
|   `-- front_and_back_matter.md
|
|-- frontend/                      Next.js 15 + Tailwind CSS + Framer Motion
|   |-- app/
|   |   |-- layout.tsx             Root layout with SEO meta and Inter font
|   |   |-- globals.css            Design system: dark theme, glass, animations
|   |   `-- page.tsx               SSE consumer, pipeline sidebar, prose viewer
|   |-- next.config.ts             API proxy rewrite to FastAPI on port 8000
|   `-- package.json
|
`-- backend/                       Python 3.11+ / FastAPI / LangGraph
    |-- .env.example               Copy to .env and fill in keys
    |-- requirements.txt
    |-- main.py                    FastAPI app, SSE stream, download endpoint
    |
    |-- core/
    |   |-- state.py               LangGraph state schema (BookWriterState)
    |   |-- config.py              Pydantic-Settings loaded from .env
    |   `-- memory.py              Redis memory manager
    |
    |-- graph/
    |   |-- graph.py               StateGraph assembly, edges, HITL interrupt
    |   `-- nodes.py               All LangGraph node functions
    |
    |-- api/
    |   `-- routes/
    |       |-- books.py           POST /api/books
    |       |-- stream.py          GET /api/stream/{id}  SSE
    |       |-- review.py          POST /api/review/{id}  HITL decision
    |       `-- health.py          GET /api/health
    |
    `-- utils/
        |-- utils.py               Context Anchor loader (reads docs/ folder)
        `-- prompt_builder.py      Context-isolated prompt assembly
```

---

## State Memory Architecture

The LangGraph state is split into distinct memory tiers to prevent context contamination between chapters.

| Class | Tier | Purpose |
|---|---|---|
| ContextAnchor | Long-term (never pruned) | Story bible: characters, worldbuilding, style guide |
| ChapterSummary | Short-term (rolling list) | Compressed 100-200 word recap per completed chapter |
| WorkingMemory | Working (pruned per chapter) | Active draft, research notes, token budget |
| PipelineControl | Ephemeral | HITL flags, routing signals, retry counts |
| BookWriterState | Top-level TypedDict | LangGraph canonical state merging all tiers |

The key design principle: every call to `execute_step` receives only the `context_anchor`, the last three chapter summaries, and the active `current_draft`. Previous chapters' raw prose is never re-injected, keeping the context window clean and preventing hallucinations.

---

## Setup and Running

### Prerequisites

- Python 3.11+
- Node.js 18+
- Docker (for Redis)
- OpenAI API key
- Tavily API key

### 1. Backend

```powershell
cd d:\deployment_2026\my_writer\backend

# Copy environment template
Copy-Item .env.example .env
# Edit .env: set OPENAI_API_KEY and TAVILY_API_KEY

# Create and activate virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Start Redis
docker run -d -p 6379:6379 redis:7-alpine

# Run FastAPI
python -m uvicorn backend.main:app --reload --port 8000
```

### 2. Frontend

```powershell
cd d:\deployment_2026\my_writer\frontend
npm install
npm run dev
# Open http://localhost:3000
```

---

## API Reference

| Method | Path | Description |
|---|---|---|
| POST | /api/write | Start a new session and begin SSE streaming |
| POST | /api/resume | Resume after HITL review with optional edits |
| GET | /api/stream/{id} | SSE token stream for an active session |
| POST | /api/review/{id} | Submit HITL decision (approve / revise / reject) |
| GET | /api/download/{id} | Download the compiled Markdown book file |
| GET | /api/health | Health check |

### SSE Event Types

```json
{ "type": "status",    "status": "plan_step",  "message": "..." }
{ "type": "plan",      "plan": [...] }
{ "type": "token",     "content": "The ship shuddered..." }
{ "type": "replan",    "latest_summary": "...", "next_task": "..." }
{ "type": "hitl_pause","thread_id": "...", "plan": [...] }
{ "type": "done",      "message": "Book drafting complete!" }
{ "type": "error",     "message": "..." }
```

---

## Context Anchor Files

All `.md` files in the `docs/` folder are loaded at startup and concatenated into the `context_anchor` state variable. They act as the AI's persistent long-term memory for the entire run.

| File | Purpose |
|---|---|
| story_bible.md | Core thesis, characters, worldbuilding |
| research_database.md | Scientific studies, citations, statistics |
| book_outline.md | Chapter structure and sub-section plan |
| case_studies.md | Real-world narrative examples for the AI to draw on |
| expansion_framework.md | Structural formula each sub-section must follow |
| audience_personas.md | Target reader profiles |
| stylistic_examples.md | Writing style and tone reference |
| system_rules.md | Hard rules the AI must not violate |
| front_and_back_matter.md | Instructions for title page, TOC, glossary generation |

---

## Output

When the pipeline completes all sub-sections, the graph automatically runs the compilation sequence. The final book is written to:

```
backend/output/<Book_Title>_Final.md
```

This file can be downloaded directly from the frontend via the "Download Manuscript" button, or fetched programmatically via `GET /api/download/{session_id}`.

---

## Key Dependencies

| Package | Purpose |
|---|---|
| langgraph | Plan-and-Execute StateGraph orchestration |
| langchain-openai | GPT-4o / GPT-4o-mini LLM integration |
| langchain-tavily | Tavily web search integration |
| fastapi | REST and SSE API server |
| sse-starlette | Server-Sent Events support |
| redis / langgraph-checkpoint-redis | State persistence and HITL checkpointing |
| structlog | Structured logging |
| pydantic-settings | Configuration from .env |
| next | React framework for the frontend |
| framer-motion | Physics-based UI animations |
