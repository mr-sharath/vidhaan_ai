import json
import asyncio
import uuid as pyuuid
import os
import datetime
import jwt
from fastapi import FastAPI, Depends, HTTPException, Body, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

from app.config import settings
from app.db import get_db, init_db, User, ChatThread, ChatMessage, CustomKnowledgeBase, CustomDocument, CustomDocumentChunk
from app.search import hybrid_search_rrf
from app.kb_helpers import process_kb_document
from app.embeddings import get_query_embedding

# Initialize FastAPI
app = FastAPI(
    title="Vidhaan AI Backend",
    description="Asynchronous legal-tech RAG backend supporting SSE real-time streaming.",
    version="0.1.0"
)

# Configure CORS
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "https://vidhaan.vercel.app", "https://vidhaanai.online", "https://www.vidhaanai.online"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import hashlib
import secrets

def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    hash_bytes = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    )
    return f"{salt}:{hash_bytes.hex()}"

def verify_password(password: str, hashed_password: str) -> bool:
    try:
        salt, stored_hash = hashed_password.split(':')
        hash_bytes = hashlib.pbkdf2_hmac(
            'sha256',
            password.encode('utf-8'),
            salt.encode('utf-8'),
            100000
        )
        return hash_bytes.hex() == stored_hash
    except Exception:
        return False

# JWT Security Utilities & Dependencies
security = HTTPBearer()
JWT_SECRET = os.getenv("JWT_SECRET", "vidhaan_ai_sovereign_secret_key_2026")
JWT_ALGORITHM = "HS256"

def create_access_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)) -> User:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authorization token")
        user_uuid = pyuuid.UUID(user_id)
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authorization token")
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid authorization token")
        
    user = db.query(User).filter(User.id == user_uuid).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

@app.on_event("startup")
def startup_event():
    init_db()
    
    # Seed default admin user
    from app.db import SessionLocal
    db = SessionLocal()
    try:
        admin_email = "admin@vidhaanai.online"
        admin_user = db.query(User).filter(User.email == admin_email).first()
        if not admin_user:
            print("Seeding default admin account...")
            hashed = hash_password("AdminVidhaan2026!")
            admin_user = User(email=admin_email, password_hash=hashed, is_admin=True)
            db.add(admin_user)
            db.commit()
            db.refresh(admin_user)
            print("Admin account seeded successfully: admin@vidhaanai.online / AdminVidhaan2026!")
        else:
            if not admin_user.is_admin:
                admin_user.is_admin = True
                db.commit()
                print("Admin account privileges verified.")
    except Exception as e:
        print(f"Error seeding admin user: {e}")
        db.rollback()
    finally:
        db.close()

class Message(BaseModel):
    role: str  # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]
    augmented_mode: bool = True
    user_id: Optional[str] = None
    thread_id: Optional[str] = None
    selected_kb_id: Optional[str] = None

class AuthRequest(BaseModel):
    email: str
    password: str

class ThreadCreate(BaseModel):
    user_id: str
    title: str

class ThreadUpdate(BaseModel):
    title: str

class KBCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None

class NotebookCitationPin(BaseModel):
    act_title: str
    section_title: Optional[str] = None
    pdf_name: Optional[str] = None
    snippet: str
    custom_notes: Optional[str] = None

class NotebookCitationUpdate(BaseModel):
    custom_notes: Optional[str] = None

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "groq_configured": settings.GROQ_API_KEY != "gsk_your_groq_api_key_here",
        "gemini_configured": settings.GEMINI_API_KEY != "your_gemini_api_key_here"
    }

@app.post("/api/auth/signup")
def sign_up(payload: AuthRequest, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    password = payload.password.strip()
    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password are required")
    
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
        
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="An account with this email already exists")
        
    # Hash password and create user
    hashed = hash_password(password)
    user = User(email=email, password_hash=hashed)
    db.add(user)
    db.commit()
    db.refresh(user)
    
    token = create_access_token(str(user.id))
    return {
        "id": str(user.id),
        "email": user.email,
        "is_admin": user.is_admin,
        "created_at": user.created_at.isoformat(),
        "access_token": token,
        "token_type": "bearer"
    }

