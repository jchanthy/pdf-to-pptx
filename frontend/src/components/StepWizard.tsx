import React from 'react';
import { UploadCloud, Eye, Download, Check } from 'lucide-react';
import type { Language } from '../types';
import { translations } from '../i18n/translations';

interface StepWizardProps {
  currentStep: number; // 1, 2, 3
  language: Language;
  onStepClick?: (step: number) => void;
  canNavigateToStep?: (step: number) => boolean;
}

export const StepWizard: React.FC<StepWizardProps> = ({
  currentStep,
  language,
  onStepClick,
  canNavigateToStep = () => false,
}) => {
  const t = translations[language];

  const steps = [
    { num: 1, title: t.step_upload, icon: UploadCloud },
    { num: 2, title: t.step_preview, icon: Eye },
    { num: 3, title: t.step_download, icon: Download },
  ];

  return (
    <div className="py-6 max-w-4xl mx-auto px-4">
      <div className="flex items-center justify-between relative">
        {/* Background Connecting Line */}
        <div className="absolute top-5 left-12 right-12 h-0.5 bg-slate-200 -z-0" />
        <div
          className="absolute top-5 left-12 h-0.5 bg-indigo-600 transition-all duration-500 ease-out -z-0"
          style={{
            width: currentStep === 1 ? '0%' : currentStep === 2 ? '50%' : '100%',
          }}
        />

        {steps.map((step) => {
          const isDone = currentStep > step.num;
          const isActive = currentStep === step.num;
          const isClickable = onStepClick && canNavigateToStep(step.num);
          const Icon = step.icon;

          return (
            <div
              key={step.num}
              onClick={() => isClickable && onStepClick(step.num)}
              className={`flex flex-col items-center relative z-10 ${
                isClickable ? 'cursor-pointer group' : 'cursor-default'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 font-semibold text-sm shadow-xs ${
                  isDone
                    ? 'bg-emerald-600 text-white ring-4 ring-emerald-50'
                    : isActive
                    ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 shadow-indigo-200'
                    : 'bg-white border-2 border-slate-300 text-slate-400 group-hover:border-slate-400'
                }`}
              >
                {isDone ? <Check className="w-5 h-5 stroke-[2.5]" /> : <Icon className="w-5 h-5" />}
              </div>
              <span
                className={`mt-2 text-xs font-semibold tracking-tight transition-colors duration-200 text-center max-w-[130px] sm:max-w-none ${
                  isActive
                    ? 'text-indigo-900 font-bold'
                    : isDone
                    ? 'text-slate-700'
                    : 'text-slate-400'
                }`}
              >
                {step.title}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
