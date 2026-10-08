import { useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { UploadStep } from './components/UploadStep';
import { PreviewStep } from './components/PreviewStep';
import { DownloadStep } from './components/DownloadStep';
import type {
  FontOption,
  Language,
  ProcessOptions,
  ProcessResponse,
  ReplacementItem,
} from './types';
import {
  getFonts,
  uploadAndProcess,
  applyFixesAndDownload,
} from './services/api';
import { translations } from './i18n/translations';
import { AlertCircle, X } from 'lucide-react';

export function App() {
  const [language, setLanguage] = useState<Language>('km');
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [fonts, setFonts] = useState<FontOption[]>([]);
  const [options, setOptions] = useState<ProcessOptions>({
    target_font: 'Khmer OS Battambang',
    mode: 'auto',
  });

  const [processResult, setProcessResult] = useState<ProcessResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedReplacements, setSavedReplacements] = useState<ReplacementItem[]>([]);
  const [resetKey, setResetKey] = useState<number>(0);

  const t = translations[language];

  // Fetch fonts on mount
  useEffect(() => {
    getFonts().then((data) => {
      setFonts(data);
      const def = data.find((f) => f.default);
      if (def) {
        setOptions((prev) => ({ ...prev, target_font: def.name }));
      }
    });
  }, []);

  const handleLanguageToggle = () => {
    setLanguage((prev) => (prev === 'km' ? 'en' : 'km'));
  };

  const handleUploadSubmit = async (pptxFile: File | null, pdfFile: File | null) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      // 1. Process document and identify all Khmer Unicode & spelling fixes
      const response = await uploadAndProcess(pptxFile, pdfFile, options);
      setProcessResult(response);
      setSavedReplacements(response.all_replacements);

      // 2. Move to completion screen and wait for user to click the download button
      setCurrentStep(3);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || t.alert_error);
    } finally {
      setIsLoading(false);
    }
  };

  const triggerFileDownload = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleProceedToDownload = async (updatedReplacements: ReplacementItem[]) => {
    if (!processResult) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      setSavedReplacements(updatedReplacements);
      const blob = await applyFixesAndDownload(
        processResult.session_id,
        options.target_font,
        updatedReplacements
      );
      const isDocx = processResult.document_type === 'docx';
      const ext = isDocx ? '.docx' : '.pptx';
      const baseName = processResult.filename
        ? processResult.filename.replace(/\.[^/.]+$/, '')
        : (isDocx ? 'document' : 'presentation');
      triggerFileDownload(blob, `${baseName}_fixed${ext}`);
      setCurrentStep(3);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to generate corrected file');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadAgain = async () => {
    if (!processResult) return;
    setIsLoading(true);
    try {
      const blob = await applyFixesAndDownload(
        processResult.session_id,
        options.target_font,
        savedReplacements
      );
      const isDocx = processResult.document_type === 'docx';
      const ext = isDocx ? '.docx' : '.pptx';
      const baseName = processResult.filename
        ? processResult.filename.replace(/\.[^/.]+$/, '')
        : (isDocx ? 'document' : 'presentation');
      triggerFileDownload(blob, `${baseName}_fixed${ext}`);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to download');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartOver = () => {
    setCurrentStep(1);
    setProcessResult(null);
    setSavedReplacements([]);
    setErrorMessage(null);
    setIsLoading(false);
    setResetKey((prev) => prev + 1);
  };

  return (
    <div className="h-screen max-h-screen overflow-hidden bg-slate-50 flex flex-col font-khmer">
      {/* Navbar */}
      <Navbar
        language={language}
        onLanguageToggle={handleLanguageToggle}
        onLogoClick={handleStartOver}
        isLoading={isLoading}
      />

      {/* Main Container */}
      <main className="flex-1 min-h-0 w-full mx-auto px-3 sm:px-6 py-2 sm:py-3 max-w-[1600px] flex flex-col overflow-hidden">
        {/* Error Notification */}
        {errorMessage && (
          <div className="shrink-0 max-w-4xl w-full mx-auto mb-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start justify-between shadow-xs">
            <div className="flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold">Error</p>
                <p className="mt-0.5">{errorMessage}</p>
              </div>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-400 hover:text-rose-700 p-0.5 rounded-lg"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Step Views */}
        {currentStep === 1 && (
          <UploadStep
            key={resetKey}
            language={language}
            onSubmit={handleUploadSubmit}
            isLoading={isLoading}
          />
        )}

        {currentStep === 2 && processResult && (
          <PreviewStep
            data={processResult}
            language={language}
            fonts={fonts}
            targetFont={options.target_font}
            onTargetFontChange={(font) => setOptions((prev) => ({ ...prev, target_font: font }))}
            onProceedToDownload={handleProceedToDownload}
            onBackToUpload={() => setCurrentStep(1)}
            isLoading={isLoading}
          />
        )}

        {currentStep === 3 && processResult && (
          <DownloadStep
            language={language}
            targetFont={options.target_font}
            totalSlides={processResult.total_slides}
            totalFixed={
              savedReplacements.filter(
                (r) => r.status === 'accepted' || r.status === 'modified'
              ).length
            }
            onDownloadAgain={handleDownloadAgain}
            onStartOver={handleStartOver}
            onPreviewEdit={() => setCurrentStep(2)}
            isLoading={isLoading}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="shrink-0 border-t border-slate-200 py-1.5 px-4 text-center text-[11px] text-slate-400 bg-white">
        <p className="font-khmer">
          Khmer DocFixer &bull; PowerPoint & Word Khmer Spelling Corrector
        </p>
      </footer>
    </div>
  );
}

export default App;
