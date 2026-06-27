import os
import sys

# Add backend folder to python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import settings
from sqlalchemy import create_engine, text

def run_migration():
    print(f"Connecting to database: {settings.DATABASE_URL.split('@')[-1]}")
    engine = create_engine(settings.DATABASE_URL)
    
    with engine.connect() as conn:
        # Start transaction
        trans = conn.begin()
        try:
            print("Dropping old cosine distance pgvector index (if exists)...")
            conn.execute(text("DROP INDEX IF EXISTS child_embedding_cosine_idx;"))
            
            print("Creating new high-performance inner product pgvector HNSW index...")
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS child_embedding_inner_idx 
                ON child_documents USING hnsw (embedding vector_ip_ops);
            """))
            
            print("Checking GIN index on fts_tokens...")
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS child_fts_idx 
                ON child_documents USING gin(fts_tokens);
            """))
            
            trans.commit()
            print("✓ Migration completed successfully!")
        except Exception as e:
            trans.rollback()
            print(f"✗ Migration failed: {e}")
            sys.exit(1)

if __name__ == "__main__":
    run_migration()
