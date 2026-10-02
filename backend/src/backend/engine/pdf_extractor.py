"""
PDF Text and Layout Extractor for Reference Documents.
Uses pdfplumber and pypdf to extract clean Khmer Unicode text per page.
"""

import logging
import unicodedata
from typing import Dict, List, Optional
import pypdf
import pdfplumber

import re
from .dictionary import clean_khmer_unicode, restore_khmer_text, sanitize_khmer_coeng

logger = logging.getLogger(__name__)

KHMER_DIACRITICS = set('់៍័ៈំ៉៊៌៎៏៑ិីឹឺុូួើឿៀេែៃោៅ\u17D2')


class PDFPageContent:
    def __init__(self, page_number: int, text: str, lines: List[str]):
        self.page_number = page_number
        self.text = text
        self.lines = lines

    def to_dict(self) -> Dict:
        return {
            "page_number": self.page_number,
            "text": self.text,
            "lines": self.lines
        }


def _process_extracted_lines(raw_text: str) -> Tuple[str, List[str]]:
    """Normalizes Unicode, collapses multi-spaces, removes isolated diacritics, and heals Khmer text."""
    if not raw_text:
        return "", []
        
    normalized = unicodedata.normalize("NFC", raw_text)
    raw_lines = normalized.splitlines()
    clean_lines = []
    
    for line in raw_lines:
        # Collapse multiple spaces
        line = re.sub(r'[ \t]{2,}', ' ', line).strip()
        if not line:
            continue
        # Skip lines that are purely isolated diacritics or coeng
        if len(line) <= 2 and all(c in KHMER_DIACRITICS for c in line):
            continue
        # Pre-heal Khmer Unicode text
        fixed_line, _ = restore_khmer_text(line)
        fixed_line = sanitize_khmer_coeng(fixed_line)
        if fixed_line:
            clean_lines.append(fixed_line)
            
    full_text = "\n".join(clean_lines)
    return full_text, clean_lines


def extract_text_from_pdf(pdf_path: str) -> List[PDFPageContent]:
    """
    Extracts text from each page of a PDF file.
    Uses pypdf first because it preserves logical sequential character streams in Khmer
    without detaching vowels/diacritics into vertical coordinate slices.
    Falls back to pdfplumber (layout=False) if needed.
    """
    pages_content: List[PDFPageContent] = []
    
    # 1. Try pypdf first
    try:
        reader = pypdf.PdfReader(pdf_path)
        for idx, page in enumerate(reader.pages):
            page_num = idx + 1
            raw_text = page.extract_text() or ""
            full_text, lines = _process_extracted_lines(raw_text)
            pages_content.append(PDFPageContent(
                page_number=page_num,
                text=full_text,
                lines=lines
            ))
            
        if any(p.lines for p in pages_content):
            return pages_content
    except Exception as e:
        logger.warning(f"pypdf extraction failed, falling back to pdfplumber: {e}")

    # 2. Fallback to pdfplumber without layout=True to avoid vertical splitting of diacritics
    try:
        pages_content = []
        with pdfplumber.open(pdf_path) as pdf:
            for idx, page in enumerate(pdf.pages):
                page_num = idx + 1
                raw_text = page.extract_text(layout=False) or page.extract_text() or ""
                full_text, lines = _process_extracted_lines(raw_text)
                pages_content.append(PDFPageContent(
                    page_number=page_num,
                    text=full_text,
                    lines=lines
                ))
    except Exception as e:
        logger.error(f"pdfplumber extraction also failed: {e}")

    return pages_content
