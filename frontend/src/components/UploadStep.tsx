import { useState, useRef } from 'react';
import {
  Upload,
  FileText,
} from 'lucide-react';
import type { Language } from '../types';
import { translations } from '../i18n/translations';

interface UploadStepProps {
  language: Language;
  onSubmit: (pptx: File | null, pdf: File | null) => void;
  isLoading: boolean;
  onLoadSample?: () => void;
}

export const UploadStep: React.FC<UploadStepProps> = ({
  language,
  onSubmit,
  isLoading,
}) => {
  const t = translations[language];

  const [docFile, setDocFile] = useState<File | null>(null);
  const [dragOverDoc, setDragOverDoc] = useState(false);

  const docInputRef = useRef<HTMLInputElement>(null);


  const handleDocDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverDoc(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const name = file.name.toLowerCase();
      if (name.endsWith('.pptx') || name.endsWith('.docx') || name.endsWith('.pdf')) {
        setDocFile(file);
        onSubmit(file, null);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setDocFile(file);
      onSubmit(file, null);
    }
  };

  return (
    <div className="max-w-3xl w-full mx-auto h-full flex flex-col justify-center items-center py-1 sm:py-2 space-y-3 sm:space-y-4">
      {/* Hero Welcome */}
      <div className="text-center space-y-0.5 shrink-0">
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight font-khmer">
          {language === 'km' ? 'ពិនិត្យ និងកែអក្ខរាវិរុទ្ធអក្សរខ្មែរ' : 'Khmer Spelling Corrector'}
        </h1>
        <p className="text-xs text-slate-500 font-khmer">
          {language === 'km' ? 'ដាក់ឯកសារចូលដើម្បីពិនិត្យ និងកែសម្រួល' : 'Drop your document to inspect & fix'}
        </p>
      </div>

      <div className="w-full flex-1 max-h-[380px] min-h-[190px] flex flex-col">
        {/* Single Document Upload Zone */}
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between mb-1.5 shrink-0">
            <label className="text-xs sm:text-sm font-bold text-slate-800 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-600 inline-block" />
              <span>{t.upload_pptx_title}</span>
              <span className="text-rose-500 font-bold">*</span>
            </label>
            <span className="text-[11px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md font-mono font-semibold">.pptx / .docx / .pdf</span>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              if (!isLoading) setDragOverDoc(true);
            }}
            onDragLeave={() => setDragOverDoc(false)}
            onDrop={handleDocDrop}
            onClick={() => {
              if (!isLoading) docInputRef.current?.click();
            }}
            className={`relative border-2 border-dashed rounded-3xl p-4 sm:p-6 flex-1 w-full text-center cursor-pointer transition-all duration-200 flex flex-col justify-center items-center ${
              isLoading
                ? 'border-indigo-400 bg-indigo-50/50 cursor-wait'
                : dragOverDoc
                ? 'border-indigo-500 bg-indigo-50/70 scale-[1.01]'
                : docFile
                ? 'border-indigo-400 bg-indigo-50/30'
                : 'border-slate-300 bg-white hover:border-indigo-400 hover:bg-slate-50/80 shadow-xs'
            }`}
          >
            <input
              ref={docInputRef}
              type="file"
              disabled={isLoading}
              accept=".pptx,.docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={handleFileSelect}
            />

            {isLoading ? (
              <div className="space-y-3 max-w-md mx-auto py-2">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200">
                  <svg className="animate-spin h-6 w-6 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm sm:text-base font-extrabold text-slate-900 font-khmer">
                    {language === 'km' ? 'កំពុងពិនិត្យ និងកែសម្រួលឯកសារ...' : 'Processing & Fixing Document...'}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 font-khmer">
                    {docFile?.name || 'Please wait a moment...'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 max-w-md mx-auto">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shadow-xs">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm sm:text-base font-bold text-slate-800 font-khmer">
                    {t.drag_drop_hint}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 font-khmer leading-relaxed">
                    {t.upload_pptx_desc}
                  </p>
                </div>
                <div>
                  <span className="inline-flex items-center space-x-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 text-white shadow-md shadow-indigo-100 hover:bg-indigo-700 transition">
                    <FileText className="w-3.5 h-3.5" />
                    <span>{language === 'km' ? 'ជ្រើសរើសឯកសារ (.pptx / .docx / .pdf)' : 'Select Document (.pptx / .docx / .pdf)'}</span>
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
