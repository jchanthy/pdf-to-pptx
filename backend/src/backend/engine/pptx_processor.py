"""
PPTX Traversal and Reconstruction Engine.
Recursively traverses slide shapes (text frames, tables, group shapes, notes)
at the paragraph level to prevent word fragmentation across runs, and updates
text and fonts while strictly preserving geometry, styling, and XML DrawingML complex script fonts.
"""

import logging
from typing import Dict, Generator, List, Optional, Tuple
from pptx import Presentation
from pptx.enum.shapes import MSO_SHAPE_TYPE
from pptx.oxml.xmlchemy import OxmlElement
from pptx.oxml.ns import qn

from .dictionary import restore_khmer_text, sanitize_khmer_coeng

logger = logging.getLogger(__name__)

# Standard recommended Khmer fonts
RECOMMENDED_KHMER_FONTS = [
    {"name": "Khmer OS Battambang", "category": "Administrative / Clean Sans", "default": True},
    {"name": "Kantumruy Pro", "category": "Modern Sans (Google Font)", "default": False},
    {"name": "Khmer OS Siemreap", "category": "Readable Body Font", "default": False},
    {"name": "Hanuman", "category": "Traditional Serif (Google Font)", "default": False},
    {"name": "Khmer OS Muol Light", "category": "Headline / Formal Header", "default": False},
    {"name": "Koh Santepheap", "category": "Contemporary Display", "default": False},
]


def set_run_font_comprehensive(run, font_name: str):
    """
    Sets the font family on a run for Latin, Complex Script (CS - essential for Khmer),
    and East Asian (EA) XML elements in PowerPoint DrawingML.
    Crucially removes artificial negative/condensed character spacing (spc) attribute
    that causes Khmer characters and spaces to collide, overlap, and collapse into each other.
    """
    try:
        run.font.name = font_name
    except Exception:
        pass
        
    try:
        rPr = run._r.get_or_add_rPr()
        # Remove artificial condensed/negative character spacing (spc) that squashes Khmer glyphs
        if 'spc' in rPr.attrib:
            del rPr.attrib['spc']
            
        for tag in ('cs', 'ea', 'latin'):
            font_el = rPr.find(qn(f'a:{tag}'))
            if font_el is None:
                font_el = OxmlElement(f'a:{tag}')
                rPr.append(font_el)
            font_el.set('typeface', font_name)
    except Exception as e:
        logger.debug(f"Could not set XML font element: {e}")


class SlideParagraphItem:
    """Represents a full paragraph within a shape/table/notes."""
    def __init__(
        self,
        slide_index: int,
        shape_id: str,
        shape_name: str,
        shape_type: str,
        paragraph_index: int,
        text: str,
        font_name: Optional[str] = None,
        is_table: bool = False,
        row_idx: Optional[int] = None,
        col_idx: Optional[int] = None,
        is_notes: bool = False,
        raw_paragraph_ref = None,
        runs = None
    ):
        self.slide_index = slide_index
        self.shape_id = str(shape_id)
        self.shape_name = shape_name
        self.shape_type = shape_type
        self.paragraph_index = paragraph_index
        self.text = text
        self.font_name = font_name
        self.is_table = is_table
        self.row_idx = row_idx
        self.col_idx = col_idx
        self.is_notes = is_notes
        self.raw_paragraph_ref = raw_paragraph_ref
        self.runs = runs or []

    def to_dict(self) -> Dict:
        return {
            "slide_index": self.slide_index,
            "shape_id": self.shape_id,
            "shape_name": self.shape_name,
            "shape_type": self.shape_type,
            "paragraph_index": self.paragraph_index,
            "run_index": 0,
            "text": self.text,
            "font_name": self.font_name,
            "is_table": self.is_table,
            "row_idx": self.row_idx,
            "col_idx": self.col_idx,
            "is_notes": self.is_notes,
        }


