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
    bullet_pattern = re.compile(r'^\s*(?:[0-9]+[\u200b\s]*[.)]|[១-៩]+[\u200b\s]*[.)]|[-*❖•●–—]|[ក-អ][\u200b\s]*[.)])\s*')
    
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


def _merge_adjacent_text_blocks(blocks: List[dict]) -> List[dict]:
    """
    Merges adjacent or wrapped text blocks that belong to the same logical paragraph
    or continuous text box to prevent split words (e.g. 'កុំព្យូ' and 'ទ័រ').
    """
    if not blocks or len(blocks) <= 1:
        return blocks

    import re
    bullet_pattern = re.compile(r'^\s*(?:[0-9]+[\u200b\s]*[.)]|[១-៩]+[\u200b\s]*[.)]|[-*❖•●–—]|[ក-អ][\u200b\s]*[.)])\s*')

    # Sort blocks vertically primarily, horizontally secondarily
    sorted_blocks = sorted(blocks, key=lambda b: (round(b["bbox"][1] / 10) * 10, b["bbox"][0]))
    merged: List[dict] = []

    for b in sorted_blocks:
        b_copy = {
            "bbox": list(b["bbox"]),
            "lines": list(b.get("lines", [])),
            "type": b.get("type", 0)
        }
        if not merged:
            merged.append(b_copy)
            continue

        prev = merged[-1]
        prev_lines = prev.get("lines", [])
        curr_lines = b_copy.get("lines", [])

        if not prev_lines or not curr_lines:
            merged.append(b_copy)
            continue

        prev_text = "".join(s.get("text", "") for l in prev_lines for s in l.get("spans", [])).strip()
        curr_text = "".join(s.get("text", "") for l in curr_lines for s in l.get("spans", [])).strip()

        if not prev_text or not curr_text:
            merged.append(b_copy)
            continue

        p_bx0, p_by0, p_bx1, p_by1 = prev["bbox"]
        c_bx0, c_by0, c_bx1, c_by1 = b_copy["bbox"]

        vertical_gap = c_by0 - p_by1
        horizontal_diff = abs(c_bx0 - p_bx0)

        last_ch = prev_text[-1]
        is_terminated = last_ch in ('។', '?', '!', '៖', '…', ':')
        is_curr_bullet = bool(bullet_pattern.match(curr_text))

        p_spans = [s for l in prev_lines for s in l.get("spans", []) if s.get("text", "").strip()]
        c_spans = [s for l in curr_lines for s in l.get("spans", []) if s.get("text", "").strip()]
        p_size = p_spans[-1].get("size", 14) if p_spans else 14
        c_size = c_spans[0].get("size", 14) if c_spans else 14
        size_diff = abs(p_size - c_size)

        if (-8 <= vertical_gap <= 25) and (horizontal_diff <= 40) and (not is_terminated) and (not is_curr_bullet) and (size_diff <= 3.5):
            prev["lines"].extend(curr_lines)
            prev["bbox"] = [
                min(p_bx0, c_bx0),
                min(p_by0, c_by0),
                max(p_bx1, c_bx1),
                max(p_by1, c_by1)
            ]
        else:
            merged.append(b_copy)

    return merged


def _is_valid_real_table(tab, pw: float, ph: float) -> bool:
    """
    Validates whether a PyMuPDF table structure represents a genuine data table
    versus a whole-slide frame or loose icon layout.
    """
    x0, y0, x1, y1 = tab.bbox
    # Reject false-positive whole-page bounding frames
    if x0 <= 5 and y0 <= 5 and (x1 >= pw - 5) and (y1 >= ph - 5):
        return False
    df = tab.extract()
    if not df or len(df) < 2 or len(df[0]) < 2:
        return False
    col_has_content = [any(row[c] and row[c].strip() for row in df) for c in range(len(df[0]))]
    if sum(col_has_content) < 2:
        return False
    total_cells = len(df) * len(df[0])
    filled = sum(1 for r in df for c in r if c and c.strip())
    # Real structured tables have a high content density (>= 65%)
    return (filled / total_cells) >= 0.65


