"""
LLM-Assisted Khmer Unicode Restorer using Google Gemini API.
Uses Gemini (gemini-2.5-flash) to restore corrupted Khmer legacy fonts,
repair vowel reordering, fix broken subscripts, and align with PDF context.
"""

import json
import logging
import os
from typing import Dict, List, Optional
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)


GEMINI_RESTORER_SYSTEM_PROMPT = """You are an authoritative expert in Khmer linguistics, Khmer Unicode standards (U+1780 to U+17FF), and legacy font recovery (Limon S1/S2/R1, ABC fonts).
Your task is to take corrupted, garbled, or legacy-encoded Khmer text from a presentation slide (and optional reference PDF page text), and restore it into pristine, grammatically accurate Khmer Unicode.

Key Rules:
1. Fix all corrupted sequences (e.g., "កំតAយូទ័រ" -> "កុំព្យូទ័រ", "ប.គ្.A" -> "ប.គ.ព").
2. Reorder pre-vowels (េ, ែ, ោ, ៅ, ើ, ៀ) so they correctly follow the base consonant in Unicode order.
3. Fix broken subscript sequences (restore Khmer Coeng U+17D2).
4. Preserve all numbers, English technical terms, punctuation, and bullet points.
5. If reference text is provided, use it as the ground-truth guide.
6. Return output in valid JSON matching the requested schema.
"""


def restore_with_gemini(
    slide_index: int,
    texts_to_fix: List[Dict],
    pdf_context: Optional[str] = None,
    api_key: Optional[str] = None
) -> List[Dict]:
    """
    Sends slide text fragments to Gemini to get clean Khmer Unicode replacements.
    Returns list of replacement dictionaries:
    [{"slide_index": int, "original": str, "replacement": str, "confidence": float, "source": "gemini_ai"}]
    """
    effective_api_key = api_key or os.getenv("GEMINI_API_KEY")
    if not effective_api_key:
        logger.info("No Gemini API key provided; skipping LLM restoration.")
        return []
        
    if not texts_to_fix:
        return []

    client = genai.Client(api_key=effective_api_key)
    
    # Format inputs
    items_payload = []
    for item in texts_to_fix:
        t = item.get("text", "").strip()
        if t:
            items_payload.append({
                "id": f"{item.get('shape_id')}_{item.get('paragraph_index', 0)}_{item.get('run_index', 0)}",
                "shape_id": item.get("shape_id"),
                "paragraph_index": item.get("paragraph_index"),
                "run_index": item.get("run_index"),
                "original_text": t
            })
            
    if not items_payload:
        return []

    prompt = f"""Slide #{slide_index + 1} Corrupted Text Segments:
{json.dumps(items_payload, ensure_ascii=False, indent=2)}

"""
    if pdf_context:
        prompt += f"""Reference Clean Text from Accompanying PDF:
\"\"\"
{pdf_context}
\"\"\"

"""

    prompt += """Please analyze each item. If the item contains legacy/corrupted Khmer text or typos, provide the corrected Khmer Unicode string. If the item is already correct English/numbers or clean Khmer, return the original string.
Return a JSON array of objects with fields:
- "id": string matching the input id
- "original": string
- "replacement": string (the corrected Khmer Unicode)
- "is_changed": boolean
- "explanation": brief explanation of fix in English or Khmer
"""

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=GEMINI_RESTORER_SYSTEM_PROMPT,
                response_mime_type="application/json",
                temperature=0.1,
            )
        )
        
        raw_json = response.text
        parsed_results = json.loads(raw_json)
        
        id_to_item = {item["id"]: item for item in items_payload}
        replacements = []
        
        for res in parsed_results:
            item_id = res.get("id")
            original = res.get("original")
            replacement = res.get("replacement")
            is_changed = res.get("is_changed", False)
            
            if (is_changed or (original and replacement and original.strip() != replacement.strip())) and item_id in id_to_item:
                meta = id_to_item[item_id]
                replacements.append({
                    "slide_index": slide_index,
                    "shape_id": meta["shape_id"],
                    "paragraph_index": meta["paragraph_index"],
                    "run_index": meta["run_index"],
                    "original": original or meta["original_text"],
                    "replacement": replacement,
                    "confidence": 0.98,
                    "source": "gemini_ai",
                    "explanation": res.get("explanation", "Restored by Gemini AI")
                })
                
        return replacements

    except Exception as e:
        logger.error(f"Gemini restoration failed for slide {slide_index + 1}: {e}")
        return []
