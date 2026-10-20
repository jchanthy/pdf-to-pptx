import React, { useState } from 'react';
import {
  Download,
  CheckCircle,
  Sparkles,
  RotateCcw,
  Edit3,
  FileText,
  Presentation,
  Loader2,
} from 'lucide-react';
import type { Language } from '../types';
import { translations } from '../i18n/translations';

interface DownloadStepProps {
  language: Language;
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
  const [downloadingFormat, setDownloadingFormat] = useState<'primary' | 'secondary' | null>(null);

  const getUnitLabel = () => {
    if (documentType === 'docx') {
      return language === 'km' ? 'ទំព័រ' : 'Pages';
    }
    return language === 'km' ? 'ស្លាយ' : 'Slides';
  };

  const handlePrimaryDownload = () => {
    setDownloadingFormat('primary');
    onDownloadAgain();
  };

  const handleSecondaryDownload = () => {
    setDownloadingFormat('secondary');
    if (documentType === 'pdf' && onDownloadAsPptx) {
      onDownloadAsPptx();
    } else if (onDownloadAsPdf) {
      onDownloadAsPdf();
    }
  };

  // Define format details based on original document type
  const isPdf = documentType === 'pdf';
  const isDocx = documentType === 'docx';

  // Primary format (original format)
  const primaryFormat = {
    ext: isPdf ? 'pdf' : isDocx ? 'docx' : 'pptx',
    badge: isPdf ? 'PDF' : isDocx ? 'DOCX' : 'PPTX',
    title: isPdf
      ? (language === 'km' ? 'ឯកសារ PDF (.pdf)' : 'PDF Document (.pdf)')
      : isDocx
      ? (language === 'km' ? 'ឯកសារ Word (.docx)' : 'Word Document (.docx)')
      : (language === 'km' ? 'ស្លាយ PowerPoint (.pptx)' : 'PowerPoint (.pptx)'),
    subtitle: isPdf
      ? (language === 'km' ? 'ឯកសារ PDF ដែលបានកែអក្សរខ្មែរត្រឹមត្រូវ' : 'Fixed Khmer Unicode PDF document')
      : isDocx
      ? (language === 'km' ? 'ឯកសារ Word ដើមដែលបានកែសម្រួលរួច' : 'Editable Word document with fixed fonts')
      : (language === 'km' ? 'ស្លាយបទបង្ហាញដើមដែលបានកែសម្រួលរួច' : 'Editable PowerPoint slides with fixed fonts'),
    theme: isPdf
      ? {
          badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
          btnBg: 'bg-rose-600 hover:bg-rose-700',
          icon: <FileText className="w-5 h-5 text-rose-600" />,
        }
      : isDocx
      ? {
          badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
          btnBg: 'bg-blue-600 hover:bg-blue-700',
          icon: <FileText className="w-5 h-5 text-blue-600" />,
        }
      : {
          badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
          btnBg: 'bg-amber-600 hover:bg-amber-700',
          icon: <Presentation className="w-5 h-5 text-amber-600" />,
        },
  };

  // Secondary format (convert option)
  const secondaryFormat = isPdf
    ? {
        ext: 'pptx',
        badge: 'PPTX',
        title: language === 'km' ? 'ស្លាយ PowerPoint (.pptx)' : 'PowerPoint (.pptx)',
        subtitle: language === 'km' ? 'បម្លែងជាស្លាយ PowerPoint ដែលអាចកែសម្រួលបាន' : 'Converted to editable PowerPoint presentation',
        badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
        btnBg: 'bg-amber-600 hover:bg-amber-700',
        icon: <Presentation className="w-5 h-5 text-amber-600" />,
        available: Boolean(onDownloadAsPptx),
      }
    : {
        ext: 'pdf',
        badge: 'PDF',
        title: language === 'km' ? 'ឯកសារ PDF (.pdf)' : 'PDF Document (.pdf)',
        subtitle: language === 'km' ? 'បម្លែងជា PDF គុណភាពខ្ពស់ ងាយស្រួលចែករំលែក' : 'Exported print-ready PDF document',
        badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
        btnBg: 'bg-rose-600 hover:bg-rose-700',
        icon: <FileText className="w-5 h-5 text-rose-600" />,
        available: Boolean(onDownloadAsPdf),
      };