def _cluster_content_blocks(blocks: List[dict]) -> List[List[dict]]:
    """
    Groups vertically adjacent and horizontally aligned blocks (such as consecutive
    bullet points or paragraphs of the same column) into single text containers.
    Prevents text from being fragmented into tiny disjoint floating boxes.
    """
    if not blocks:
        return []
    sorted_blocks = sorted(blocks, key=lambda b: (b['bbox'][1], b['bbox'][0]))
    clusters: List[List[dict]] = []
    for b in sorted_blocks:
        bx0, by0, bx1, by1 = b['bbox']
        matched = None
        for cl in clusters:
            last = cl[-1]
            lx0, ly0, lx1, ly1 = last['bbox']
            v_gap = by0 - ly1
            h_diff = abs(bx0 - lx0)
            has_h_overlap = not (bx1 < lx0 - 20 or bx0 > lx1 + 20)
            if (-10 <= v_gap <= 35) and (h_diff <= 50 or (bx0 >= lx0 and bx0 - lx0 <= 65)) and has_h_overlap:
                matched = cl
                break
        if matched:
            matched.append(b)
        else:
            clusters.append([b])
    return clusters


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

        # 1. Extract embedded content images as standalone editable PowerPoint picture shapes
        embedded_images = []
        for img_info in page.get_images():
            xref = img_info[0]
            base_img = doc.extract_image(xref)
            if not base_img:
                continue
            iw = base_img.get("width", 0)
            ih = base_img.get("height", 0)
            # Filter out tiny 1x1 or 2x2 color tiles or heading masks
            if iw < 8 or ih < 8:
                continue
            rects = page.get_image_rects(xref)
            if not rects:
                continue
            
            # Delete image from background copy so it isn't baked into the canvas
            try:
                p_bg.delete_image(xref)
            except Exception:
                pass
            
            ext = base_img.get("ext", "png")
            img_filename = f"img_p{page_idx+1}_{xref}.{ext}"
            img_path = os.path.join(temp_dir, img_filename)
            if not os.path.exists(img_path):
                with open(img_path, "wb") as f_img:
                    f_img.write(base_img["image"])
                    
            for r in rects:
                if r.width >= 5 and r.height >= 5:
                    embedded_images.append((img_path, r.x0, r.y0, r.width, r.height))

        # Check for real structured data tables on the page
        tabs = page.find_tables()
        real_tables = [t for t in tabs.tables if _is_valid_real_table(t, page_width, page_height)]
        table_bboxes = [t.bbox for t in real_tables]

        # 2. Redact text and table contents on background copy to produce a pristine background without ghosting
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
        for t in real_tables:
            p_bg.add_redact_annot(pymupdf.Rect(t.bbox), fill=None)
        p_bg.apply_redactions(images=0)
        
        # Delete any remaining 2x2 masked heading images from background copy
        for img_info in list(p_bg.get_images()):
            xref = img_info[0]
            obj = doc_for_bg.xref_object(xref)
            if '/Width 2' in obj and '/Height 2' in obj:
                try:
                    p_bg.delete_image(xref)
                except Exception:
                    pass
        
        # Crisp, fast 120 DPI background rendering
        pix = p_bg.get_pixmap(dpi=120)
        bg_image_path = os.path.join(temp_dir, f"bg_slide_{page_idx+1}.png")
        pix.save(bg_image_path)
        
        # Insert pristine background canvas
        slide.shapes.add_picture(
            bg_image_path,
            0,
            0,
            width=Pt(page_width),
            height=Pt(page_height)
        )

        # Insert standalone editable picture shapes
        for img_path, rx, ry, rw, rh in embedded_images:
            try:
                slide.shapes.add_picture(
                    img_path,
                    Pt(rx),
                    Pt(ry),
                    width=Pt(rw),
                    height=Pt(rh)
                )
            except Exception as e:
                logger.warning(f"Could not add picture shape {img_path}: {e}")

        # Insert native PowerPoint Table shapes
        for t_idx, t in enumerate(real_tables):
            tx0, ty0, tx1, ty1 = t.bbox
            tw = max(tx1 - tx0, 50)
            th = max(ty1 - ty0, 30)
            df = t.extract()
            if not df or not df[0]:
                continue
            num_rows = len(df)
            num_cols = len(df[0])
            tbl_shape = slide.shapes.add_table(num_rows, num_cols, Pt(tx0), Pt(ty0), Pt(tw), Pt(th))
            tbl = tbl_shape.table
            
            for r_i in range(num_rows):
                for c_i in range(num_cols):
                    cell = tbl.cell(r_i, c_i)
                    cell.margin_left = Pt(4)
                    cell.margin_right = Pt(4)
                    cell.margin_top = Pt(3)
                    cell.margin_bottom = Pt(3)
                    raw_val = (df[r_i][c_i] or "").strip()
                    if not raw_val:
                        continue
                    fixed_val, _ = restore_khmer_text(raw_val)
                    fixed_val = sanitize_khmer_coeng(fixed_val)
                    full_slide_original.append(raw_val)
                    full_slide_corrected.append(fixed_val)
                    cell.text = fixed_val
                    for p in cell.text_frame.paragraphs:
                        p.font.name = target_font
                        p.font.size = Pt(10.5 if num_rows > 6 else 12)
                        if r_i == 0:
                            p.font.bold = True
                    if raw_val != fixed_val:
                        rep_item = ReplacementItem(
                            id=str(uuid.uuid4())[:8],
                            slide_index=page_idx,
                            shape_id=f"table_{page_idx}_{r_i}_{c_i}",
                            paragraph_index=0,
                            run_index=0,
                            original=raw_val,
                            replacement=fixed_val,
                            confidence=0.96,
                            source="pdf_table_restoration",
                            status="accepted",
                            explanation="Restored Khmer Unicode in table cell",
                            context=raw_val
                        )
                        slide_replacements.append(rep_item)
                        all_replacements.append(rep_item)
        
        # 3. Smart Hybrid Text Extraction:
        # Check if page has selectable digital vector text
        page_dict = page.get_text("dict")
        raw_text_blocks = [b for b in page_dict.get("blocks", []) if b.get("type") == 0]
        text_blocks = _merge_adjacent_text_blocks(raw_text_blocks)
        digital_chars = sum(len(span.get("text", "").strip()) for b in text_blocks for l in b.get("lines", []) for span in l.get("spans", []))
        has_digital_text = (digital_chars >= 8 and not force_ocr)

        slide_replacements: List[ReplacementItem] = []
        full_slide_original: List[str] = []
        full_slide_corrected: List[str] = []
        slide_title = ""

        if has_digital_text:
            # Exclude text blocks that lie inside any real table bounds
            def _is_in_table(b):
                bx0, by0, bx1, by1 = b["bbox"]
                for tx0, ty0, tx1, ty1 in table_bboxes:
                    if not (bx1 < tx0 + 2 or bx0 > tx1 - 2 or by1 < ty0 + 2 or by0 > ty1 - 2):
                        return True
                return False
                
            non_table_blocks = [b for b in text_blocks if not _is_in_table(b)]
            
            # Partition blocks into Title, Footers, and Body
            title_block = None
            footer_blocks = []
            body_blocks = []
            
            for b in non_table_blocks:
                bb = b["bbox"]
                if (bb[1] > page_height * 0.88 and bb[0] > page_width * 0.80) or bb[1] > page_height * 0.94:
                    footer_blocks.append(b)
                elif bb[1] < page_height * 0.22 and not title_block:
                    title_block = b
                else:
                    body_blocks.append(b)
                    
            containers = []
            if title_block:
                containers.append(("title", [title_block]))
            for col in _cluster_content_blocks(body_blocks):
                containers.append(("body", col))
            for fb in footer_blocks:
                containers.append(("footer", [fb]))

            for c_idx, (c_type, block_group) in enumerate(containers):
                min_x = min(b["bbox"][0] for b in block_group)
                min_y = min(b["bbox"][1] for b in block_group)
                max_x = max(b["bbox"][2] for b in block_group)
                max_y = max(b["bbox"][3] for b in block_group)
                
                bw = max(max_x - min_x + 25, 30)
                bh = max(max_y - min_y + 15, 20)
                
                tx_box = slide.shapes.add_textbox(Pt(min_x), Pt(min_y), Pt(bw), Pt(bh))
                tf = tx_box.text_frame
                tf.word_wrap = True
                tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
                
                first_p = True
                for b_idx, block in enumerate(block_group):
                    logical_paras = _extract_logical_paragraphs(block)
                    for p_idx, (para_raw_text, font_size, color_int, flags) in enumerate(logical_paras):
                        if not para_raw_text.strip():
                            continue
                        para_fixed_text, _ = restore_khmer_text(para_raw_text)
                        para_fixed_text = sanitize_khmer_coeng(para_fixed_text)
                        
                        full_slide_original.append(para_raw_text)
                        full_slide_corrected.append(para_fixed_text)
                        
                        if not slide_title and c_type == "title" and len(para_fixed_text) > 3:
                            slide_title = para_fixed_text
                        elif not slide_title and min_y < page_height * 0.25 and len(para_fixed_text) > 3:
                            slide_title = para_fixed_text
                            
                        if para_raw_text.strip() != para_fixed_text.strip():
                            rep_id = str(uuid.uuid4())[:8]
                            rep_item = ReplacementItem(
                                id=rep_id,
                                slide_index=page_idx,
                                shape_id=f"pdf_shape_{c_idx}_{b_idx}_{p_idx}",
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
                            
                        p = tf.paragraphs[0] if first_p else tf.add_paragraph()
                        first_p = False
                        
                        clean = para_fixed_text.strip()
                        is_sub_bullet = clean.startswith(('•', '-', '*'))
                        is_main_bullet = clean.startswith('●') or (len(clean) >= 2 and clean[0].isdigit() and clean[1] in ('.', ')')) or (len(clean) >= 2 and 0x17E0 <= ord(clean[0]) <= 0x17E9 and clean[1] in ('.', ')'))
                        
                        if is_sub_bullet:
                            p.level = 1
                            p.space_before = Pt(3)
                            p.space_after = Pt(3)
                        elif is_main_bullet:
                            p.level = 0
                            p.space_before = Pt(6)
                            p.space_after = Pt(4)
                        elif c_type == "title":
                            p.space_after = Pt(6)
                        else:
                            p.space_before = Pt(2)
                            p.space_after = Pt(3)
                            
                        run = p.add_run()
                        run.text = para_fixed_text
                        run.font.size = Pt(font_size)
                        r = (color_int >> 16) & 0xFF
                        g = (color_int >> 8) & 0xFF
                        b_c = color_int & 0xFF
                        run.font.color.rgb = RGBColor(r, g, b_c)
                        if (flags & 16) or c_type == "title":
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
            table_count=len(real_tables)
        ))
        
    prs.save(output_pptx_path)
    logger.info(f"Direct PDF-to-PPTX with Khmer OCR created at {output_pptx_path} with {len(prs.slides)} slides.")
    
    return output_pptx_path, slides_diff, all_replacements
