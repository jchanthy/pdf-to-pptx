"""
Pydantic data models for Khmer DocFixer API.
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class ReplacementItem(BaseModel):
    id: str = Field(..., description="Unique replacement identifier")
    slide_index: int = Field(..., description="0-indexed slide number")
    shape_id: str = Field(default="", description="Shape ID within presentation")
    paragraph_index: Optional[int] = Field(default=None)
    run_index: Optional[int] = Field(default=None)
    original: str = Field(..., description="Original corrupted or legacy text")
    replacement: str = Field(..., description="Proposed clean Khmer Unicode text")
    confidence: float = Field(default=0.9, description="Confidence score between 0.0 and 1.0")
    source: str = Field(default="dictionary", description="Source: dictionary, heuristic, limon_translit, pdf_alignment, gemini_ai, user_edit")
    status: str = Field(default="accepted", description="Status: accepted, rejected, modified")
    explanation: Optional[str] = Field(default=None, description="Explanation or rule name")
    context: Optional[str] = Field(default=None, description="Surrounding sentence/context")


class SlideDiff(BaseModel):
    slide_index: int
    slide_number: int
    title: str
    original_text: str
    preview_corrected_text: str
    replacements: List[ReplacementItem] = []
    shape_count: int = 0
    table_count: int = 0


class ProcessResponse(BaseModel):
    session_id: str
    total_slides: int
    total_corrupted_found: int
    slides: List[SlideDiff]
    all_replacements: List[ReplacementItem]
    target_font: str
    has_pdf_reference: bool
    mode: str
    document_type: str = "pptx"  # "pptx" or "docx"
    filename: Optional[str] = None


class ApplyFixesRequest(BaseModel):
    session_id: str
    target_font: str = "Khmer OS Battambang"
    replacements: List[ReplacementItem]


class FontOption(BaseModel):
    name: str
    category: str
    default: bool = False
