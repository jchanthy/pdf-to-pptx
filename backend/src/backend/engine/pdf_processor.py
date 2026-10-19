"""
PDF Khmer Text Traversal and Unicode Restoration Engine.
Applies Khmer Unicode corrections directly to native PDF documents:
1. Identifies corrupted text spans and exact bounding boxes.
2. Redacts corrupted legacy glyphs cleanly.
3. Re-inserts canonical Khmer Unicode text using high-fidelity Khmer fonts.
4. Preserves vector graphics, background artwork, page layouts, and dimensions.
"""

import logging
import os
import re
from typing import Dict, List, Optional, Tuple
import pymupdf

from .dictionary import restore_khmer_text, sanitize_khmer_coeng

logger = logging.getLogger(__name__)

# Common system Khmer font paths on Windows and Linux
CANDIDATE_FONT_PATHS = [
    r"C:\Windows\Fonts\daunpenh.ttf",
    r"C:\Windows\Fonts\KhmerUI.ttf",
    r"C:\Windows\Fonts\KhmerUIb.ttf",
    r"C:\Windows\Fonts\LeelawUI.ttf",
    r"C:\Windows\Fonts\LEELAWAD.TTF",
    r"C:\Windows\Fonts\KhmerOSBattambang.ttf",
    r"C:\Windows\Fonts\KhmerOS.ttf",
    r"C:\Windows\Fonts\KhmerOSsys.ttf",
    r"C:\Windows\Fonts\KhmerOS_siemreap.ttf",
    r"/usr/share/fonts/truetype/khmeros/KhmerOS_battambang.ttf",
    r"/usr/share/fonts/truetype/khmeros/KhmerOS.ttf",
]


def resolve_khmer_font_path(target_font: str = "Khmer OS Battambang") -> Optional[str]:
    """Finds a valid TrueType/OpenType Khmer font file on the host system."""
    import tempfile
    target_clean = re.sub(r'[^a-zA-Z0-9]', '', target_font.lower())
    
    # 0. Check custom uploaded fonts directory first
    custom_dir = os.path.join(tempfile.gettempdir(), "khmer_docfixer_fonts")
    if os.path.isdir(custom_dir):
        for f in os.listdir(custom_dir):
            f_clean = re.sub(r'[^a-zA-Z0-9]', '', f.lower())
            if (target_clean in f_clean or f_clean in target_clean) and f.lower().endswith((".ttf", ".otf")):
                return os.path.join(custom_dir, f)

    # Try exact or partial match first
    for path in CANDIDATE_FONT_PATHS:
        if os.path.exists(path):
            p_clean = re.sub(r'[^a-zA-Z0-9]', '', os.path.basename(path).lower())
            if target_clean in p_clean or p_clean in target_clean:
                return path

    # Fallback to any existing Khmer font from candidates
    for path in CANDIDATE_FONT_PATHS:
        if os.path.exists(path):
            return path

    # Fallback to scanning C:\Windows\Fonts
    win_fonts_dir = r"C:\Windows\Fonts"
    if os.path.isdir(win_fonts_dir):
        for f in os.listdir(win_fonts_dir):
            f_low = f.lower()
            if any(k in f_low for k in ["khmer", "daunpenh", "leelaw"]) and f_low.endswith(".ttf"):
                return os.path.join(win_fonts_dir, f)

    return None


