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
        trans = conn.begin()
        try:
            print("Adding 'is_pinned' column to 'chat_threads' table if not exists...")
            conn.execute(text("ALTER TABLE chat_threads ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE NOT NULL;"))
            
            print("Creating 'notebook_citations' table if not exists...")
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS notebook_citations (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    act_title VARCHAR NOT NULL,
                    section_title VARCHAR,
                    pdf_name VARCHAR,
                    snippet TEXT NOT NULL,
                    custom_notes TEXT,
                    created_at TIMESTAMP DEFAULT timezone('utc'::text, now())
                );
            """))
            
            trans.commit()
            print("✓ Migration v1.2 completed successfully!")
        except Exception as e:
            trans.rollback()
            print(f"✗ Migration v1.2 failed: {e}")
            sys.exit(1)

if __name__ == "__main__":
    run_migration()
