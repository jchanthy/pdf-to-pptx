import React, { useState } from 'react';
import {
  FileText,
  Sparkles,
  Layers,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  Table as TableIcon,
  Columns,
  Download,
} from 'lucide-react';
import type { FontOption, Language, ProcessResponse, ReplacementItem } from '../types';
import { translations } from '../i18n/translations';
import { SlideComparison } from './SlideComparison';
import { ReviewTable } from './ReviewTable';

interface PreviewStepProps {
  data: ProcessResponse;
  language: Language;
  fonts: FontOption[];
  targetFont: string;
  onTargetFontChange: (font: string) => void;
  onProceedToDownload: (replacements: ReplacementItem[]) => void;
  onBackToUpload: () => void;
  isLoading: boolean;
}

export const PreviewStep: React.FC<PreviewStepProps> = ({
  data,
  language,
  fonts,
  targetFont,
  onTargetFontChange,
  onProceedToDownload,
  onBackToUpload,
  isLoading,
}) => {
  const t = translations[language];

  const [activeTab, setActiveTab] = useState<'comparison' | 'table'>('comparison');
  const [slides, setSlides] = useState(data.slides);
  const [replacements, setReplacements] = useState<ReplacementItem[]>(data.all_replacements);

  const handleUpdateSlideText = (slideIdx: number, newText: string) => {
    // 1. Update slide preview text
    const updatedSlides = slides.map((s, idx) => {
      if (idx === slideIdx) {
        return {
          ...s,
          preview_corrected_text: newText,
        };
      }
      return s;
    });
    setSlides(updatedSlides);

    // 2. Add custom replacement record if slide original differed
    const targetSlide = slides[slideIdx];
    if (targetSlide && targetSlide.original_text !== newText) {
      const customItem: ReplacementItem = {
        id: `slide-edit-${slideIdx}-${Date.now()}`,
        slide_index: slideIdx,
        shape_id: 'custom_shape',
        original: targetSlide.original_text,
        replacement: newText,
        confidence: 1.0,
        source: 'user_edit',
        status: 'accepted',
        explanation: `Direct slide edit by user on Slide ${slideIdx + 1}`,
      };
      setReplacements((prev: ReplacementItem[]) => [customItem, ...prev.filter((p: ReplacementItem) => p.slide_index !== slideIdx || p.source !== 'user_edit')]);
    }
  };

  const acceptedCount = replacements.filter(
    (r) => r.status === 'accepted' || r.status === 'modified'
  ).length;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Top Banner Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Slides Count */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 font-khmer">
              {t.stats_slides}
            </p>
            <p className="text-xl font-extrabold text-slate-900">
              {data.total_slides}
            </p>
          </div>
        </div>

        {/* Corrupted Detected */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 font-khmer">
              {t.stats_corrupted}
            </p>
            <p className="text-xl font-extrabold text-amber-600">
              {data.total_corrupted_found}
            </p>
          </div>
        </div>

        {/* PDF Reference Status */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center space-x-3.5">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              data.has_pdf_reference
                ? 'bg-teal-50 text-teal-600'
                : 'bg-slate-100 text-slate-400'
            }`}
          >
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 font-khmer">
              {t.stats_pdf}
            </p>
            <p className="text-sm font-bold text-slate-800">
              {data.has_pdf_reference ? 'Active (Aligned)' : 'None (Dictionary Mode)'}
            </p>
          </div>
        </div>

        {/* Target Font Selector */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col justify-center">
          <label className="text-xs font-semibold text-slate-400 font-khmer mb-1">
            {t.stats_font}
          </label>
          <select
            value={targetFont}
            onChange={(e) => onTargetFontChange(e.target.value)}
            className="text-xs font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
          >
            {fonts.map((f) => (
              <option key={f.name} value={f.name}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('comparison')}
            className={`inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-bold transition cursor-pointer ${
              activeTab === 'comparison'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Columns className="w-4 h-4" />
            <span className="font-khmer">{t.tab_comparison}</span>
          </button>

          <button
            onClick={() => setActiveTab('table')}
            className={`inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-bold transition cursor-pointer ${
              activeTab === 'table'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <TableIcon className="w-4 h-4" />
            <span className="font-khmer">{t.tab_table}</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                activeTab === 'table' ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {acceptedCount}
            </span>
          </button>
        </div>

        <button
          onClick={onBackToUpload}
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 inline-flex items-center space-x-1 cursor-pointer font-khmer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{t.btn_back_upload}</span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'comparison' ? (
        <SlideComparison
          slides={slides}
          language={language}
          targetFont={targetFont}
          onUpdateSlideText={handleUpdateSlideText}
        />
      ) : (
        <ReviewTable
          replacements={replacements}
          onReplacementsChange={setReplacements}
          language={language}
          targetFont={targetFont}
        />
      )}

      {/* Bottom Sticky Action Bar */}
      <div className="sticky bottom-4 z-20 bg-white/95 backdrop-blur-md rounded-2xl p-4 border border-slate-200 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-2 text-sm text-slate-600">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>
            <strong className="text-slate-900">{acceptedCount}</strong> replacements ready to apply to{' '}
            <strong className="text-slate-900">{data.total_slides}</strong> slides with font{' '}
            <span className="font-semibold text-indigo-600 underline">{targetFont}</span>.
          </span>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
          <button
            onClick={() => onProceedToDownload(replacements)}
            disabled={isLoading || acceptedCount === 0}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-100 transition active:scale-98 disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Applying Fixes & Formatting...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span className="font-khmer">{t.btn_proceed_download}</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
