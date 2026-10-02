"""
PDF-to-PPTX Text Alignment and Diff Computation Engine.
Aligns text elements from PPTX slides with clean reference PDF pages,
computing token-level and phrase-level replacements with confidence scores.
"""

import difflib
import re
from typing import Dict, List, Optional, Tuple
from .pdf_extractor import PDFPageContent
from .dictionary import restore_khmer_text, sanitize_khmer_coeng

# Non-standalone Khmer signs that should NEVER be a standalone replacement chunk
DISALLOWED_STANDALONE_SIGNS = set('់៍័ៈំ៉៊៌៎៏៑')


def calculate_similarity(a: str, b: str) -> float:
    """Calculates SequenceMatcher ratio between two strings after normalizing spacing."""
    if not a or not b:
        return 0.0
    norm_a = re.sub(r'\s+', ' ', a).strip()
    norm_b = re.sub(r'\s+', ' ', b).strip()
    return difflib.SequenceMatcher(None, norm_a, norm_b).ratio()


def find_best_matching_pdf_line(pptx_text: str, pdf_lines: List[str]) -> Tuple[Optional[str], float]:
    """
    Finds the most matching line in the PDF lines for a given PPTX line or paragraph.
    Returns (best_pdf_line, similarity_score).
    """
    if not pptx_text or not pdf_lines:
        return None, 0.0
        
    cleaned_pptx = re.sub(r'\s+', ' ', pptx_text).strip()
    if not cleaned_pptx:
        return None, 0.0
        
    best_match = None
    best_score = 0.0
    
    for line in pdf_lines:
        line_clean = re.sub(r'\s+', ' ', line).strip()
        if not line_clean:
            continue
            
        score = calculate_similarity(cleaned_pptx, line_clean)
        if score > best_score:
            best_score = score
            best_match = line_clean
            
    # Check if pptx_text is a significant substring of any line or vice versa
    for line in pdf_lines:
        line_clean = re.sub(r'\s+', ' ', line).strip()
        if cleaned_pptx in line_clean and len(cleaned_pptx) > 6:
            contain_score = len(cleaned_pptx) / max(len(line_clean), 1) * 0.95
            if contain_score > best_score:
                best_score = contain_score
                best_match = line_clean
                
    return best_match, best_score


from .khmer_validator import khmer_validator

def extract_word_alignments(pptx_text: str, pdf_text: str) -> List[Dict]:
    """
    Computes fine-grained word or phrase replacements between PPTX text and matching PDF text.
    Uses token-level Khmer syllable/word alignment to prevent dangerous mid-syllable slices.
    """
    replacements = []
    norm_pptx = re.sub(r'[ \t]{2,}', ' ', pptx_text).strip()
    norm_pdf = re.sub(r'[ \t]{2,}', ' ', pdf_text).strip()
    
    # Tokenize into Khmer syllables / words to ensure atomicity
    pptx_tokens = khmer_validator.segment_text(norm_pptx)
    pdf_tokens = khmer_validator.segment_text(norm_pdf)
    
    matcher = difflib.SequenceMatcher(None, pptx_tokens, pdf_tokens)
    
    # Only perform fine alignment if overall similarity is sufficiently high
    if matcher.ratio() < 0.60:
        return []
        
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == 'replace':
            original_chunk = "".join(pptx_tokens[i1:i2]).strip()
            clean_chunk = "".join(pdf_tokens[j1:j2]).strip()
            
            # Reject if identical without spaces (e.g. spacing differences only)
            if re.sub(r'\s+', '', original_chunk) == re.sub(r'\s+', '', clean_chunk):
                continue
                
            # Require minimum length of 3 to avoid destructive single-letter swaps
            if len(original_chunk) < 3 or len(clean_chunk) < 3:
                continue
                
            # Reject if replacement or original has no Khmer base consonant or independent vowel
            has_khmer_orig = any(0x1780 <= ord(c) <= 0x17FF for c in original_chunk)
            has_khmer_clean = any(0x1780 <= ord(c) <= 0x17FF for c in clean_chunk)
            if has_khmer_orig and not any(0x1780 <= ord(c) <= 0x17B3 for c in original_chunk):
                continue
            if has_khmer_clean and not any(0x1780 <= ord(c) <= 0x17B3 for c in clean_chunk):
                continue
                
            # Reject if replacement is just standalone signs or coeng
            if all(c in DISALLOWED_STANDALONE_SIGNS for c in clean_chunk):
                continue

                
            # Clean duplicate consonant stutter (e.g. 'ផផ្' -> 'ផ្')
            clean_chunk = re.sub(r'([\u1780-\u17A2])\1\u17D2', lambda m: m.group(1) + '\u17D2', clean_chunk)

            
            # Restore clean chunk through dictionary and heuristics
            clean_chunk, _ = restore_khmer_text(clean_chunk)
            clean_chunk = sanitize_khmer_coeng(clean_chunk)
            
            # Linguistic safety check: if original is already valid word and replacement is invalid, skip
            if khmer_validator.is_valid_word(original_chunk) and not khmer_validator.is_valid_word(clean_chunk):
                continue
                
            if original_chunk and clean_chunk and original_chunk != clean_chunk:
                replacements.append({
                    "original": original_chunk,
                    "replacement": clean_chunk,
                    "confidence": round(matcher.ratio(), 2),
                    "source": "pdf_alignment"
                })
                
    return replacements



