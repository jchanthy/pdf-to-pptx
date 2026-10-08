import React, { useMemo, useState } from 'react';
import {
  FileText,
  Layers,
  ArrowRight,
  RotateCcw,
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
  const [tableFilterSlide, setTableFilterSlide] = useState<number | null>(null);

  // Derive slide-level replacements reactively from replacements state
  const enrichedSlides = useMemo(() => {
    const map = new Map<number, ReplacementItem[]>();
    replacements.forEach((r) => {
      const list = map.get(r.slide_index) || [];
      list.push(r);
      map.set(r.slide_index, list);
    });

    return slides.map((s) => ({
      ...s,
      replacements: map.get(s.slide_index) || [],
    }));
  }, [slides, replacements]);

  const handleToggleReplacement = (id: string, newStatus: 'accepted' | 'rejected') => {
    const updated = replacements.map((item) => {
      if (item.id === id) {
        return { ...item, status: newStatus };
      }
      return item;
    });
    setReplacements(updated);
  };

  const handleBulkSlideStatus = (slideIdx: number, newStatus: 'accepted' | 'rejected') => {
    const updated = replacements.map((item) => {
      if (item.slide_index === slideIdx) {
        return { ...item, status: newStatus };
      }
      return item;
    });
    setReplacements(updated);
  };

  const handleEditReplacement = (id: string, newReplacement: string) => {
    const updated = replacements.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          replacement: newReplacement,
          status: 'modified' as const,
          source: 'user_edit' as const,
        };
      }
      return item;
    });
    setReplacements(updated);
  };

  const handleSwitchToTable = (slideIndex?: number) => {
    if (slideIndex !== undefined) {
      setTableFilterSlide(slideIndex);
    }
    setActiveTab('table');
  };

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
    <div className="w-full h-full flex flex-col min-h-0 space-y-2">
      {/* Sleek Office App Header Bar */}
      <div className="shrink-0 bg-white rounded-2xl border border-slate-200 shadow-xs px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2">
        {/* Left: Document Identity & Quick Stat Badges */}
        <div className="flex items-center space-x-2.5">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-white shadow-xs shrink-0 ${
              data.document_type === 'docx'
                ? 'bg-blue-600'
                : 'bg-orange-500'
            }`}
          >
            {data.document_type === 'docx' ? (
              <FileText className="w-3.5 h-3.5" />
            ) : (
              <Layers className="w-3.5 h-3.5" />
            )}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xs sm:text-sm font-extrabold text-slate-900 truncate max-w-[180px] sm:max-w-xs font-khmer">
                {data.filename || (data.document_type === 'docx' ? 'Document.docx' : 'Presentation.pptx')}
              </h2>
              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                data.document_type === 'docx'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'bg-orange-50 text-orange-700 border border-orange-200'
              }`}>
                {data.document_type === 'docx' ? 'Word' : 'PPTX'}
              </span>
            </div>
            <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-khmer">
              <span>
                {data.total_slides} {data.document_type === 'docx' ? (language === 'km' ? 'ទំព័រ' : 'pages') : (language === 'km' ? 'ស្លាយ' : 'slides')}
              </span>
              <span>•</span>
              <span className="text-amber-600 font-bold">
                {data.total_corrupted_found} {language === 'km' ? 'កំហុស' : 'issues'}
              </span>
            </div>
          </div>
        </div>

        {/* Center / Right: Target Font Selector & View Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Target Font Quick Picker */}
          <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 text-xs">
            <span className="text-slate-400 font-medium font-khmer text-[11px]">{t.stats_font}:</span>
            <select
              value={targetFont}
              onChange={(e) => onTargetFontChange(e.target.value)}
              className="font-bold text-slate-800 bg-transparent focus:outline-hidden cursor-pointer text-xs"
            >
              {fonts.map((f) => (
                <option key={f.name} value={f.name}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          {/* View Tab Buttons */}
          <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setActiveTab('comparison')}
              className={`inline-flex items-center space-x-1 px-2 py-1 rounded-md font-bold transition cursor-pointer font-khmer text-xs ${
                activeTab === 'comparison'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>{t.tab_comparison}</span>
            </button>
            <button
              onClick={() => setActiveTab('table')}
              className={`inline-flex items-center space-x-1 px-2 py-1 rounded-md font-bold transition cursor-pointer font-khmer text-xs ${
                activeTab === 'table'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>{t.tab_table}</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700 font-bold">
                {acceptedCount}
              </span>
            </button>
          </div>

          {/* Proceed to Download in Top Bar */}
          <button
            onClick={() => onProceedToDownload(replacements)}
            disabled={isLoading || acceptedCount === 0}
            className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition active:scale-98 disabled:opacity-50 cursor-pointer font-khmer ml-1"
          >
            {isLoading ? (
              <span>{language === 'km' ? 'កំពុង...' : '...'}</span>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>{t.btn_proceed_download}</span>
                <ArrowRight className="w-3 h-3 ml-0.5" />
              </>
            )}
          </button>

          {/* Back to Upload */}
          <button
            onClick={onBackToUpload}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg border border-transparent hover:border-slate-200 transition cursor-pointer"
            title={t.btn_back_upload}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Content Workspace */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {activeTab === 'comparison' ? (
          <SlideComparison
            slides={enrichedSlides}
            language={language}
            targetFont={targetFont}
            documentType={data.document_type || 'pptx'}
            filename={data.filename}
            onUpdateSlideText={handleUpdateSlideText}
            onToggleReplacementStatus={handleToggleReplacement}
            onBulkSlideStatus={handleBulkSlideStatus}
            onEditReplacement={handleEditReplacement}
            onSwitchToTable={handleSwitchToTable}
          />
        ) : (
          <ReviewTable
            replacements={replacements}
            onReplacementsChange={setReplacements}
            language={language}
            targetFont={targetFont}
            initialSlideFilter={tableFilterSlide}
          />
        )}
      </div>
    </div>
  );
};
