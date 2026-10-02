import { useState, useRef } from 'react';
import {
  Upload,
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
  onSubmit: (pptx: File | null, pdf: File | null) => void;
  isLoading: boolean;
  onLoadSample?: () => void;
}

export const UploadStep: React.FC<UploadStepProps> = ({
  language,
  fonts,
  options,
  onOptionsChange,
  onSubmit,
  isLoading,
}) => {
  const t = translations[language];

  const [pptxFile, setPptxFile] = useState<File | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [dragOverPptx, setDragOverPptx] = useState(false);

  const pptxInputRef = useRef<HTMLInputElement>(null);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pptxFile) return;
    onSubmit(pptxFile, null);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12">
      {/* Hero Welcome */}
      <div className="text-center space-y-3 pt-2">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          {t.app_title}: <span className="text-indigo-600">{t.app_subtitle}</span>
        </h1>
        <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-600 leading-relaxed font-khmer">
          {language === 'km'
            ? 'ផ្ទុកឡើងឯកសារ PowerPoint (.pptx) ដើម្បីពិនិត្យ និងកែអក្ខរាវិរុទ្ធអក្សរខ្មែរខូច ឬពុម្ពអក្សរចាស់ ឱ្យត្រឹមត្រូវ ១០០% ផ្អែកលើវចនានុក្រមភាសាខ្មែរ សម្ដេចសង្ឃរាជ ជួន ណាត។'
            : 'Upload your PowerPoint presentation (.pptx) to check and correct Khmer spelling and corrupted characters based on the official Chuon Nath dictionary.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Single PPTX Upload Zone */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-bold text-slate-800 flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block" />
              <span>{t.upload_pptx_title}</span>
              <span className="text-rose-500 font-bold">*</span>
            </label>
            <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md font-mono font-semibold">.pptx</span>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverPptx(true);
            }}
            onDragLeave={() => setDragOverPptx(false)}
            onDrop={handlePptxDrop}
            onClick={() => pptxInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-200 flex flex-col justify-center items-center ${
              dragOverPptx
                ? 'border-indigo-500 bg-indigo-50/70 scale-[1.01]'
                : pptxFile
                ? 'border-indigo-400 bg-indigo-50/30'
                : 'border-slate-300 bg-white hover:border-indigo-400 hover:bg-slate-50/80 shadow-xs'
            }`}
          >
            <input
              ref={pptxInputRef}
              type="file"
              accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setPptxFile(e.target.files[0]);
                }
              }}
            />

            {pptxFile ? (
              <div className="space-y-4 w-full max-w-md mx-auto">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-100">
                  <FileText className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-base font-bold text-slate-900 truncate">
                    {pptxFile.name}
                  </p>
                  <p className="text-xs text-indigo-700 font-semibold mt-1">
                    {formatFileSize(pptxFile.size)}
                  </p>
                </div>
                <div className="flex items-center justify-center space-x-3 pt-1">
                  <span className="inline-flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                    {language === 'km' ? 'រួចរាល់សម្រាប់ពិនិត្យអក្ខរាវិរុទ្ធ' : 'Ready to Check Spelling'}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPptxFile(null);
                      if (pptxInputRef.current) pptxInputRef.current.value = '';
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                    title="Remove file"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-slate-400 font-khmer pt-1">
                  {t.drag_drop_replace}
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-w-md mx-auto">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shadow-xs">
                  <Upload className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-base font-bold text-slate-800 font-khmer">
                    {t.drag_drop_hint}
                  </p>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1 font-khmer leading-relaxed">
                    {t.upload_pptx_desc}
                  </p>
                </div>
                <div>
                  <span className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 text-white shadow-md shadow-indigo-100 hover:bg-indigo-700 transition">
                    <FileText className="w-4 h-4" />
                    <span>Browse .pptx File</span>
                  </span>
                </div>
              </div>
            )}
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
                <option value="dictionary_heuristic">{t.mode_dict}</option>
                <option value="gemini_ai">{t.mode_gemini}</option>
              </select>
              <p className="text-xs text-slate-500">
                {options.mode === 'auto'
                  ? 'Combines Chuon Nath dictionary, consonant skeleton matching, and regex healing.'
                  : options.mode === 'gemini_ai'
                  ? 'Leverages Gemini 2.5 Flash for deep linguistic restoration.'
                  : 'Fast offline rule-based processing.'}
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
        <div className="flex justify-center sm:justify-end pt-2">
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
                <span className="font-khmer">{t.btn_convert_pdf}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
