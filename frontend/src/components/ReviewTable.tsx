import { useState } from 'react';
import {
  Search,
  Check,
  X,
  Edit2,
  Save,
  Sparkles,
  BookOpen,
  FileCheck,
  CheckCheck,
  XCircle,
  PlusCircle,
} from 'lucide-react';
import type { Language, ReplacementItem } from '../types';
import { translations } from '../i18n/translations';

interface ReviewTableProps {
  replacements: ReplacementItem[];
  onReplacementsChange: (updated: ReplacementItem[]) => void;
  language: Language;
  targetFont: string;
}

export const ReviewTable: React.FC<ReviewTableProps> = ({
  replacements,
  onReplacementsChange,
  language,
  targetFont,
}) => {
  const t = translations[language];

  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  // Add custom rule state
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customOrig, setCustomOrig] = useState('');
  const [customRepl, setCustomRepl] = useState('');
  const [customSlide, setCustomSlide] = useState<number>(-1); // -1 = all slides

  const handleStartEdit = (item: ReplacementItem) => {
    setEditingId(item.id);
    setEditValue(item.replacement);
  };

  const handleSaveEdit = (id: string) => {
    const updated = replacements.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          replacement: editValue.trim() || item.replacement,
          status: 'modified' as const,
          source: 'user_edit' as const,
        };
      }
      return item;
    });
    onReplacementsChange(updated);
    setEditingId(null);
  };

  const handleAddCustomFix = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customOrig.trim() || !customRepl.trim()) return;

    const newItem: ReplacementItem = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      slide_index: customSlide === -1 ? 0 : customSlide,
      shape_id: 'custom_shape',
      original: customOrig.trim(),
      replacement: customRepl.trim(),
      confidence: 1.0,
      source: 'user_edit',
      status: 'accepted',
      explanation: customSlide === -1 ? 'User custom rule (All slides)' : `User custom rule (Slide ${customSlide + 1})`,
    };

    onReplacementsChange([newItem, ...replacements]);
    setCustomOrig('');
    setCustomRepl('');
    setShowAddCustom(false);
  };

  const handleToggleStatus = (id: string, newStatus: 'accepted' | 'rejected') => {
    const updated = replacements.map((item) => {
      if (item.id === id) {
        return { ...item, status: newStatus };
      }
      return item;
    });
    onReplacementsChange(updated);
  };

  const handleAcceptAll = () => {
    const updated = replacements.map((item) => ({ ...item, status: 'accepted' as const }));
    onReplacementsChange(updated);
  };

  const handleRejectAll = () => {
    const updated = replacements.map((item) => ({ ...item, status: 'rejected' as const }));
    onReplacementsChange(updated);
  };

  // Filtered items
  const filteredItems = replacements.filter((item) => {
    const matchesSearch =
      searchTerm === '' ||
      item.original.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.replacement.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.explanation && item.explanation.toLowerCase().includes(searchTerm.toLowerCase())) ||
      `slide ${item.slide_index + 1}`.includes(searchTerm.toLowerCase());

    const matchesSource = sourceFilter === 'all' || item.source === sourceFilter;
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;

    return matchesSearch && matchesSource && matchesStatus;
  });

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'dictionary':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <BookOpen className="w-3 h-3 mr-1" /> {t.source_dictionary}
          </span>
        );
      case 'limon_translit':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <Sparkles className="w-3 h-3 mr-1" /> {t.source_limon}
          </span>
        );
      case 'pdf_alignment':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
            <FileCheck className="w-3 h-3 mr-1" /> {t.source_pdf}
          </span>
        );
      case 'gemini_ai':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <Sparkles className="w-3 h-3 mr-1" /> {t.source_gemini}
          </span>
        );
      case 'user_edit':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Edit2 className="w-3 h-3 mr-1" /> {t.source_user}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700">
            {t.source_heuristic}
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Table Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t.table_search_placeholder}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-khmer"
          />
        </div>

        {/* Filters & Bulk Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          {/* Source Filter */}
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-slate-50 text-slate-700 focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Sources</option>
            <option value="dictionary">Dictionary</option>
            <option value="limon_translit">Limon Translit</option>
            <option value="pdf_alignment">PDF Alignment</option>
            <option value="gemini_ai">Gemini AI</option>
            <option value="heuristic">Heuristic</option>
            <option value="user_edit">Custom Edit</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-slate-50 text-slate-700 focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Statuses</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="modified">Modified</option>
          </select>

          {/* Accept / Reject All */}
          <button
            onClick={handleAcceptAll}
            className="inline-flex items-center space-x-1 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition cursor-pointer"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span className="font-khmer">{t.btn_accept_all}</span>
          </button>
          <button
            onClick={handleRejectAll}
            className="inline-flex items-center space-x-1 px-3 py-2 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition cursor-pointer"
          >
            <XCircle className="w-3.5 h-3.5" />
            <span className="font-khmer">{t.btn_reject_all}</span>
          </button>

          {/* Add Custom Fix Button */}
          <button
            onClick={() => setShowAddCustom(!showAddCustom)}
            className="inline-flex items-center space-x-1 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs transition cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span className="font-khmer">{t.add_custom_fix}</span>
          </button>
        </div>
      </div>

      {/* Add Custom Fix Panel */}
      {showAddCustom && (
        <form
          onSubmit={handleAddCustomFix}
          className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-4 shadow-xs space-y-3"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-indigo-900 font-khmer flex items-center space-x-1.5">
              <PlusCircle className="w-4 h-4 text-indigo-600" />
              <span>{t.add_custom_fix_title}</span>
            </h4>
            <button
              type="button"
              onClick={() => setShowAddCustom(false)}
              className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1 font-khmer">
                {t.add_custom_orig}
              </label>
              <input
                type="text"
                required
                value={customOrig}
                onChange={(e) => setCustomOrig(e.target.value)}
                placeholder="e.g. គមានាគមាន៍"
                className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 text-xs text-rose-700 font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1 font-khmer">
                {t.add_custom_repl}
              </label>
              <input
                type="text"
                required
                value={customRepl}
                onChange={(e) => setCustomRepl(e.target.value)}
                placeholder="e.g. គមនាគមន៍"
                className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 text-xs text-emerald-800 font-khmer font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                style={{ fontFamily: `'${targetFont}', 'Kantumruy Pro', sans-serif` }}
              />
            </div>
            <div className="flex items-end space-x-2">
              <div className="flex-1">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1 font-khmer">
                  {t.table_col_slide}
                </label>
                <select
                  value={customSlide}
                  onChange={(e) => setCustomSlide(parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 text-xs font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 font-khmer"
                >
                  <option value={-1}>{t.all_slides}</option>
                  {Array.from(new Set(replacements.map((r) => r.slide_index))).sort((a,b)=>a-b).map((sIdx) => (
                    <option key={sIdx} value={sIdx}>
                      Slide {sIdx + 1}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer font-khmer h-[38px] shrink-0"
              >
                {t.add_custom_submit}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Table Content */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-600 font-khmer">
                <th className="py-3 px-4 w-20">{t.table_col_slide}</th>
                <th className="py-3 px-4">{t.table_col_original}</th>
                <th className="py-3 px-4">{t.table_col_replacement}</th>
                <th className="py-3 px-4 w-32">{t.table_col_source}</th>
                <th className="py-3 px-4 w-24 text-center">{t.table_col_confidence}</th>
                <th className="py-3 px-4 w-28 text-center">{t.table_col_status}</th>
                <th className="py-3 px-4 w-32 text-center">{t.table_col_actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-khmer">
                    {t.no_corruptions_slide}
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isAccepted = item.status === 'accepted' || item.status === 'modified';
                  const isEditing = editingId === item.id;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/70 transition ${
                        !isAccepted ? 'opacity-50 bg-slate-50/30' : ''
                      }`}
                    >
                      {/* Slide # */}
                      <td className="py-3.5 px-4 font-bold text-slate-700">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-xs">
                          Slide {item.slide_index + 1}
                        </span>
                      </td>

                      {/* Original Corrupted Text */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <span className="font-mono text-xs font-bold text-rose-700 bg-rose-50 px-2 py-1 rounded border border-rose-200 inline-block">
                            {item.original}
                          </span>
                          {item.explanation && (
                            <p className="text-[11px] text-slate-400 italic">
                              {item.explanation}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Proposed Unicode Replacement */}
                      <td className="py-3.5 px-4">
                        {isEditing ? (
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="px-2.5 py-1 text-sm border-2 border-indigo-500 rounded-lg focus:outline-hidden font-khmer w-full"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveEdit(item.id)}
                              className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 cursor-pointer"
                              title={t.save}
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1 rounded-md text-slate-400 hover:bg-slate-100 cursor-pointer"
                              title={t.cancel}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div
                            className="font-bold text-slate-900 text-sm"
                            style={{ fontFamily: `'${targetFont}', 'Kantumruy Pro', sans-serif` }}
                          >
                            <span className="text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200 inline-block">
                              {item.replacement}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Source */}
                      <td className="py-3.5 px-4">
                        {getSourceBadge(item.source)}
                      </td>

                      {/* Confidence */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                          {(item.confidence * 100).toFixed(0)}%
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                            item.status === 'accepted'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.status === 'modified'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {item.status === 'accepted'
                            ? t.accepted
                            : item.status === 'modified'
                            ? 'Modified'
                            : t.rejected}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          {/* Edit button */}
                          <button
                            onClick={() => handleStartEdit(item)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                            title={t.edit}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Accept / Reject Toggle */}
                          {item.status === 'accepted' || item.status === 'modified' ? (
                            <button
                              onClick={() => handleToggleStatus(item.id, 'rejected')}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                              title={t.rejected}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleToggleStatus(item.id, 'accepted')}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
                              title={t.accepted}
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
