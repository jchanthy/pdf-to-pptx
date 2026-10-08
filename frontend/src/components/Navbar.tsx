import { FileText, Globe } from 'lucide-react';
import type { Language } from '../types';
import { translations } from '../i18n/translations';

interface NavbarProps {
  language: Language;
  onLanguageToggle: () => void;
  onLogoClick?: () => void;
  isLoading?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  language,
  onLanguageToggle,
  onLogoClick,
}) => {
  const t = translations[language];

  return (
    <header className="shrink-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="w-full px-4 sm:px-6 h-12 flex items-center justify-between">
        {/* Brand / Logo */}
        <button
          onClick={onLogoClick}
          type="button"
          className="flex items-center space-x-2 text-left cursor-pointer group focus:outline-hidden transition active:scale-98 select-none"
          title={language === 'km' ? 'ត្រឡប់ទៅទំព័រដើម' : 'Go to Home'}
        >
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs group-hover:bg-indigo-700 transition">
            <FileText className="w-3.5 h-3.5 stroke-[2.2]" />
          </div>
          <span className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight group-hover:text-indigo-600 transition">
            {t.app_title}
          </span>
        </button>

        {/* Right Actions */}
        <div className="flex items-center space-x-3">
          {/* Language Switcher */}
          <button
            onClick={onLanguageToggle}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200/80 text-slate-700 transition cursor-pointer border border-slate-200"
            title="Switch Language"
          >
            <Globe className="w-3.5 h-3.5 text-slate-500" />
            <span>{language === 'km' ? 'ភាសាខ្មែរ 🇰🇭' : 'English 🇬🇧'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
