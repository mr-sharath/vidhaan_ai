# Vidhaan AI - Version 0.3.0 Release Notes
*Date: July 5, 2026*
*Status: Deployed & Active*

## Overview
Vidhaan AI v0.3.0 introduces secure containerized knowledge base isolation (Custom Vaults), a multi-hop mediator RAG synthesis pipeline, an inline whiteboard notebook workspace with browser sync mechanics, and premium landing page graphics compliant with official Indian digital guidelines.

---

## Key Features & Enhancements

### 1. Sovereign Custom Knowledge Vaults
* **pgvector Storage:** Implemented secure local database schemas using pgvector for storing isolated document chunks vectorized via `gemini-embedding-2` (768 dimensions).
* **Parallel Ingestion:** Enabled parallel chunked uploads for up to 5 files (`.pdf`, `.docx`, `.txt`) per custom knowledge base.
* **Token-Free Ticket Previews:** Previews are served securely using a 15-second single-use ticket key (`tk_...`), completely eliminating auth token leakage into the browser address bar.

### 2. Multi-Hop Mediator RAG Search Pipeline
* **Mediator LLM Layer:** Automatically triggers when searching a custom knowledge base. The mediator extracts entities, statutory titles, and legal queries from custom files, runs secondary queries against the public database, and compiles a merged hybrid context block.
* **Zero Disclaimers:** Direct LLM output synthesis with strict statutory source citations.

### 3. Unified Workspace & Sidebar Symmetry
* **Inline Whiteboard Editor:** Pinned citations and draft editor render inside the central pane, preserving constant access to the left chat list.
* **URL Search Parameter Sync:** Persistently syncs view variables (`view`, `thread`, `vault`) in the browser's address bar to restore the user session on page refresh.
* **Aesthetic Alignment:** Normalized the sidebar dashboard buttons to share equivalent typography, outlines, and amber active highlight states.

### 4. High-Contrast Dark Mode & Graphic Assets
* **Department Scope Graphics:** Generated 4 high-definition legal symbolic illustrations representing key constitutional and judicial divisions of India.
* **Contrast Fixes:** Replaced all bright white card containers with charcoal classes (`dark:bg-[#1a1a1a]`) and fixed navy text headers to ensure optimal readability in dark mode.

---

## Technical Metrics
* **Total Chunks in Memory:** 5,233 sections
* **Public Acts Ingested:** 113 acts
* **Local Response Latency:** < 85ms
