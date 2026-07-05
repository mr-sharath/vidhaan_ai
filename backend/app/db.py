import datetime
import uuid
from sqlalchemy import create_engine, Column, String, Text, ForeignKey, DateTime, Boolean, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB, TSVECTOR
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from pgvector.sqlalchemy import Vector
from app.config import settings

Base = declarative_base()

class ParentDocument(Base):
    __tablename__ = 'parent_documents'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    act_title = Column(String, nullable=False)
    section_title = Column(String, nullable=True)
    content = Column(Text, nullable=False)
    metadata_fields = Column("metadata", JSONB, default=dict)  # Avoid conflict with SQLAlchemy's metadata
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    children = relationship("ChildDocument", back_populates="parent", cascade="all, delete-orphan")

class ChildDocument(Base):
    __tablename__ = 'child_documents'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    parent_id = Column(UUID(as_uuid=True), ForeignKey('parent_documents.id', ondelete='CASCADE'), nullable=False)
    content = Column(Text, nullable=False)
    embedding = Column(Vector(768), nullable=True) # 768 dimensions for Google text-embedding-004
    fts_tokens = Column(TSVECTOR, nullable=True)  # Full-text search tokens
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    parent = relationship("ParentDocument", back_populates="children")

class User(Base):
    __tablename__ = 'users'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=True)
    is_admin = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    threads = relationship("ChatThread", back_populates="user", cascade="all, delete-orphan")
    citations = relationship("NotebookCitation", back_populates="user", cascade="all, delete-orphan")
    custom_kbs = relationship("CustomKnowledgeBase", back_populates="user", cascade="all, delete-orphan")

class ChatThread(Base):
    __tablename__ = 'chat_threads'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    title = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    is_pinned = Column(Boolean, default=False, nullable=False)
    
    user = relationship("User", back_populates="threads")
    messages = relationship("ChatMessage", back_populates="thread", cascade="all, delete-orphan")

class ChatMessage(Base):
    __tablename__ = 'chat_messages'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    thread_id = Column(UUID(as_uuid=True), ForeignKey('chat_threads.id', ondelete='CASCADE'), nullable=False)
    role = Column(String, nullable=False)  # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    sources = Column(JSONB, default=list, nullable=True)
    model = Column(String, nullable=True)
    search_meta = Column(JSONB, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    thread = relationship("ChatThread", back_populates="messages")

class NotebookCitation(Base):
    __tablename__ = 'notebook_citations'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    act_title = Column(String, nullable=False)
    section_title = Column(String, nullable=True)
    pdf_name = Column(String, nullable=True)
    snippet = Column(Text, nullable=False)
    custom_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    user = relationship("User", back_populates="citations")

class CustomKnowledgeBase(Base):
    __tablename__ = 'custom_knowledge_bases'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String, default="processing", nullable=False)  # 'processing', 'ready', 'failed'
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    user = relationship("User", back_populates="custom_kbs")
    documents = relationship("CustomDocument", back_populates="kb", cascade="all, delete-orphan")

class CustomDocument(Base):
    __tablename__ = 'custom_documents'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    kb_id = Column(UUID(as_uuid=True), ForeignKey('custom_knowledge_bases.id', ondelete='CASCADE'), nullable=False)
    filename = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    file_path = Column(String, nullable=False)
    status = Column(String, default="uploaded", nullable=False)  # 'uploaded', 'processing', 'completed', 'failed'
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    kb = relationship("CustomKnowledgeBase", back_populates="documents")
    chunks = relationship("CustomDocumentChunk", back_populates="document", cascade="all, delete-orphan")

class CustomDocumentChunk(Base):
    __tablename__ = 'custom_document_chunks'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey('custom_documents.id', ondelete='CASCADE'), nullable=False)
    content = Column(Text, nullable=False)
    embedding = Column(Vector(768), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    document = relationship("CustomDocument", back_populates="chunks")

# Create Database Engine
engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    from sqlalchemy import text
    Base.metadata.create_all(bind=engine)
    with engine.begin() as conn:
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;"))
            print("Database check: 'is_admin' column verified/added successfully.")
        except Exception as e:
            print(f"Warning: Could not alter users table to verify/add 'is_admin': {e}")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

