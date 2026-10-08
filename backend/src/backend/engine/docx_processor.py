"""
DOCX Traversal, Paragraph & Page-Break Extraction, and Reconstruction Engine.
Accurately preserves and detects Word document pages through:
1. Hard page breaks (<w:br w:type="page"/>)
2. Rendered Word layout page breaks (<w:lastRenderedPageBreak/>)
3. Paragraph pageBreakBefore settings (<w:pageBreakBefore/>)
4. Dynamic Word standard page density heuristics (~250-350 words or ~1,500-2,000 chars per A4 page)
5. Heading/Section boundaries for natural document pagination.
"""

import logging
import os
import re
import uuid
from typing import Dict, List, Optional, Tuple
import docx
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

from .dictionary import restore_khmer_text, sanitize_khmer_coeng
from .legacy_converter import convert_limon_to_unicode, is_likely_legacy_font
from ..models import ReplacementItem, SlideDiff

logger = logging.getLogger(__name__)


def set_docx_run_font(run, font_name: str):
    """Sets font for regular Latin and Complex Script (w:cs) in Word OpenXML."""
    try:
        run.font.name = font_name
    except Exception:
        pass
    try:
        rPr = run._r.get_or_add_rPr()
        rFonts = rPr.find(qn('w:rFonts'))
        if rFonts is None:
            rFonts = OxmlElement('w:rFonts')
            rPr.append(rFonts)
        rFonts.set(qn('w:ascii'), font_name)
        rFonts.set(qn('w:hAnsi'), font_name)
        rFonts.set(qn('w:cs'), font_name)
    except Exception as e:
        logger.debug(f"Could not set docx XML font: {e}")


def has_explicit_page_break(element_xml: str) -> bool:
    """Detects whether an XML paragraph or run element forces a new Word page."""
    # Check for <w:br w:type="page"/>
    if 'w:type="page"' in element_xml or "w:type='page'" in element_xml:
        return True
    # Check for Word's cached rendered layout page break
    if 'lastRenderedPageBreak' in element_xml:
        return True
    # Check for paragraph style pageBreakBefore
    if 'pageBreakBefore' in element_xml:
        return True
    # Check for section break
    if 'w:sectPr' in element_xml:
        return True
    return False


