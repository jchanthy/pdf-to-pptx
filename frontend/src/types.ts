export type ProcessMode = 'auto' | 'pdf_alignment' | 'dictionary_heuristic' | 'gemini_ai';

export type Language = 'km' | 'en';

export interface ReplacementItem {
  id: string;
  slide_index: number;
  shape_id: string;
  paragraph_index?: number;
  run_index?: number;
  original: string;
  replacement: string;
  confidence: number;
  source: 'dictionary' | 'heuristic' | 'limon_translit' | 'pdf_alignment' | 'gemini_ai' | 'user_edit';
  status: 'accepted' | 'rejected' | 'modified';
  explanation?: string;
  context?: string;
}

export interface SlideDiff {
  slide_index: number;
  slide_number: number;
  title: string;
  original_text: string;
  preview_corrected_text: string;
  replacements: ReplacementItem[];
  shape_count: number;
  table_count: number;
}

export interface ProcessResponse {
  session_id: string;
  total_slides: number;
  total_corrupted_found: number;
  slides: SlideDiff[];
  all_replacements: ReplacementItem[];
  target_font: string;
  has_pdf_reference: boolean;
  mode: string;
}

export interface FontOption {
  name: string;
  category: string;
  default: boolean;
}

export interface ProcessOptions {
  target_font: string;
  mode: ProcessMode;
  gemini_api_key?: string;
}
