import datetime
import uuid
from sqlalchemy import create_engine, Column, String, Text, ForeignKey, DateTime, Boolean
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
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    threads = relationship("ChatThread", back_populates="user", cascade="all, delete-orphan")

class ChatThread(Base):
    __tablename__ = 'chat_threads'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    title = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    user = relationship("User", back_populates="threads")
    messages = relationship("ChatMessage", back_populates="thread", cascade="all, delete-orphan")

class ChatMessage(Base):
    __tablename__ = 'chat_messages'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    thread_id = Column(UUID(as_uuid=True), ForeignKey('chat_threads.id', ondelete='CASCADE'), nullable=False)
    role = Column(String, nullable=False)  # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    sources = Column(JSONB, default=list, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    thread = relationship("ChatThread", back_populates="messages")

# Create Database Engine
engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

