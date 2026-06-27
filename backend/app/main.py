import json
import asyncio
import uuid as pyuuid
import os
import datetime
import jwt
from fastapi import FastAPI, Depends, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

from app.config import settings
from app.db import get_db, init_db, User, ChatThread, ChatMessage
from app.search import hybrid_search_rrf

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
    allow_origins=[FRONTEND_URL, "https://vidhaan.vercel.app"],
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

class Message(BaseModel):
    role: str  # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]
    augmented_mode: bool = True
    user_id: Optional[str] = None
    thread_id: Optional[str] = None

class AuthRequest(BaseModel):
    email: str
    password: str

class ThreadCreate(BaseModel):
    user_id: str
    title: str

class ThreadUpdate(BaseModel):
    title: str

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
        if request.augmented_mode:
            yield f"event: status\ndata: {json.dumps('Querying statutory vector database (Hybrid Search)...')}\n\n"
            await asyncio.sleep(0.1)
            
            try:
                import time
                search_start = time.time()
                # Perform hybrid dense-sparse RRF search
                sources = hybrid_search_rrf(db, user_query, limit=4)
                search_time_ms = int((time.time() - search_start) * 1000)
                
                if sources:
                    yield f"event: status\ndata: {json.dumps(f'Found {len(sources)} statutory sources. Re-ranking...')}\n\n"
                    await asyncio.sleep(0.1)
                    
                    # Format cited sources payload containing exact PDF filename
                    sources_payload = [
                        {
                            "act_title": s["act_title"],
                            "section_title": s["section_title"],
                            "metadata": s["metadata"],
                            "pdf_name": os.path.basename(s["metadata"].get("source_file", "")) if s["metadata"] else "",
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
            "4. Anchor your responses by explicitly citing the Act name and specific Section/Article numbers.\n"
            "5. If the database context is relevant, extract the core rule and present it simply. If the database context does not contain the answer, solve the user's prompt using your internal legal parametric knowledge in the same concise, structured format.\n\n"
        )
        
        if request.augmented_mode and sources:
            system_prompt += (
                "You have been provided with authoritative sources retrieved from our statutory legal database.\n"
                "Use these sources explicitly to ground and verify your answer. Anchor your responses by explicitly citing "
                "the Act name and specific Section/Article numbers.\n\n"
                "Here are the retrieved statutory source references:\n"
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
                "CRITICAL INSTRUCTION: At the very end of your response, add a dedicated section '### 🔍 Statutory Metadata Citations' "
                "formatted in italics explaining exactly where the information was searched from and how the answer was generated.\n"
                "Format exactly as follows:\n"
                "*We searched our local vector database and retrieved the following authoritative statutory documents to ground this answer:*\n"
                "* - Act: [Act Title] - Section/Page: [Section Title]*\n"
                "*Generation Method: The legal rules were extracted from the primary text of the cited Acts to ensure accuracy.*"
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=True)

