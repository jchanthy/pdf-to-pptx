import {
  Download,
  CheckCircle,
  Sparkles,
  RotateCcw,
  Edit3,
} from 'lucide-react';
import type { Language } from '../types';
import { translations } from '../i18n/translations';

interface DownloadStepProps {
  language: Language;
  targetFont: string;
  totalSlides: number;
  totalFixed: number;
  onDownloadAgain: () => void;
  onStartOver: () => void;
  onPreviewEdit: () => void;
  isLoading?: boolean;
}

export const DownloadStep: React.FC<DownloadStepProps> = ({
  language,
  targetFont,
  totalSlides,
  totalFixed,
  onDownloadAgain,
  onStartOver,
  onPreviewEdit,
  isLoading,
}) => {
  const t = translations[language];

  return (
    <div className="max-w-xl w-full mx-auto h-full flex flex-col justify-center items-center py-1 sm:py-2 px-4 text-center space-y-3 sm:space-y-4">
      {/* Success Badge */}
      <div className="relative inline-block shrink-0">
        <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center shadow-lg shadow-emerald-100 ring-4 ring-emerald-50">
          <CheckCircle className="w-8 h-8 stroke-[2.5]" />
        </div>
        <div className="absolute -bottom-1 -right-1 bg-amber-400 text-amber-950 p-1 rounded-full shadow-md">
          <Sparkles className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* Main Title & Description */}
      <div className="space-y-1 shrink-0">
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight font-khmer">
          {t.download_title}
        </h2>
        <p className="text-slate-600 text-xs sm:text-sm leading-relaxed max-w-md mx-auto font-khmer">
          {t.download_desc}{' '}
          <strong className="text-indigo-600 font-semibold">{targetFont}</strong>.
        </p>
      </div>

      {/* Summary Metrics Card */}
      <div className="bg-white rounded-xl p-3 sm:p-4 border border-slate-200 shadow-xs grid grid-cols-3 gap-3 text-center w-full max-w-md shrink-0">
        <div>
          <p className="text-[11px] font-semibold text-slate-400 font-khmer">{t.stats_slides}</p>
          <p className="text-xl font-extrabold text-slate-900 mt-0.5">{totalSlides}</p>
        </div>
        <div className="border-x border-slate-100">
          <p className="text-[11px] font-semibold text-slate-400 font-khmer">{t.download_runs_updated}</p>
          <p className="text-xl font-extrabold text-emerald-600 mt-0.5">{totalFixed}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold text-slate-400 font-khmer">{t.stats_font}</p>
          <p className="text-xs font-bold text-slate-800 mt-1 truncate" title={targetFont}>
            {targetFont}
          </p>
        </div>
      </div>

      {/* Primary Action Button */}
      <div className="space-y-1.5 shrink-0 w-full max-w-xs">
        <button
          onClick={onDownloadAgain}
          disabled={isLoading}
          className="w-full inline-flex items-center justify-center space-x-2.5 px-6 py-3 rounded-xl text-sm sm:text-base font-bold bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-lg shadow-indigo-200 transition active:scale-98 cursor-pointer disabled:opacity-60"
        >
          {isLoading ? (
            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <Download className="w-4 h-4" />
          )}
          <span className="font-khmer">
            {isLoading
              ? (language === 'km' ? 'កំពុងបង្កើតឯកសារ...' : 'Generating...')
              : t.download_button}
          </span>
        </button>
        <p className="text-[11px] text-slate-400 font-mono">
          {t.download_file_suffix}
        </p>
      </div>

      {/* Secondary Actions */}
      <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-center gap-3 shrink-0">
        <button
          onClick={onPreviewEdit}
          className="inline-flex items-center space-x-1.5 text-xs sm:text-sm font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3.5 py-1.5 rounded-lg transition cursor-pointer font-khmer border border-indigo-200 shadow-2xs"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>{language === 'km' ? '✎ ពិនិត្យ & កែសម្រួល' : '✎ Preview & Edit'}</span>
        </button>

        <button
          onClick={onStartOver}
          className="inline-flex items-center space-x-1.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3.5 py-1.5 rounded-lg transition cursor-pointer font-khmer border border-slate-200"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{t.download_start_over}</span>
        </button>
      </div>
    </div>
  );
};
