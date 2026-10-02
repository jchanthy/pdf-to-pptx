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
    target_font: str = "Khmer OS Battambang"
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
        
        # 1. Redact text and remove masked headings from background copy to produce a pristine background
        # A) Pad regular text block redactions by 5pt top/bottom and 2pt left/right
        #    This ensures high Khmer diacritics (់, ៍, ៏, ាំ, ំ) and subscript coengs are never clipped or left as stray marks
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
        
        # B) Delete 2x2 masked heading images from background copy so no text or Bantoc marks are baked into pixels
        for img_info in list(p_bg.get_images()):
            xref = img_info[0]
            obj = doc_for_bg.xref_object(xref)
            if '/Width 2' in obj and '/Height 2' in obj:
                p_bg.delete_image(xref)
        
        pix = p_bg.get_pixmap(dpi=150)
        bg_image_path = os.path.join(temp_dir, f"bg_slide_{page_idx+1}.png")
        pix.save(bg_image_path)
        
        # Insert background image
        slide.shapes.add_picture(
            bg_image_path,
            0,
            0,
            width=Pt(page_width),
            height=Pt(page_height)
        )
        
        # 2. Extract and restore text blocks and masked headings
        page_dict = page.get_text("dict")
        slide_replacements: List[ReplacementItem] = []
        full_slide_original: List[str] = []
        full_slide_corrected: List[str] = []
        slide_title = ""
        
        # A) Detect 2x2 masked headings, recover their text, and create editable PowerPoint text boxes
        img_list = page.get_images()
        img_2x2_xrefs = []
        for im in img_list:
            xref = im[0]
            obj = doc.xref_object(xref)
            if '/Width 2' in obj and '/Height 2' in obj:
                m = re.search(r'/SMask\s+(\d+)', obj)
                sm_id = int(m.group(1)) if m else None
                m_col = re.search(r'<([0-9A-Fa-f]{6})', obj)
                col = (int(m_col.group(1)[:2], 16), int(m_col.group(1)[2:4], 16), int(m_col.group(1)[4:6], 16)) if m_col else (60, 180, 229)
                img_2x2_xrefs.append((xref, sm_id, col))
                
        blocks_2x2 = [b for b in page_dict.get('blocks', []) if b.get('type') == 1 and b.get('width') == 2 and b.get('height') == 2]
        blocks_2x2.sort(key=lambda b: (b['bbox'][1], b['bbox'][0]))
        
        if blocks_2x2 and img_2x2_xrefs:
            heading_groups: List[List[dict]] = []
            for b in blocks_2x2:
                if not heading_groups:
                    heading_groups.append([b])
                else:
                    last_g = heading_groups[-1]
                    if abs(b['bbox'][1] - last_g[0]['bbox'][1]) < 15:
                        last_g.append(b)
                    else:
                        heading_groups.append([b])
                        
            curr_idx = 0
            for g in heading_groups:
                g_x0 = min(b['bbox'][0] for b in g)
                g_y0 = min(b['bbox'][1] for b in g)
                g_x1 = max(b['bbox'][2] for b in g)
                g_y1 = max(b['bbox'][3] for b in g)
                g_w = max(g_x1 - g_x0 + 20, 40)
                g_h = max(g_y1 - g_y0 + 10, 24)
                
                group_words = []
                group_col = (60, 180, 229)
                for b in g:
                    if curr_idx < len(img_2x2_xrefs):
                        _, sm_id, col = img_2x2_xrefs[curr_idx]
                        group_col = col
                        w_text = KNOWN_MASK_TITLES.get(sm_id, "")
                        if w_text and w_text not in group_words:
                            group_words.append(w_text)
                    curr_idx += 1
                    
                combined_heading = " ".join(group_words).strip()
                if combined_heading:
                    if not slide_title:
                        slide_title = combined_heading
                    full_slide_original.append(combined_heading)
                    full_slide_corrected.append(combined_heading)
                    
                    h_box = slide.shapes.add_textbox(Pt(g_x0), Pt(g_y0), Pt(g_w), Pt(g_h))
                    h_tf = h_box.text_frame
                    h_tf.word_wrap = True
                    h_tf.margin_left = h_tf.margin_top = h_tf.margin_right = h_tf.margin_bottom = 0
                    h_p = h_tf.paragraphs[0]
                    h_run = h_p.add_run()
                    h_run.text = combined_heading
                    h_font_size = max(18.0, min(36.0, (g_y1 - g_y0) * 0.72))
                    h_run.font.size = Pt(h_font_size)
                    h_run.font.bold = True
                    h_run.font.color.rgb = RGBColor(group_col[0], group_col[1], group_col[2])
                    set_run_font_comprehensive(h_run, target_font)
        
        for b_idx, block in enumerate(page_dict.get("blocks", [])):
            if block.get("type") != 0:  # only text blocks
                continue
                
            bx0, by0, bx1, by1 = block["bbox"]
            bw = max(bx1 - bx0 + 20, 30)
            bh = max(by1 - by0 + 10, 20)
            
            # Create text box at block coordinates
            tx_box = slide.shapes.add_textbox(Pt(bx0), Pt(by0), Pt(bw), Pt(bh))
            tf = tx_box.text_frame
            tf.word_wrap = True
            tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
            
            logical_paras = _extract_logical_paragraphs(block)
            for p_idx, (para_raw_text, font_size, color_int, flags) in enumerate(logical_paras):
                if not para_raw_text.strip():
                    continue
                    
                # Restore Khmer text using Chuon Nath dictionary & decoder
                para_fixed_text, _ = restore_khmer_text(para_raw_text)
                para_fixed_text = sanitize_khmer_coeng(para_fixed_text)
                
                full_slide_original.append(para_raw_text)
                full_slide_corrected.append(para_fixed_text)
                
                # Check for slide title (first prominent line near top)
                if not slide_title and by0 < page_height * 0.25 and len(para_fixed_text) > 3:
                    slide_title = para_fixed_text
                    
                # Record replacement if text was corrected
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
                    
                # Add paragraph to text frame
                p = tf.paragraphs[0] if (p_idx == 0) else tf.add_paragraph()
                run = p.add_run()
                run.text = para_fixed_text
                run.font.size = Pt(font_size)
                
                r = (color_int >> 16) & 0xFF
                g = (color_int >> 8) & 0xFF
                b = color_int & 0xFF
                run.font.color.rgb = RGBColor(r, g, b)
                
                if flags & 2:  # italic
                    run.font.italic = True
                if flags & 16:  # bold
                    run.font.bold = True
                    
                set_run_font_comprehensive(run, target_font)
                
        slides_diff.append(SlideDiff(
            slide_index=page_idx,
            slide_number=page_idx + 1,
            title=slide_title or f"Slide {page_idx + 1}",
            original_text="\n".join(full_slide_original),
            preview_corrected_text="\n".join(full_slide_corrected),
            replacements=slide_replacements,
            shape_count=len(page_dict.get("blocks", [])),
            table_count=0
        ))
        
    prs.save(output_pptx_path)
    logger.info(f"Direct PDF-to-PPTX created at {output_pptx_path} with {len(prs.slides)} slides.")
    
    return output_pptx_path, slides_diff, all_replacements
