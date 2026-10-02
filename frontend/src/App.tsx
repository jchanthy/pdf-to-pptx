import { useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { StepWizard } from './components/StepWizard';
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
  loadSamplePresentation,
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
      const response = await uploadAndProcess(pptxFile, pdfFile, options);
      setProcessResult(response);
      setSavedReplacements(response.all_replacements);
      setCurrentStep(2);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || t.alert_error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadSample = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await loadSamplePresentation();
      setProcessResult(response);
      setSavedReplacements(response.all_replacements);
      setCurrentStep(2);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to load sample presentation');
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
      triggerFileDownload(blob, 'presentation_fixed.pptx');
      setCurrentStep(3);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to generate corrected PPTX');
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
      triggerFileDownload(blob, 'presentation_fixed.pptx');
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
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-khmer">
      {/* Navbar */}
      <Navbar
        language={language}
        onLanguageToggle={handleLanguageToggle}
        onLoadSample={handleLoadSample}
        isLoading={isLoading}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Step Wizard Bar */}
        <StepWizard
          currentStep={currentStep}
          language={language}
          onStepClick={(step) => {
            if (step === 1) setCurrentStep(1);
            if (step === 2 && processResult) setCurrentStep(2);
            if (step === 3 && processResult) setCurrentStep(3);
          }}
          canNavigateToStep={(step) => {
            if (step === 1) return true;
            if (step === 2) return Boolean(processResult);
            if (step === 3) return Boolean(processResult);
            return false;
          }}
        />

        {/* Error Notification */}
        {errorMessage && (
          <div className="max-w-4xl mx-auto mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start justify-between shadow-xs">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-bold">Error</p>
                <p className="mt-0.5">{errorMessage}</p>
              </div>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-400 hover:text-rose-700 p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step Views */}
        {currentStep === 1 && (
          <UploadStep
            language={language}
            fonts={fonts}
            options={options}
            onOptionsChange={setOptions}
            onSubmit={handleUploadSubmit}
            isLoading={isLoading}
            onLoadSample={handleLoadSample}
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
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500 bg-white">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="font-khmer">
            Khmer DocFixer &bull; PDF-to-PPTX Unicode Restorer &bull; Limon / ABC to Khmer Unicode Engine
          </p>
          <p className="text-slate-400">
            Preserves Office Open XML Geometry, Styling, Tables, and Shapes
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
