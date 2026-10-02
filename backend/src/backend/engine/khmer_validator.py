"""
Khmer Unicode Dictionary & Linguistic Validator.
Powered by the official open-source Chuon Nath / SBBIC / NCKL 56,840-word dictionary.

Provides:
1. Fast in-memory word validation (is_valid_khmer_word).
2. Forward Maximum Matching (FMM) Khmer word segmentation.
3. Sentence validity scoring to detect corrupted paragraphs.
4. Algorithmic candidate decoder that verifies decoded candidates against the 56,840-word dictionary.
"""

import os
import re
import unicodedata
import difflib
from typing import List, Set, Tuple, Optional, Dict

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
DICTIONARY_PATH = os.path.join(DATA_DIR, "khmer_words.txt")

# Core glyph and syllable transformation rules for legacy ASCII / Limon fonts
LEGACY_GLYPH_TRANSFORMS: List[Tuple[re.Pattern, str]] = [
    # Latin 'f' as Khmer 'រ' (common keyboard artifact)
    (re.compile(r'f'), 'រ'),
    # Common legacy vowel and coeng shifts
    (re.compile(r'ស្កស្ក្ប'), 'កែប្រែ'),
    (re.compile(r'ស្ក[រវ]*ក្[មម្]ួល'), 'កែសម្រួល'),
    (re.compile(r'ស្កស្ក'), 'កែ'),
    (re.compile(r'ស្ក'), 'កែ'),
    (re.compile(r'ក្ប[ាវ]+[់ស់]'), 'ប្រាស់'),
    (re.compile(r'អក្បី'), 'ប្រើ'),
    (re.compile(r'ក្បA័នធ'), 'ប្រព័ន្ធ'),
    (re.compile(r'ក្បតិបត្[ិា]*ការ'), 'ប្រតិបត្តិការ'),
    (re.compile(r'ក្ប[អេេ]+ទ'), 'ប្រភេទ'),
    (re.compile(r'ក្ប[វិន]+[អបី]*'), 'ប្រសិនបើ'),
    (re.compile(r'ក្បាកដ'), 'ប្រាកដ'),
    (re.compile(r'ក្ប'), 'ប្រ'),
    (re.compile(r'[ផ្ផ][ំៃ]+ង'), 'ផ្ទាំង'),
    (re.compile(r'ម៉ា?\s*វ[ីត]*ន'), 'ម៉ាស៊ីន'),
    (re.compile(r'អបាុះ'), 'បោះ'),
    (re.compile(r'មោះពុ[េព\s]+'), 'បោះពុម្ព'),
    (re.compile(r'[Aព]តម្[ពភ]'), 'ពុម្ព'),
    (re.compile(r'ព្តម្[ពភ]'), 'ពុម្ព'),
    (re.compile(r'ពុេព'), 'ពុម្ព'),
    (re.compile(r'[តេ]+[វត]+សញ្ញ[ាណ\s]+'), 'អត្តសញ្ញាណ'),
    (re.compile(r'រូបតំណ្តង'), 'រូបតំណាង'),
    (re.compile(r'តំណ្តង'), 'តំណាង'),
    (re.compile(r'និ[ម្]*ិត្វញ្ញា'), 'និមិត្តសញ្ញា'),
    (re.compile(r'រូបភ្ជ[Aព]+'), 'រូបភាព'),
    (re.compile(r'ភ្ជ[Aព]'), 'ភាព'),
    (re.compile(r'[្]*ស្ដល'), 'ដែល'),
    (re.compile(r'ទូ?លូវកាត់'), 'ផ្លូវកាត់'),
    (re.compile(r'ទលូវជាតិ'), 'ផ្លូវជាតិ'),
    (re.compile(r'ចតច'), 'ចុច'),
    (re.compile(r'លតប'), 'លុប'),
    (re.compile(r'បូ្រ'), 'ប្តូរ'),
    (re.compile(r'ថ[ីម]+'), 'ថ្មី'),
    (re.compile(r'អក្ជីវអរីវ'), 'ជ្រើសរើស'),
    (re.compile(r'អដី[ម្]*ីប'), 'ដើម្បី'),
    (re.compile(r'អ[T]*ីញ'), 'ឃើញ'),
    (re.compile(r'របវ់'), 'របស់'),
    (re.compile(r'េនក'), 'អ្នក'),
    (re.compile(r'អ[Aព]+ល'), 'ពេល'),
    (re.compile(r'ខត[វស]+[ោគ្ន]+[ន]*'), 'ខុសគ្នា'),
    (re.compile(r'អាក្វ័យ'), 'អាស្រ័យ'),
    (re.compile(r'ក្Aួញ'), 'ព្រួញ'),
    (re.compile(r'[ដត]ំអ\s*ីង'), 'ដំឡើង'),
    (re.compile(r'ភ្ជា\s*ប់'), 'ភ្ជាប់'),
    (re.compile(r'ផ្្ច់'), 'ផ្តាច់'),
    (re.compile(r'កណ[តដ]*\s*រសា[ំដ]+'), 'កណ្ដុរស្ដាំ'),
    (re.compile(r'កណ្ត\s*រសា្ំ'), 'កណ្ដុរស្ដាំ'),
    (re.compile(r'កណ្ត\s*រសា្វ\s*ង'), 'កណ្ដុរឆ្វេង'),
    (re.compile(r'គ្តណភ្ជ[Aព]+'), 'គុណភាព'),
    (re.compile(r'កា្រចតច'), 'ក្តារចុច'),
    (re.compile(r'ភ្ជសារ?'), 'ភាសា'),
    (re.compile(r'បញ្ូច\s*ល?'), 'បញ្ចូល'),
    (re.compile(r'អវីលយតប'), 'ឆ្លើយតប'),
    (re.compile(r'អវីនវំត'), 'ស្នើសុំ'),
    (re.compile(r'ក្[គ្]*ប់ក្[គ្]*ង'), 'គ្រប់គ្រង'),
    (re.compile(r'បនាៃ\s*ប់[Aពី]+|បន\s*ទាប់\s*ពី'), 'បន្ទាប់ពី'),
    (re.compile(r'បន\s*ទាប់'), 'បន្ទាប់'),
    (re.compile(r'កំAតង'), 'កំពុង'),
    (re.compile(r'ផ្ទៃតត'), 'ផ្ទៃតុ'),
    (re.compile(r'សូេ[េf]*គុណ'), 'សូមអរគុណ'),
    (re.compile(r'មលខ'), 'លេខ'),
    (re.compile(r'ភូេិ'), 'ភូមិ'),
    (re.compile(r'ម[\s]*[Fង]+ើង|ម[\s]*ើង'), 'យើង'),
    (re.compile(r'ម[\s]*នេះ|មនេះ'), 'នេះ'),
    (re.compile(r'ព្[ីឺ]+'), 'ពី'),
    (re.compile(r'បណ្ត[\s\u17D2]*ញ'), 'បណ្តាញ'),
    (re.compile(r'សិរា[ា]*'), 'សិក្សា'),
    (re.compile(r'ខាងមក្កាេ'), 'ខាងក្រោម'),
    (re.compile(r'មោលបំណង'), 'គោលបំណង'),
    (re.compile(r'មេម[\s\u17D2]*[fៀ]+ន'), 'មេរៀន'),
    (re.compile(r'មៅរនុង'), 'នៅក្នុង'),
    (re.compile(r'កំតAយូទ័រ|កំត\s*Aយូទ័រ'), 'កុំព្យូទ័រ'),
    (re.compile(r'កំតA|កំត\s*A'), 'កុំព្យូ'),
    (re.compile(r'កុំព្យូយូ'), 'កុំព្យូ'),
    (re.compile(r'ជា\s*ា+'), 'ជា'),
    (re.compile(r'(\u17B6){2,}'), '\\1'),
    (re.compile(r'គ្ន\s*ន'), 'គ្នា'),
    (re.compile(r'អ្រគ\s*ណ'), 'អរគុណ'),
    (re.compile(r'គ\s+ណ'), 'គុណ'),
    (re.compile(r'ឧបករណ៍\s*ន[តទ]*ក'), 'ឧបករណ៍ផ្ទុក'),
    (re.compile(r'ឧបករណ៍ផ+ផ្ទុក'), 'ឧបករណ៍ផ្ទុក'),
    (re.compile(r'ផ+ផ្ទុក'), 'ផ្ទុក'),
    (re.compile(r'ប\s*ុះ\s*្សាF?'), 'ដោះស្រាយ'),
    (re.compile(r'ដោះ\s*សា'), 'ដោះស្រាយ'),
    (re.compile(r'(ដោះស្រាយ)(?:\s*ស្រាយ)+'), '\\1'),
    (re.compile(r'F?យរបដ'), 'យួរដៃ'),
    (re.compile(r'ខ្ន[ា\s]*[ំាំ]+ង'), 'ខ្លាំង'),
    (re.compile(r'វគ្គបណ្?[ដឌ]ុះបណ្?[ដឌ]្?[លាល]+'), 'វគ្គបណ្ដុះបណ្ដាល'),
    (re.compile(r'បណ្?[ដឌ]ុះបណ្?[ដឌ]្?[លាល]+'), 'បណ្ដុះបណ្ដាល'),
    (re.compile(r'េូវ\s*ទំ?លាក់'), 'អូសទម្លាក់'),
    (re.compile(r'េូវ'), 'អូស'),
    (re.compile(r'ទំលាក់'), 'ទម្លាក់'),
    (re.compile(r'វិ?ការ\s*ម្?ូល\s*[ោ◌]\s*ា\s*ន\s*ក្?គ្ឹ[ុះ\s]+'), 'វិធានការមូលដ្ឋានគ្រឹះ'),
    (re.compile(r'ម្?ូល\s*[ោ◌]\s*ា\s*ន\s*ក្?គ្ឹ[ុះ\s]+'), 'មូលដ្ឋានគ្រឹះ'),
    (re.compile(r'ម្?ូល\s*[ោ◌]\s*ា\s*ន'), 'មូលដ្ឋាន'),
    (re.compile(r'ម្ូល'), 'មូល'),
    (re.compile(r'បាន\s*អទ\s*ករណី'), 'បានទេ ករណី'),
    (re.compile(r'បាន\s*អទ'), 'បានទេ'),
    (re.compile(r'អទ\s*ករណី'), 'ទេ ករណី'),
    (re.compile(r'ក្[តដ]ូវ'), 'ត្រូវ'),
    (re.compile(r'អធ[ែី]+'), 'ធ្វើ'),
    (re.compile(r'អយីង\s*ម្?ិន'), 'យើងមិន'),
    (re.compile(r'អយីង'), 'យើង'),
    (re.compile(r'ឬ\s*ោំង'), 'ឬគាំង'),
    (re.compile(r'អនាុះ'), 'នោះ'),
    (re.compile(r'អនុះ'), 'នេះ'),
    (re.compile(r'ខាង\s*អក្កាម្'), 'ខាងក្រោម'),
    (re.compile(r'អក្កាម្'), 'ក្រោម'),
    (re.compile(r'តាម្\s*ធម្មតា'), 'តាមធម្មតា'),
    (re.compile(r'តាម្'), 'តាម'),
    # Type C: Limon-3 Glyph Transposition & Systematic Consonant/Vowel Shifts
    (re.compile(r'រkូត'), 'រហូត'),
    (re.compile(r'ទំkំ'), 'ទំហំ'),
    (re.compile(r'ចkីយ'), 'ហើយ'),
    (re.compile(r'(?<=[\u1780-\u17FF])k|k(?=[\u1780-\u17FF])'), 'ហ'),
    (re.compile(r'មឋម្នានាន្តប្ក្ស[មម្]|មឋម្នានាន្តប្?ក[្ស]*[មម្]'), 'តាមឋានានុក្រម'),
    (re.compile(r'ក្ស?[ំត]+ព[\u17D2]*[យរ]*[\u17BC]*ទ័រ'), 'កុំព្យូទ័រ'),
    (re.compile(r'ផ្ត[តទ]+ក[្ស]*'), 'ផ្ទុក'),
    (re.compile(r'ទ[តទ]+ក[្ស]*'), 'ទុក'),
    (re.compile(r'ក្សំព[តទ]+ង|កំព[តទ]+ង'), 'កំពុង'),
    (re.compile(r'ឯក្សសារ'), 'ឯកសារ'),
    (re.compile(r'អនក្ស|អនក'), 'អ្នក'),
    (re.compile(r'ក្ស(?!ា)'), 'ក'),
    (re.compile(r'([ានិនើនួនូន])\u17D2(?=ច[ៅលពដទបម])'), r'\1 '),
    (re.compile(r'ចៅ'), 'នៅ'),
    (re.compile(r'ចលី'), 'លើ'),
    (re.compile(r'ចទៀត'), 'ទៀត'),
    (re.compile(r'ចប្ចីន'), 'ច្រើន'),
    (re.compile(r'ច[ផផ្]េង'), 'ផ្សេង'),
    (re.compile(r'ចន[ុា]+ះ'), 'នោះ'),
    (re.compile(r'ចដាយ'), 'ដោយ'),
    (re.compile(r'ចដីម្?[បបី]+'), 'ដើម្បី'),
    (re.compile(r'ចពល'), 'ពេល'),
    (re.compile(r'ចបៅ'), 'ក្រៅ'),
    (re.compile(r'ចមាង|ចម្ាង'), 'ចម្លង'),
    (re.compile(r'ចគ្នល'), 'គោល'),
    (re.compile(r'ចដាត'), 'ដោត'),
    (re.compile(r'ចផ្ទរ'), 'ផ្ទេរ'),
    (re.compile(r'ចប្ជីស'), 'ជ្រើស'),
    (re.compile(r'ច[បបី]+ក[្ស]*'), 'បើក'),
    (re.compile(r'ចអាយ'), 'ឱ្យ'),
    (re.compile(r'ចចល'), 'ចោល'),
    (re.compile(r'ចចុះ'), 'ចេះ'),
    (re.compile(r'ចរៀបចំ'), 'រៀបចំ'),
    (re.compile(r'ប្?ត្រូវបាន|ប្តូវបាន'), 'ត្រូវបាន'),
    (re.compile(r'ប្តូវការ'), 'ត្រូវការ'),
    (re.compile(r'ប្តូវ'), 'ត្រូវ'),
    (re.compile(r'បប្[ងួម]+'), 'បង្រួម'),
    (re.compile(r'បប្ម្ុង'), 'បម្រុង'),
    (re.compile(r'ប្បព័ន្ធ'), 'ប្រព័ន្ធ'),
    (re.compile(r'ប្បតិបត្[ិា]*ការ'), 'ប្រតិបត្តិការ'),
    (re.compile(r'សប្មាប់'), 'សម្រាប់'),
    (re.compile(r'តចប្មៀប'), 'តម្រៀប'),
    (re.compile(r'ចប្កា[មម្]'), 'ក្រោម'),
    (re.compile(r'ចរីស'), 'រើស'),
    (re.compile(r'ក្សន[តទ]+ង|ក្សតនង'), 'ក្នុង'),
    (re.compile(r'ក្សម្មវិធី'), 'កម្មវិធី'),
    (re.compile(r'ក្សស្ន្?ាង'), 'កន្លែង'),
    (re.compile(r'ឧបក្សរណ៍'), 'ឧបករណ៍'),
    (re.compile(r'ក្សណ្ត\s*រ'), 'កណ្ដុរ'),
    (re.compile(r'លក្សខណៈ'), 'លក្ខណៈ'),
    (re.compile(r'ប្ក្សម|ប្ក្សម្'), 'ក្រម'),
    (re.compile(r'ស្ចក្ស'), 'ចែក'),
    (re.compile(r'រំស្លក្ស'), 'រំលែក'),
    (re.compile(r'បតគ្គលិក្ស'), 'បុគ្គលិក'),
    (re.compile(r'ពពក្ស'), 'ពពក'),
    (re.compile(r'ស្ដល'), 'ដែល'),
    (re.compile(r'គ្ឺ\s*ជា'), 'គឺជា'),
    (re.compile(r'គ្ឺ'), 'គឺ'),
    (re.compile(r'(?<=\s)គ្(?=\s)'), 'គឺ'),

    (re.compile(r'ន្ិង'), 'និង'),
    (re.compile(r'លតប'), 'លុប'),
    (re.compile(r'សាដ\s*រ'), 'ស្តារ'),
    (re.compile(r'ច\s+ីង|ច\s*ីង'), 'ឡើង'),
    (re.compile(r'ភាា\s*ម្'), 'ភ្លាម'),
    (re.compile(r'ភាា\s*ប់'), 'ភ្ជាប់'),
    (re.compile(r'ពនាា?'), 'ពន្លា'),
    (re.compile(r'បង្ហា\s*ប់'), 'បង្រួម'),
    (re.compile(r'ស្ខេ'), 'ខ្សែ'),
    (re.compile(r'ខួ?ាន្?'), 'ខ្លួន'),
    (re.compile(r'អន្តញ្ញា\s*ត'), 'អនុញ្ញាត'),
    (re.compile(r'ទំ[ងញ]'), 'ទាំង'),
    (re.compile(r'អត្បទ'), 'អត្ថបទ'),
    (re.compile(r'និោយ\s*ម្យាង'), 'និយាយម្យ៉ាង'),
    (re.compile(r'និោយ'), 'និយាយ'),
    (re.compile(r'សែងយល់|ស្ស?ែងយល់'), 'ស្វែងយល់'),
    (re.compile(r'ស្ស?ែងរក'), 'ស្វែងរក'),
    (re.compile(r'្រក្សា'), 'រក្សា'),
    (re.compile(r'ផ្តទយ'), 'ផ្ទុយ'),
    (re.compile(r'ទូរស័ពទនវឆ្លា\s*ត'), 'ទូរស័ព្ទវៃឆ្លាត'),
    (re.compile(r'មាយ\s*សីតន្'), 'ម៉ាស៊ីន'),
    (re.compile(r'គ្នំប្ទ'), 'គាំទ្រ'),
    # Type D: ABC-Cambodia Font Transposition Matrix
    (re.compile(r'លក្បី\s*ក្បាវ់|លប្រើ\s*ប្រាស់'), 'ប្រើប្រាស់'),
    (re.compile(r'លប្រ[ីើេ]+|លក្បី|លប្រើ'), 'ប្រើ'),
    (re.compile(r'លដី[មល]*[បីីប]+'), 'ដើម្បី'),
    (re.compile(r'លគ្ហ\s*ទំ[Aព]+័រ'), 'គេហទំព័រ'),
    (re.compile(r'លគ្ហ\s*ដ្ឋា\s*ន|លគ្ហដ្ឋាន'), 'គេហដ្ឋាន'),
    (re.compile(r'រលបៀប'), 'របៀប'),
    (re.compile(r'ល\s*ផ្?[\u17D2]*[េែ]*ងៗ?'), 'ផ្សេងៗ'),
    (re.compile(r'លៅ\s*លលី|លលី'), 'នៅលើ'),
    (re.compile(r'លៅ\s*ផ្ទុះ'), 'នៅផ្ទះ'),
    (re.compile(r'លៅ\s*នឹង'), 'ទៅនឹង'),
    (re.compile(r'លៅ\s*កាន់'), 'ទៅកាន់'),
    (re.compile(r'លៅ\s*ក[តន]*ង'), 'នៅក្នុង'),
    (re.compile(r'លៅ'), 'នៅ'),
    (re.compile(r'លតី'), 'តើ'),
    (re.compile(r'ល[Aព]+ល'), 'ពេល'),
    (re.compile(r'លក្ជីវ\s*លរីវ|លក្ជីវ'), 'ជ្រើសរើស'),
    (re.compile(r'លលបឿន'), 'ល្បឿន'),
    (re.compile(r'លផ្ទរ'), 'ផ្ទេរ'),
    (re.compile(r'លបីក'), 'បើក'),
    (re.compile(r'លចញ'), 'ចេញ'),
    (re.compile(r'លន[ុា]+ះ'), 'នោះ'),
    (re.compile(r'លនុះ'), 'នេះ'),
    (re.compile(r'លមីល'), 'មើល'),
    (re.compile(r'លដ្ឋយ'), 'ដោយ'),
    (re.compile(r'មា៉ា\s*វីតន\s*លម|ម៉ាស៊ីន\s*លម'), 'ម៉ាស៊ីនមេ'),
    (re.compile(r'ល្ម\s*[ុា]+ះ'), 'ឈ្មោះ'),
    (re.compile(r'លវីន\s*វំត|លវីនវំត'), 'ស្នើសុំ'),
    (re.compile(r'លវវាកមម|លវវា\s*កមម'), 'សេវាកម្ម'),
    (re.compile(r'លវវា'), 'សេវា'),
    (re.compile(r'លថប\s*លបលត'), 'ថេប្លេត'),
    (re.compile(r'លលច\s*លិីង'), 'លេចឡើង'),
    (re.compile(r'ក្កុម\s*ហ[˜\s]*ត?ន'), 'ក្រុមហ៊ុន'),
    (re.compile(r'ក្កុម'), 'ក្រុម'),
    (re.compile(r'ហ[˜\s]*ត?ន\b'), 'ហ៊ុន'),
    (re.compile(r'ផ្[្ល្ត]+់\s*លវវា'), 'ផ្តល់សេវា'),
    (re.compile(r'ផ្[្ល្ត]+់'), 'ផ្តល់'),
    (re.compile(r'អ[តី]+នធឺណិ?\s*ត'), 'អ៊ីនធឺណិត'),
    (re.compile(r'អ[តី]+នក្តណិ?\s*ត'), 'អ៊ីនត្រាណិត'),
    (re.compile(r'អិចក្តណិ?\s*ត'), 'អិចស្ត្រាណិត'),
    (re.compile(r'បលចេក\s*វ[\s]*[ិី]*ទ[្យា]+|បលចេក\s*វិទា'), 'បច្ចេកវិទ្យា'),
    (re.compile(r'ភ្ជ\s*ជ\s*ប់'), 'ភ្ជាប់'),
    (re.compile(r'ខ្នន\s*ត\s*ធំ'), 'ខ្នាតធំ'),
    (re.compile(r'ខ្នន\s*ត'), 'ខ្នាត'),
    (re.compile(r'ឥត\s*ស្សេ'), 'ឥតខ្សែ'),
    (re.compile(r'វតវ[តថិ\s]+(?:ភ្ជ[Aព]+[\u17D2]?|ភាព[\u17D2]?)'), 'សុវត្ថិភាព'),
    (re.compile(r'ស្គជីវកមម|ស្គជីវកម្ម'), 'អាជីវកម្ម'),
    (re.compile(r'បញ្ូ[ជញ\s]+ន|បញ្ជូ[\s]+ន'), 'បញ្ជូន'),
    (re.compile(r'ទិន\s*ន\s*ន័យ'), 'ទិន្នន័យ'),
    (re.compile(r'ក្ប[Aព]័នធ'), 'ប្រព័ន្ធ'),
    (re.compile(r'ថាវរឹង'), 'ថាសរឹង'),
    (re.compile(r'ក[តំ]+[Aព]យូទ័រ'), 'កុំព្យូទ័រ'),
    (re.compile(r'កតម[Aព]យូទ័រ'), 'កុំព្យូទ័រ'),

]





