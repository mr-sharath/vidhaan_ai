import re
from pypdf import PdfReader
from typing import List, Dict, Any

def clean_text(text: str) -> str:
    """Removes null bytes and collapses extra whitespaces."""
    text = text.replace('\x00', '')
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def chunk_text(text: str, chunk_size: int = 250, chunk_overlap: int = 50) -> List[str]:
    """
    Splits text into child chunks of approximately chunk_size words,
    with a specified overlap.
    """
    words = text.split()
    chunks = []
    if len(words) <= chunk_size:
        return [text]
    
    start = 0
    while start < len(words):
        end = start + chunk_size
        chunk_words = words[start:end]
        chunks.append(" ".join(chunk_words))
        if end >= len(words):
            break
        start += (chunk_size - chunk_overlap)
    return chunks

def parse_statute_pdf(pdf_path: str, act_title: str) -> List[Dict[str, Any]]:
    """
    Parses a statutory PDF and extracts Parent documents (Sections/Articles).
    Returns a list of dicts: [
        {
            "act_title": act_title,
            "section_title": "Section Title / Page Number",
            "content": "Full section text...",
            "children": ["child chunk 1", "child chunk 2", ...]
        }
    ]
    """
    try:
        reader = PdfReader(pdf_path)
    except Exception as e:
        print(f"Error opening/reading PDF {pdf_path}: {e}")
        return []

    pages_text = []
    
    for i, page in enumerate(reader.pages):
        try:
            text = page.extract_text() or ""
            text = clean_text(text)
            if text:
                pages_text.append((i + 1, text))
        except Exception as e:
            print(f"Error extracting text from page {i+1} of {pdf_path}: {e}")
            
    if not pages_text:
        return []
            
    sections = []
    current_title = "Preamble / Preliminary"
    current_content = []
    
    # Process line-by-line to identify section boundaries
    lines = []
    for pnum, ptxt in pages_text:
        for line in ptxt.split('\n'):
            lines.append((pnum, line.strip()))
            
    for pnum, line in lines:
        if not line:
            continue
        
        # Check if line matches common Indian statutory section headers, e.g.:
        # "Section 10. What agreements are contracts"
        # "12. Interpretation clause"
        # "Article 21. Protection of life"
        is_section_header = False
        
        # Pattern 1: Explicit "Section X" or "Article X" or "PART X"
        match = re.match(r'^(Section\s+\d+|Article\s+\d+|PART\s+[I|V|X|L|C|D|M]+)\b', line, re.IGNORECASE)
        if not match:
            # Pattern 2: "12. Interpretation" or "4. Short title" (start of line digit + dot + capitalization)
            match = re.match(r'^(\d+)\.\s+([A-Z][a-zA-Z\s\’\'\"“”-]{3,})', line)
            
        if match:
            # Save the previous accumulated section
            if current_content:
                parent_text = " ".join(current_content)
                parent_text = clean_text(parent_text)
                if len(parent_text) > 40:
                    sections.append({
                        "act_title": act_title,
                        "section_title": current_title,
                        "content": parent_text,
                        "children": chunk_text(parent_text)
                    })
            
            # Start new section
            current_title = line[:100]  # Limit length for DB storage
            current_content = [line]
        else:
            current_content.append(line)
            
    # Append the last accumulated section
    if current_content:
        parent_text = " ".join(current_content)
        parent_text = clean_text(parent_text)
        if len(parent_text) > 40:
            sections.append({
                "act_title": act_title,
                "section_title": current_title,
                "content": parent_text,
                "children": chunk_text(parent_text)
            })
            
    # Robust Fallback Heuristic:
    # If the document has many pages but we failed to extract modular sections
    # (i.e. we got <= 2 sections due to complex/non-standard headers),
    # chunk the document page-by-page as Parent Documents, grouping 2 pages together.
    if len(sections) <= 2 and len(pages_text) > 2:
        sections = []
        current_group = []
        start_page = 1
        for pnum, ptxt in pages_text:
            current_group.append(ptxt)
            if len(current_group) == 2:
                parent_text = " ".join(current_group)
                title = f"Pages {start_page}-{pnum}"
                sections.append({
                    "act_title": act_title,
                    "section_title": title,
                    "content": parent_text,
                    "children": chunk_text(parent_text)
                })
                current_group = []
                start_page = pnum + 1
        if current_group:
            parent_text = " ".join(current_group)
            title = f"Pages {start_page}-{len(pages_text)}"
            sections.append({
                "act_title": act_title,
                "section_title": title,
                "content": parent_text,
                "children": chunk_text(parent_text)
            })
            
    return sections
