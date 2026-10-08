import type { FontOption, ProcessOptions, ProcessResponse, ReplacementItem } from '../types';

const API_BASE = '/api';

export async function getFonts(): Promise<FontOption[]> {
  try {
    const res = await fetch(`${API_BASE}/fonts`);
    if (!res.ok) throw new Error('Failed to fetch fonts');
    return await res.json();
  } catch (err) {
    console.error('Error fetching fonts:', err);
    return [
      { name: 'Khmer OS Battambang', category: 'Administrative / Clean Sans', default: true },
      { name: 'Kantumruy Pro', category: 'Modern Sans (Google Font)', default: false },
      { name: 'Khmer OS Siemreap', category: 'Readable Body Font', default: false },
      { name: 'Hanuman', category: 'Traditional Serif (Google Font)', default: false },
      { name: 'Khmer OS Muol Light', category: 'Headline / Formal Header', default: false },
      { name: 'Koh Santepheap', category: 'Contemporary Display', default: false },
    ];
  }
}

export async function uploadAndProcess(
  docFile: File | null,
  pdfFile: File | null,
  options: ProcessOptions
): Promise<ProcessResponse> {
  const formData = new FormData();
  if (docFile) {
    formData.append('file', docFile);
    formData.append('pptx_file', docFile);
  }
  if (pdfFile) {
    formData.append('pdf_file', pdfFile);
  }
  formData.append('target_font', options.target_font);
  formData.append('mode', options.mode);
  if (options.gemini_api_key) {
    formData.append('gemini_api_key', options.gemini_api_key);
  }

  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Upload failed with status: ${res.status}`);
  }

  return await res.json();
}

export async function loadSamplePresentation(): Promise<ProcessResponse> {
  const res = await fetch(`${API_BASE}/sample`);
  if (!res.ok) {
    throw new Error('Failed to load sample presentation');
  }
  return await res.json();
}

export async function applyFixesAndDownload(
  sessionId: string,
  targetFont: string,
  replacements: ReplacementItem[]
): Promise<Blob> {
  const res = await fetch(`${API_BASE}/apply-and-download`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      session_id: sessionId,
      target_font: targetFont,
      replacements: replacements,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to download corrected presentation');
  }

  return await res.blob();
}

export async function cleanupSession(sessionId: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/cleanup/${sessionId}`, { method: 'DELETE' });
  } catch (e) {
    console.warn('Session cleanup failed:', e);
  }
}
