# Scriptorium — Automated AI Book Writer

Scriptorium is a production-grade, agentic book-writing pipeline that turns a premise and a set of context documents into a fully-drafted, structured non-fiction book. It combines a LangGraph Plan-and-Execute state machine, a Tavily-powered research agent, Redis-backed checkpointing, and a live-streaming Next.js dashboard with human-in-the-loop review at every stage.

---

## What it does

1. You provide a title, genre, premise, and a folder of Markdown context documents (your story bible, research notes, chapter outline, style guide, etc.).
2. The **Planner** reads your documents and generates a granular JSON queue of sub-sections — not just chapter headings, but specific writing tasks with directives, target word counts, and continuity hooks.
3. The pipeline **pauses** before drafting each sub-section. You see the planned task in the sidebar, can edit the title or directive, then click **Approve**.
4. The **Research Agent** (Tavily web search) gathers up-to-date facts and case studies relevant to that sub-section.
5. The **Drafter** (GPT-4o) writes 1,000–1,500 words of prose, streaming every token live to the browser.
6. The **Summariser** (GPT-4o-mini) compresses the completed draft into a structured 150-word chapter summary and appends the raw prose to the `full_manuscript` accumulation buffer, then clears the working context window.
7. The loop repeats — plan, approve, research, draft, summarise — until every sub-section is done.
8. The pipeline automatically runs **Front Matter** (Title Page, Copyright, TOC, Introduction) and **Back Matter** (Conclusion, Acknowledgments, Glossary) generation.
9. The finished book is compiled to `backend/output/<Title>_Final.md` and available for download directly from the UI.

---

## Architecture

```
Browser (Next.js 15 + Tailwind)
    |
    |  SSE token stream  /  REST (POST, GET)
    v
FastAPI (Python 3.11, port 8000)
    |
    v
LangGraph StateGraph — Plan-and-Execute loop
    |
    |── plan_step ──────── GPT-4o-mini  Generates JSON sub-section queue
    |
    |── [INTERRUPT] ─────  Human reviews and approves next task
    |
    |── research_step ──── Tavily       Web search for facts and case studies
    |
    |── execute_step ────── GPT-4o      Drafts prose, streams tokens via SSE
    |
    |── replan_step ─────── GPT-4o-mini Summarises draft, advances queue
    |
    |── (loop until queue is empty)
    |
    |── front_matter_step ─ GPT-4o      Title page, copyright, TOC, introduction
    |── back_matter_step ── GPT-4o      Conclusion, acknowledgments, glossary
    |── compile_book_step ─ Disk write  Assembles full_manuscript → .md file
    |
    └── END
```

State is persisted in **Redis** via `langgraph-checkpoint-redis`. Every node transition is a checkpoint, so the session survives server restarts and can be resumed from any interrupt point.

---

## Context Anchor System

The `/docs` folder contains nine Markdown files that the system loads at startup. They are concatenated into a single `context_anchor` string and injected into every prompt. This gives the AI persistent, session-wide memory without re-reading files on every call.

| File | Purpose |
|---|---|
| `story_bible.md` | Core thesis, key arguments, worldbuilding, characters |
| `research_database.md` | Scientific studies, citations, statistics |
| `book_outline.md` | Chapter structure and sub-section plan |
| `case_studies.md` | Real-world narrative examples |
| `expansion_framework.md` | Structural formula each sub-section must follow |
| `audience_personas.md` | Target reader profiles and reading level |
| `stylistic_examples.md` | Writing style, tone, and voice reference |
| `system_rules.md` | Hard constraints the AI must not violate |
| `front_and_back_matter.md` | Instructions for front and back matter generation |

Edit these files to point the AI at any book you want to write. The pipeline will adapt automatically.

---

## Memory Architecture

Each completed draft is too large to include in every subsequent prompt. Scriptorium uses a three-tier memory architecture to keep the context window clean while preserving narrative continuity.

| Tier | Field | Managed by | Size |
|---|---|---|---|
| Long-term (permanent) | `context_anchor` | Loaded once at startup | ~20,000 tokens |
| Short-term (rolling) | `past_steps` | Appended by `replan_step` | 150 words per chapter |
| Working (wiped per chapter) | `current_draft` | Written by `execute_step`, cleared by `replan_step` | ~1,200 tokens |
| Accumulation buffer | `full_manuscript` | Appended by `replan_step`, written to disk at end | Grows throughout |
| Research notes | `current_research_notes` | Written by `research_step`, cleared by `replan_step` | ~500 tokens |

The `execute_step` prompt only ever sees: `context_anchor` + the last three `past_steps` summaries + `current_research_notes`. It never sees previous chapters' raw prose. This prevents context contamination and hallucination of earlier material.

---

## Project Structure

