"""
Khmer Encoding Structure (KES / Unicode UTN #61) normalizer.

Thin wrapper around the official SIL `khnormal` algorithm (distributed in the
`khmernormalizer` package), the reference implementation of the Khmer Encoding
Structure proposed by CADT / IDRI, SIL and CLO.

It enforces ONE canonical code-point order per Khmer syllable:
    Base -> Coeng+Subscript(s) (Coeng-Ro last) -> Robat -> Shifter ->
    Vowel -> Sign(s)
and fixes sequences such as:
    េ + ី  -> ើ        (compound vowels)
    coeng ដ -> coeng ត  (KES mapping)
    vowel/shifter/diacritic order inside a syllable.

Text is processed per Khmer run only, so Latin words, numbers and punctuation
(e.g. "Browser", "Hard Disk") are never touched.
"""

import logging
import re
import unicodedata

logger = logging.getLogger(__name__)

# One run = Khmer block chars plus the ZWJ/ZWNJ used inside KES clusters.
_KHMER_RUN = re.compile(r"[\u1780-\u17FF\u200C\u200D]+")

try:
    from khmernormalizer.khnormal import khmer_normalize as _khmer_normalize
except Exception as exc:  # pragma: no cover - dependency missing
    _khmer_normalize = None
    logger.warning("khmernormalizer not available, KES stage skipped: %s", exc)


def kes_available() -> bool:
    return _khmer_normalize is not None


def normalize_kes(text: str) -> str:
    """Return `text` with every Khmer run put into KES canonical order."""
    if not text or _khmer_normalize is None:
        return text

    def _fix(match: "re.Match") -> str:
        run = match.group(0)
        try:
            return _khmer_normalize(run)
        except Exception:  # never let normalization break a document
            return run

    return unicodedata.normalize("NFC", _KHMER_RUN.sub(_fix, text))