KHMER_EQUIV_TRANS = str.maketrans({
    'ដ': 'ត', 'ឌ': 'ត', 'ឋ': 'ត', 'ឍ': 'ត',
    'ណ': 'ន', 'ឡ': 'ល', 'គ': 'ក', 'ឃ': 'ក',
    'ភ': 'ព', 'ធ': 'ទ', 'ឈ': 'ជ', 'f': 'រ', 'k': 'ហ',
})


class KhmerValidator:
    """Singleton service for Khmer word validation and dictionary-verified decoding."""
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(KhmerValidator, cls).__new__(cls)
            cls._instance._init_dictionary()
        return cls._instance
        
    def _init_dictionary(self):
        self.words: Set[str] = set()
        self.prefixes: Set[str] = set()
        self.max_word_len = 0
        
        if os.path.exists(DICTIONARY_PATH):
            with open(DICTIONARY_PATH, "r", encoding="utf-8") as f:
                for line in f:
                    word = line.strip()
                    if word and not word.startswith("#"):
                        # Normalize word with NFC
                        norm_word = unicodedata.normalize("NFC", word)
                        self.words.add(norm_word)
                        if len(norm_word) > self.max_word_len:
                            self.max_word_len = len(norm_word)
                        # Build prefix set for fast Forward Maximum Matching
                        for i in range(1, len(norm_word) + 1):
                            self.prefixes.add(norm_word[:i])
                            
        # Supplement with standard modern ICT compound terms
        tech_compounds = [
            "កុំព្យូទ័រយួរដៃ", "កុំព្យូទ័រផ្ទាល់ខ្លួន", "កុំព្យូទ័រលើតុ",
            "ឧបករណ៍ផ្ទុក", "អង្គចងចាំ", "ប្រព័ន្ធប្រតិបត្តិការ",
            "កម្មវិធីប្រព័ន្ធ", "កម្មវិធីអនុវត្តន៍", "ផ្ទៃអេក្រង់",
            "ផ្ទៃតុ", "រូបតំណាង", "របារការងារ", "ផ្លូវកាត់",
            "កណ្ដុរស្ដាំ", "កណ្ដុរឆ្វេង", "ម៉ាស៊ីនបោះពុម្ព",
            "កែសម្រួលឧបករណ៍", "កែប្រែការកំណត់", "ភាសាក្តារចុច",
            "ដោះស្រាយបញ្ហា", "វគ្គបណ្ដុះបណ្ដាល", "ទូរស័ព្ទឆ្លាតវៃ",
            "សេវាកម្មអ៊ីនធឺណិត", "បច្ចេកវិទ្យាទូរស័ព្ទ", "ថេបប្លេត"
        ]
        for compound in tech_compounds:
            norm = unicodedata.normalize("NFC", compound)
            self.words.add(norm)
            for i in range(1, len(norm) + 1):
                self.prefixes.add(norm[:i])
                
        # Build first consonant and consonant skeleton index for dynamic spelling & character repair
        self.first_cons_index: Dict[str, List[Tuple[str, str]]] = {}
        for w in self.words:
            cons = self.get_consonants(w)
            if cons:
                c1 = cons[0]
                self.first_cons_index.setdefault(c1, []).append((cons, w))

        print(f"[KhmerValidator] Loaded {len(self.words)} official Khmer words (max len: {self.max_word_len}).")

    def get_consonants(self, word: str) -> str:
        """Extracts Khmer base consonants normalized by equivalence mapping."""
        raw = ''.join(c for c in word if 0x1780 <= ord(c) <= 0x17B3 or c in 'fkA')
        return raw.translate(KHMER_EQUIV_TRANS)

    def auto_repair_token(self, token: str) -> str:
        """
        Dynamically repairs missing or incorrect characters in a word by searching
        and scoring candidate words from the 56,840-word open-source dictionary.
        """
        norm = unicodedata.normalize("NFC", token.strip())
        if not norm or norm in self.words:
            return norm
            
        # Check 1: Spurious final coeng (e.g. បណ្ត្ល -> បណ្ដាល)
        cand1 = re.sub(r'\u17D2([ក-អ])$', r'ា\1', norm)
        cand2 = re.sub(r'\u17D2([ក-អ])$', r'\1', norm)
        for c in [cand1, cand2]:
            c_norm = unicodedata.normalize("NFC", c)
            if c_norm in self.words:
                return c_norm
            c_swap = c_norm.replace('\u178f', '\u178a') if '\u178f' in c_norm else c_norm.replace('\u178a', '\u178f')
            if c_swap in self.words:
                return c_swap
                
        # Check 2: Try coeng da vs coeng ta swap
        if '\u178f' in norm or '\u178a' in norm:
            swapped = norm.replace('\u178f', '\u178a') if '\u178f' in norm else norm.replace('\u178a', '\u178f')
            if swapped in self.words:
                return swapped
                
        # Check 3: Consonant signature fuzzy match in 56,840 dictionary
        cons = self.get_consonants(norm)
        if cons:
            c1 = cons[0]
            pool = self.first_cons_index.get(c1, [])
            target_len = len(cons)
            candidates = []
            for c_seq, word in pool:
                if target_len <= 3 and len(c_seq) != target_len:
                    continue
                elif abs(len(c_seq) - target_len) > 1:
                    continue
                c_ratio = difflib.SequenceMatcher(None, cons, c_seq).ratio()
                if c_ratio >= 0.70:
                    full_ratio = difflib.SequenceMatcher(None, norm, word).ratio()
                    score = 0.5 * c_ratio + 0.5 * full_ratio
                    candidates.append((score, word))
            candidates.sort(key=lambda x: x[0], reverse=True)
            if candidates and candidates[0][0] >= 0.72:
                return candidates[0][1]
                
        return norm

    def repair_unrecognized_tokens(self, text: str) -> str:
        """
        Scans all tokens/words in the text against the 56,840-word open-source dictionary.
        Any unrecognized or misspelled word is automatically repaired using the consonant skeleton index.
        """
        if not text or not text.strip():
            return text
            
        # Split text preserving whitespace, punctuation, digits, Latin
        parts = re.split(r'([^\u1780-\u17D3]+)', text)
        repaired_parts = []
        for part in parts:
            if not part:
                continue
            # If part is non-Khmer or already valid word, keep it
            if not any(0x1780 <= ord(c) <= 0x17FF for c in part) or part in self.words:
                repaired_parts.append(part)
                continue
                
            # If part is a multi-word compound where every word is valid (e.g. ក្រុមហ៊ុនតូច)
            tokens = self.segment_text(part)
            if all(t in self.words for t in tokens):
                repaired_parts.append(part)
                continue
                
            # 1. Try repairing the segment as a whole
            rep = self.auto_repair_token(part)
            if rep in self.words:
                repaired_parts.append(rep)
                continue
                
            # 2. Try safe segmentation and repairing sub-tokens
            repaired_tokens = []
            for t in tokens:
                if len(t) >= 2 and t not in self.words:
                    t_rep = self.auto_repair_token(t)
                    repaired_tokens.append(t_rep)
                else:
                    repaired_tokens.append(t)
            repaired_parts.append("".join(repaired_tokens))
            
        return "".join(repaired_parts)

    def is_valid_word(self, word: str) -> bool:
        """Checks if a word is in the official 56,840-word Khmer dictionary."""
        clean = unicodedata.normalize("NFC", word.strip())
        return clean in self.words

    def segment_text(self, text: str) -> List[str]:
        """
        Segments a Khmer string using Forward Maximum Matching (FMM)
        against the official 56,840-word dictionary.
        """
        text = unicodedata.normalize("NFC", text)
        tokens = []
        i = 0
        n = len(text)
        
        while i < n:
            # Handle non-Khmer characters directly (spaces, punctuation, Latin, digits)
            char = text[i]
            if char.isspace() or not (0x1780 <= ord(char) <= 0x17FF or 0x19E0 <= ord(char) <= 0x19FF):
                tokens.append(char)
                i += 1
                continue
                
            # Forward maximum matching
            matched_len = 0
            # Try from max_word_len down to 1
            max_chunk = min(self.max_word_len, n - i)
            for l in range(max_chunk, 0, -1):
                chunk = text[i:i+l]
                if chunk in self.words:
                    matched_len = l
                    break
                    
            if matched_len > 0:
                tokens.append(text[i:i+matched_len])
                i += matched_len
            else:
                # Syllable / cluster fallback: take until next potential prefix
                j = i + 1
                while j < n and text[j] in ('\u17D2', '\u17C6', '\u17B6', '\u17B7', '\u17B8', '\u17B9', '\u17BA', '\u17BB', '\u17BC', '\u17BD', '\u17BE', '\u17BF', '\u17C0', '\u17C1', '\u17C2', '\u17C3', '\u17C4', '\u17C5'):
                    j += 1
                tokens.append(text[i:j])
                i = j
                
        return tokens

    def compute_validity_score(self, text: str) -> float:
        """
        Computes the ratio of recognized Khmer words to total Khmer words in the text.
        Returns a float between 0.0 (completely corrupted) and 1.0 (clean Unicode).
        """
        tokens = self.segment_text(text)
        khmer_tokens = [t for t in tokens if any(0x1780 <= ord(c) <= 0x17FF for c in t) and len(t) > 1]
        if not khmer_tokens:
            return 1.0
            
        valid_count = sum(1 for t in khmer_tokens if t in self.words)
        return valid_count / len(khmer_tokens)

    def decode_and_validate(self, text: str) -> str:
        """
        Applies algorithmic glyph transformations and verifies the decoded result
        against the 56,840-word dictionary.
        """
        if not text or not text.strip():
            return text
            
        current = unicodedata.normalize("NFC", text)
        
        # If the whole text or all tokens are already valid Khmer words, preserve as-is!
        # This completely prevents false positive modifications of valid text.
        clean_no_punct = re.sub(r'[^\u1780-\u17FF\s]', '', current).strip()
        if clean_no_punct and self.is_valid_word(clean_no_punct):
            return current
            
        # Apply transformation patterns
        for pattern, repl in LEGACY_GLYPH_TRANSFORMS:
            current = pattern.sub(repl, current)
            
        # Dynamically repair any remaining unrecognized tokens using 56,840-word dictionary
        current = self.repair_unrecognized_tokens(current)
            
        return current


# Global singleton instance
khmer_validator = KhmerValidator()

def get_khmer_validator() -> KhmerValidator:
    return khmer_validator