def align_slide_with_pdf(
    slide_index: int,
    slide_texts: List[Dict],
    pdf_pages: List[PDFPageContent]
) -> List[Dict]:
    """
    Aligns all text blocks of a slide with the corresponding PDF page.
    Matches slide_index with PDF page_number if within range.
    """
    alignments = []
    
    if not pdf_pages:
        return alignments
        
    # Default matching page by index
    target_page: Optional[PDFPageContent] = None
    if slide_index < len(pdf_pages):
        target_page = pdf_pages[slide_index]
    else:
        # Search all pages
        best_overall_score = 0.0
        for page in pdf_pages:
            for item in slide_texts:
                _, score = find_best_matching_pdf_line(item.get("text", ""), page.lines)
                if score > best_overall_score:
                    best_overall_score = score
                    target_page = page
                    
    if not target_page:
        return alignments
        
    for item in slide_texts:
        text = item.get("text", "").strip()
        if not text or len(text) < 4:
            continue
            
        best_line, score = find_best_matching_pdf_line(text, target_page.lines)
        
        # Check if identical ignoring extra spaces
        if not best_line or re.sub(r'\s+', '', text) == re.sub(r'\s+', '', best_line):
            continue
            
        # High confidence match threshold
        if score >= 0.70 and text != best_line:
            fine_alignments = extract_word_alignments(text, best_line)
            
            if fine_alignments:
                for fa in fine_alignments:
                    alignments.append({
                        "slide_index": slide_index,
                        "shape_id": item.get("shape_id"),
                        "paragraph_index": item.get("paragraph_index"),
                        "run_index": item.get("run_index", 0),
                        "original": fa["original"],
                        "replacement": fa["replacement"],
                        "confidence": fa["confidence"],
                        "source": "pdf_alignment",
                        "context": text
                    })
            elif len(text) >= 5 and len(best_line) >= 5:
                # Whole phrase alignment: only align if lengths are reasonably comparable
                # (Prevents an entire multi-column table row from replacing a single cell)
                len_ratio = len(text) / max(len(best_line), 1)
                if len_ratio < 0.65 or len_ratio > 1.5:
                    continue
                    
                clean_replacement, _ = restore_khmer_text(best_line)
                clean_replacement = sanitize_khmer_coeng(clean_replacement)
                if clean_replacement != text and re.sub(r'\s+', '', clean_replacement) != re.sub(r'\s+', '', text):
                    alignments.append({
                        "slide_index": slide_index,
                        "shape_id": item.get("shape_id"),
                        "paragraph_index": item.get("paragraph_index"),
                        "run_index": item.get("run_index", 0),
                        "original": text,
                        "replacement": clean_replacement,
                        "confidence": round(score, 2),
                        "source": "pdf_alignment",
                        "context": text
                    })
                
    return alignments
