"""
Khmer Legacy Font (Limon S1/S2/R1 & ABC) to Unicode Converter.
Accurately maps legacy ASCII hack fonts to standard Khmer Unicode (U+1780 - U+17FF),
reorders pre-vowels (េ, ែ, ោ, ៅ, ើ, ៀ) to their correct Unicode grammatical positions,
and converts subscript markers to Khmer Coeng (្ U+17D2).
"""

import re
from typing import Dict, Optional, Tuple

# Limon Consonants
LIMON_CONSONANTS: Dict[str, str] = {
    'k': 'ក', 'x': 'ខ', 'K': 'គ', 'X': 'ឃ', 'g': 'ង',
    'c': 'ច', 'q': 'ឆ', 'C': 'ជ', 'Q': 'ឈ', 'j': 'ញ',
    'd': 'ដ', 'G': 'ឋ', 'D': 'ឌ', 'f': 'ឍ', 'N': 'ណ',
    't': 'ត', 'f': 'ថ', 'T': 'ទ', 'F': 'ធ', 'n': 'ន',
    'b': 'ប', 'p': 'ផ', 'P': 'ព', 'h': 'ភ', 'm': 'ម',
    'y': 'យ', 'r': 'រ', 'l': 'ល', 'v': 'វ',
    's': 'ស', 'H': 'ហ', 'L': 'ឡ', "'": 'អ', 'O': 'អ',
}

# Limon Subscripts (Coeng characters)
LIMON_SUBSCRIPTS: Dict[str, str] = {
    'ø': '្ក', 'Ø': '្ខ', 'ù': '្គ', 'ú': '្ឃ', 'û': '្ង',
    'ü': '្ច', 'ý': '្ឆ', 'þ': '្ជ', 'ÿ': '្ឈ', 'J': '្ញ',
    '¡': '្ដ', '¢': '្ឋ', '£': '្ឌ', '¤': '្ឍ', '¥': '្ណ',
    '¦': '្ត', '§': '្ថ', '¨': '្ទ', '©': '្ធ', 'ª': '្ន',
    '«': '្ប', '¬': '្ផ', '­': '្ព', '®': '្ភ', '¯': '្ម',
    '°': '្យ', '±': '្រ', '²': '្ល', '³': '្វ',
    '´': '្ស', 'µ': '្ហ', '¶': '្ឡ', '·': '្អ',
}

# Limon Vowels & Diacritics
LIMON_VOWELS: Dict[str, str] = {
    'a': 'ា',    # Sra Aa
    'i': 'ិ',    # Sra I
    'I': 'ី',    # Sra Ii
    'w': 'ឹ',    # Sra Y
    'W': 'ឺ',    # Sra Yy
    'u': 'ុ',    # Sra U
    'U': 'ូ',    # Sra Uu
    'o': 'ួ',    # Sra Ua
    'e': 'េ',    # Sra E (pre-vowel)
    'E': 'ែ',    # Sra Ae (pre-vowel)
    'É': 'ៃ',    # Sra Ai (pre-vowel)
    'eA': 'ោ',   # Sra Ao
    'eA1': 'ៅ',  # Sra Au
    'eI': 'ើ',   # Sra Ee
    'ea': 'ៀ',   # Sra Ie
    'eA;': 'ោះ', # Sra Oh
    'eh': 'េះ',  # Sra Eh
    'uM': 'ុំ',   # Sra Om
    'M': 'ំ',    # Nikahit
    ':': 'ះ',    # Reahmuk
    ';': '់',    # Bantoc
    '#': '៏',    # Asda
    '$': '៍',    # Tandakhat
    '%': '៌',    # Robat
    '^': '៎',    # Kakabat
    '&': '័',    # Samyok Sannya
    '~': 'ៗ',    # Lekto
    '`': '៑',    # Viriam
}

# Known font names that are legacy
LEGACY_FONT_NAMES = [
    'limon', 'abc', 'k-khmer', 'f-khmer', 'preah vihear', 'kampongcham',
    'battambang-abc', 'angkorthom', 'bayon', 'chrieng', 'banteay srei'
]

