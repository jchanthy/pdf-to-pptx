import { useState, useRef } from 'react';
import {
  Upload,
  FileCheck,
  FileText,
  Trash2,
  Settings,
  Sparkles,
  Layers,
  Key,
  ChevronDown,
  Info,
  CheckCircle2,
} from 'lucide-react';
import type { FontOption, Language, ProcessMode, ProcessOptions } from '../types';
import { translations } from '../i18n/translations';

interface UploadStepProps {
  language: Language;
  fonts: FontOption[];
  options: ProcessOptions;
  onOptionsChange: (newOptions: ProcessOptions) => void;
  onSubmit: (pptx: File, pdf: File | null) => void;
  isLoading: boolean;
  onLoadSample: () => void;
}

export const UploadStep: React.FC<UploadStepProps> = ({
  language,
  fonts,
  options,
  onOptionsChange,
  onSubmit,
  isLoading,
  onLoadSample,
}) => {
  const t = translations[language];

  const [pptxFile, setPptxFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [dragOverPptx, setDragOverPptx] = useState(false);
  const [dragOverPdf, setDragOverPdf] = useState(false);

  const pptxInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const handlePptxDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverPptx(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.toLowerCase().endsWith('.pptx')) {
        setPptxFile(file);
      }
    }
  };

  const handlePdfDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverPdf(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.toLowerCase().endsWith('.pdf')) {
        setPdfFile(file);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pptxFile) return;
    onSubmit(pptxFile, pdfFile);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Hero Welcome */}
      <div className="text-center space-y-3 pt-2">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          <span>Limon & ABC Font Unicode Restorer</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          {t.app_title}: <span className="text-indigo-600">{t.app_subtitle}</span>
        </h1>
        <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-600 leading-relaxed font-khmer">
          {t.tagline}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dual Upload Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Target PPTX Upload */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-bold text-slate-800 flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block" />
                <span>{t.target_pptx_title}</span>
                <span className="text-rose-500 font-bold">*</span>
              </label>
              <span className="text-xs text-slate-400 font-mono">.pptx</span>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverPptx(true);
              }}
              onDragLeave={() => setDragOverPptx(false)}
              onDrop={handlePptxDrop}
              onClick={() => pptxInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 flex-1 flex flex-col justify-center items-center ${
                dragOverPptx
                  ? 'border-indigo-500 bg-indigo-50/70 scale-[1.01]'
                  : pptxFile
                  ? 'border-indigo-300 bg-indigo-50/30'
                  : 'border-slate-300 bg-white hover:border-indigo-400 hover:bg-slate-50/80 shadow-xs'
              }`}
            >
              <input
                ref={pptxInputRef}
                type="file"
                accept=".pptx"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setPptxFile(e.target.files[0]);
                  }
                }}
              />

              {pptxFile ? (
                <div className="space-y-3 w-full">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-100">
                    <FileCheck className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 truncate max-w-[280px] mx-auto">
                      {pptxFile.name}
                    </p>
                    <p className="text-xs text-indigo-700 font-semibold mt-0.5">
                      {formatFileSize(pptxFile.size)}
                    </p>
                  </div>
                  <div className="flex items-center justify-center space-x-2 pt-1">
                    <span className="inline-flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Ready
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPptxFile(null);
                        if (pptxInputRef.current) pptxInputRef.current.value = '';
                      }}
                      className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      title="Remove file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 font-khmer">
                    {t.drag_drop_replace}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                    <Upload className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700 font-khmer">
                      {t.drag_drop_hint}
                    </p>
                    <p className="text-xs text-slate-400 mt-1 font-khmer">
                      {t.target_pptx_desc}
                    </p>
                  </div>
                  <span className="inline-block px-3 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Browse .pptx
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Reference PDF Upload (Optional) */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-bold text-slate-800 flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-violet-500 inline-block" />
                <span>{t.reference_pdf_title}</span>
                <span className="text-xs text-slate-400 font-normal">({language === 'km' ? 'ជម្រើសបន្ថែម' : 'Optional'})</span>
              </label>
              <span className="text-xs text-slate-400 font-mono">.pdf</span>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverPdf(true);
              }}
              onDragLeave={() => setDragOverPdf(false)}
              onDrop={handlePdfDrop}
              onClick={() => pdfInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 flex-1 flex flex-col justify-center items-center ${
                dragOverPdf
                  ? 'border-violet-500 bg-violet-50/70 scale-[1.01]'
                  : pdfFile
                  ? 'border-violet-300 bg-violet-50/30'
                  : 'border-slate-300 bg-white hover:border-violet-400 hover:bg-slate-50/80 shadow-xs'
              }`}
            >
              <input
                ref={pdfInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setPdfFile(e.target.files[0]);
                  }
                }}
              />

              {pdfFile ? (
                <div className="space-y-3 w-full">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-violet-600 text-white flex items-center justify-center shadow-lg shadow-violet-100">
                    <FileText className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 truncate max-w-[280px] mx-auto">
                      {pdfFile.name}
                    </p>
                    <p className="text-xs text-violet-700 font-semibold mt-0.5">
                      {formatFileSize(pdfFile.size)}
                    </p>
                  </div>
                  <div className="flex items-center justify-center space-x-2 pt-1">
                    <span className="inline-flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Reference Ready
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPdfFile(null);
                        if (pdfInputRef.current) pdfInputRef.current.value = '';
                      }}
                      className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      title="Remove file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 font-khmer">
                    {t.drag_drop_replace}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center border border-violet-100">
                    <FileText className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700 font-khmer">
                      {t.drag_drop_hint}
                    </p>
                    <p className="text-xs text-slate-400 mt-1 font-khmer">
                      {t.reference_pdf_desc}
                    </p>
                  </div>
                  <span className="inline-block px-3 py-1 rounded-lg text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200">
                    Browse .pdf
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Configuration Panel */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center space-x-2.5">
              <Settings className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base font-bold text-slate-900 font-khmer">
                {t.options_title}
              </h3>
            </div>

            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 inline-flex items-center space-x-1 cursor-pointer"
            >
              <span>{showAdvanced ? 'Hide Advanced' : 'Show Advanced / AI'}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Target Font Selector */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-800 flex items-center space-x-2 font-khmer">
                <Layers className="w-4 h-4 text-indigo-500" />
                <span>{t.output_font_label}</span>
              </label>
              <select
                value={options.target_font}
                onChange={(e) => onOptionsChange({ ...options, target_font: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50/50 text-slate-800 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-hidden transition"
              >
                {fonts.map((f) => (
                  <option key={f.name} value={f.name}>
                    {f.name} ({f.category})
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 font-khmer">
                {t.output_font_desc}
              </p>
            </div>

            {/* Mode Selector */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-800 flex items-center space-x-2 font-khmer">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                <span>{t.mode_label}</span>
              </label>
              <select
                value={options.mode}
                onChange={(e) => onOptionsChange({ ...options, mode: e.target.value as ProcessMode })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50/50 text-slate-800 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-hidden transition"
              >
                <option value="auto">{t.mode_auto}</option>
                <option value="pdf_alignment">{t.mode_pdf}</option>
                <option value="dictionary_heuristic">{t.mode_dict}</option>
                <option value="gemini_ai">{t.mode_gemini}</option>
              </select>
              <p className="text-xs text-slate-500">
                {options.mode === 'auto'
                  ? 'Combines heuristic rules, Limon transliteration, and PDF alignment.'
                  : options.mode === 'gemini_ai'
                  ? 'Leverages Gemini 2.5 Flash for deep linguistic restoration.'
                  : 'Fast rule-based processing.'}
              </p>
            </div>
          </div>

          {/* Advanced / Gemini Section */}
          {showAdvanced && (
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-800 flex items-center space-x-2 font-khmer">
                  <Key className="w-4 h-4 text-amber-500" />
                  <span>{t.gemini_key_title}</span>
                </label>
                <input
                  type="password"
                  value={options.gemini_api_key || ''}
                  onChange={(e) => onOptionsChange({ ...options, gemini_api_key: e.target.value })}
                  placeholder={t.gemini_key_placeholder}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition font-mono"
                />
                <p className="text-xs text-slate-500 flex items-center space-x-1 font-khmer">
                  <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{t.gemini_key_desc}</span>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          {/* 1-Click Demo Button */}
          <button
            type="button"
            onClick={onLoadSample}
            disabled={isLoading}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-3 rounded-xl text-sm font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300/80 transition cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 text-amber-600 animate-bounce" />
            <span className="font-khmer">{t.btn_load_sample}</span>
          </button>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!pptxFile || isLoading}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-8 py-3.5 rounded-xl text-base font-bold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-lg shadow-indigo-200 transition active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="font-khmer">{t.btn_processing}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span className="font-khmer">{t.btn_start_processing}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
