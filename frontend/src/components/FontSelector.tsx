import React, { useState, useRef } from 'react';
import { Type, Edit3, Check, UploadCloud, Loader2 } from 'lucide-react';
import type { FontOption, Language } from '../types';
import { uploadCustomFont } from '../services/api';

interface FontSelectorProps {
  fonts: FontOption[];
  selectedFont: string;
  onChange: (font: string) => void;
  onFontAdded?: (newFont: FontOption) => void;
  language: Language;
  label?: string;
  compact?: boolean;
  className?: string;
}

export const FontSelector: React.FC<FontSelectorProps> = ({
  fonts,
  selectedFont,
  onChange,
  onFontAdded,
  language,
  label,
  compact = false,
  className = '',
}) => {
  const isPreset = fonts.some((f) => f.name.toLowerCase() === selectedFont.toLowerCase());
  const [isCustomMode, setIsCustomMode] = useState<boolean>(!isPreset && Boolean(selectedFont));
  const [customFontInput, setCustomFontInput] = useState<string>(isPreset ? '' : selectedFont);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '__custom__') {
      setIsCustomMode(true);
      // Keep existing custom input if present, or leave empty for typing
      if (customFontInput.trim()) {
        onChange(customFontInput.trim());
      }
    } else {
      setIsCustomMode(false);
      onChange(val);
    }
  };

  const handleCustomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomFontInput(val);
    if (val.trim()) {
      onChange(val.trim());
    }
  };

  const handleFontFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    const nameLower = file.name.toLowerCase();
    if (!nameLower.endsWith('.ttf') && !nameLower.endsWith('.otf')) {
      setUploadError(
        language === 'km'
          ? 'សូមជ្រើសរើសឯកសារពុម្ពអក្សរ .ttf ឬ .otf'
          : 'Please select a .ttf or .otf font file'
      );
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    try {
      const newFont = await uploadCustomFont(file);
      if (onFontAdded) {
        onFontAdded(newFont);
      }
      onChange(newFont.name);
      setIsCustomMode(false);
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || 'Failed to upload font');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Compact variant for toolbar/preview header
  if (compact) {
    return (
      <div className={`flex items-center space-x-1.5 ${className}`}>
        {/* Hidden file input for font installation */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".ttf,.otf"
          className="hidden"
          onChange={handleFontFileUpload}
        />

        <div className="flex items-center space-x-1 bg-white border border-slate-200 rounded-lg px-2 py-1 shadow-2xs text-xs">
          <Type className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <span className="text-slate-500 font-medium font-khmer text-[11px] shrink-0">
            {label || (language === 'km' ? 'ពុម្ពអក្សរ:' : 'Font:')}
          </span>

          {!isCustomMode ? (
            <select
              value={isPreset ? selectedFont : '__custom__'}
              onChange={handleSelectChange}
              className="font-bold text-slate-800 bg-transparent focus:outline-hidden cursor-pointer text-xs max-w-[170px] truncate"
            >
              {fonts.map((f) => (
                <option key={f.name} value={f.name}>
                  {f.name} {f.installed ? '✓' : ''}
                </option>
              ))}
              <option value="__custom__">
                {language === 'km' ? '✍️ បញ្ចូលផ្ទាល់ខ្លួន...' : '✍️ Custom font...'}
              </option>
            </select>
          ) : (
            <div className="flex items-center space-x-1">
              <input
                type="text"
                value={customFontInput}
                onChange={handleCustomInputChange}
                placeholder={language === 'km' ? 'ឈ្មោះពុម្ពអក្សរ...' : 'Font name...'}
                className="w-28 px-1.5 py-0.5 text-xs font-bold text-indigo-700 bg-indigo-50/50 border border-indigo-200 rounded focus:outline-indigo-500"
                autoFocus
              />
              <button
                type="button"
                onClick={() => {
                  setIsCustomMode(false);
                  if (fonts.length > 0) onChange(fonts[0].name);
                }}
                className="text-[10px] text-slate-400 hover:text-slate-700 px-1 py-0.5 rounded cursor-pointer"
                title={language === 'km' ? 'ត្រឡប់ទៅបញ្ជីពុម្ពអក្សរ' : 'Back to preset list'}
              >
                ✕
              </button>
            </div>
          )}

          {/* Quick upload button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            title={language === 'km' ? 'ដំឡើង/ផ្ទុកឡើងឯកសារពុម្ពអក្សរ (.ttf / .otf)' : 'Install/Upload font (.ttf / .otf)'}
            className="text-slate-400 hover:text-indigo-600 p-0.5 rounded cursor-pointer"
          >
            {isUploading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
            ) : (
              <UploadCloud className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>
    );
  }

  // Full / Card variant for UploadStep and DownloadStep
  return (
    <div className={`w-full max-w-md mx-auto ${className}`}>
      {/* Hidden file input for font installation */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".ttf,.otf"
        className="hidden"
        onChange={handleFontFileUpload}
      />

      <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3 sm:p-4 text-left shadow-xs transition hover:border-indigo-200">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Type className="w-4 h-4" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-800 font-khmer block">
                {label || (language === 'km' ? 'ជ្រើសរើសពុម្ពអក្សរខ្មែរ (Khmer Font)' : 'Choose Khmer Font')}
              </label>
              <span className="text-[10px] text-slate-500 font-khmer">
                {language === 'km'
                  ? 'កំណត់ពុម្ពអក្សរដែលអ្នកចង់បានសម្រាប់ឯកសារ'
                  : 'Selected font will format all Khmer text'}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            {/* Direct Upload Font File Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="inline-flex items-center space-x-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-1 rounded-lg transition cursor-pointer"
              title={language === 'km' ? 'ដំឡើង/ផ្ទុកឡើងឯកសារពុម្ពអក្សរ (.ttf / .otf)' : 'Install font file (.ttf / .otf)'}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin text-emerald-600" />
                  <span className="font-khmer text-[10px]">{language === 'km' ? 'កំពុងផ្ទុក...' : 'Uploading...'}</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-3 h-3 text-emerald-600" />
                  <span className="font-khmer">{language === 'km' ? 'ផ្ទុកឡើង .TTF' : 'Upload .TTF'}</span>
                </>
              )}
            </button>

            {/* Toggle Type Custom Name */}
            <button
              type="button"
              onClick={() => {
                if (isCustomMode) {
                  setIsCustomMode(false);
                  if (fonts.length > 0) onChange(fonts[0].name);
                } else {
                  setIsCustomMode(true);
                }
              }}
              className="inline-flex items-center space-x-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50/80 hover:bg-indigo-100 px-2 py-1 rounded-lg transition cursor-pointer"
            >
              {isCustomMode ? (
                <>
                  <Check className="w-3 h-3" />
                  <span className="font-khmer">{language === 'km' ? 'បញ្ជីហ្វុន' : 'Preset list'}</span>
                </>
              ) : (
                <>
                  <Edit3 className="w-3 h-3" />
                  <span className="font-khmer">{language === 'km' ? 'បញ្ចូលឈ្មោះហ្វុន' : 'Type name'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {uploadError && (
          <div className="mb-2 px-2.5 py-1 text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg font-khmer">
            {uploadError}
          </div>
        )}

        {!isCustomMode ? (
          <div className="relative">
            <select
              value={isPreset ? selectedFont : '__custom__'}
              onChange={handleSelectChange}
              className="w-full bg-white border border-slate-200 text-slate-800 font-semibold text-xs rounded-xl px-3 py-2.5 shadow-2xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition cursor-pointer"
            >
              {fonts.map((f) => (
                <option key={f.name} value={f.name}>
                  {f.name} &bull; {f.category} {f.installed ? ' (Ready on PC)' : ''}
                </option>
              ))}
              <option value="__custom__">
                {language === 'km' ? '✍️ បញ្ចូលឈ្មោះពុម្ពអក្សរផ្ទាល់ខ្លួន (Custom)...' : '✍️ Type custom font name...'}
              </option>
            </select>
          </div>
        ) : (
          <div className="space-y-1.5">
            <div className="relative">
              <input
                type="text"
                value={customFontInput}
                onChange={handleCustomInputChange}
                placeholder={
                  language === 'km'
                    ? 'វាយបញ្ចូលឈ្មោះពុម្ពអក្សរ (ឧ. Khmer OS Bokor, Noto Sans Khmer...)'
                    : 'Type font name (e.g. Khmer OS Bokor, Noto Sans Khmer...)'
                }
                className="w-full bg-white border border-indigo-300 text-indigo-900 font-bold text-xs rounded-xl px-3 py-2.5 shadow-2xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                autoFocus
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-500 font-khmer pl-1">
              <span>
                {language === 'km'
                  ? '💡 វាយឈ្មោះពុម្ពអក្សរ ឬចុច "ផ្ទុកឡើង .TTF" ខាងលើដើម្បីដំឡើង'
                  : '💡 Type font name or click "Upload .TTF" above to install font file'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsCustomMode(false);
                  if (fonts.length > 0) onChange(fonts[0].name);
                }}
                className="text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
              >
                {language === 'km' ? 'ត្រឡប់ទៅបញ្ជី' : 'Back to list'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
