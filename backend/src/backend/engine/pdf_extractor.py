"""
PDF Text and Layout Extractor for Reference Documents.
Uses pdfplumber and pypdf to extract clean Khmer Unicode text per page.
"""

import logging
import unicodedata
from typing import Dict, List, Optional, Tuple
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
    # Pre-heal full text first so cross-line split syllables (e.g. 'ច្\nមុះ' -> 'ឈ្មោះ') are restored
    pre_healed, _ = restore_khmer_text(normalized)
    raw_lines = pre_healed.splitlines()
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
    Uses pymupdf (fitz) text blocks first because it respects 2D spatial text frames
    and preserves multi-line tables, cards, and diagrams without horizontal concatenation.
    Falls back to pypdf and pdfplumber if needed.
    """
    pages_content: List[PDFPageContent] = []
    
    # 1. Try PyMuPDF block extraction (highest spatial accuracy for slides)
    try:
        import pymupdf
        doc = pymupdf.open(pdf_path)
        for idx, page in enumerate(doc):
            page_num = idx + 1
            blocks = page.get_text("blocks")
            raw_blocks = []
            for b in blocks:
                b_text = b[4].strip()
                # Skip isolated page numbers
                if b_text and b_text != str(page_num):
                    raw_blocks.append(b_text)
            raw_text = "\n".join(raw_blocks)
            full_text, lines = _process_extracted_lines(raw_text)
            pages_content.append(PDFPageContent(
                page_number=page_num,
                text=full_text,
                lines=lines
            ))
        if any(p.lines for p in pages_content):
            return pages_content
    except Exception as e:
        logger.warning(f"pymupdf extraction failed, falling back to pypdf: {e}")

    # 2. Fallback to pypdf
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

    # 3. Fallback to pdfplumber without layout=True to avoid vertical splitting of diacritics
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
