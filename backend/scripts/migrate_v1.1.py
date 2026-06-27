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
            print("Adding 'model' column to 'chat_messages' table if not exists...")
            conn.execute(text("ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS model VARCHAR;"))
            
            print("Adding 'search_meta' column to 'chat_messages' table if not exists...")
            conn.execute(text("ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS search_meta JSONB;"))
            
            trans.commit()
            print("✓ Migration v1.1 completed successfully!")
        except Exception as e:
            trans.rollback()
            print(f"✗ Migration v1.1 failed: {e}")
            sys.exit(1)

if __name__ == "__main__":
    run_migration()