  return (
    <div className="max-w-lg w-full mx-auto h-full flex flex-col justify-center items-center py-6 px-4 text-center">
      {/* Success Badge */}
      <div className="relative inline-block mb-3">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center shadow-lg shadow-emerald-100 ring-4 ring-emerald-50">
          <CheckCircle className="w-9 h-9 stroke-[2.5]" />
        </div>
        <div className="absolute -bottom-1 -right-1 bg-amber-400 text-amber-950 p-1 rounded-full shadow-md">
          <Sparkles className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* Main Title & Subtitle */}
      <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight font-khmer mb-1">
        {t.download_title}
      </h2>
      <p className="text-slate-500 text-xs sm:text-sm font-khmer mb-4">
        {t.download_desc}
      </p>

      {/* Stats Pill */}
      <div className="bg-white rounded-xl py-2 px-5 border border-slate-200/80 shadow-xs flex items-center justify-center gap-4 text-xs font-khmer mb-5">
        <span className="text-slate-600 font-semibold">
          <strong className="text-slate-900 font-bold text-sm">{totalSlides}</strong> {getUnitLabel()}
        </span>
        <span className="text-slate-300">•</span>
        <span className="text-emerald-600 font-semibold">
          <strong className="text-emerald-700 font-bold text-sm">{totalFixed}</strong> {t.download_runs_updated}
        </span>
      </div>

      {/* File Formats to Download */}
      <div className="w-full max-w-md space-y-3 mb-6">
        <div className="text-left text-xs font-bold text-slate-500 font-khmer px-1 uppercase tracking-wider">
          {language === 'km' ? 'ទម្រង់ឯកសារសម្រាប់ទាញយក' : 'Available Download Formats'}
        </div>

        {/* Primary Format Card */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all flex items-center justify-between text-left gap-3">
          <div className="flex items-center space-x-3.5 min-w-0">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${primaryFormat.theme.badgeBg}`}>
              {primaryFormat.theme.icon}
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-slate-900 text-sm font-khmer truncate">
                  {primaryFormat.title}
                </h3>
                <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded border ${primaryFormat.theme.badgeBg}`}>
                  {primaryFormat.badge}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-khmer truncate mt-0.5">
                {primaryFormat.subtitle}
              </p>
            </div>
          </div>

          <button
            onClick={handlePrimaryDownload}
            disabled={isLoading}
            className={`inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition active:scale-95 cursor-pointer shadow-sm disabled:opacity-60 shrink-0 ${primaryFormat.theme.btnBg}`}
          >
            {isLoading && downloadingFormat === 'primary' ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Download className="w-4 h-4 stroke-[2.2]" />
            )}
            <span className="font-khmer">
              {isLoading && downloadingFormat === 'primary'
                ? (language === 'km' ? 'កំពុងទាញយក...' : 'Generating...')
                : (language === 'km' ? 'ទាញយក' : 'Download')}
            </span>
          </button>
        </div>

        {/* Secondary Format Card (Convert) */}
        {secondaryFormat.available && (
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all flex items-center justify-between text-left gap-3">
            <div className="flex items-center space-x-3.5 min-w-0">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${secondaryFormat.badgeBg}`}>
                {secondaryFormat.icon}
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-2">
                  <h3 className="font-bold text-slate-900 text-sm font-khmer truncate">
                    {secondaryFormat.title}
                  </h3>
                  <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded border ${secondaryFormat.badgeBg}`}>
                    {secondaryFormat.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-khmer truncate mt-0.5">
                  {secondaryFormat.subtitle}
                </p>
              </div>
            </div>

            <button
              onClick={handleSecondaryDownload}
              disabled={isLoading}
              className={`inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition active:scale-95 cursor-pointer shadow-sm disabled:opacity-60 shrink-0 ${secondaryFormat.btnBg}`}
            >
              {isLoading && downloadingFormat === 'secondary' ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Download className="w-4 h-4 stroke-[2.2]" />
              )}
              <span className="font-khmer">
                {isLoading && downloadingFormat === 'secondary'
                  ? (language === 'km' ? 'កំពុងបម្លែង...' : 'Converting...')
                  : (language === 'km' ? 'ទាញយក' : 'Download')}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Secondary Actions */}
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
