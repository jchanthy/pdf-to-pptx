import {
  Download,
  CheckCircle,
  Sparkles,
  RotateCcw,
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
}

export const DownloadStep: React.FC<DownloadStepProps> = ({
  language,
  targetFont,
  totalSlides,
  totalFixed,
  onDownloadAgain,
  onStartOver,
}) => {
  const t = translations[language];

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 text-center space-y-8">
      {/* Success Badge */}
      <div className="relative inline-block">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center shadow-xl shadow-emerald-100 ring-8 ring-emerald-50">
          <CheckCircle className="w-10 h-10 stroke-[2.5]" />
        </div>
        <div className="absolute -bottom-1 -right-1 bg-amber-400 text-amber-950 p-1.5 rounded-full shadow-md">
          <Sparkles className="w-4 h-4" />
        </div>
      </div>

      {/* Main Title & Description */}
      <div className="space-y-3">
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight font-khmer">
          {t.download_title}
        </h2>
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-lg mx-auto font-khmer">
          {t.download_desc}{' '}
          <strong className="text-indigo-600 font-semibold">{targetFont}</strong>.
        </p>
      </div>

      {/* Summary Metrics Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-xs font-semibold text-slate-400 font-khmer">{t.stats_slides}</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">{totalSlides}</p>
        </div>
        <div className="border-x border-slate-100">
          <p className="text-xs font-semibold text-slate-400 font-khmer">{t.download_runs_updated}</p>
          <p className="text-2xl font-extrabold text-emerald-600 mt-1">{totalFixed}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-400 font-khmer">{t.stats_font}</p>
          <p className="text-sm font-bold text-slate-800 mt-2 truncate" title={targetFont}>
            {targetFont}
          </p>
        </div>
      </div>

      {/* Primary Action Button */}
      <div className="space-y-3 pt-2">
        <button
          onClick={onDownloadAgain}
          className="w-full sm:w-auto inline-flex items-center justify-center space-x-3 px-8 py-4 rounded-2xl text-base font-bold bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-xl shadow-indigo-200 transition active:scale-98 cursor-pointer"
        >
          <Download className="w-5 h-5" />
          <span className="font-khmer">{t.download_button}</span>
        </button>
        <p className="text-xs text-slate-400 font-mono">
          {t.download_file_suffix}
        </p>
      </div>

      {/* Secondary: Start Over */}
      <div className="pt-4 border-t border-slate-200">
        <button
          onClick={onStartOver}
          className="inline-flex items-center space-x-2 text-sm font-semibold text-slate-600 hover:text-indigo-600 transition cursor-pointer font-khmer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>{t.download_start_over}</span>
        </button>
      </div>
    </div>
  );
};