def _traverse_paragraphs(shape, slide_index: int, prefix: str = "") -> Generator[SlideParagraphItem, None, None]:
    """Recursively traverses a single shape (including group shapes and tables) for paragraphs."""
    shape_id = f"{prefix}{shape.shape_id}"
    shape_name = shape.name or f"Shape_{shape.shape_id}"
    
    # Check for Group Shape (MSO_SHAPE_TYPE.GROUP = 6)
    if shape.shape_type == MSO_SHAPE_TYPE.GROUP:
        for child_shape in shape.shapes:
            yield from _traverse_paragraphs(child_shape, slide_index, prefix=f"{shape_id}_")
        return
        
    # Check for Table
    if shape.has_table:
        table = shape.table
        for row_idx, row in enumerate(table.rows):
            for col_idx, cell in enumerate(row.cells):
                if cell.text_frame:
                    for p_idx, paragraph in enumerate(cell.text_frame.paragraphs):
                        combined_text = "".join(r.text for r in paragraph.runs) or paragraph.text
                        if combined_text.strip():
                            font_name = paragraph.runs[0].font.name if paragraph.runs and paragraph.runs[0].font else None
                            yield SlideParagraphItem(
                                slide_index=slide_index,
                                shape_id=f"{shape_id}_t_{row_idx}_{col_idx}",
                                shape_name=f"{shape_name} [R{row_idx+1}:C{col_idx+1}]",
                                shape_type="Table",
                                paragraph_index=p_idx,
                                text=combined_text,
                                font_name=font_name,
                                is_table=True,
                                row_idx=row_idx,
                                col_idx=col_idx,
                                raw_paragraph_ref=paragraph,
                                runs=paragraph.runs
                            )
        return

    # Check for Text Frame
    if shape.has_text_frame:
        for p_idx, paragraph in enumerate(shape.text_frame.paragraphs):
            combined_text = "".join(r.text for r in paragraph.runs) or paragraph.text
            if combined_text.strip():
                font_name = paragraph.runs[0].font.name if paragraph.runs and paragraph.runs[0].font else None
                yield SlideParagraphItem(
                    slide_index=slide_index,
                    shape_id=shape_id,
                    shape_name=shape_name,
                    shape_type="TextBox",
                    paragraph_index=p_idx,
                    text=combined_text,
                    font_name=font_name,
                    raw_paragraph_ref=paragraph,
                    runs=paragraph.runs
                )


def extract_presentation_runs(prs: Presentation) -> List[SlideParagraphItem]:
    """
    Extracts all text items across all slides in a presentation,
    consolidated at the paragraph level to prevent cross-run word splitting.
    """
    items: List[SlideParagraphItem] = []
    
    for slide_idx, slide in enumerate(prs.slides):
        # 1. Slide shapes
        for shape in slide.shapes:
            for item in _traverse_paragraphs(shape, slide_idx):
                if item.text.strip():
                    items.append(item)
                    
        # 2. Slide notes
        if slide.has_notes_slide and slide.notes_slide.notes_text_frame:
            for p_idx, paragraph in enumerate(slide.notes_slide.notes_text_frame.paragraphs):
                combined_text = "".join(r.text for r in paragraph.runs) or paragraph.text
                if combined_text.strip():
                    font_name = paragraph.runs[0].font.name if paragraph.runs and paragraph.runs[0].font else None
                    items.append(SlideParagraphItem(
                        slide_index=slide_idx,
                        shape_id=f"notes_{slide_idx}",
                        shape_name=f"Slide {slide_idx+1} Notes",
                        shape_type="Notes",
                        paragraph_index=p_idx,
                        text=combined_text,
                        font_name=font_name,
                        is_notes=True,
                        raw_paragraph_ref=paragraph,
                        runs=paragraph.runs
                    ))
                        
    return items


