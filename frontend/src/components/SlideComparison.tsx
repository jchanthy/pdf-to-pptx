import React, { useEffect, useState, type ReactNode } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Edit3,
  Check,
  AlertTriangle,
  ArrowRight,
  CheckCheck,
  CheckCircle,
  Copy,
  RotateCcw,
  Wand2,
  Columns,
} from 'lucide-react';
import type { Language, SlideDiff } from '../types';
import { translations } from '../i18n/translations';

interface SlideComparisonProps {
  slides: SlideDiff[];
  language: Language;
  targetFont: string;
  documentType?: 'pptx' | 'docx' | 'pdf';
  filename?: string;
  onUpdateSlideText?: (slideIdx: number, newText: string) => void;
  onToggleReplacementStatus?: (id: string, newStatus: 'accepted' | 'rejected') => void;
  onBulkSlideStatus?: (slideIdx: number, newStatus: 'accepted' | 'rejected') => void;
  onEditReplacement?: (id: string, newReplacement: string) => void;
  onSwitchToTable?: (slideIndex?: number) => void;
}

export const SlideComparison: React.FC<SlideComparisonProps> = ({
  slides,
  language,
  targetFont,
  documentType = 'pptx',
  filename,
  onUpdateSlideText,
  onBulkSlideStatus,
}) => {
  const t = translations[language];
  const [currentSlideIdx, setCurrentSlideIdx] = useState(0);

  // PowerPoint Canvas Mode:
  // 'corrected' = live editable presentation slide
  // 'original' = show original legacy slide
  // 'split' = side-by-side comparison inside the slide canvas
  const [canvasView, setCanvasView] = useState<'corrected' | 'original' | 'split'>('corrected');

  // Direct editing vs visual highlight pills (defaults to false so highlights show immediately)
  const [isLiveTyping, setIsLiveTyping] = useState(false);
  const [liveSlideText, setLiveSlideText] = useState('');
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const slide = slides[currentSlideIdx] || slides[0];

  // Slides with issues
  const slidesWithIssues = slides
    .map((s, idx) => ({ idx, count: s.replacements.length }))
    .filter((s) => s.count > 0);

  const prevIssueSlideIdx = (() => {
    const prevIssues = slidesWithIssues
      .filter((s) => s.idx < currentSlideIdx)
      .map((s) => s.idx);
    return prevIssues.length > 0 ? prevIssues[prevIssues.length - 1] : null;
  })();

  const nextIssueSlideIdx = (() => {
    const nextIssues = slidesWithIssues
      .filter((s) => s.idx > currentSlideIdx)
      .map((s) => s.idx);
    return nextIssues.length > 0 ? nextIssues[0] : null;
  })();

  // Synchronize liveSlideText when slide index changes
  useEffect(() => {
    if (slide) {
      setLiveSlideText(slide.preview_corrected_text || '');
    }
    setActiveCardId(null);
  }, [currentSlideIdx, slide]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setCurrentSlideIdx((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        setCurrentSlideIdx((prev) => Math.min(slides.length - 1, prev + 1));
      } else if ((e.key === 'j' || e.key === 'J') && e.altKey) {
        if (nextIssueSlideIdx !== null) {
          e.preventDefault();
          setCurrentSlideIdx(nextIssueSlideIdx);
        }
      } else if ((e.key === 'k' || e.key === 'K') && e.altKey) {
        if (prevIssueSlideIdx !== null) {
          e.preventDefault();
          setCurrentSlideIdx(prevIssueSlideIdx);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [slides.length, nextIssueSlideIdx, prevIssueSlideIdx]);

  // Handle direct typing on the slide canvas
  const handleLiveTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setLiveSlideText(val);
    if (onUpdateSlideText) {
      onUpdateSlideText(currentSlideIdx, val);
    }
  };

  // Helper: Reset to original
  const handleResetToOriginal = () => {
    if (slide && onUpdateSlideText) {
      const orig = slide.original_text;
      setLiveSlideText(orig);
      onUpdateSlideText(currentSlideIdx, orig);
    }
  };

  // Helper: Clean dotted circles
  const handleCleanDottedCircles = () => {
    if (!liveSlideText) return;
    let cleaned = liveSlideText.replace(/\u25cc/g, '');
    cleaned = cleaned.replace(/([\u1780-\u17A2])\u17C1\u17C0/g, '$1\u17C0');
    setLiveSlideText(cleaned);
    if (onUpdateSlideText) {
      onUpdateSlideText(currentSlideIdx, cleaned);
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleAcceptAllOnSlide = () => {
    if (onBulkSlideStatus) {
      onBulkSlideStatus(currentSlideIdx, 'accepted');
    }
  };

  const handleHighlightClick = (repId: string) => {
    setActiveCardId((prev) => (prev === repId ? null : repId));
  };

  if (!slides || slides.length === 0) {
    return (
      <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
        No slides found.
      </div>
    );
  }

  const slideReplacements = slide.replacements || [];

  const wordCount = liveSlideText.trim()
    ? liveSlideText.trim().split(/\s+/).length
    : 0;
  const charCount = liveSlideText.length;

  const renderHighlightedText = (text: string, isOriginal: boolean) => {
    if (!text) return <span className="text-slate-400 italic">Empty text</span>;

    // Only highlight actual coherent words/phrases, not entire multi-line paragraphs or broken glyphs!
    const sortedReps = [...slideReplacements]
      .filter((rep) => {
        const orig = rep.original?.trim() || '';
        const repl = rep.replacement?.trim() || '';
        const term = isOriginal ? orig : repl;
        if (!term || term.length < 2) return false;
        // Skip entire paragraphs or lines > 70 characters
        if (term.length > 70 || term.includes('\n')) return false;
        // Skip if either original or replacement consists entirely of dependent vowels/diacritics
        if (/^[\u17B6-\u17D3]+$/.test(orig) || /^[\u17B6-\u17D3]+$/.test(repl)) return false;
        // Skip if either starts with a Coeng (\u17D2) or dependent vowel without base consonant
        if (/^[\u17D2\u17B6-\u17C5]/.test(term)) return false;
        return true;
      })
      .sort((a, b) => {
        const termA = (isOriginal ? a.original : a.replacement) || '';
        const termB = (isOriginal ? b.original : b.replacement) || '';
        return termB.length - termA.length;
      });

    let elements: ReactNode[] = [text];

    sortedReps.forEach((rep, rIdx) => {
      const term = isOriginal ? rep.original : rep.replacement;
      if (!term) return;

      const newElements: ReactNode[] = [];
      elements.forEach((el, elIdx) => {
        if (typeof el === 'string') {
          const parts = el.split(term);
          parts.forEach((part, pIdx) => {
            if (pIdx > 0) {
              const isAccepted = rep.status === 'accepted' || rep.status === 'modified';
              const isActive = activeCardId === rep.id;
              newElements.push(
                <span
                  key={`mark-wrap-${rIdx}-${elIdx}-${pIdx}`}
                  className="relative inline-block"
                >
                  <mark
                    onClick={(e) => {
                      e.stopPropagation();
                      handleHighlightClick(rep.id);
                    }}
                    className={`px-1.5 py-0.5 rounded-md font-medium mx-0.5 inline cursor-pointer transition select-none ${
                      isActive
                        ? 'ring-2 ring-indigo-500 bg-indigo-100 text-indigo-950 font-bold'
                        : isOriginal
                        ? 'bg-rose-100 text-rose-800 line-through decoration-rose-400 hover:bg-rose-200'
                        : isAccepted
                        ? 'bg-emerald-100 text-emerald-900 font-semibold hover:bg-emerald-200'
                        : 'bg-amber-100/90 text-amber-900 border-b-2 border-amber-400 hover:bg-amber-200'
                    }`}
                  >
                    {term}
                  </mark>

                  {/* Clean Non-Intrusive Floating Correction Tooltip */}
                  {isActive && (
                    <span
                      onClick={(e) => e.stopPropagation()}
                      className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-1.5 bg-slate-900/95 text-white text-xs rounded-xl shadow-2xl p-2.5 flex items-center space-x-2 whitespace-nowrap font-sans backdrop-blur-xs border border-slate-700 animate-in fade-in zoom-in-95 duration-100"
                    >
                      <span className="font-mono text-[11px] bg-rose-950/80 text-rose-300 px-1.5 py-0.5 rounded border border-rose-800/60 line-through">
                        {rep.original}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-bold text-[12px] bg-emerald-950/80 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800/60 font-khmer">
                        {rep.replacement}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (onUpdateSlideText) {
                            const newText = liveSlideText.replace(rep.original, rep.replacement);
                            setLiveSlideText(newText);
                            onUpdateSlideText(currentSlideIdx, newText);
                          }
                          setActiveCardId(null);
                        }}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[11px] cursor-pointer shadow-xs transition"
                        title="Accept & Apply fix"
                      >
                        ✓ {t.change_word}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (onUpdateSlideText) {
                            const newText = liveSlideText.replace(rep.replacement, rep.original);
                            setLiveSlideText(newText);
                            onUpdateSlideText(currentSlideIdx, newText);
                          }
                          setActiveCardId(null);
                        }}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold text-[11px] cursor-pointer transition border border-slate-700"
                        title="Keep original word"
                      >
                        ✕ {t.ignore_word}
                      </button>
                    </span>
                  )}
                </span>
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
    <div className="w-full h-full flex flex-col min-h-0 space-y-2">
      {/* 1. TOP POWERPOINT / WORD OFFICE RIBBON */}
      <div className="shrink-0 bg-white rounded-2xl p-2 sm:p-2.5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-2">
        {/* Navigation: Prev / Page-Slide Counter / Next / Jump Issue */}
        <div className="flex items-center space-x-2">
          <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 p-0.5 shadow-2xs">
            <button
              onClick={() => setCurrentSlideIdx((prev) => Math.max(0, prev - 1))}
              disabled={currentSlideIdx === 0}
              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-700 hover:bg-white hover:text-indigo-600 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer font-khmer"
              title={`${t.slide_prev} (Left Arrow ←)`}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.slide_prev}</span>
            </button>

            <span className="px-2.5 text-xs font-extrabold text-slate-900 font-khmer">
              {documentType === 'docx' ? (language === 'km' ? 'ទំព័រ' : 'Page') : t.slide_nav_title} {currentSlideIdx + 1} / {slides.length}
            </span>

            <button
              onClick={() => setCurrentSlideIdx((prev) => Math.min(slides.length - 1, prev + 1))}
              disabled={currentSlideIdx === slides.length - 1}
              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-2xs disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer font-khmer"
              title={`${t.slide_next} (Right Arrow →)`}
            >
              <span className="hidden sm:inline">{t.slide_next}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Jump to Next Issue */}
          {nextIssueSlideIdx !== null ? (
            <button
              onClick={() => setCurrentSlideIdx(nextIssueSlideIdx)}
              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl border border-amber-400 bg-amber-500 hover:bg-amber-600 text-white text-xs font-extrabold shadow-2xs transition cursor-pointer font-khmer"
              title="Jump directly to next slide or page with issues"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{t.jump_next_issue}</span>
              <span className="text-[10px] bg-white text-amber-900 px-1.5 py-0.2 rounded font-black font-sans">
                #{nextIssueSlideIdx + 1}
              </span>
              <ArrowRight className="w-3 h-3" />
            </button>
          ) : (
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl flex items-center space-x-1 font-khmer">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>{language === 'km' ? 'ស្អាតទាំងអស់!' : 'Clean'}</span>
            </span>
          )}
        </div>

        {/* View Mode Switcher & Quick Action */}
        <div className="flex items-center space-x-2">
          {/* View Mode Switcher */}
          <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-khmer">
            <button
              onClick={() => setCanvasView('corrected')}
              className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                canvasView === 'corrected'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-white" />
              <span>{documentType === 'docx' ? (language === 'km' ? 'ទំព័រកែរួច' : 'Fixed') : t.slide_view_corrected}</span>
            </button>

            <button
              onClick={() => setCanvasView('original')}
              className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                canvasView === 'original'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-white" />
              <span>{documentType === 'docx' ? (language === 'km' ? 'ទំព័រដើម' : 'Original') : t.slide_view_original}</span>
            </button>

            <button
              onClick={() => setCanvasView('split')}
              className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                canvasView === 'split'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>{t.slide_view_split}</span>
            </button>
          </div>

          {/* Accept All On Slide / Page */}
          {slideReplacements.length > 0 && (
            <button
              onClick={handleAcceptAllOnSlide}
              className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-2xs transition cursor-pointer font-khmer"
              title={documentType === 'docx' ? "Accept all fixes on this page" : "Accept all fixes on this slide"}
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{documentType === 'docx' ? (language === 'km' ? 'យល់ព្រមទំព័រនេះ' : 'Fix Page') : t.change_all_slide}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. THE CLEAN FULL-WIDTH DOCUMENT / SLIDE WORKSPACE */}
      <div className="w-full flex-1 min-h-0 bg-slate-100/80 rounded-2xl p-2.5 sm:p-3 border border-slate-200 shadow-xs flex flex-col overflow-hidden">
          {/* Top Canvas Bar */}
          <div className="shrink-0 flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-200 text-xs font-khmer">
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-slate-800">
                {slide.title || (documentType === 'docx' ? `Page ${currentSlideIdx + 1}` : `Slide ${currentSlideIdx + 1}`)}
              </span>
              {filename && (
                <span className="hidden sm:inline-block max-w-[130px] truncate text-[10px] text-slate-400 bg-slate-200/60 px-1.5 py-0.5 rounded font-mono" title={filename}>
                  {filename}
                </span>
              )}
              <span className="text-[11px] text-slate-400">
                • {targetFont}
              </span>
              {slideReplacements.length > 0 && (
                <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                  {slideReplacements.length} {language === 'km' ? 'ពាក្យកែតម្រូវ' : 'corrections'}
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {canvasView === 'corrected' && (
                <button
                  onClick={() => setIsLiveTyping(!isLiveTyping)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer flex items-center space-x-1.5 font-khmer ${
                    !isLiveTyping
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                  title={isLiveTyping ? "Show word highlights" : "Switch to direct text edit"}
                >
                  <Edit3 className="w-3 h-3" />
                  <span>
                    {!isLiveTyping
                      ? (language === 'km' ? '✨ បង្ហាញពាក្យកែតម្រូវ' : '✨ Highlight Fixes')
                      : (language === 'km' ? '✎ កែប្រែអត្ថបទផ្ទាល់' : '✎ Direct Edit')}
                  </span>
                </button>
              )}

              <button
                onClick={handleCleanDottedCircles}
                className="p-1 text-teal-700 hover:bg-teal-50 rounded-lg border border-teal-200 bg-white transition cursor-pointer"
                title={t.clean_dotted_circles}
              >
                <Wand2 className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleResetToOriginal}
                className="p-1 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 bg-white transition cursor-pointer"
                title={t.reset_to_autofix}
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() =>
                  handleCopyText(
                    canvasView === 'original'
                      ? slide.original_text
                      : liveSlideText
                  )
                }
                className="p-1 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 bg-white transition cursor-pointer"
                title="Copy slide text"
              >
                {copySuccess ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* THE AUTHENTIC POWERPOINT / WORD DOCUMENT CANVAS */}
          <div className={`flex-1 min-h-0 flex flex-col justify-center items-center overflow-hidden p-1 sm:p-2 ${documentType === 'docx' ? 'bg-slate-200/70 rounded-xl' : ''}`}>
            <div
              className={`bg-white shadow-md border border-slate-200 flex flex-col overflow-hidden relative transition-all ${
                documentType === 'docx'
                  ? 'w-full max-w-[850px] h-full rounded-sm border-slate-300 shadow-sm my-auto'
                  : 'w-full h-full max-w-5xl rounded-xl aspect-video mx-auto'
              }`}
              style={{
                fontFamily: `'${targetFont}', 'Kantumruy Pro', sans-serif`,
              }}
            >
              {/* Paper Header / Ribbon Watermark */}
              <div className={`px-4 py-1.5 border-b shrink-0 flex items-center justify-between text-xs font-mono ${
                documentType === 'docx' ? 'bg-slate-50/90 border-slate-200 text-slate-500' : 'bg-slate-50/50 border-slate-100 text-slate-400'
              }`}>
                <span className="font-bold flex items-center space-x-1.5">
                  <span className={`w-2 h-2 rounded-sm ${documentType === 'docx' ? 'bg-blue-600' : 'bg-orange-600'}`} />
                  <span className="text-slate-700 text-[11px]">
                    {documentType === 'docx'
                      ? `Word Document — Page ${currentSlideIdx + 1}`
                      : `PowerPoint — Slide ${currentSlideIdx + 1}`}
                  </span>
                </span>
                <span className="text-[10px] text-slate-400">
                  {charCount} chars • {wordCount} words
                </span>
              </div>

              {/* Slide / Document Page Body Content */}
              <div className={`flex-1 min-h-0 overflow-y-auto ${documentType === 'docx' ? 'p-6 sm:p-8 bg-white' : 'p-4 sm:p-6'}`}>
                {canvasView === 'corrected' ? (
                  isLiveTyping ? (
                    <textarea
                      value={liveSlideText}
                      onChange={handleLiveTextChange}
                      className="w-full h-full p-2 text-sm sm:text-base text-slate-900 bg-transparent border-none focus:outline-hidden leading-relaxed resize-none font-sans"
                      style={{
                        fontFamily: `'${targetFont}', 'Kantumruy Pro', sans-serif`,
                      }}
                      placeholder={
                        documentType === 'docx'
                          ? 'Type and edit Word document text directly on page...'
                          : 'Type and modify slide presentation content...'
                      }
                    />
                  ) : (
                    <div className="text-sm sm:text-base text-slate-900 whitespace-pre-line leading-relaxed select-text font-normal">
                      {renderHighlightedText(liveSlideText, false)}
                    </div>
                  )
                ) : canvasView === 'original' ? (
                  <div className="text-sm sm:text-base text-slate-800 whitespace-pre-line leading-relaxed select-text font-normal">
                    {renderHighlightedText(slide.original_text, true)}
                  </div>
                ) : (
                  /* Split View: Original vs Corrected side-by-side inside the slide */
                  <div className="grid grid-cols-2 gap-3 h-full">
                    <div className="border-r border-slate-200 pr-2 overflow-y-auto">
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded block mb-1 font-khmer">
                        {t.slide_view_original}
                      </span>
                      <div className="prose prose-xs max-w-none text-slate-800 whitespace-pre-line leading-relaxed text-xs sm:text-sm">
                        {renderHighlightedText(slide.original_text, true)}
                      </div>
                    </div>
                    <div className="pl-1 overflow-y-auto">
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded block mb-1 font-khmer">
                        {t.slide_view_corrected}
                      </span>
                      <div className="prose prose-xs max-w-none text-slate-900 whitespace-pre-line leading-relaxed text-xs sm:text-sm">
                        {renderHighlightedText(liveSlideText, false)}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Slide / Document Canvas Footer Bar */}
              <div className="px-4 py-1.5 border-t border-slate-100 bg-slate-50/40 shrink-0 flex items-center justify-between text-[10px] text-slate-400">
                <span className="font-khmer truncate">
                  {canvasView === 'corrected'
                    ? (documentType === 'docx'
                        ? '✎ Click and type directly on page to edit document'
                        : '✎ Click and type directly on slide to modify presentation')
                    : 'Viewing document state'}
                </span>
                <span className="font-bold text-slate-500 shrink-0 ml-2">
                  {documentType === 'docx' ? 'A4 Document Page' : '16:9 Widescreen'}
                </span>
              </div>
            </div>
          </div>
        </div>
    </div>
  );
};
