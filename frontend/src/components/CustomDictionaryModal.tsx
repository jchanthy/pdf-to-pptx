import React, { useEffect, useRef, useState } from 'react';
import { BookOpen, CheckCircle2, FileUp, Plus, Save, X } from 'lucide-react';
import type { Language } from '../types';
import {
  getCustomDictionary,
  updateCustomDictionary,
  uploadCustomDictionaryFile,
  type CustomDictEntry,
} from '../services/api';

interface CustomDictionaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

export const CustomDictionaryModal: React.FC<CustomDictionaryModalProps> = ({
  isOpen,
  onClose,
  language,
}) => {
  const [wrongWord, setWrongWord] = useState('');
  const [rightWord, setRightWord] = useState('');
  const [entries, setEntries] = useState<CustomDictEntry[]>([]);
  const [rawContent, setRawContent] = useState('');
  const [activeTab, setActiveTab] = useState<'quick' | 'raw'>('quick');
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isKm = language === 'km';

  useEffect(() => {
    if (isOpen) {
      loadDict();
      setStatusMessage(null);
    }
  }, [isOpen]);

  const loadDict = async () => {
    try {
      const data = await getCustomDictionary();
      setEntries(data.entries || []);
      setRawContent(data.raw_content || '');
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const handleAddPair = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wrongWord.trim() || !rightWord.trim()) return;
    setIsSaving(true);
    try {
      const data = await updateCustomDictionary({
        wrong: wrongWord.trim(),
        right: rightWord.trim(),
      });
      setEntries(data.entries || []);
      setRawContent(data.raw_content || '');
      setWrongWord('');
      setRightWord('');
      showToast(
        isKm
          ? 'បានបន្ថែមពាក្យទៅក្នុងវចនានុក្រមដោយជោគជ័យ!'
          : 'Added word pair to dictionary!'
      );
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveRaw = async () => {
    setIsSaving(true);
    try {
      const data = await updateCustomDictionary({
        raw_lines: rawContent,
        replace_all: true,
      });
      setEntries(data.entries || []);
      setRawContent(data.raw_content || '');
      showToast(
        isKm ? 'បានរក្សាទុកវចនានុក្រមដោយជោគជ័យ!' : 'Saved dictionary file!'
      );
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsSaving(true);
    try {
      const data = await uploadCustomDictionaryFile(file);
      setEntries(data.entries || []);
      setRawContent(data.raw_content || '');
      showToast(
        isKm
          ? `បានបញ្ចូលឯកសារពាក្យដោយជោគជ័យ (${data.count} ពាក្យ)!`
          : `Uploaded dictionary file (${data.count} entries)!`
      );
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                {isKm
                  ? 'វចនានុក្រមផ្ទាល់ខ្លួន (បន្ថែមពាក្យខុស → ពាក្យត្រូវ)'
                  : 'Custom Dictionary (Upload / Add Misspelled Words)'}
              </h2>
              <p className="text-[11px] text-slate-500">
                {isKm
                  ? 'បន្ថែមពាក្យដែលខុស ឬ Upload ឯកសារ .txt ដើម្បីឱ្យប្រព័ន្ធកែស្វ័យប្រវត្តិ'
                  : 'Add misspelled words or upload a .txt file for automatic correction'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs & Upload Button */}
        <div className="px-5 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 bg-white">
          <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveTab('quick')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                activeTab === 'quick'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isKm ? 'បន្ថែមពាក្យរហ័ស' : 'Quick Add'} ({entries.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('raw')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                activeTab === 'raw'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isKm ? 'កែសម្រួលបញ្ជីទាំងមូល (Bulk Text)' : 'Bulk Edit (custom_dictionary.txt)'}
            </button>
          </div>

          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSaving}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition cursor-pointer"
            >
              <FileUp className="w-3.5 h-3.5" />
              <span>{isKm ? 'Upload ឯកសារ (.txt)' : 'Upload .txt File'}</span>
            </button>
          </div>
        </div>

        {/* Status Toast */}
        {statusMessage && (
          <div className="mx-5 mt-3 px-3.5 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{statusMessage}</span>
          </div>
        )}

        {/* Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {activeTab === 'quick' ? (
            <>
              {/* Add New Pair Form */}
              <form
                onSubmit={handleAddPair}
                className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {isKm ? 'ពាក្យខុស (Incorrect Word)' : 'Incorrect / Corrupted Word'}
                    </label>
                    <input
                      type="text"
                      value={wrongWord}
                      onChange={(e) => setWrongWord(e.target.value)}
                      placeholder={isKm ? 'ឧ. មា"លាវ ឬ ធី សុហវី' : 'e.g. មា"លាវ'}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {isKm ? 'ពាក្យត្រូវ (Correct Word)' : 'Correct Word'}
                    </label>
                    <input
                      type="text"
                      value={rightWord}
                      onChange={(e) => setRightWord(e.target.value)}
                      placeholder={isKm ? 'ឧ. ម៉ាល់វែរ ឬ ធី សុហ្វី' : 'e.g. ម៉ាល់វែរ'}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSaving || !wrongWord.trim() || !rightWord.trim()}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isKm ? 'បន្ថែមពាក្យ' : 'Add to Dictionary'}</span>
                  </button>
                </div>
              </form>

              {/* Current Entries List */}
              <div>
                <h3 className="text-xs font-bold text-slate-700 mb-2">
                  {isKm
                    ? `បញ្ជីពាក្យដែលបានបន្ថែម (${entries.length})`
                    : `Saved Custom Replacements (${entries.length})`}
                </h3>
                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto divide-y divide-slate-100">
                  {entries.length === 0 ? (
                    <p className="p-4 text-center text-xs text-slate-400">
                      {isKm ? 'មិនទាន់មានពាក្យបន្ថែមនៅឡើយទេ' : 'No custom words added yet.'}
                    </p>
                  ) : (
                    entries.map((item, idx) => (
                      <div
                        key={idx}
                        className="px-3.5 py-2 flex items-center justify-between text-xs hover:bg-slate-50"
                      >
                        <span className="text-rose-600 font-medium break-all">
                          {item.wrong}
                        </span>
                        <span className="text-slate-400 mx-2">→</span>
                        <span className="text-emerald-700 font-bold break-all">
                          {item.right}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-slate-600">
                {isKm
                  ? 'អ្នកអាចសរសេរ ឬ Paste ពាក្យជាច្រើនបន្ទាត់ក្នុងទម្រង់៖ ពាក្យខុស = ពាក្យត្រូវ ឬ ពាក្យខុស (ពាក្យត្រូវ)'
                  : 'Paste multiple lines in format: wrong = right, wrong -> right, or wrong (right)'}
              </p>
              <textarea
                value={rawContent}
                onChange={(e) => setRawContent(e.target.value)}
                rows={10}
                className="w-full p-3 text-xs font-mono rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                placeholder={'មា"លាវ = ម៉ាល់វែរ\nធី សុហវី = ធី សុហ្វី'}
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveRaw}
                  disabled={isSaving}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isKm ? 'រក្សាទុកទាំងអស់' : 'Save Changes'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
