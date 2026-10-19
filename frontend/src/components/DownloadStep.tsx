import {
  Download,
  CheckCircle,
  Sparkles,
  RotateCcw,
  Edit3,
  FileText,
} from 'lucide-react';
import type { Language } from '../types';
import { translations } from '../i18n/translations';

interface DownloadStepProps {
  language: Language;
  targetFont: string;
  totalSlides: number;
  totalFixed: number;
  documentType?: 'pptx' | 'docx' | 'pdf';
  onDownloadAgain: () => void;
  onDownloadAsPptx?: () => void;
  onDownloadAsPdf?: () => void;
  onStartOver: () => void;
  onPreviewEdit: () => void;
  isLoading?: boolean;
}

export const DownloadStep: React.FC<DownloadStepProps> = ({
  language,
  targetFont,
  totalSlides,
  totalFixed,
  documentType = 'pptx',
  onDownloadAgain,
  onDownloadAsPptx,
  onDownloadAsPdf,
  onStartOver,
  onPreviewEdit,
  isLoading,
}) => {
  const t = translations[language];

  const getDownloadButtonLabel = () => {
    if (isLoading) {
      return language === 'km' ? 'កំពុងបង្កើតឯកសារ...' : 'Generating...';
    }
    const ext = documentType.toUpperCase();
    return language === 'km'
      ? `ទាញយកឯកសារ ${ext} (.${documentType})`
      : `Download ${ext} (.${documentType})`;
  };

  const getUnitLabel = () => {
    if (documentType === 'docx') {
      return language === 'km' ? 'ទំព័រ' : 'Pages';
    }
    return language === 'km' ? 'ស្លាយ' : 'Slides';
  };

  return (
    <div className="max-w-md w-full mx-auto h-full flex flex-col justify-center items-center py-6 px-4 text-center">
      {/* Success Badge */}
      <div className="relative inline-block mb-3">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center shadow-lg shadow-emerald-100 ring-4 ring-emerald-50">
          <CheckCircle className="w-9 h-9 stroke-[2.5]" />
        </div>
        <div className="absolute -bottom-1 -right-1 bg-amber-400 text-amber-950 p-1 rounded-full shadow-md">
          <Sparkles className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* Clean Main Title & Subtitle */}
      <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight font-khmer mb-1">
        {t.download_title}
      </h2>
      <p className="text-slate-500 text-xs sm:text-sm font-khmer mb-5">
        {t.download_desc}
      </p>

      {/* Clean Stats Pill */}
      <div className="bg-white rounded-xl py-2 px-5 border border-slate-200/80 shadow-xs flex items-center justify-center gap-4 text-xs font-khmer mb-6">
        <span className="text-slate-600 font-semibold">
          <strong className="text-slate-900 font-bold text-sm">{totalSlides}</strong> {getUnitLabel()}
        </span>
        <span className="text-slate-300">•</span>
        <span className="text-emerald-600 font-semibold">
          <strong className="text-emerald-700 font-bold text-sm">{totalFixed}</strong> {t.download_runs_updated}
        </span>
        <span className="text-slate-300">•</span>
        <span className="text-slate-500 font-medium truncate max-w-[140px]" title={targetFont}>
          {targetFont}
        </span>
      </div>

      {/* Main Download Button */}
      <div className="w-full max-w-xs space-y-2 mb-5">
        <button
          onClick={onDownloadAgain}
          disabled={isLoading}
          className="w-full inline-flex items-center justify-center space-x-2 px-6 py-3.5 rounded-xl text-base font-bold bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-lg shadow-indigo-200 transition active:scale-98 cursor-pointer disabled:opacity-60"
        >
          {isLoading ? (
            <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <Download className="w-5 h-5 stroke-[2.2]" />
          )}
          <span className="font-khmer">{getDownloadButtonLabel()}</span>
        </button>

        {/* Secondary PPTX option when user uploaded a PDF */}
        {documentType === 'pdf' && onDownloadAsPptx && (
          <button
            onClick={onDownloadAsPptx}
            disabled={isLoading}
            className="w-full inline-flex items-center justify-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-khmer">
              {language === 'km' ? 'ទាញយកជា PowerPoint (.pptx)' : 'Download as PowerPoint (.pptx)'}
            </span>
          </button>
        )}

        {/* Secondary PDF option when user uploaded a PPTX or DOCX */}
        {documentType !== 'pdf' && onDownloadAsPdf && (
          <button
            onClick={onDownloadAsPdf}
            disabled={isLoading}
            className="w-full inline-flex items-center justify-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-khmer">
              {language === 'km' ? 'ទាញយកជា PDF (.pdf)' : 'Download as PDF (.pdf)'}
            </span>
          </button>
        )}
      </div>

      {/* Clean Secondary Actions */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={onPreviewEdit}
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-700 bg-white hover:bg-indigo-50/50 px-3.5 py-1.5 rounded-lg transition cursor-pointer font-khmer border border-slate-200 shadow-2xs"
        >
          <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
          <span>{language === 'km' ? 'ពិនិត្យ & កែសម្រួល' : 'Preview & Edit'}</span>
        </button>

        <button
          onClick={onStartOver}
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 px-3.5 py-1.5 rounded-lg transition cursor-pointer font-khmer border border-slate-200 shadow-2xs"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
          <span>{t.download_start_over}</span>
        </button>
      </div>
    </div>
  );
};