# Common whole-word Limon transliteration table for frequent patterns
COMMON_LIMON_WORDS: Dict[str, str] = {
    "kmµviFIB": "កម្មវិធី",
    "kmµviFI": "កម្មវិធី",
    "sRmab;": "សម្រាប់",
    "sRmab": "សម្រាប់",
    "bBa©kviFIB": "បច្ចេកវិទ្យា",
    "bBa©kviFI": "បច្ចេកវិទ្យា",
    "bBa©k": "បច្ចេក",
    "viFIB": "វិទ្យា",
    "viFI": "វិទ្យា",
    "kMBüÚT½r": "កុំព្យូទ័រ",
    "kMBüÚTr": "កុំព្យូទ័រ",
    "kMBüÚ": "កុំព្យូ",
    "kMBü": "កុំព្យូ",
    "Rk务g": "ក្រសួង",
    "Rksuog": "ក្រសួង",
    "eRkAgkar": "គម្រោងការ",
    "eRkAg": "គម្រោង",
    "salklviFüal½y": "សាកលវិទ្យាល័យ",
    "saklviFüal½y": "សាកលវិទ្យាល័យ",
    "Gnuvtþn_": "អនុវត្តន៍",
    "Gnuvtþ": "អនុវត្ត",
    "Gnuvt": "អនុវត្ត",
    "kar": "ការ",
    "enAc": "ដែល",
    "edaye": "ដោយ",
    "eday": "ដោយ",
    "enA": "នៅ",
    "kñúg": "ក្នុង",
    "kñug": "ក្នុង",
    "RBHraCaNackRkm<úCa": "ព្រះរាជាណាចក្រកម្ពុជា",
    "Cati": "ជាតិ",
    "sasna": "សាសនា",
    "RBHmhakSRt": "ព្រះមហាក្សត្រ",
    "GgÁPaB": "អង្គភាព",
    "sßab½n": "ស្ថាប័ន",
    "eQµaH": "ឈ្មោះ",
    "muxtMenAg": "មុខតំណែង",
}


def is_likely_legacy_font(font_name: Optional[str], text: Optional[str]) -> bool:
    """
    Determines whether a shape/run is likely using a legacy Khmer font.
    """
    if font_name:
        fn_lower = font_name.lower()
        for leg in LEGACY_FONT_NAMES:
            if leg in fn_lower:
                return True
                
    if not text:
        return False
        
    # Check for direct legacy words
    for kw in COMMON_LIMON_WORDS:
        if kw in text:
            return True
            
    # Check for presence of Limon subscript characters (ASCII 0x80-0xFF range common in Limon)
    limon_subscript_chars = set(LIMON_SUBSCRIPTS.keys())
    has_subscript = any(c in limon_subscript_chars for c in text)
    if has_subscript:
        return True
        
    # Check for specific pre-vowel combos with ASCII letters: 'eR', 'ek', 'ec', 'es'
    if re.search(r'\be[kxKcgCdtTbpmyrlvsh]', text) and not re.search(r'[a-zA-Z]{5,}', text):
        return True
        
    return False