@app.post("/api/auth/signin")
def sign_in(payload: AuthRequest, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    password = payload.password.strip()
    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password are required")
        
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
        
    # Handle legacy mock users created without password_hash
    if not user.password_hash:
        user.password_hash = hash_password(password)
        db.commit()
        db.refresh(user)
    elif not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
        
    token = create_access_token(str(user.id))
    return {
        "id": str(user.id),
        "email": user.email,
        "is_admin": user.is_admin,
        "created_at": user.created_at.isoformat(),
        "access_token": token,
        "token_type": "bearer"
    }

@app.get("/api/threads")
def list_threads(user_id: Optional[str] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Ignore user_id query param and use current_user.id for security
    threads = db.query(ChatThread).filter(ChatThread.user_id == current_user.id).order_by(ChatThread.is_pinned.desc(), ChatThread.created_at.desc()).all()
    return [
        {
            "id": str(t.id),
            "title": t.title,
            "is_pinned": t.is_pinned,
            "created_at": t.created_at.isoformat()
        }
        for t in threads
    ]

@app.post("/api/threads")
def create_thread(payload: ThreadCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Securely map thread creation to current authenticated user
    thread = ChatThread(user_id=current_user.id, title=payload.title)
    db.add(thread)
    db.commit()
    db.refresh(thread)
    
    return {
        "id": str(thread.id),
        "title": thread.title,
        "created_at": thread.created_at.isoformat()
    }

@app.get("/api/threads/{thread_id}/messages")
def get_thread_history(thread_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        thread_uuid = pyuuid.UUID(thread_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid thread_id format")
        
    thread = db.query(ChatThread).filter(ChatThread.id == thread_uuid, ChatThread.user_id == current_user.id).first()
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found or access denied")
        
    messages = db.query(ChatMessage).filter(ChatMessage.thread_id == thread_uuid).order_by(ChatMessage.created_at.asc()).all()
    return [
        {
            "id": str(m.id),
            "role": m.role,
            "content": m.content,
            "sources": m.sources or [],
            "model": m.model,
            "search_meta": m.search_meta,
            "created_at": m.created_at.isoformat()
        }
        for m in messages
    ]

@app.delete("/api/threads/{thread_id}")
def delete_thread(thread_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        thread_uuid = pyuuid.UUID(thread_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid thread_id format")
        
    thread = db.query(ChatThread).filter(ChatThread.id == thread_uuid, ChatThread.user_id == current_user.id).first()
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found or access denied")
        
    db.delete(thread)
    db.commit()
    return {"status": "success", "message": "Thread deleted successfully"}

@app.delete("/api/threads/{thread_id}/messages")
def delete_thread_messages(thread_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return delete_thread(thread_id, db, current_user)

@app.delete("/api/threads")
def delete_all_threads(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    threads = db.query(ChatThread).filter(ChatThread.user_id == current_user.id).all()
    for thread in threads:
        db.delete(thread)
    db.commit()
    return {"status": "success", "message": "All chat history cleared successfully"}

@app.delete("/api/users/me")
def delete_current_user(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db.delete(current_user)
    db.commit()
    return {"status": "success", "message": "User account and all associated data deleted successfully"}


@app.patch("/api/threads/{thread_id}")
def update_thread(thread_id: str, payload: ThreadUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        thread_uuid = pyuuid.UUID(thread_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid thread_id format")
        
    thread = db.query(ChatThread).filter(ChatThread.id == thread_uuid, ChatThread.user_id == current_user.id).first()
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found or access denied")
        
    thread.title = payload.title.strip()
    db.commit()
    db.refresh(thread)
    
    return {
        "id": str(thread.id),
        "title": thread.title,
        "created_at": thread.created_at.isoformat()
    }

@app.put("/api/threads/{thread_id}/pin")
def pin_thread(thread_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        thread_uuid = pyuuid.UUID(thread_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid thread_id format")
        
    thread = db.query(ChatThread).filter(ChatThread.id == thread_uuid, ChatThread.user_id == current_user.id).first()
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found or access denied")
        
    thread.is_pinned = not thread.is_pinned
    db.commit()
    db.refresh(thread)
    return {"status": "success", "is_pinned": thread.is_pinned}

@app.get("/api/notebook")
def get_notebook_citations(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from app.db import NotebookCitation
    citations = db.query(NotebookCitation).filter(NotebookCitation.user_id == current_user.id).order_by(NotebookCitation.created_at.desc()).all()
    return [
        {
            "id": str(c.id),
            "act_title": c.act_title,
            "section_title": c.section_title,
            "pdf_name": c.pdf_name,
            "snippet": c.snippet,
            "custom_notes": c.custom_notes,
            "created_at": c.created_at.isoformat()
        }
        for c in citations
    ]

@app.post("/api/notebook/pin")
def pin_citation(payload: NotebookCitationPin, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from app.db import NotebookCitation
    # Avoid duplicate pins of the exact same snippet/section
    existing = db.query(NotebookCitation).filter(
        NotebookCitation.user_id == current_user.id,
        NotebookCitation.act_title == payload.act_title,
        NotebookCitation.section_title == payload.section_title,
        NotebookCitation.snippet == payload.snippet
    ).first()
    
    if existing:
        return {"status": "already_exists", "id": str(existing.id)}
        
    citation = NotebookCitation(
        user_id=current_user.id,
        act_title=payload.act_title,
        section_title=payload.section_title,
        pdf_name=payload.pdf_name,
        snippet=payload.snippet,
        custom_notes=payload.custom_notes
    )
    db.add(citation)
    db.commit()
    db.refresh(citation)
    return {"status": "success", "id": str(citation.id)}

@app.put("/api/notebook/pin/{citation_id}")
def update_citation_notes(citation_id: str, payload: NotebookCitationUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from app.db import NotebookCitation
    try:
        citation_uuid = pyuuid.UUID(citation_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid citation_id format")
        
    citation = db.query(NotebookCitation).filter(NotebookCitation.id == citation_uuid, NotebookCitation.user_id == current_user.id).first()
    if not citation:
        raise HTTPException(status_code=404, detail="Citation not found or access denied")
        
    citation.custom_notes = payload.custom_notes
    db.commit()
    db.refresh(citation)
    return {"status": "success", "custom_notes": citation.custom_notes}

@app.delete("/api/notebook/pin/{citation_id}")
def delete_citation_pin(citation_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from app.db import NotebookCitation
    try:
        citation_uuid = pyuuid.UUID(citation_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid citation_id format")
        
    citation = db.query(NotebookCitation).filter(NotebookCitation.id == citation_uuid, NotebookCitation.user_id == current_user.id).first()
    if not citation:
        raise HTTPException(status_code=404, detail="Citation not found or access denied")
        
    db.delete(citation)
    db.commit()
    return {"status": "success", "message": "Citation unpinned successfully"}

def generate_mediator_query(user_query: str, custom_context: str) -> str:
    """
    Generates an optimized statutory search query from the user query and custom vault context.
    Uses Groq (Llama 3.3) or Gemini for intermediate generation.
    """
    prompt = f"""You are a legal assistant. Analyze the user query and the custom document text below:

User Query: "{user_query}"
Custom Document Context:
{custom_context}

Identify any specific Indian acts, sections, rules, or legal provisions mentioned or implied in the Custom Document Context.
Construct a search query optimized for database retrieval.
The query should be a concise phrase of key legal terms and act/section titles.
For example, if the document mentions "Section 106 Transfer of Property Act eviction notice", return "Transfer of Property Act Section 106 eviction notice".
If no specific acts or sections are found, output a keyword query summarizing the legal issue.
Output ONLY the final search query text. Do not write any explanations, preamble, or markdown formatting."""

    if settings.GROQ_API_KEY and settings.GROQ_API_KEY != "gsk_your_groq_api_key_here":
        try:
            from groq import Groq
            client = Groq(api_key=settings.GROQ_API_KEY)
            completion = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": "You are a helpful legal query generator."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=100
            )
            val = completion.choices[0].message.content.strip()
            if val:
                if val.startswith('"') and val.endswith('"'):
                    val = val[1:-1].strip()
                return val
        except Exception as e:
            print(f"Error in Groq mediator query generator: {e}")

    if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY != "your_gemini_api_key_here":
        try:
            from google import genai
            g_client = genai.Client(api_key=settings.GEMINI_API_KEY)
            response = g_client.models.generate_content(
                model="gemini-2.0-flash",
                contents=prompt,
            )
            val = response.text.strip()
            if val:
                if val.startswith('"') and val.endswith('"'):
                    val = val[1:-1].strip()
                return val
        except Exception as e:
            print(f"Error in Gemini mediator query generator: {e}")

    return user_query

async def chat_stream_generator(request: ChatRequest, db: Session):
    """
    Asynchronous SSE stream generator that yields:
    - Status Updates
    - Retrieved Statutory Sources (if augmented_mode is ON)
    - LLM Answer Tokens (Groq with Gemini Fallback)
    - Done Signal
    """
    try:
        user_query = request.messages[-1].content
        sources = []
        sources_payload = []
        active_model = None
        search_meta = None
        
        # 1. RAG pipeline (Augmented Statutory Mode)
        custom_chunks = []
        custom_kb_name = None
        search_query = user_query
        
        if request.augmented_mode:
            # Query custom knowledge base if selected
            if request.selected_kb_id and request.selected_kb_id != "none":
                try:
                    kb_uuid = pyuuid.UUID(request.selected_kb_id)
                    kb = db.query(CustomKnowledgeBase).filter(CustomKnowledgeBase.id == kb_uuid).first()
                    if kb:
                        custom_kb_name = kb.name
                        yield f"event: status\ndata: {json.dumps(f'Searching custom vault context ({kb.name})...')}\n\n"
                        await asyncio.sleep(0.05)
                        
                        query_vector = get_query_embedding(user_query)
                        if not all(v == 0.0 for v in query_vector):
                            sql = text("""
                                SELECT chunk.content, doc.filename
                                FROM custom_document_chunks chunk
                                JOIN custom_documents doc ON doc.id = chunk.document_id
                                WHERE doc.kb_id = :kb_id AND doc.status = 'completed'
                                ORDER BY chunk.embedding <#> CAST(:query_embedding AS vector)
                                LIMIT 4;
                            """)
                            res = db.execute(sql, {"query_embedding": query_vector, "kb_id": kb_uuid})
                            for row in res:
                                custom_chunks.append({
                                    "filename": row.filename,
                                    "content": row.content
                                })
                                
                        # Multi-hop RAG mediator signature query extraction!
                        if custom_chunks:
                            yield f"event: status\ndata: {json.dumps('Extracting key legal concepts from your vault documents...')}\n\n"
                            await asyncio.sleep(0.05)
                            custom_context_text = "\n\n".join([f"[{c['filename']}]: {c['content']}" for c in custom_chunks])
                            search_query = generate_mediator_query(user_query, custom_context_text)
                            print(f"Generated mediator search query signature: {search_query}")
                except Exception as kb_err:
                    print(f"Error querying custom KB: {kb_err}")

            yield f"event: status\ndata: {json.dumps('Querying statutory vector database (Hybrid Search)...')}\n\n"
            await asyncio.sleep(0.1)
            
            try:
                import time
                search_start = time.time()
                # Perform hybrid dense-sparse RRF search using the generated signature query
                sources = hybrid_search_rrf(db, search_query, limit=4)
                search_time_ms = int((time.time() - search_start) * 1000)
                
                if sources:
                    yield f"event: status\ndata: {json.dumps(f'Found {len(sources)} statutory sources. Re-ranking...')}\n\n"
                    await asyncio.sleep(0.1)
                    
                    # Format cited sources payload containing exact PDF filename and relative path
                    def get_relative_pdf_path(source_file: str) -> str:
                        if not source_file:
                            return ""
                        norm = source_file.replace("\\", "/")
                        parts = norm.split("/data/")
                        if len(parts) > 1:
                            return parts[-1]
                        return os.path.basename(source_file)

                    sources_payload = [
                        {
                            "act_title": s["act_title"],
                            "section_title": s["section_title"],
                            "metadata": s["metadata"],
                            "pdf_name": os.path.basename(s["metadata"].get("source_file", "")) if s["metadata"] else "",
                            "pdf_relative_path": get_relative_pdf_path(s["metadata"].get("source_file", "")) if s["metadata"] else "",
                            "snippets": s["snippets"]
                        }
                        for s in sources
                    ]
                    yield f"event: sources\ndata: {json.dumps(sources_payload)}\n\n"
                    
                    search_meta = {
                        "count": len(sources),
                        "time_ms": search_time_ms,
                        "type": "Hybrid Dense + Sparse (RRF)"
                    }
                    yield f"event: search_stats\ndata: {json.dumps(search_meta)}\n\n"
                else:
                    yield f"event: status\ndata: {json.dumps('No high-confidence database records matched. Falling back to LLM parametric memory.')}\n\n"
                    await asyncio.sleep(0.1)
            except Exception as search_err:
                print(f"RAG search exception: {search_err}")
                yield f"event: status\ndata: {json.dumps('RAG lookup failed. Defaulting to standard inference...')}\n\n"
                await asyncio.sleep(0.1)

        # 2. Build inference prompt with tuned parameters for concise answers
        system_prompt = (
            "You are Vidhaan AI, a premium, production-grade legal AI assistant specializing in Indian Statutory Law.\n"
            "Your tone must be authoritative, neutral, clear, and highly professional.\n\n"
            "CRITICAL INSTRUCTIONS:\n"
            "1. Keep your answers brief, simple, and easy to understand. Summarize the key legal rules in a few lines of text, keeping the response concise and contextually aligned with the user's specific question.\n"
            "2. Provide a detailed or comprehensive explanation ONLY if the user explicitly asks or insists on a detailed answer. Otherwise, default to a short, high-level summary.\n"
            "3. Do NOT include any conversational disclaimers, pleasantries, fluff, intro, or concluding remarks (e.g., do NOT say 'Here is the analysis', 'Hope this helps', etc.).\n"
            "4. Anchor your responses by explicitly citing the Act name and specific Section/Article numbers where applicable.\n"
            "5. If the database context is relevant, extract the core rule and present it simply. If the database context does not contain the answer, solve the user's prompt using your internal legal parametric knowledge in the same concise, structured format.\n"
        )
        
        if request.selected_kb_id and request.selected_kb_id != "none":
            system_prompt += (
                "6. You MUST evaluate whether the user's uploaded Custom Vault documents are relevant and utilized in drafting your response.\n"
                "At the very end of your response, you MUST yield a metadata payload line indicating whether the Custom KB was utilized or not.\n"
                "This line must start with the exact prefix `__KB_UTILIZATION_METADATA__: ` followed by a JSON object containing 'utilized' (boolean) and 'explanation' (string).\n"
                "Example format:\n"
                "__KB_UTILIZATION_METADATA__: {\"utilized\": true, \"explanation\": \"The eviction notice hearing dates match rent control timings.\"}\n"
                "Ensure this metadata line is on its own separate line at the very end of your response text. Do not omit it.\n\n"
            )
        else:
            system_prompt += "\n"

        if request.augmented_mode and (sources or custom_chunks):
            system_prompt += (
                "You have been provided with authoritative sources retrieved from our statutory legal database "
                "and/or the user's custom vault knowledge base documents.\n"
                "Use these sources explicitly to ground and verify your answer. Anchor your responses by explicitly citing "
                "the Act name and specific Section/Article numbers where applicable.\n\n"
                "CRITICAL GROUNDING & RELEVANCE RULES:\n"
                "1. Assess whether the provided public database sources are contextually relevant to the user's query.\n"
                "2. If the public database sources do NOT contain relevant statutory provisions for the query, "
                "you MUST begin your response with this exact warning: '⚠️ *Note: Relevant statutory documents for this query were not found in our database index. "
                "The following answer is synthesized from fallback parametric knowledge:*'\n"
                "3. Relate public statutory provisions to custom vault documents if they touch on the same topic.\n\n"
            )
            
            if custom_chunks:
                system_prompt += (
                    f"Here are the retrieved user Custom Vault document references (Vault Name: {custom_kb_name or 'Custom KB'}):\n"
                    "--------------------------------------------------\n"
                )
                for idx, chunk in enumerate(custom_chunks, start=1):
                    system_prompt += (
                        f"CUSTOM VAULT SOURCE {idx} (File: {chunk['filename']}):\n"
                        f"Text Context:\n{chunk['content']}\n"
                        "--------------------------------------------------\n"
                    )
            
            if sources:
                system_prompt += (
                    "Here are the retrieved public statutory source references:\n"
                    "--------------------------------------------------\n"
                )
                for idx, src in enumerate(sources, start=1):
                    system_prompt += (
                        f"SOURCE {idx}:\n"
                        f"Act: {src['act_title']}\n"
                        f"Section/Article: {src['section_title']}\n"
                        f"Text Context:\n{src['content']}\n"
                        "--------------------------------------------------\n"
                    )
            
            system_prompt += (
                "\nProvide a concise legal analysis summarizing the core provision. Explain it simply in a few lines of text.\n"
                "Rely strictly on the grounding rules above to handle relevance and source discrepancies."
            )
        else:
            system_prompt += (
                "Provide a concise legal analysis summarizing the core provision based on your parametric knowledge of Indian Law. "
                "Keep the response brief and contextually aligned, with no general conversational disclaimers."
            )

        # 3. Stream Inference (Groq vs Gemini Fallback)
        yield f"event: status\ndata: {json.dumps('Synthesizing professional legal response...')}\n\n"
        await asyncio.sleep(0.05)
        
        # Prepare messages in the format expected by LLMs
        llm_messages = [{"role": "system", "content": system_prompt}]
        for msg in request.messages:
            role = "user" if msg.role == "user" else "assistant"
            llm_messages.append({"role": role, "content": msg.content})

        response_content = ""
        groq_success = False
        if settings.GROQ_API_KEY and settings.GROQ_API_KEY != "gsk_your_groq_api_key_here":
            try:
                from groq import Groq
                client = Groq(api_key=settings.GROQ_API_KEY)
                
                # Using the active llama-3.3-70b-versatile model
                completion = client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=llm_messages,
                    temperature=0.1,
                    max_tokens=2048,
                    stream=True
                )
                
                active_model = "llama-3.3-70b-versatile"
                yield f"event: model\ndata: {json.dumps(active_model)}\n\n"
                groq_success = True
                for chunk in completion:
                    token = chunk.choices[0].delta.content or ""
                    if token:
                        response_content += token
                        yield f"event: token\ndata: {json.dumps(token)}\n\n"
                        await asyncio.sleep(0.005)
                        
            except Exception as groq_err:
                print(f"Groq API call failed or rate limited: {groq_err}. Transitioning to Gemini fallback...")

        # Fallback to Gemini if Groq failed or is not configured
        if not groq_success:
            if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY != "your_gemini_api_key_here":
                try:
                    from google import genai
                    from google.genai import types
                    
                    gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)
                    
                    # Convert conversation history to google-genai content objects
                    contents = []
                    for m in request.messages[:-1]:
                        role = "user" if m.role == "user" else "model"
                        contents.append(
                            types.Content(
                                role=role,
                                parts=[types.Part.from_text(text=m.content)]
                            )
                        )
                    contents.append(
                        types.Content(
                            role="user",
                            parts=[types.Part.from_text(text=user_query)]
                        )
                    )
                    
                    active_model = "gemini-2.5-flash"
                    yield f"event: model\ndata: {json.dumps(active_model)}\n\n"
                    # Generate streamed content using gemini-2.5-flash
                    response = gemini_client.models.generate_content_stream(
                        model="gemini-2.5-flash",
                        contents=contents,
                        config=types.GenerateContentConfig(
                            system_instruction=system_prompt,
                            temperature=0.1
                        )
                    )
                    
                    for chunk in response:
                        token = chunk.text
                        if token:
                            response_content += token
                            yield f"event: token\ndata: {json.dumps(token)}\n\n"
                            await asyncio.sleep(0.005)
                except Exception as gemini_err:
                    print(f"Gemini Fallback failed: {gemini_err}")
                    yield f"event: error\ndata: {json.dumps(f'Both Groq and Gemini API connections failed: {str(gemini_err)}')}\n\n"
            else:
                yield f"event: error\ndata: {json.dumps('Inference failed. Groq/Gemini API keys are unconfigured. Please configure .env.')}\n\n"

        # 4. Save response to database if thread is configured
        if request.thread_id and response_content.strip():
            try:
                thread_uuid = pyuuid.UUID(request.thread_id)
                thread_exists = db.query(ChatThread).filter(ChatThread.id == thread_uuid).first()
                if thread_exists:
                    assistant_msg = ChatMessage(
                        thread_id=thread_uuid,
                        role="assistant",
                        content=response_content.strip(),
                        sources=sources_payload,
                        model=active_model,
                        search_meta=search_meta
                    )
                    db.add(assistant_msg)
                    db.commit()
            except Exception as db_err:
                print(f"Error saving assistant message to DB: {db_err}")
                db.rollback()

        yield "event: done\ndata: {}\n\n"

    except Exception as e:
        print(f"Critical stream generator crash: {e}")
        yield f"event: error\ndata: {json.dumps(f'Internal server stream error: {str(e)}')}\n\n"

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Main chat completion endpoint serving a text/event-stream.
    """
    # Pre-save the user's message if thread_id is provided
    if request.thread_id and request.messages:
        try:
            thread_uuid = pyuuid.UUID(request.thread_id)
            thread_exists = db.query(ChatThread).filter(ChatThread.id == thread_uuid, ChatThread.user_id == current_user.id).first()
            if thread_exists:
                user_query = request.messages[-1].content
                # Avoid duplicating user messages if already saved
                last_msg = db.query(ChatMessage).filter(ChatMessage.thread_id == thread_uuid).order_by(ChatMessage.created_at.desc()).first()
                if not last_msg or last_msg.role != "user" or last_msg.content != user_query:
                    user_msg = ChatMessage(
                        thread_id=thread_uuid,
                        role="user",
                        content=user_query
                    )
                    db.add(user_msg)
                    db.commit()
        except Exception as db_err:
            print(f"Error saving user message to DB: {db_err}")
            db.rollback()

    return StreamingResponse(
        chat_stream_generator(request, db),
        media_type="text/event-stream"
    )

# =====================================================================
# CUSTOM KNOWLEDGE BASE VAULT ENDPOINTS
# =====================================================================

@app.post("/api/kb")
def create_knowledge_base(payload: KBCreateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Limit to 10 vaults per user
    existing_count = db.query(CustomKnowledgeBase).filter(CustomKnowledgeBase.user_id == current_user.id).count()
    if existing_count >= 10:
        raise HTTPException(status_code=400, detail="You have reached the maximum limit of 10 custom vaults.")
        
    kb = CustomKnowledgeBase(
        user_id=current_user.id,
        name=payload.name.strip(),
        description=payload.description.strip() if payload.description else None,
        status="ready" # Starts as ready until a document is uploaded which triggers "processing"
    )
    db.add(kb)
    db.commit()
    db.refresh(kb)
    
    return {
        "id": str(kb.id),
        "name": kb.name,
        "description": kb.description,
        "status": kb.status,
        "created_at": kb.created_at.isoformat(),
        "documents": []
    }

@app.get("/api/kb")
def list_knowledge_bases(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    kbs = db.query(CustomKnowledgeBase).filter(CustomKnowledgeBase.user_id == current_user.id).order_by(CustomKnowledgeBase.created_at.desc()).all()
    result = []
    for kb in kbs:
        docs = db.query(CustomDocument).filter(CustomDocument.kb_id == kb.id).all()
        result.append({
            "id": str(kb.id),
            "name": kb.name,
            "description": kb.description,
            "status": kb.status,
            "created_at": kb.created_at.isoformat(),
            "documents": [
                {
                    "id": str(d.id),
                    "filename": d.filename,
                    "file_size": d.file_size,
                    "status": d.status,
                    "error_message": d.error_message,
                    "created_at": d.created_at.isoformat()
                }
                for d in docs
            ]
        })
    return result

@app.get("/api/kb/{kb_id}")
def get_knowledge_base(kb_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        kb_uuid = pyuuid.UUID(kb_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID format")
        
    kb = db.query(CustomKnowledgeBase).filter(CustomKnowledgeBase.id == kb_uuid, CustomKnowledgeBase.user_id == current_user.id).first()
    if not kb:
        raise HTTPException(status_code=404, detail="Vault not found")
        
    docs = db.query(CustomDocument).filter(CustomDocument.kb_id == kb.id).all()
    return {
        "id": str(kb.id),
        "name": kb.name,
        "description": kb.description,
        "status": kb.status,
        "created_at": kb.created_at.isoformat(),
        "documents": [
            {
                "id": str(d.id),
                "filename": d.filename,
                "file_size": d.file_size,
                "status": d.status,
                "error_message": d.error_message,
                "created_at": d.created_at.isoformat()
            }
            for d in docs
        ]
    }

@app.delete("/api/kb/{kb_id}")
def delete_knowledge_base(kb_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        kb_uuid = pyuuid.UUID(kb_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID format")
        
    kb = db.query(CustomKnowledgeBase).filter(CustomKnowledgeBase.id == kb_uuid, CustomKnowledgeBase.user_id == current_user.id).first()
    if not kb:
        raise HTTPException(status_code=404, detail="Vault not found")
        
    # Get all documents to clean up files from disk
    docs = db.query(CustomDocument).filter(CustomDocument.kb_id == kb.id).all()
    for d in docs:
        if os.path.exists(d.file_path):
            try:
                os.remove(d.file_path)
            except Exception as e:
                print(f"Error deleting file from disk: {e}")
                
    db.delete(kb)
    db.commit()
    
    # Also remove empty vault folder on disk if exists
    upload_dir = os.path.join("uploads", kb_id)
    if os.path.exists(upload_dir):
        try:
            # Delete folder contents recursively just in case
            for f in os.listdir(upload_dir):
                os.remove(os.path.join(upload_dir, f))
            os.rmdir(upload_dir)
        except Exception:
            pass
            
    return {"message": "Vault successfully deleted"}

@app.post("/api/kb/{kb_id}/upload")
def upload_kb_document(
    kb_id: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        kb_uuid = pyuuid.UUID(kb_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID format")
        
    kb = db.query(CustomKnowledgeBase).filter(CustomKnowledgeBase.id == kb_uuid, CustomKnowledgeBase.user_id == current_user.id).first()
    if not kb:
        raise HTTPException(status_code=404, detail="Vault not found")
        
    # 1. Limit check: max 5 files per vault
    doc_count = db.query(CustomDocument).filter(CustomDocument.kb_id == kb_uuid).count()
    if doc_count >= 5:
        raise HTTPException(status_code=400, detail="This vault has reached the limit of 5 uploaded files.")
        
    # 2. Format check
    filename = file.filename
    ext = os.path.splitext(filename)[1].lower()
    if ext not in [".pdf", ".docx", ".doc", ".txt"]:
        raise HTTPException(status_code=400, detail="Unsupported format. Only .pdf, .docx, and .txt files are allowed.")
        
    # 3. File size check (5MB limit)
    file.file.seek(0, os.SEEK_END)
    file_size = file.file.tell()
    file.file.seek(0)
    if file_size > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds the maximum limit of 5MB.")
        
    # 4. Save to uploads directory
    upload_dir = os.path.join("uploads", kb_id)
    os.makedirs(upload_dir, exist_ok=True)
    
    # Clean filename to avoid path traversal
    safe_filename = "".join(c for c in filename if c.isalnum() or c in "._- ")
    file_path = os.path.join(upload_dir, safe_filename)
    
    with open(file_path, "wb") as f:
        f.write(file.file.read())
        
    # 5. Create CustomDocument record
    doc = CustomDocument(
        kb_id=kb_uuid,
        filename=safe_filename,
        file_size=file_size,
        file_path=file_path,
        status="uploaded"
    )
    db.add(doc)
    
    # Force vault status to processing
    kb.status = "processing"
    db.commit()
    db.refresh(doc)
    
    # 6. Trigger background ingestion (requires a background thread)
    background_tasks.add_task(process_kb_document, db, kb_id, str(doc.id))
    
    return {
        "id": str(doc.id),
        "filename": doc.filename,
        "file_size": doc.file_size,
        "status": doc.status,
        "created_at": doc.created_at.isoformat()
    }

@app.delete("/api/kb/{kb_id}/documents/{doc_id}")
def delete_kb_document(kb_id: str, doc_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        kb_uuid = pyuuid.UUID(kb_id)
        doc_uuid = pyuuid.UUID(doc_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID format")
        
    kb = db.query(CustomKnowledgeBase).filter(CustomKnowledgeBase.id == kb_uuid, CustomKnowledgeBase.user_id == current_user.id).first()
    if not kb:
        raise HTTPException(status_code=404, detail="Vault not found")
        
    doc = db.query(CustomDocument).filter(CustomDocument.id == doc_uuid, CustomDocument.kb_id == kb_uuid).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found inside this vault")
        
    # Clean file from disk
    if os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except Exception as e:
            print(f"Error removing document file from disk: {e}")
            
    db.delete(doc)
    db.commit()
    
    # Re-evaluate KB status if remaining docs are completed
    remaining_docs = db.query(CustomDocument).filter(CustomDocument.kb_id == kb_uuid).all()
    if not remaining_docs:
        kb.status = "ready"
    elif all(d.status == "completed" for d in remaining_docs):
        kb.status = "ready"
    else:
        kb.status = "processing"
    db.commit()
    
    return {"message": "Document successfully deleted"}

@app.get("/api/kb/{kb_id}/documents/{doc_id}/download")
def download_kb_document(
    kb_id: str, 
    doc_id: str, 
    token: Optional[str] = None, 
    db: Session = Depends(get_db), 
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))
):
    auth_token = None
    if credentials:
        auth_token = credentials.credentials
    elif token:
        auth_token = token
        
    if not auth_token:
        raise HTTPException(status_code=401, detail="Authentication credentials not provided")
        
    try:
        payload = jwt.decode(auth_token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        user_uuid = pyuuid.UUID(user_id)
    except (jwt.PyJWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid or expired token")
        
    current_user = db.query(User).filter(User.id == user_uuid).first()
    if not current_user:
        raise HTTPException(status_code=401, detail="User not found")

    try:
        kb_uuid = pyuuid.UUID(kb_id)
        doc_uuid = pyuuid.UUID(doc_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID format")
        
    kb = db.query(CustomKnowledgeBase).filter(CustomKnowledgeBase.id == kb_uuid, CustomKnowledgeBase.user_id == current_user.id).first()
    if not kb:
        raise HTTPException(status_code=404, detail="Vault not found")
        
    doc = db.query(CustomDocument).filter(CustomDocument.id == doc_uuid, CustomDocument.kb_id == kb_uuid).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found inside this vault")
        
    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="File not found on server disk")
        
    ext = os.path.splitext(doc.filename.lower())[1]
    if ext == ".pdf":
        media_type = "application/pdf"
    elif ext == ".txt":
        media_type = "text/plain; charset=utf-8"
    elif ext in (".docx", ".doc"):
        media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    else:
        media_type = "application/octet-stream"
        
    return FileResponse(doc.file_path, media_type=media_type, content_disposition_type="inline")

@app.get("/api/kb/preview/{vault_name}/{filename}")
def preview_kb_document_by_name(
    vault_name: str, 
    filename: str, 
    token: Optional[str] = None, 
    db: Session = Depends(get_db), 
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))
):
    auth_token = None
    if credentials:
        auth_token = credentials.credentials
    elif token:
        auth_token = token
        
    if not auth_token:
        raise HTTPException(status_code=401, detail="Authentication credentials not provided")
        
    try:
        payload = jwt.decode(auth_token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        user_uuid = pyuuid.UUID(user_id)
    except (jwt.PyJWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid or expired token")
        
    current_user = db.query(User).filter(User.id == user_uuid).first()
    if not current_user:
        raise HTTPException(status_code=401, detail="User not found")

    kb = db.query(CustomKnowledgeBase).filter(
        CustomKnowledgeBase.name == vault_name, 
        CustomKnowledgeBase.user_id == current_user.id
    ).first()
    if not kb:
        raise HTTPException(status_code=404, detail="Vault not found")
        
    doc = db.query(CustomDocument).filter(
        CustomDocument.filename == filename, 
        CustomDocument.kb_id == kb.id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found inside this vault")
        
    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="File not found on server disk")
        
    ext = os.path.splitext(doc.filename.lower())[1]
    if ext == ".pdf":
        media_type = "application/pdf"
    elif ext == ".txt":
        media_type = "text/plain; charset=utf-8"
    elif ext in (".docx", ".doc"):
        media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    else:
        media_type = "application/octet-stream"
        
    return FileResponse(doc.file_path, media_type=media_type, content_disposition_type="inline")

preview_tickets = {}

class TicketRequest(BaseModel):
    kb_id: str
    doc_id: str

@app.post("/api/kb/tickets")
def create_preview_ticket(request: TicketRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    import secrets
    import time
    try:
        kb_uuid = pyuuid.UUID(request.kb_id)
        doc_uuid = pyuuid.UUID(request.doc_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID format")
        
    kb = db.query(CustomKnowledgeBase).filter(CustomKnowledgeBase.id == kb_uuid, CustomKnowledgeBase.user_id == current_user.id).first()
    if not kb:
        raise HTTPException(status_code=404, detail="Vault not found")
        
    doc = db.query(CustomDocument).filter(CustomDocument.id == doc_uuid, CustomDocument.kb_id == kb_uuid).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    ticket_id = secrets.token_hex(16)
    preview_tickets[ticket_id] = {
        "doc_id": str(doc.id),
        "expires_at": time.time() + 15
    }
    return {"ticket": ticket_id}

@app.get("/api/kb/view-file/{ticket_id}")
def view_file_by_ticket(ticket_id: str, db: Session = Depends(get_db)):
    import time
    ticket = preview_tickets.get(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Invalid, expired, or used preview ticket.")
        
    if time.time() > ticket["expires_at"]:
        preview_tickets.pop(ticket_id, None)
        raise HTTPException(status_code=410, detail="Preview ticket has expired.")
        
    preview_tickets.pop(ticket_id, None)
    
    doc_uuid = pyuuid.UUID(ticket["doc_id"])
    doc = db.query(CustomDocument).filter(CustomDocument.id == doc_uuid).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="File not found on server disk")
        
    ext = os.path.splitext(doc.filename.lower())[1]
    if ext == ".pdf":
        media_type = "application/pdf"
    elif ext == ".txt":
        media_type = "text/plain; charset=utf-8"
    elif ext in (".docx", ".doc"):
        media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    else:
        media_type = "application/octet-stream"
        
    return FileResponse(doc.file_path, media_type=media_type, content_disposition_type="inline")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=True)