def apply_pdf_replacements_and_fonts(
    pdf_path: str,
    output_path: str,
    replacements: List[dict],
    target_font: str = "Khmer OS Battambang"
) -> int:
    """
    Applies validated Khmer Unicode text replacements directly into a PDF document.
    Redacts corrupted glyphs and writes restored Khmer Unicode text into matching bboxes.
    """
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"Source PDF not found at {pdf_path}")

    doc = pymupdf.open(pdf_path)
    font_path = resolve_khmer_font_path(target_font)
    if not font_path:
        logger.warning("No system Khmer TrueType font found; using default font embedding.")

    total_replacements_applied = 0

    # Group replacements by page (slide_index)
    by_page: Dict[int, List[dict]] = {}
    for r in replacements:
        p_idx = r.get("slide_index", 0)
        by_page.setdefault(p_idx, []).append(r)

    for page_idx in range(len(doc)):
        page = doc[page_idx]
        page_reps = by_page.get(page_idx, [])
        if not page_reps:
            continue

        insertions_to_make = []

        # Sort replacements by original text length descending to avoid sub-string collisions
        sorted_reps = sorted(page_reps, key=lambda x: len(x.get("original", "")), reverse=True)

        for rep in sorted_reps:
            orig = rep.get("original", "").strip()
            replacement = rep.get("replacement", "").strip()
            if not orig or not replacement or orig == replacement:
                continue

            rects = []
            font_size = 13.0
            color_rgb = (0, 0, 0)

            # Strategy 1: Direct search in page text
            found_rects = page.search_for(orig)
            if not found_rects and '\u200b' in orig:
                found_rects = page.search_for(orig.replace('\u200b', ''))

            if found_rects:
                rects.extend(found_rects)

            # Strategy 2: Span-level inspection if search_for didn't find exact match
            if not rects:
                page_dict = page.get_text("dict")
                for block in page_dict.get("blocks", []):
                    if "lines" not in block:
                        continue
                    for line in block.get("lines", []):
                        for span in line.get("spans", []):
                            span_text = span.get("text", "").strip()
                            if orig in span_text or span_text in orig:
                                s_rect = pymupdf.Rect(span["bbox"])
                                rects.append(s_rect)
                                font_size = span.get("size", 13.0)
                                c_int = span.get("color", 0)
                                color_rgb = (
                                    ((c_int >> 16) & 0xFF) / 255.0,
                                    ((c_int >> 8) & 0xFF) / 255.0,
                                    (c_int & 0xFF) / 255.0
                                )
                                break
                        if rects:
                            break
                    if rects:
                        break

            # If rects found, redact the old corrupted glyphs
            for rect in rects:
                # Add slight margin to ensure full glyph removal
                r_annot = pymupdf.Rect(rect.x0 - 1, rect.y0 - 1, rect.x1 + 1, rect.y1 + 1)
                page.add_redact_annot(r_annot, fill=(1, 1, 1)) # clean whiteout
                
                # Calculate insertion font size based on bounding box height
                calc_font_size = min(max(rect.height * 0.75, 9.0), 32.0)
                if font_size == 13.0:
                    font_size = calc_font_size

                insertions_to_make.append({
                    "rect": rect,
                    "text": replacement,
                    "fontsize": font_size,
                    "color": color_rgb
                })
                total_replacements_applied += 1

        # Apply redactions to commit erasure of corrupted text
        if insertions_to_make:
            page.apply_redactions()

            # Insert clean Khmer Unicode text
            for item in insertions_to_make:
                rect = item["rect"]
                text = item["text"]
                f_size = item["fontsize"]
                col = item["color"]

                try:
                    lines = text.split("\n")
                    line_height = f_size * 1.3
                    base_y = rect.y1 - 2
                    if len(lines) > 1:
                        base_y = rect.y0 + f_size

                    for l_idx, line_str in enumerate(lines):
                        cur_y = base_y + (l_idx * line_height)
                        pt = pymupdf.Point(rect.x0, cur_y)
                        if font_path:
                            page.insert_text(
                                pt,
                                line_str,
                                fontname="khmer_font",
                                fontfile=font_path,
                                fontsize=f_size,
                                color=col
                            )
                        else:
                            page.insert_text(pt, line_str, fontsize=f_size, color=col)
                except Exception as ex:
                    logger.warning(f"Failed to insert text '{text}' on page {page_idx}: {ex}")

    # Save to destination with compression
    doc.save(output_path, garbage=3, deflate=True)
    doc.close()
    logger.info(f"PDF restoration complete: {total_replacements_applied} replacements saved to {output_path}")
    return total_replacements_applied
