from sqlalchemy.orm import Session
from sqlalchemy import text
from app.embeddings import get_query_embedding
from typing import List, Dict, Any

def dense_search(db: Session, query_text: str, limit: int = 30) -> List[Dict[str, Any]]:
    """
    Retrieves child chunks using cosine similarity from pgvector.
    Returns list of matching child documents.
    """
    query_embedding = get_query_embedding(query_text)
    
    # We check if query embedding is all zeros (indicates unconfigured Gemini API key/fallback)
    if all(v == 0.0 for v in query_embedding):
        return []

    sql = text("""
        SELECT id, parent_id, content, (1 - (embedding <=> CAST(:query_embedding AS vector))) AS score
        FROM child_documents
        ORDER BY embedding <=> CAST(:query_embedding AS vector)
        LIMIT :limit;
    """)
    
    try:
        result = db.execute(sql, {"query_embedding": query_embedding, "limit": limit})
        hits = []
        for row in result:
            hits.append({
                "child_id": str(row.id),
                "parent_id": str(row.parent_id),
                "content": row.content,
                "score": float(row.score or 0.0)
            })
        return hits
    except Exception as e:
        db.rollback()
        print(f"Error in dense search query: {e}. Check if pgvector is installed and enabled.")
        return []

def sparse_search(db: Session, query_text: str, limit: int = 30) -> List[Dict[str, Any]]:
    """
    Retrieves child chunks using PostgreSQL full-text search (FTS) with ts_rank.
    Cleans conversational stop words and runs highly resilient OR matches.
    """
    if not query_text.strip():
        return []

    # Filter stop words and format as OR keywords
    clean_query = re_clean_query(query_text)
    if not clean_query:
        return []

    sql = text("""
        SELECT id, parent_id, content, ts_rank(fts_tokens, to_tsquery('english', :query_text)) AS score
        FROM child_documents
        WHERE fts_tokens @@ to_tsquery('english', :query_text)
        ORDER BY score DESC
        LIMIT :limit;
    """)
    
    try:
        result = db.execute(sql, {"query_text": clean_query, "limit": limit})
        hits = []
        for row in result:
            hits.append({
                "child_id": str(row.id),
                "parent_id": str(row.parent_id),
                "content": row.content,
                "score": float(row.score or 0.0)
            })
        return hits
    except Exception as e:
        db.rollback()
        # Fallback to manual substring matching if tsquery/FTS fails due to syntax
        print(f"FTS Query failed: {e}. Falling back to substring match...")
        return fallback_substring_search(db, query_text, limit)

def re_clean_query(query: str) -> str:
    """
    Extracts high-value legal keywords (nouns, act titles, section numbers) 
    and filters out conversational stop words, formatting as a to_tsquery OR string.
    """
    import re
    # Conversational stop words to remove
    stop_words = {
        'explain', 'what', 'is', 'the', 'under', 'how', 'does', 'can', 'you', 'tell', 'me', 
        'about', 'provision', 'provisions', 'section', 'article', 'act', 'law', 'indian',
        'of', 'in', 'on', 'with', 'for', 'to', 'a', 'an', 'describe', 'summarize', 'find',
        'search', 'lookup', 'get', 'give', 'show', 'list', 'please', 'here', 'rules', 'rule',
        'by', 'which', 'are', 'made', 'free', 'consent', 'if', 'from', 'another', 'other', 
        'any', 'person', 'him', 'himself', 'themselves', 'their', 'his', 'her', 'or', 'and', 
        'but', 'at', 'out', 'into', 'up', 'off', 'over', 'again', 'further', 'then', 'once', 
        'there', 'when', 'where', 'why', 'all', 'both', 'each', 'few', 'more', 'most', 'some', 
        'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 
        'will', 'just', 'should', 'now', 'would', 'could', 'may', 'might', 'must', 'shall', 
        'been', 'being', 'have', 'has', 'had', 'do', 'did', 'having', 'who', 'whom', 'this', 
        'that', 'these', 'those', 'am', 'was', 'were', 'be', 'i', 'my', 'myself', 'we',
        'our', 'ours', 'ourselves', 'your', 'yours', 'yourself', 'yourselves', 'he',
        'she', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves', 'party',
        'parties'
    }
    
    # Extract alphanumeric tokens
    words = re.findall(r'\b\w+\b', query.lower())
    
    # Filter words
    keywords = [w for w in words if w not in stop_words or w.isdigit()]
    
    # Fallback to all words if list is empty
    if not keywords:
        keywords = words
        
    # Join with logical OR operator for tsquery, e.g. "'10' | 'contract'"
    # This provides wide matching capabilities combined with high-precision ts_rank_cd re-ranking.
    return " | ".join([f"'{k}'" for k in keywords])

