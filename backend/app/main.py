import json
import asyncio
import uuid as pyuuid
import os
from fastapi import FastAPI, Depends, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
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

# Configure CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust for production
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
    
    return {
        "id": str(user.id),
        "email": user.email,
        "created_at": user.created_at.isoformat()
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
        
    return {
        "id": str(user.id),
        "email": user.email,
        "created_at": user.created_at.isoformat()
    }

@app.get("/api/threads")
def list_threads(user_id: str, db: Session = Depends(get_db)):
    try:
        user_uuid = pyuuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user_id format")
        
    threads = db.query(ChatThread).filter(ChatThread.user_id == user_uuid).order_by(ChatThread.created_at.desc()).all()
    return [
        {
            "id": str(t.id),
            "title": t.title,
            "created_at": t.created_at.isoformat()
        }
        for t in threads
    ]

@app.post("/api/threads")
def create_thread(payload: ThreadCreate, db: Session = Depends(get_db)):
    try:
        user_uuid = pyuuid.UUID(payload.user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user_id format")
        
    thread = ChatThread(user_id=user_uuid, title=payload.title)
    db.add(thread)
    db.commit()
    db.refresh(thread)
    
    return {
        "id": str(thread.id),
        "title": thread.title,
        "created_at": thread.created_at.isoformat()
    }

@app.get("/api/threads/{thread_id}/messages")
def get_thread_history(thread_id: str, db: Session = Depends(get_db)):
    try:
        thread_uuid = pyuuid.UUID(thread_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid thread_id format")
        
    messages = db.query(ChatMessage).filter(ChatMessage.thread_id == thread_uuid).order_by(ChatMessage.created_at.asc()).all()
    return [
        {
            "id": str(m.id),
            "role": m.role,
            "content": m.content,
            "sources": m.sources or [],
            "created_at": m.created_at.isoformat()
        }
        for m in messages
    ]

@app.delete("/api/threads/{thread_id}")
def delete_thread(thread_id: str, db: Session = Depends(get_db)):
    try:
        thread_uuid = pyuuid.UUID(thread_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid thread_id format")
        
    thread = db.query(ChatThread).filter(ChatThread.id == thread_uuid).first()
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
        
    db.delete(thread)
    db.commit()
    return {"status": "success", "message": "Thread deleted successfully"}

@app.delete("/api/threads/{thread_id}/messages")
def delete_thread_messages(thread_id: str, db: Session = Depends(get_db)):
    return delete_thread(thread_id, db)

@app.patch("/api/threads/{thread_id}")
def update_thread(thread_id: str, payload: ThreadUpdate, db: Session = Depends(get_db)):
    try:
        thread_uuid = pyuuid.UUID(thread_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid thread_id format")
        
    thread = db.query(ChatThread).filter(ChatThread.id == thread_uuid).first()
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
        
    thread.title = payload.title.strip()
    db.commit()
    db.refresh(thread)
    
    return {
        "id": str(thread.id),
        "title": thread.title,
        "created_at": thread.created_at.isoformat()
    }

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
        
        # 1. RAG pipeline (Augmented Statutory Mode)
        if request.augmented_mode:
            yield f"event: status\ndata: {json.dumps('Querying statutory vector database (Hybrid Search)...')}\n\n"
            await asyncio.sleep(0.1)
            
            try:
                # Perform hybrid dense-sparse RRF search
                sources = hybrid_search_rrf(db, user_query, limit=4)
                
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
                else:
                    yield f"event: status\ndata: {json.dumps('No high-confidence database records matched. Falling back to LLM parametric memory.')}\n\n"
                    await asyncio.sleep(0.1)
            except Exception as search_err:
                print(f"RAG search exception: {search_err}")
                yield f"event: status\ndata: {json.dumps('RAG lookup failed. Defaulting to standard inference...')}\n\n"
                await asyncio.sleep(0.1)

        # 2. Build inference prompt with extremely strict format and no conversational disclaimers
        system_prompt = (
            "You are Vidhaan AI, a premium, production-grade legal AI assistant specializing in Indian Statutory Law.\n"
            "Your tone must be authoritative, neutral, clear, and highly professional.\n\n"
            "CRITICAL INSTRUCTIONS:\n"
            "1. Give highly precise, structured, and complete answers.\n"
            "2. Do NOT include any conversational disclaimers, pleasantries, fluff, intro, or concluding remarks (e.g., do NOT say 'Here is the analysis', 'Hope this helps', 'As an AI, I...', 'Please consult a lawyer', etc.).\n"
            "3. Anchor your responses by explicitly citing the Act name and specific Section/Article numbers.\n"
            "4. If the database context is relevant, explain it fully and accurately. If the database context does not contain the answer, solve the user's prompt using your internal legal parametric knowledge, but ensure you present the response in the same precise, structured format without any standard conversational disclaimers.\n\n"
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
                "\nProvide a comprehensive legal analysis. If the database context is relevant, explain it fully.\n"
                "CRITICAL INSTRUCTION: At the very end of your response, add a dedicated section '### 🔍 Statutory Metadata Citations' "
                "formatted in italics explaining exactly where the information was searched from and how the answer was generated.\n"
                "Format exactly as follows:\n"
                "*We searched our local vector database and retrieved the following authoritative statutory documents to ground this answer:*\n"
                "* - Act: [Act Title] - Section/Page: [Section Title]*\n"
                "*Generation Method: The legal rules were extracted from the primary text of the cited Acts to ensure accuracy.*"
            )
        else:
            system_prompt += (
                "Provide a comprehensive, authoritative legal analysis based on your parametric knowledge of Indian Law. "
                "Ensure the response has a rigorous logical structure and has no general conversational disclaimers."
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
                        sources=sources_payload
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
async def chat_endpoint(request: ChatRequest, db: Session = Depends(get_db)):
    """
    Main chat completion endpoint serving a text/event-stream.
    """
    # Pre-save the user's message if thread_id is provided
    if request.thread_id and request.messages:
        try:
            thread_uuid = pyuuid.UUID(request.thread_id)
            thread_exists = db.query(ChatThread).filter(ChatThread.id == thread_uuid).first()
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

