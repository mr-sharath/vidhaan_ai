-- SQL Migration to set up Vidhaan AI Database Schema

-- 1. Enable the pgvector extension (requires superuser/db owner privileges in Supabase)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create parent_documents table
CREATE TABLE IF NOT EXISTS parent_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    act_title TEXT NOT NULL,                  -- e.g. "The Indian Contract Act, 1872"
    section_title TEXT,                       -- e.g. "Section 124" or "Article 21"
    content TEXT NOT NULL,                     -- Complete statutory text of this section
    metadata JSONB DEFAULT '{}'::jsonb,        -- Extra metadata (file source, department)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create child_documents table
CREATE TABLE IF NOT EXISTS child_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES parent_documents(id) ON DELETE CASCADE,
    content TEXT NOT NULL,                     -- Small semantic slice (150-300 tokens)
    embedding vector(768),                     -- Google text-embedding-004 vector dimension is 768
    fts_tokens tsvector,                       -- PostgreSQL full-text search vector
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create index for FTS (Full-Text Search)
CREATE INDEX IF NOT EXISTS child_fts_idx ON child_documents USING gin(fts_tokens);

-- 5. Create index for pgvector (HNSW index for high performance cosine similarity queries)
-- Using vector_cosine_ops for cosine similarity search
CREATE INDEX IF NOT EXISTS child_embedding_cosine_idx 
ON child_documents USING hnsw (embedding vector_cosine_ops);

-- 6. Trigger function to automatically maintain the tsvector on content changes
CREATE OR REPLACE FUNCTION child_fts_trigger() RETURNS trigger AS $$
BEGIN
  NEW.fts_tokens := to_tsvector('english', NEW.content);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Bind the trigger to child_documents table
DROP TRIGGER IF EXISTS tsvectorupdate ON child_documents;
CREATE TRIGGER tsvectorupdate BEFORE INSERT OR UPDATE
ON child_documents FOR EACH ROW EXECUTE FUNCTION child_fts_trigger();