def fallback_substring_search(db: Session, query_text: str, limit: int = 30) -> List[Dict[str, Any]]:
    """Simple database ILIKE fallback for robust search matching."""
    sql = text("""
        SELECT id, parent_id, content
        FROM child_documents
        WHERE content ILIKE :query_like
        LIMIT :limit;
    """)
    try:
        like_str = f"%{query_text}%"
        result = db.execute(sql, {"query_like": like_str, "limit": limit})
        hits = []
        for row in result:
            hits.append({
                "child_id": str(row.id),
                "parent_id": str(row.parent_id),
                "content": row.content,
                "score": 0.5  # Fixed score for fallback
            })
        return hits
    except Exception as e:
        db.rollback()
        print(f"Fallback search also failed: {e}")
        return []

def hybrid_search_rrf(db: Session, query_text: str, limit: int = 5, k: int = 60) -> List[Dict[str, Any]]:
    """
    Performs dense & sparse searches, maps child chunks back to parent statutory section nodes,
    fuses rank scores via Reciprocal Rank Fusion (RRF), and pulls top section content.
    
    RRF Score formula: sum( 1 / (k + rank) ) (deduplicated by parent_id)
    """
    # 1. Fetch matching child slices from both search engines
    dense_results = dense_search(db, query_text, limit=40)
    sparse_results = sparse_search(db, query_text, limit=40)
    
    # 2. Run Reciprocal Rank Fusion on Parent Document IDs (Deduplicated per engine)
    parent_scores = {}
    
    # Dense results rank scoring (deduplicate so only the best rank counts)
    dense_parents = set()
    for rank, hit in enumerate(dense_results, start=1):
        pid = hit["parent_id"]
        if pid not in dense_parents:
            parent_scores[pid] = parent_scores.get(pid, 0.0) + (1.0 / (k + rank))
            dense_parents.add(pid)
        
    # Sparse results rank scoring (deduplicate so only the best rank counts)
    sparse_parents = set()
    for rank, hit in enumerate(sparse_results, start=1):
        pid = hit["parent_id"]
        if pid not in sparse_parents:
            parent_scores[pid] = parent_scores.get(pid, 0.0) + (1.0 / (k + rank))
            sparse_parents.add(pid)
        
    if not parent_scores:
        return []
        
    # Sort parents by fusion score descending and select top limits
    sorted_pids = sorted(parent_scores.items(), key=lambda x: x[1], reverse=True)[:limit]
    
    # 3. Pull actual statutory parents and format cited reference details
    retrieved_parents = []
    for pid, score in sorted_pids:
        sql = text("SELECT act_title, section_title, content, metadata FROM parent_documents WHERE id = :pid")
        try:
            row = db.execute(sql, {"pid": pid}).first()
            if row:
                # Capture matched child snippet slices for the UI sources panel
                matching_snippets = []
                for hit in dense_results:
                    if hit["parent_id"] == pid:
                        matching_snippets.append(hit["content"])
                for hit in sparse_results:
                    if hit["parent_id"] == pid and hit["content"] not in matching_snippets:
                        matching_snippets.append(hit["content"])
                        
                retrieved_parents.append({
                    "parent_id": pid,
                    "act_title": row.act_title,
                    "section_title": row.section_title,
                    "content": row.content,
                    "metadata": row.metadata or {},
                    "rrf_score": score,
                    "snippets": matching_snippets[:3]  # Top matched segments
                })
        except Exception as e:
            print(f"Error fetching parent doc {pid}: {e}")
            
    return retrieved_parents