```
my_writer/
|
|── README.md
|── docs/                         Nine context anchor Markdown files
|
|── frontend/                     Next.js 15 application
|   |── app/
|   |   |── layout.tsx            Root layout, SEO meta, Google Fonts
|   |   |── globals.css           Global styles
|   |   `── page.tsx              Main dashboard — SSE consumer, HITL controls, card grid
|   |── next.config.ts            API proxy: /api/* → localhost:8000
|   `── package.json
|
`── backend/                      Python 3.11 application
    |── .env.example              Copy to .env, fill in your API keys
    |── requirements.txt
    |── main.py                   FastAPI app — /api/write, /api/resume, /api/download
    |
    |── core/
    |   |── state.py              LangGraph TypedDict state schema
    |   |── config.py             Pydantic-Settings from .env
    |   `── memory.py             Redis session manager
    |
    |── graph/
    |   |── graph.py              StateGraph assembly, edges, HITL interrupt
    |   `── nodes.py              All LangGraph node functions
    |
    |── agents/                   One module per agent role
    |   |── planner.py
    |   |── chapter_writer.py
    |   |── context_summariser.py
    |   |── context_pruner.py
    |   |── human_review.py
    |   |── front_matter.py
    |   |── back_matter.py
    |   `── router.py
    |
    |── api/routes/
    |   |── books.py
    |   |── stream.py
    |   |── review.py
    |   |── health.py
    |   `── download.py
    |
    |── utils/
    |   |── utils.py              Context anchor loader (reads /docs folder)
    |   `── prompt_builder.py     Context-isolated prompt assembly
    |
    `── output/                   Compiled book files written here
```

---

## Setup

### Prerequisites

- Python 3.11 or later
- Node.js 18 or later
- Docker Desktop (for Redis)
- An OpenAI API key (GPT-4o access required)
- A Tavily API key (free tier is sufficient for testing)

### 1. Clone and configure

```powershell
git clone https://github.com/thulanesigasa/my_writer.git
cd my_writer

# Copy the environment template and fill in your keys
Copy-Item backend\.env.example backend\.env
notepad backend\.env
```

Your `.env` needs at minimum:

```
OPENAI_API_KEY=sk-...
TAVILY_API_KEY=tvly-...
```

### 2. Start Redis

```powershell
# Make sure Docker Desktop is running first, then:
docker run -d -p 6379:6379 --name redis-scriptorium redis:7-alpine
```

### 3. Backend

```powershell
cd backend

python -m venv .venv
.\.venv\Scripts\Activate.ps1

pip install -r requirements.txt

# Run from the my_writer root, not from inside backend/
cd ..
.\backend\.venv\Scripts\python.exe -m uvicorn backend.main:app --reload --port 8000
```

### 4. Frontend

Open a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open **http://localhost:3000**.

---

## Running the Pipeline

1. Open http://localhost:3000.
2. Click **Config** to review or change the book title, genre, and premise.
3. Click **Generate**. The planner will read your `/docs` context files and produce a full sub-section queue — you will see the cards populate in the grid.
4. The pipeline pauses automatically. Review the next section title and directive in the sidebar. Edit if needed.
5. Click **Approve & Draft**. Watch the prose stream live into the Prose view.
6. Repeat for each section. The pipeline handles research, drafting, and memory management automatically.
7. When all sections are done, the Front Matter and Back Matter generate automatically, and the final `.md` file is compiled.
8. Click **Download Manuscript** to save your book.

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/write` | Start a new writing session. Accepts book metadata JSON. Returns an SSE stream. |
| POST | `/api/resume` | Resume after a human-in-the-loop pause. Accepts `thread_id`, updated `plan`, and `past_steps`. Returns an SSE stream. |
| GET | `/api/download/{session_id}` | Download the compiled Markdown manuscript. |
| GET | `/api/health` | Health check. Returns `{"status": "ok"}`. |

### SSE Event Schema

All events are `data: <JSON>` lines. Event types:

| `type` | Payload | Meaning |
|---|---|---|
| `status` | `current_node`, `message` | Node transition — update the status display |
| `plan` | `plan: []` | Planner finished — populate the section card grid |
| `hitl_pause` | `thread_id`, `plan`, `target_task` | Graph interrupted — show the review panel |
| `token` | `content`, `sub_section` | Prose token — append to the streaming display |
| `replan` | `latest_summary`, `next_task` | Section complete — advance the queue |
| `done` | `message` | All sections drafted and compiled |
| `error` | `message` | Recoverable error |

---

## Key Dependencies

| Package | Version | Role |
|---|---|---|
| `langgraph` | 0.2.73 | Plan-and-Execute state graph orchestration |
| `langchain-core` | 0.3.65 | LangChain LCEL and prompt abstractions |
| `langchain-openai` | 0.3.18 | GPT-4o and GPT-4o-mini integration |
| `langchain-tavily` | 0.2.18 | Tavily web search tool |
| `langchain-community` | 0.3.25 | Community integrations |
| `langgraph-checkpoint-redis` | 0.0.2 | Redis-backed graph state persistence |
| `fastapi` | 0.111.1 | REST and SSE API server |
| `sse-starlette` | 2.1.2 | Server-Sent Events support |
| `redis` | 5.2.1 | Redis client |
| `pydantic-settings` | 2.4.0 | Configuration from `.env` |
| `structlog` | 24.4.0 | Structured logging |
| `next` | 16.x | React framework for the frontend |
| `framer-motion` | latest | UI animations |

---

## Common Issues

**`No module named uvicorn`**
Run the server from the project root (`my_writer/`), not from inside `backend/`. The command is:
```powershell
.\backend\.venv\Scripts\python.exe -m uvicorn backend.main:app --reload --port 8000
```

**`Cannot connect to Docker`**
Docker Desktop must be running before you start the Redis container. Open Docker Desktop from the Start Menu, wait for it to finish loading, then run the `docker run` command.

**`langgraph-checkpoint-redis` connection refused**
The backend falls back to `MemorySaver` if Redis is unavailable — sessions will work but will not survive a server restart.

**Pyrefly IDE errors (`Cannot find module langgraph`)**
These are IDE configuration errors, not code errors. Open the Command Palette in VS Code (`Ctrl+Shift+P`), choose **Python: Select Interpreter**, and point it to:
```
d:\deployment_2026\my_writer\backend\.venv\Scripts\python.exe
```
