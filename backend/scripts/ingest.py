import os
import sys
from sqlalchemy import text

# Add parent directory to sys.path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db import engine, SessionLocal, Base, ParentDocument, ChildDocument
from app.parser import parse_statute_pdf
from app.embeddings import get_embeddings_batch

def setup_database_schema(db):
    """Enables vector extension and initializes database tables."""
    print("Initializing database schema...")
    try:
        # Enable vector extension
        db.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
        db.commit()
        print("Vector extension enabled successfully.")
    except Exception as e:
        print(f"Warning: Could not enable pgvector extension: {e}. If it is already enabled or you do not have superuser privileges, this may be normal.")
        db.rollback()

    # Create tables
    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully.")

    # Check/Create FTS trigger
    try:
        db.execute(text("""
            CREATE OR REPLACE FUNCTION child_fts_trigger() RETURNS trigger AS $$
            BEGIN
              NEW.fts_tokens := to_tsvector('english', NEW.content);
              RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        """))
        db.execute(text("""
            DROP TRIGGER IF EXISTS tsvectorupdate ON child_documents;
        """))
        db.execute(text("""
            CREATE TRIGGER tsvectorupdate BEFORE INSERT OR UPDATE
            ON child_documents FOR EACH ROW EXECUTE FUNCTION child_fts_trigger();
        """))
        db.commit()
        print("Full-Text Search trigger verified/created successfully.")
    except Exception as e:
        print(f"Warning: Could not create FTS triggers: {e}")
        db.rollback()

def ingest_data_directory(db, data_dir: str):
    """Recursively scans data_dir and ingests PDF files."""
    print(f"Scanning data directory: {data_dir}")
    if not os.path.exists(data_dir):
        print(f"Error: Directory {data_dir} does not exist.")
        return

    pdf_files = []
    for root, dirs, files in os.walk(data_dir):
        for file in files:
            if file.lower().endswith(".pdf") and not file.startswith("."):
                pdf_files.append(os.path.join(root, file))

    print(f"Found {len(pdf_files)} PDF documents to ingest.")
    
    for i, file_path in enumerate(pdf_files, start=1):
        act_title = os.path.splitext(os.path.basename(file_path))[0]
        print(f"\n==========================================")
        print(f"[{i}/{len(pdf_files)}] Processing Act: '{act_title}'")
        print(f"Path: {file_path}")
        print(f"==========================================")
        
        # 1. Parse PDF
        sections = parse_statute_pdf(file_path, act_title)
        if not sections:
            print(f"Warning: No sections extracted from {file_path}. Skipping.")
            continue
            
        print(f"Extracted {len(sections)} statutory sections/pages from PDF.")
        
        # 2. Ingest sections
        for idx, sec in enumerate(sections, start=1):
            # Check if this parent section already exists to avoid duplication
            try:
                existing_parent = db.query(ParentDocument).filter_by(
                    act_title=sec["act_title"],
                    section_title=sec["section_title"]
                ).first()
                
                if existing_parent:
                    print(f"  -> [{idx}/{len(sections)}] Skipping section '{sec['section_title']}' (already exists)")
                    continue
            except Exception as e:
                print(f"Error searching existing parent: {e}")

            # Create Parent Document
            try:
                parent_doc = ParentDocument(
                    act_title=sec["act_title"],
                    section_title=sec["section_title"],
                    content=sec["content"],
                    metadata_fields={"source_file": file_path}
                )
                db.add(parent_doc)
                db.commit() # Commit to generate parent_doc.id
                db.refresh(parent_doc)
            except Exception as e:
                print(f"Error saving parent section '{sec['section_title']}': {e}")
                db.rollback()
                continue
            
            # Generate Embeddings in batch for child chunks of this section
            children_texts = sec["children"]
            if not children_texts:
                continue
                
            print(f"  -> [{idx}/{len(sections)}] Generating embeddings for {len(children_texts)} children of '{sec['section_title']}'...")
            embeddings = get_embeddings_batch(children_texts)
            
            # Create Child Documents
            child_docs = []
            for c_text, emb in zip(children_texts, embeddings):
                child_doc = ChildDocument(
                    parent_id=parent_doc.id,
                    content=c_text,
                    embedding=emb
                )
                child_docs.append(child_doc)
                
            try:
                db.bulk_save_objects(child_docs)
                db.commit()
            except Exception as e:
                print(f"Error saving child chunks: {e}")
                db.rollback()
            
        print(f"Finished ingesting: '{act_title}'")

def main():
    db = SessionLocal()
    try:
        setup_database_schema(db)
        
        # Locate the data folder relative to project workspace
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        data_dir = os.path.join(project_root, "data")
        
        ingest_data_directory(db, data_dir)
        print("\nIngestion pipeline completed successfully!")
    except Exception as e:
        print(f"Critical Ingestion Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    main()
