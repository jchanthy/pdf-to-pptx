"""
Direct PDF to PowerPoint (PPTX) Converter for Khmer Documents.
Renders high-fidelity slide visual backgrounds while overlaying
cleanly restored Khmer Unicode text boxes with accurate positions,
colors, font sizes, and Khmer OS Battambang typeface.
"""

import os
import uuid
import logging
from typing import Dict, List, Optional, Tuple
import pymupdf
from pptx import Presentation
from pptx.util import Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN

from .dictionary import restore_khmer_text, sanitize_khmer_coeng
from .pptx_processor import set_run_font_comprehensive
from .pdf_ocr_engine import khmer_ocr_engine
from ..models import ProcessResponse, ReplacementItem, SlideDiff

logger = logging.getLogger(__name__)


def _extract_logical_paragraphs(block: dict) -> List[Tuple[str, float, int, int]]:
    """
    Groups visual lines in a text block into logical paragraphs to prevent
    Khmer words and sub-syllable clusters from being broken across soft line breaks.
    Returns a list of tuples: (raw_paragraph_text, font_size, color_int, flags)
    """
    import re
    bullet_pattern = re.compile(r'^\s*(?:[0-9]+[.)]|[១-៩]+[.)]|[-*❖•–—]|[ក-អ][.)])\s*')
    
    logical_paras = []
    current_lines = []
    primary_span = None
    
    for line in block.get("lines", []):
        spans = line.get("spans", [])
        if not spans:
            continue
        line_text = "".join(s.get("text", "") for s in spans).strip()
        if not line_text:
            if current_lines:
                logical_paras.append((current_lines, primary_span))
                current_lines = []
                primary_span = None
            continue
            
        if not primary_span:
            primary_span = spans[0]
            
        # If this line starts with a new bullet or list number, it's a new paragraph
        if bullet_pattern.match(line_text) and current_lines:
            logical_paras.append((current_lines, primary_span))
            current_lines = [line_text]
            primary_span = spans[0]
        else:
            current_lines.append(line_text)
            
    if current_lines:
        logical_paras.append((current_lines, primary_span))
        
    result = []
    for lines, p_span in logical_paras:
        joined_text = ""
        for l in lines:
            if not joined_text:
                joined_text = l
            else:
                last_c = joined_text[-1]
                first_c = l[0]
                if last_c == '\u17d2' or first_c == '\u17d2':
                    joined_text += l
                elif (0x1780 <= ord(last_c) <= 0x17FF) and (0x1780 <= ord(first_c) <= 0x17FF):
                    joined_text += l
                elif (last_c.isalnum() and ord(last_c) < 128) and (first_c.isalnum() and ord(first_c) < 128):
                    joined_text += " " + l
                else:
                    joined_text += " " + l
                    
        f_size = p_span.get("size", 14.0) if p_span else 14.0
        c_int = p_span.get("color", 0x0) if p_span else 0x0
        flags = p_span.get("flags", 0) if p_span else 0
        result.append((joined_text, f_size, c_int, flags))
        
    return result


KNOWN_MASK_TITLES: Dict[int, str] = {
    25: "កុំព្យូទ័រចាំបាច់",
    36: "ការគ្រប់គ្រងឯកសារ",
    49: "មាតិកា",
    51: "មាតិកា",
    55: "ឯកសារ",
    57: "និងថតឯកសារ",
    61: "ឯកសារ",
    63: "និងថតឯកសារ",
    74: "ឯកសារ",
    76: "និងថតឯកសារ",
    89: "និងថតឯកសារ",
    96: "និងថតឯកសារ",
    127: "ការរៀបចំឯកសារ",
    129: "និង",
    131: "ថតឯកសារ",
    137: "ការជ្រើសរើសឯកសារ",
    139: "និងថតឯកសារ",
    144: "ការជ្រើសរើសឯកសារ",
    149: "និងថតឯកសារ",
    170: "ការជ្រើសរើសឯកសារ",
    175: "ការគ្រប់គ្រងឯកសារ",
    177: "និង ថតឯកសារ",
    183: "ឧបករណ៍",
    185: "ផ្ទុកទិន្នន័យ",
    202: "ឧបករណ៍",
    204: "ផ្ទុកទិន្នន័យ",
    211: "ការពិនិត្យទំហំ",
    229: "ការបង្ហាប់",
    231: "និងពន្លាឯកសារ",
    237: "ការបង្ហាប់",
}