def convert_limon_to_unicode(text: str) -> str:
    """
    Converts a Limon encoded string to standard Khmer Unicode.
    Handles:
    - Pre-vowel reordering: 'e' + Consonant -> Consonant + 'េ'
    - Compound pre-vowels: 'eA' -> 'ោ', 'eA1' -> 'ៅ', 'eI' -> 'ើ'
    - Subscripts: 'j' + consonant or special characters -> '្' + consonant
    - Punctuation & Diacritics
    """
    if not text:
        return ""
        
    # First, quick check for known whole words or phrases
    out_text = text
    for limon_w, uni_w in sorted(COMMON_LIMON_WORDS.items(), key=lambda x: len(x[0]), reverse=True):
        out_text = out_text.replace(limon_w, uni_w)
        
    # If the text was converted substantially or didn't contain more Limon glyphs, continue fine-grained
    # Replace compound pre-vowels first:
    # e.g., e[Consonant]A; -> [Consonant] + ោះ
    # e[Consonant]A1 -> [Consonant] + ៅ
    # e[Consonant]A -> [Consonant] + ោ
    # e[Consonant]I -> [Consonant] + ើ
    # e[Consonant] -> [Consonant] + េ
    
    # Let's handle character-by-character parsing with state machine
    res = []
    i = 0
    n = len(out_text)
    
    while i < n:
        # Check Limon subscripts special glyphs (ø, þ, etc.)
        c = out_text[i]
        if c in LIMON_SUBSCRIPTS:
            res.append(LIMON_SUBSCRIPTS[c])
            i += 1
            continue
            
        # Check pre-vowel 'e' or 'E'
        if c in ('e', 'E') and i + 1 < n:
            vowel_type = 'េ' if c == 'e' else 'ែ'
            next_char = out_text[i+1]
            
            # If followed by a consonant
            if next_char in LIMON_CONSONANTS:
                base_cons = LIMON_CONSONANTS[next_char]
                i += 2
                
                # Check if there is a subscript following the consonant
                subscripts = []
                while i < n and (out_text[i] in LIMON_SUBSCRIPTS or (out_text[i] == 'j' and i + 1 < n and out_text[i+1] in LIMON_CONSONANTS)):
                    if out_text[i] in LIMON_SUBSCRIPTS:
                        subscripts.append(LIMON_SUBSCRIPTS[out_text[i]])
                        i += 1
                    elif out_text[i] == 'j':
                        subscripts.append('្' + LIMON_CONSONANTS[out_text[i+1]])
                        i += 2
                        
                # Check for compound vowel trailers after consonant like 'A', 'A1', 'I', 'a'
                compound_vowel = vowel_type
                if i < n:
                    if out_text[i:i+2] == 'A;':
                        compound_vowel = 'ោះ'
                        i += 2
                    elif out_text[i:i+2] == 'A1' or out_text[i:i+2] == 'A!':
                        compound_vowel = 'ៅ'
                        i += 2
                    elif out_text[i] == 'A':
                        compound_vowel = 'ោ'
                        i += 1
                    elif out_text[i] == 'I':
                        compound_vowel = 'ើ'
                        i += 1
                    elif out_text[i] == 'a':
                        compound_vowel = 'ៀ'
                        i += 1
                        
                res.append(base_cons)
                res.extend(subscripts)
                res.append(compound_vowel)
                continue
                
        # Check 'j' subscript prefix (e.g. j + consonant -> ្ + consonant)
        if c == 'j' and i + 1 < n and out_text[i+1] in LIMON_CONSONANTS:
            res.append('្' + LIMON_CONSONANTS[out_text[i+1]])
            i += 2
            continue
            
        # Check standard consonants
        if c in LIMON_CONSONANTS:
            res.append(LIMON_CONSONANTS[c])
            i += 1
            continue
            
        # Check standard vowels & diacritics
        if c in LIMON_VOWELS:
            res.append(LIMON_VOWELS[c])
            i += 1
            continue
            
        # Normal character (space, digit, english, punctuation, etc.)
        res.append(c)
        i += 1
        
    result_str = "".join(res)
    return result_str


MIXED_GLYPH_TABLE: Dict[str, str] = {
    '3': 'ឧ', 'ñ': 'ក', 'b': 'ព', 'U': 'ប',
    'F': 'យ', 'f': 'រ', 'R': 'ង', 'P': 'ន',
    'k': 'ហ', '6': 'ណ', '˘': '័', '˜': '៊', '~': '៊'
}

def transliterate_mixed_glyphs(text: str) -> str:
    """
    Systematically transliterates mixed legacy ASCII glyphs, numbers, and symbols
    embedded inside Khmer text without requiring legacy font metadata.
    Handles Limon-3 / ABC keyboard glyph leakage into modern Unicode presentations.
    """
    if not text:
        return ""
        
    s = text
    # Known compounds with mixed glyphs
    s = re.sub(r'3Uñ[រf]6[\'’]?', 'ឧបករណ៍', s)
    s = re.sub(r'3Uñ', 'ឧបក', s)
    s = re.sub(r'6[\'’]', 'ណ៍', s)
    s = re.sub(r'AA(?=[ក-អ\u17B6-\u17D3])', 'ពព', s)
    s = re.sub(r'(?:^|(?<=[\s\n]))A(?=[ក-អ\u17B6-\u17D3])', 'ព្យ', s)
    s = re.sub(r'PមPេះ', 'មេរៀននេះ', s)
    s = re.sub(r'PិR', 'និង', s)
    s = re.sub(r'PឹR', 'នឹង', s)
    s = re.sub(r'ការការbរ', 'ការការពារ', s)
    s = re.sub(r'ទិP[នS]P[˘័]F', 'ទិន្នន័យ', s)
    
    # Single mixed characters inside or adjacent to Khmer characters
    def _rep_char(m):
        c = m.group(0)
        return MIXED_GLYPH_TABLE.get(c, c)
        
    s = re.sub(r'(?<=[\u1780-\u17FF])[3ñbUFfRPk6˘˜~]|[3ñbUFfRPk6˘˜~](?=[\u1780-\u17FF])', _rep_char, s)
    return s

