# Vidhaan AI - Version 0.1 Design & Release Document

*   **Active Release Version**: `v0.1.0`
*   **Release Milestone**: Sovereign Hybrid RAG, Desktop Flexbox Viewport Lock, Branding Re-alignment, and Multi-platform Cloud Launch
*   **Status**: Deployed (Production Frontend on Vercel, Backend on Render, DB on Supabase)
*   **Release Date**: May 24, 2026

---

## 📋 1. Release Summary
Version 0.1 of Vidhaan AI establishes the production-grade legal research workbench. Moving away from highly generic SaaS layout tropes and ungrounded LLM completions, this release deploys a mathematically precise dense-sparse hybrid search re-ranking pipeline grounded strictly in authoritative Indian statutory acts. The workspace has been optimized with strict viewport constraints resembling the standard layout geometry of modern platforms like Gemini and ChatGPT.

---

## ⚙️ 2. Core Implemented Features & Architecture

### 2.1. Sovereign Hybrid Dense-Sparse Search (RAG)
*   **Vector Engine Upgrades**: Migrated keyword parsing from `ts_rank_cd` to `ts_rank` to avoid cover-density dilution on repeated legal stop-words (e.g., "party", "loss", "contract").
*   **RRF Parent Deduplication**: Addressed Illustration-based search bias. Standard Reciprocal Rank Fusion (RRF) algorithms sum candidate chunk scores, causing long sections containing numerous illustrations to dominate results. Grouping and deduplicating ranks at the Parent Document ID level ensures precise section mapping (e.g., Section 124 of the Indian Contract Act ranks at #1 for indemnity queries).
*   **Citations UI**: Embedded primary citation fields in assistant response payloads, linking directly to the source acts and section headers, including the exact source PDF names in the side explorer panel.

### 2.2. Strict Viewport & Flexbox Layout Alignment
*   **Global Viewport Lock**: Configured `h-screen max-h-screen overflow-hidden` classes at both `html` and `body` levels inside `layout.tsx` to completely disable browser-level window scrolling.
*   **Pure Vertical Flexbox**: Restructured the central workbench board into a rigid flex column:
    *   **Header**: Fits at the top with a fixed height (`shrink-0`).
    *   **Message Feed**: Configured with `flex-1 overflow-y-auto` to scroll messages smoothly in isolation.
    *   **Command Input Area**: Placed as a normal flex sibling (`shrink-0 bg-white border-t`) locking it to the bottom of the viewport without absolute positioning bugs.
*   **Auto-Zoom Prevention**: Configured textarea inputs with `text-base md:text-sm` font sizes. Setting font size to 16px on mobile viewports prevents iOS and Safari from forcing dynamic screen zooms on focus.
*   **Mobile-First Layout**:
    *   **Sidebar Drawer**: Configured with `-translate-x-full` and backdrop blur overlays, sliding in on command and collapsing when clicking outside.
    *   **Mobile Session Controls**: Relocated the active email profile card and sign-out controls to the bottom footer of the Left Sidebar (`flex md:hidden`) and appended explicit `"Sign Out"` text to logout buttons to save header space.

### 2.3. Institutional Branding & Technical Transparency
*   **Visual Re-Theme**: Shifted from generic dark-neon styles to a highly professional legal workbench. Utilized Ashoka Navy Blue (`#0f2942`), National Saffron (`#f57c00`), and a premium cream parchment canvas background (`#fdfbf7`).
*   **Official Disclaimer**: Placed standard, dispassionate legal warnings at the footer of both the landing page and the logged-in workspace workspace ("Developmental MVP. Not an official government website. Verify legal insights.").
*   **Stack Exposure**: Embedded technical specs directly in the landing page's Index Status card and the empty-state suggestions board, specifying:
    *   **Primary LLM**: LLaMA-3.3-70B-Versatile (via Groq Cloud)
    *   **Fallback LLM**: Gemini 2.5 Flash
    *   **Embedding Model**: Gemini Embedding v2 (768d Matryoshka)
    *   **Relational Database**: PostgreSQL (Supabase with `pgvector`)

### 2.4. Production Credentials & Account Sync
*   **Persistent Auth**: Implemented PostgreSQL-backed email and password authentication, saving session credentials and chat threads persistently.
*   **Thread Utilities**: Added support for creating new chats, renaming threads, deleting conversation histories, and copying query/response content to the clipboard.

---

## 🛠️ 3. Tool & Codebase Modifications

*   **`frontend/src/app/layout.tsx`**: Updated root metadata titles and locked HTML/Body viewports.
*   **`frontend/src/app/page.tsx`**: Replaced absolute inputs with standard flex, added mobile drawer overlays, dynamic endpoints via `process.env.NEXT_PUBLIC_API_URL`, and refined styling.
*   **`backend/app/search.py`**: Refactored hybrid search algorithms to leverage `ts_rank` instead of `ts_rank_cd`, and implemented parent-level deduplicated RRF.
*   **`backend/app/main.py`**: Updated API routing endpoints to `version="0.1.0"`.
*   **`backend/Dockerfile`**: Configured a lightweight Python 3.12 container optimized for GCP Cloud Run or Docker runtime environments.
*   **`render.yaml`**: Created a Render Blueprint configuration specifying the uvicorn web service alongside an automatically linked Postgres database.
*   **`.gitignore`**: Excluded node modules, Python virtual environments (`venv`), local keys (`.env`), database logs, and dynamic PDFs.
*   **`README.md`**: Created a root-level guide complete with Mermaid architecture diagrams.

---

## 🚀 4. Deployment Verification

*   **Next.js Production Build**: Compiled cleanly without any TypeScript compilation errors or Turbopack warning events.
*   **GitHub Publishing**: Linked codebase to `mr-sharath/vidhaan_ai.git` private repository, renamed default branch to `main`, and pushed tags:
    ```bash
    git tag -a v0.1.0 -m "Release v0.1.0"
    git push -u origin main --tags
    ```
*   **Hosting Configuration**:
    *   **Frontend**: Hosted on **Vercel** (https://vidhaan.vercel.app/)
    *   **Backend**: Hosted on **Render** (https://vidhaan-ai.onrender.com)
    *   **Database**: **Supabase PostgreSQL Instance**
