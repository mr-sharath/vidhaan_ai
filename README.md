# Vidhaan AI (v0.1) ⚖️

Vidhaan AI is a production-grade, sovereign legal intelligence assistant mapping the codification landscape of Indian Law. Grounded directly in verified legislative drafts, it utilizes an agentic hybrid dense-sparse RAG pipeline to deliver highly accurate, citations-backed responses.

## 🏗️ Core Architecture & Technical Stack

Vidhaan AI is designed with a high-performance decoupled architecture:

```mermaid
graph TD
    A[Next.js Client v0.1.0] -->|HTTP / SSE Stream| B[FastAPI Backend Node]
    B -->|Dense Query Vector| C[Google Gemini Embeddings]
    B -->|Sparse Search Query| D[(PostgreSQL Database)]
    B -->|Hybrid Reciprocal Rank Fusion| E[RRF Rank Merger]
    E -->|Context Injection| F[LLaMA-3.3-70B via Groq]
    F -->|Real-Time Token Streams| A
```

### 🧠 Model Specifications
*   **Primary Inference LLM**: `llama-3.3-70b-versatile` (configured via Groq Cloud API for sub-second responses).
*   **High-Fidelity Fallback LLM**: `gemini-2.5-flash` (configured via Google GenAI SDK).
*   **Dense Vector Embeddings**: `gemini-embedding-2` generating 768-dimensional vectors with Matryoshka Representation Learning (MRL) support.
*   **Sparse Text Search**: PostgreSQL Full-Text Search using `ts_rank` and custom legal stop-words configuration.
*   **RAG Fusion Re-ranker**: Custom Reciprocal Rank Fusion (RRF) matching dense-vector distances with sparse coverage scores, featuring parent-document deduplication.

### 💻 Technology Stack
*   **Frontend**: Next.js 15+ (App Router), React 19, TypeScript, Vanilla CSS (harmonious Ashoka Navy Blue and saffron HSL styling).
*   **Backend**: FastAPI, Python 3.12, Uvicorn, Pydantic, SQLAlchemy.
*   **Database**: PostgreSQL with `pgvector` extension for storing statutory section vector tokens.

---

## 🚀 Getting Started

### 1. Prerequisites
Ensure you have the following installed:
*   Node.js (v18+)
*   Python (v3.12+)
*   PostgreSQL database instance with `pgvector` enabled

### 2. Environment Configurations

#### Backend (`/backend/.env`)
Create a `.env` file in the backend directory matching the `.env.example`:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/vidhaan_db
GEMINI_API_KEY=your_gemini_api_key_here
GROQ_API_KEY=your_groq_api_key_here
```

#### Frontend (`/frontend/.env.local`)
Next.js naturally hooks to the FastAPI server running on localhost:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 3. Startup Instructions

#### Backend Setup
1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate
   ```
3. Install the dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the database seed and document ingestion script:
   ```bash
   python scripts/ingest.py
   ```
5. Run the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload
   ```

#### Frontend Setup
1. Navigate to the frontend folder:
   ```bash
   cd ../frontend
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Launch Next.js in development mode:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) to access the Vidhaan AI Sovereign Workbench.

---

## 🏛️ Project Structure
```
vidhaan_ai/
├── backend/
│   ├── app/                 # FastAPI router, database modules, search engines
│   ├── scripts/             # DB seeding, PDF document parsing, ingestion
│   └── requirements.txt     # Python libraries
├── frontend/
│   ├── src/app/             # Next.js main UI views, authentication flow, layout
│   └── package.json         # Node scripts & dependencies
└── data/                    # Legislative PDF directories and source materials
```

---

## 📜 Institutional Disclaimer
Vidhaan AI is a developmental MVP and research tool. It is **not** an official website of the Legislative Department or any Government of India agency. AI-generated legal insights must be verified against official gazettes before usage in litigation.