def apply_replacements_and_fonts(
    prs: Presentation,
    replacements: List[Dict],
    target_font: str = "Khmer OS Battambang"
) -> int:
    """
    Traverses the presentation and applies replacements at the paragraph level.
    Updates paragraph.runs[0] with the restored text, clears subsequent split runs,
    and sets the typeface comprehensively for PowerPoint DrawingML (cs, latin, ea).
    """
    # Group substring replacements per slide
    slide_substring_replacements: Dict[int, List[Tuple[str, str]]] = {}
    
    for r in replacements:
        s_idx = r.get("slide_index")
        orig = r.get("original", "").strip()
        repl = r.get("replacement", "").strip()
        
        if s_idx is not None and orig and repl and orig != repl:
            # Prevent single Khmer character replacements across entire slides
            if len(orig) < 2 and any(0x1780 <= ord(c) <= 0x17FF for c in orig):
                continue
            if s_idx not in slide_substring_replacements:
                slide_substring_replacements[s_idx] = []
            slide_substring_replacements[s_idx].append((orig, repl))
            
    # Sort substring replacements by length descending
    for s_idx in slide_substring_replacements:
        slide_substring_replacements[s_idx].sort(key=lambda x: len(x[0]), reverse=True)
        
    paragraphs_updated = 0
    
    for slide_idx, slide in enumerate(prs.slides):
        sub_rules = slide_substring_replacements.get(slide_idx, [])
        
        def _update_paragraph(paragraph):
            nonlocal paragraphs_updated
            orig_text = "".join(r.text for r in paragraph.runs) if paragraph.runs else paragraph.text
            if not orig_text.strip():
                return
                
            new_text = orig_text
            # 1. Apply user accepted replacements for this slide
            for orig, repl in sub_rules:
                if orig in new_text:
                    new_text = new_text.replace(orig, repl)
                    
            # 2. Apply comprehensive dictionary & heuristics restoration
            new_text, _ = restore_khmer_text(new_text)
            new_text = sanitize_khmer_coeng(new_text)
            
            # Apply changes
            if new_text != orig_text or any(ord(c) >= 0x1780 and ord(c) <= 0x17FF for c in new_text):
                # Clear spc from paragraph default run properties if present
                try:
                    pPr = paragraph._p.get_or_add_pPr()
                    defRPr = pPr.find(qn('a:defRPr'))
                    if defRPr is not None and 'spc' in defRPr.attrib:
                        del defRPr.attrib['spc']
                except Exception:
                    pass
                    
                if paragraph.runs:
                    paragraph.runs[0].text = new_text
                    set_run_font_comprehensive(paragraph.runs[0], target_font)
                    # Clear remaining split runs in this paragraph
                    for r in paragraph.runs[1:]:
                        r.text = ""
                        try:
                            if 'spc' in r._r.get_or_add_rPr().attrib:
                                del r._r.get_or_add_rPr().attrib['spc']
                        except Exception:
                            pass
                else:
                    paragraph.text = new_text
                    if paragraph.runs:
                        set_run_font_comprehensive(paragraph.runs[0], target_font)
                paragraphs_updated += 1
            elif target_font and any(ord(c) >= 0x1780 and ord(c) <= 0x17FF for c in orig_text):
                for r in paragraph.runs:
                    set_run_font_comprehensive(r, target_font)

        def _traverse_and_update(shape):
            if shape.shape_type == MSO_SHAPE_TYPE.GROUP:
                for child in shape.shapes:
                    _traverse_and_update(child)
                return
            if shape.has_table:
                for row in shape.table.rows:
                    for cell in row.cells:
                        if cell.text_frame:
                            cell.text_frame.word_wrap = True
                            for p in cell.text_frame.paragraphs:
                                _update_paragraph(p)
                return
            if shape.has_text_frame:
                shape.text_frame.word_wrap = True
                for p in shape.text_frame.paragraphs:
                    _update_paragraph(p)

        # Traverse slide shapes
        for shape in slide.shapes:
            _traverse_and_update(shape)
            
        # Traverse slide notes
        if slide.has_notes_slide and slide.notes_slide.notes_text_frame:
            for p in slide.notes_slide.notes_text_frame.paragraphs:
                _update_paragraph(p)
                
    return paragraphs_updated