def extract_docx_sections_or_pages(
    docx_path: str,
    target_font: str = "Khmer OS Battambang"
) -> Tuple[List[SlideDiff], List[ReplacementItem]]:
    """
    Reads a Word (.docx) document and segments it into authentic document pages:
    - Splits on true Word page breaks (<w:br w:type="page"/>, <w:lastRenderedPageBreak/>).
    - Respects natural A4 page capacity (~1,600 characters / ~300 words per page).
    - Preserves headings and tables in the visual order of the document.
    """
    doc = docx.Document(docx_path)
    
    # 1. Traverse document body elements in real sequential order (paragraphs & tables)
    raw_nodes = []
    
    for element in doc.element.body:
        tag = element.tag.split('}')[-1]
        
        if tag == 'p':
            p = docx.text.paragraph.Paragraph(element, doc)
            text = p.text.strip()
            xml = element.xml
            is_page_break = has_explicit_page_break(xml)
            is_heading = (
                p.style.name.startswith('Heading')
                or p.style.name.startswith('Title')
                or (p.runs and p.runs[0].bold and len(text) < 60)
            )
            font_name = None
            if p.runs and p.runs[0].font and p.runs[0].font.name:
                font_name = p.runs[0].font.name
                
            raw_nodes.append({
                "type": "paragraph",
                "text": text,
                "is_heading": is_heading,
                "has_break": is_page_break,
                "font_name": font_name,
                "raw_ref": p
            })
            
        elif tag == 'tbl':
            t = docx.table.Table(element, doc)
            # Format table content readably
            table_lines = []
            for r in t.rows:
                row_cells = [c.text.strip() for c in r.cells]
                if any(row_cells):
                    table_lines.append(" | ".join(row_cells))
            if table_lines:
                table_text = "\n".join(table_lines)
                raw_nodes.append({
                    "type": "table",
                    "text": table_text,
                    "is_heading": False,
                    "has_break": False,
                    "font_name": None,
                    "raw_ref": t
                })

    if not raw_nodes:
        raw_nodes.append({
            "type": "paragraph",
            "text": "ឯកសារទទេ (Empty Document)",
            "is_heading": False,
            "has_break": False,
            "font_name": None,
            "raw_ref": None
        })

    # 2. Page Assembly Engine: Groups nodes into authentic document pages
    # Uses explicit page breaks first, or standard A4 document pagination thresholds:
    # A standard A4 single-spaced document page contains roughly 1,400 to 2,000 characters.
    MAX_PAGE_CHARS = 1600
    MAX_PAGE_PARAGRAPHS = 10

    pages = []
    current_page_nodes = []
    current_page_chars = 0

    for node in raw_nodes:
        text = node["text"]
        node_len = len(text)

        # Check if node has explicit page break at the start or if adding it overflows standard A4 page
        is_overflow = (
            current_page_nodes
            and (
                (current_page_chars + node_len > MAX_PAGE_CHARS and len(current_page_nodes) >= 3)
                or len(current_page_nodes) >= MAX_PAGE_PARAGRAPHS
            )
        )

        if is_overflow and not node["is_heading"]:
            # Finalize current page and start a new one
            pages.append(current_page_nodes)
            current_page_nodes = []
            current_page_chars = 0

        current_page_nodes.append(node)
        current_page_chars += node_len

        # If this paragraph contains an explicit page break, terminate the page immediately
        if node.get("has_break"):
            pages.append(current_page_nodes)
            current_page_nodes = []
            current_page_chars = 0

    if current_page_nodes:
        pages.append(current_page_nodes)

    if not pages:
        pages = [[{"type": "paragraph", "text": "", "is_heading": False}]]

    all_replacements: List[ReplacementItem] = []
    slides_diff: List[SlideDiff] = []

    for page_idx, page_nodes in enumerate(pages):
        page_texts = [n["text"] for n in page_nodes if n["text"]]
        if not page_texts:
            page_texts = ["(Blank Page)"]

        # Derive page title from first heading or first line
        first_heading = next((n["text"] for n in page_nodes if n.get("is_heading") and n["text"]), None)
        if first_heading:
            page_title = first_heading[:45] + ("..." if len(first_heading) > 45 else "")
        else:
            page_title = page_texts[0][:40] + ("..." if len(page_texts[0]) > 40 else "")

        page_replacements: List[ReplacementItem] = []
        seen_pairs = set()

        for node_idx, node in enumerate(page_nodes):
            raw_text = node["text"]
            if not raw_text:
                continue

            # Limon transliteration check
            if is_likely_legacy_font(node.get("font_name"), raw_text):
                converted = convert_limon_to_unicode(raw_text)
                if converted.strip() and converted.strip() != raw_text:
                    pair_key = (page_idx, raw_text, converted.strip())
                    if pair_key not in seen_pairs:
                        seen_pairs.add(pair_key)
                        item_id = str(uuid.uuid4())[:8]
                        rep = ReplacementItem(
                            id=item_id,
                            slide_index=page_idx,
                            shape_id=str(node_idx),
                            paragraph_index=0,
                            run_index=0,
                            original=raw_text,
                            replacement=converted.strip(),
                            confidence=0.95,
                            source="limon_translit",
                            status="accepted",
                            explanation=f"Legacy font transliteration ({node.get('font_name') or 'Limon'})",
                            context=raw_text
                        )
                        page_replacements.append(rep)
                        all_replacements.append(rep)

            # Dictionary & Heuristic checks
            fixed_text, matches = restore_khmer_text(raw_text)
            for orig_term, repl_term in matches:
                pair_key = (page_idx, orig_term, repl_term)
                if pair_key not in seen_pairs:
                    seen_pairs.add(pair_key)
                    item_id = str(uuid.uuid4())[:8]
                    rep = ReplacementItem(
                        id=item_id,
                        slide_index=page_idx,
                        shape_id=str(node_idx),
                        paragraph_index=0,
                        run_index=0,
                        original=orig_term,
                        replacement=repl_term,
                        confidence=0.99,
                        source="dictionary",
                        status="accepted",
                        explanation="Matched in Khmer corruption dictionary",
                        context=raw_text
                    )
                    page_replacements.append(rep)
                    all_replacements.append(rep)

            if fixed_text != raw_text and not matches:
                pair_key = (page_idx, raw_text, fixed_text)
                if pair_key not in seen_pairs:
                    seen_pairs.add(pair_key)
                    item_id = str(uuid.uuid4())[:8]
                    rep = ReplacementItem(
                        id=item_id,
                        slide_index=page_idx,
                        shape_id=str(node_idx),
                        paragraph_index=0,
                        run_index=0,
                        original=raw_text,
                        replacement=fixed_text,
                        confidence=0.92,
                        source="heuristic",
                        status="accepted",
                        explanation="Khmer Unicode heuristic normalization & coeng repair",
                        context=raw_text
                    )
                    page_replacements.append(rep)
                    all_replacements.append(rep)

        original_page_text = "\n\n".join(page_texts)
        corrected_page_parts = []
        for pt in page_texts:
            fixed_pt, _ = restore_khmer_text(pt)
            corrected_page_parts.append(fixed_pt)
        corrected_page_text = "\n\n".join(corrected_page_parts)

        slides_diff.append(SlideDiff(
            slide_index=page_idx,
            slide_number=page_idx + 1,
            title=f"Page {page_idx + 1}" if not page_title else f"Page {page_idx + 1} - {page_title}",
            original_text=original_page_text,
            preview_corrected_text=corrected_page_text,
            replacements=page_replacements,
            shape_count=len(page_nodes),
            table_count=sum(1 for n in page_nodes if n.get("type") == "table")
        ))

    return slides_diff, all_replacements


def apply_docx_replacements_and_fonts(
    doc: docx.Document,
    replacements: List[Dict],
    target_font: str = "Khmer OS Battambang"
) -> int:
    """
    Applies accepted replacements to all paragraphs and tables in the Word document,
    and updates font family to the chosen Khmer font.
    """
    substring_map: List[Tuple[str, str]] = []
    for r in replacements:
        orig = r.get("original", "").strip()
        repl = r.get("replacement", "").strip()
        if orig and repl and orig != repl:
            if len(orig) < 2 and any(0x1780 <= ord(c) <= 0x17FF for c in orig):
                continue
            substring_map.append((orig, repl))
            
    substring_map.sort(key=lambda x: len(x[0]), reverse=True)
    updated_count = 0

    def _process_paragraph(p):
        nonlocal updated_count
        orig_text = p.text
        if not orig_text.strip():
            return
        new_text = orig_text
        for orig, repl in substring_map:
            if orig in new_text:
                new_text = new_text.replace(orig, repl)
        new_text, _ = restore_khmer_text(new_text)
        new_text = sanitize_khmer_coeng(new_text)

        p.text = new_text
        for run in p.runs:
            set_docx_run_font(run, target_font)
        updated_count += 1

    for p in doc.paragraphs:
        _process_paragraph(p)

    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                for p in cell.paragraphs:
                    _process_paragraph(p)

    return updated_count
