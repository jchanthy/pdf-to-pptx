import { useState, type ReactNode } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Layers,
  Table,
} from 'lucide-react';
import type { Language, SlideDiff } from '../types';
import { translations } from '../i18n/translations';

interface SlideComparisonProps {
  slides: SlideDiff[];
  language: Language;
  targetFont: string;
}

export const SlideComparison: React.FC<SlideComparisonProps> = ({
  slides,
  language,
  targetFont,
}) => {
  const t = translations[language];
  const [currentSlideIdx, setCurrentSlideIdx] = useState(0);

  if (!slides || slides.length === 0) {
    return (
      <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
        No slides found.
      </div>
    );
  }

  const slide = slides[currentSlideIdx];

  const renderHighlightedText = (text: string, isOriginal: boolean) => {
    if (!text) return <span className="text-slate-400 italic">Empty text</span>;

    // Highlight replaced segments
    let elements: ReactNode[] = [text];

    slide.replacements.forEach((rep, rIdx) => {
      const term = isOriginal ? rep.original : rep.replacement;
      if (!term) return;

      const newElements: ReactNode[] = [];
      elements.forEach((el) => {
        if (typeof el === 'string') {
          const parts = el.split(term);
          parts.forEach((part, pIdx) => {
            if (pIdx > 0) {
              newElements.push(
                <mark
                  key={`${rIdx}-${pIdx}`}
                  className={`px-1.5 py-0.5 rounded text-xs font-semibold mx-0.5 transition ${
                    isOriginal
                      ? 'bg-rose-100 text-rose-800 line-through decoration-rose-500/70'
                      : 'bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold'
                  }`}
                  title={isOriginal ? `Corrupted: ${rep.explanation || ''}` : `Fixed Unicode`}
                >
                  {term}
                </mark>
              );
            }
            if (part) newElements.push(part);
          });
        } else {
          newElements.push(el);
        }
      });
      elements = newElements;
    });

    return elements;
  };

  return (
    <div className="space-y-6">
      {/* Slide Carousel Navigator */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setCurrentSlideIdx((prev: number) => Math.max(0, prev - 1))}
              disabled={currentSlideIdx === 0}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition"
              title={t.slide_prev}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrentSlideIdx((prev: number) => Math.min(slides.length - 1, prev + 1))}
              disabled={currentSlideIdx === slides.length - 1}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition"
              title={t.slide_next}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm font-bold text-slate-900 font-khmer">
              {t.slide_nav_title} {currentSlideIdx + 1} / {slides.length}:
            </span>
            <span className="text-sm font-medium text-slate-600 truncate max-w-[200px] sm:max-w-xs">
              {slide.title || `Slide ${currentSlideIdx + 1}`}
            </span>
          </div>
        </div>

        {/* Slide Selector Badges */}
        <div className="flex items-center space-x-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0">
          {slides.map((s, idx) => {
            const hasCorrupted = s.replacements.length > 0;
            const isSelected = idx === currentSlideIdx;
            return (
              <button
                key={idx}
                onClick={() => setCurrentSlideIdx(idx)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center space-x-1 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : hasCorrupted
                    ? 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{idx + 1}</span>
                {hasCorrupted && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isSelected ? 'bg-amber-300' : 'bg-amber-500'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Metadata Badges */}
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500">
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-slate-100">
            <Layers className="w-3.5 h-3.5" />
            <span>{slide.shape_count} {t.slide_shapes}</span>
          </span>
          {slide.table_count > 0 && (
            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-slate-100">
              <Table className="w-3.5 h-3.5" />
              <span>{slide.table_count} {t.slide_tables}</span>
            </span>
          )}
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700">
            <span>{slide.replacements.length} {t.stats_corrupted}</span>
          </span>
        </div>
      </div>

      {/* Side-by-Side Slide Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Original Slide */}
        <div className="bg-white rounded-2xl border-2 border-rose-100 shadow-xs flex flex-col overflow-hidden">
          <div className="bg-rose-50/80 px-5 py-3.5 border-b border-rose-100 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <h4 className="text-sm font-bold text-rose-950 font-khmer">
                {t.slide_original}
              </h4>
            </div>
            <span className="text-xs font-semibold text-rose-600 bg-rose-100/60 px-2 py-0.5 rounded-md">
              Legacy / Corrupted
            </span>
          </div>

          <div className="p-6 flex-1 min-h-[300px] flex flex-col justify-start bg-slate-50/30">
            <div className="prose prose-sm max-w-none text-slate-800 whitespace-pre-line leading-relaxed font-sans">
              {renderHighlightedText(slide.original_text, true)}
            </div>
          </div>
        </div>

        {/* Right: Restored Unicode Slide */}
        <div className="bg-white rounded-2xl border-2 border-emerald-100 shadow-xs flex flex-col overflow-hidden">
          <div className="bg-emerald-50/80 px-5 py-3.5 border-b border-emerald-100 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <h4 className="text-sm font-bold text-emerald-950 font-khmer">
                {t.slide_corrected}
              </h4>
            </div>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-md">
              {targetFont}
            </span>
          </div>

          <div
            className="p-6 flex-1 min-h-[300px] flex flex-col justify-start bg-slate-50/30"
            style={{ fontFamily: `'${targetFont}', 'Kantumruy Pro', sans-serif` }}
          >
            <div className="prose prose-sm max-w-none text-slate-900 whitespace-pre-line leading-relaxed">
              {renderHighlightedText(slide.preview_corrected_text, false)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