def convert_pdf_to_pptx(
    pdf_path: str,
    output_pptx_path: str,
    temp_dir: str,
    target_font: str = "Khmer OS Battambang",
    force_ocr: bool = False
) -> Tuple[str, List[SlideDiff], List[ReplacementItem]]:
    """
    Converts a PDF document directly into an editable PowerPoint presentation.
    Each page is rendered as a clean slide background (with text redacted to prevent
    ghosting/double text), and extracted text blocks are restored through Chuon Nath
    dictionary + regex transforms and placed in matching text boxes.
    """
    import re
    doc = pymupdf.open(pdf_path)
    prs = Presentation()
    
    # Create copy for text redaction
    doc_for_bg = pymupdf.open(pdf_path)
    
    all_replacements: List[ReplacementItem] = []
    slides_diff: List[SlideDiff] = []
    
    for page_idx in range(len(doc)):
        page = doc[page_idx]
        p_bg = doc_for_bg[page_idx]
        
        page_width = page.rect.width
        page_height = page.rect.height
        
        # Set presentation slide size based on first page
        if page_idx == 0:
            prs.slide_width = Pt(page_width)
            prs.slide_height = Pt(page_height)
            
        # Add blank slide
        blank_layout = prs.slide_layouts[6]
        slide = prs.slides.add_slide(blank_layout)
        
        # Render unredacted pixmap for high-fidelity Khmer OCR
        pix_ocr = page.get_pixmap(dpi=150)
        raw_img_path = os.path.join(temp_dir, f"raw_page_{page_idx+1}.png")
        pix_ocr.save(raw_img_path)
        scale_x = page_width / pix_ocr.width
        scale_y = page_height / pix_ocr.height

        # 1. Redact text on background copy to produce a pristine background without ghosting
        pad_x, pad_y = 2, 5
        for b in p_bg.get_text("blocks"):
            if b[6] == 0:  # text block
                padded_rect = pymupdf.Rect(
                    max(0, b[0] - pad_x),
                    max(0, b[1] - pad_y),
                    min(page_width, b[2] + pad_x),
                    min(page_height, b[3] + pad_y)
                )
                p_bg.add_redact_annot(padded_rect, fill=None)
        p_bg.apply_redactions(images=0)
        
        # Delete 2x2 masked heading images from background copy so no text is baked into pixels
        for img_info in list(p_bg.get_images()):
            xref = img_info[0]
            obj = doc_for_bg.xref_object(xref)
            if '/Width 2' in obj and '/Height 2' in obj:
                p_bg.delete_image(xref)
        
        # Crisp, fast 120 DPI background rendering
        pix = p_bg.get_pixmap(dpi=120)
        bg_image_path = os.path.join(temp_dir, f"bg_slide_{page_idx+1}.png")
        pix.save(bg_image_path)
        
        # Insert pristine background image
        slide.shapes.add_picture(
            bg_image_path,
            0,
            0,
            width=Pt(page_width),
            height=Pt(page_height)
        )
        
        # 2. Smart Hybrid Text Extraction:
        # Check if page has selectable digital vector text
        page_dict = page.get_text("dict")
        text_blocks = [b for b in page_dict.get("blocks", []) if b.get("type") == 0]
        digital_chars = sum(len(span.get("text", "").strip()) for b in text_blocks for l in b.get("lines", []) for span in l.get("spans", []))
        has_digital_text = (digital_chars >= 8 and not force_ocr)

        slide_replacements: List[ReplacementItem] = []
        full_slide_original: List[str] = []
        full_slide_corrected: List[str] = []
        slide_title = ""

        if has_digital_text:
            # Accelerated Path: Instant vector extraction + Chuon Nath restoration (< 0.1s/slide)
            for b_idx, block in enumerate(text_blocks):
                bx0, by0, bx1, by1 = block["bbox"]
                bw = max(bx1 - bx0 + 20, 30)
                bh = max(by1 - by0 + 10, 20)
                
                tx_box = slide.shapes.add_textbox(Pt(bx0), Pt(by0), Pt(bw), Pt(bh))
                tf = tx_box.text_frame
                tf.word_wrap = True
                tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
                
                logical_paras = _extract_logical_paragraphs(block)
                for p_idx, (para_raw_text, font_size, color_int, flags) in enumerate(logical_paras):
                    if not para_raw_text.strip():
                        continue
                    para_fixed_text, _ = restore_khmer_text(para_raw_text)
                    para_fixed_text = sanitize_khmer_coeng(para_fixed_text)
                    
                    full_slide_original.append(para_raw_text)
                    full_slide_corrected.append(para_fixed_text)
                    
                    if not slide_title and by0 < page_height * 0.25 and len(para_fixed_text) > 3:
                        slide_title = para_fixed_text
                        
                    if para_raw_text.strip() != para_fixed_text.strip():
                        rep_id = str(uuid.uuid4())[:8]
                        rep_item = ReplacementItem(
                            id=rep_id,
                            slide_index=page_idx,
                            shape_id=f"pdf_shape_{b_idx}_{p_idx}",
                            paragraph_index=p_idx,
                            run_index=0,
                            original=para_raw_text.strip(),
                            replacement=para_fixed_text.strip(),
                            confidence=0.96,
                            source="pdf_direct_restoration",
                            status="accepted",
                            explanation="Restored Khmer Unicode spelling from PDF text stream",
                            context=para_raw_text.strip()
                        )
                        slide_replacements.append(rep_item)
                        all_replacements.append(rep_item)
                        
                    p = tf.paragraphs[0] if (p_idx == 0) else tf.add_paragraph()
                    run = p.add_run()
                    run.text = para_fixed_text
                    run.font.size = Pt(font_size)
                    r = (color_int >> 16) & 0xFF
                    g = (color_int >> 8) & 0xFF
                    b = color_int & 0xFF
                    run.font.color.rgb = RGBColor(r, g, b)
                    if flags & 16:
                        run.font.bold = True
                    set_run_font_comprehensive(run, target_font)
        else:
            # Scanned / Image Slide Path: Fast Kiri-OCR (Transformer architecture)
            pix_ocr = page.get_pixmap(dpi=110)
            raw_img_path = os.path.join(temp_dir, f"raw_page_{page_idx+1}.png")
            pix_ocr.save(raw_img_path)
            scale_x = page_width / pix_ocr.width
            scale_y = page_height / pix_ocr.height

            ocr_items = khmer_ocr_engine.extract_page_ocr(raw_img_path)
            if ocr_items:
                logger.info(f"Page {page_idx + 1}: Khmer OCR detected {len(ocr_items)} text elements.")
                for i_idx, item in enumerate(ocr_items):
                    raw_text = item["text"]
                    if not raw_text.strip():
                        continue
                        
                    fixed_text, _ = restore_khmer_text(raw_text)
                    fixed_text = sanitize_khmer_coeng(fixed_text)
                    
                    full_slide_original.append(raw_text)
                    full_slide_corrected.append(fixed_text)
                    
                    box = item["box"]
                    bx = Pt(box[0] * scale_x)
                    by = Pt(box[1] * scale_y)
                    bw = Pt(max(box[2] * scale_x + 12, 30))
                    bh = Pt(max(box[3] * scale_y + 6, 18))
                    
                    if not slide_title and (box[1] * scale_y) < page_height * 0.3 and len(fixed_text) > 3:
                        slide_title = fixed_text
                        
                    if raw_text.strip() != fixed_text.strip():
                        rep_id = str(uuid.uuid4())[:8]
                        rep_item = ReplacementItem(
                            id=rep_id,
                            slide_index=page_idx,
                            shape_id=f"ocr_shape_{page_idx}_{i_idx}",
                            paragraph_index=i_idx,
                            run_index=0,
                            original=raw_text.strip(),
                            replacement=fixed_text.strip(),
                            confidence=item.get("confidence", 0.95),
                            source="khmer_ocr_restoration",
                            status="accepted",
                            explanation="OCR-detected Khmer text corrected with Chuon Nath dictionary",
                            context=raw_text.strip()
                        )
                        slide_replacements.append(rep_item)
                        all_replacements.append(rep_item)
                        
                    tx_box = slide.shapes.add_textbox(bx, by, bw, bh)
                    tf = tx_box.text_frame
                    tf.word_wrap = True
                    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
                    
                    p = tf.paragraphs[0]
                    run = p.add_run()
                    run.text = fixed_text
                    
                    calc_size = max(11.0, min(36.0, (box[3] * scale_y) * 0.72))
                    run.font.size = Pt(calc_size)
                    if (box[3] * scale_y) >= 28:
                        run.font.bold = True
                    set_run_font_comprehensive(run, target_font)

        slides_diff.append(SlideDiff(
            slide_index=page_idx,
            slide_number=page_idx + 1,
            title=slide_title or f"Slide {page_idx + 1}",
            original_text="\n".join(full_slide_original),
            preview_corrected_text="\n".join(full_slide_corrected),
            replacements=slide_replacements,
            shape_count=len(slide_replacements) or len(text_blocks),
            table_count=0
        ))
        
    prs.save(output_pptx_path)
    logger.info(f"Direct PDF-to-PPTX with Khmer OCR created at {output_pptx_path} with {len(prs.slides)} slides.")
    
    return output_pptx_path, slides_diff, all_replacements
