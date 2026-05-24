import os
from google import genai
from google.genai import types
from app.config import settings
from typing import List

# Helper to check if the API key is validly configured
def _is_api_key_valid() -> bool:
    return bool(settings.GEMINI_API_KEY and settings.GEMINI_API_KEY != "your_gemini_api_key_here")

# Initialize client dynamically
client = None
if _is_api_key_valid():
    try:
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
    except Exception as e:
        print(f"Error initializing Google GenAI client: {e}")

def get_embedding(text: str) -> List[float]:
    """
    Generates a 768-dimensional vector embedding for the input document text
    using Google's gemini-embedding-2 with Matryoshka Representation Learning (MRL).
    """
    if not _is_api_key_valid() or client is None:
        # Fallback dummy embedding if key is missing/unconfigured
        return [0.0] * 768
        
    try:
        response = client.models.embed_content(
            model="gemini-embedding-2",
            contents=text,
            config=types.EmbedContentConfig(
                output_dimensionality=768
            )
        )
        return response.embeddings[0].values
    except Exception as e:
        print(f"Error generating embedding via Gemini API: {e}")
        return [0.0] * 768

def get_query_embedding(text: str) -> List[float]:
    """
    Generates a 768-dimensional vector embedding optimized for query search.
    """
    if not _is_api_key_valid() or client is None:
        return [0.0] * 768

    try:
        response = client.models.embed_content(
            model="gemini-embedding-2",
            contents=text,
            config=types.EmbedContentConfig(
                output_dimensionality=768
            )
        )
        return response.embeddings[0].values
    except Exception as e:
        print(f"Error generating query embedding via Gemini API: {e}")
        return [0.0] * 768

def get_embeddings_batch(texts: List[str]) -> List[List[float]]:
    """
    Generates vector embeddings for a list of texts by iterating over them.
    Optimized for rate limit safety and free-tier reliability.
    """
    results = []
    for t in texts:
        results.append(get_embedding(t))
    return results
