"""
Khmer PDF OCR Engine using Open-Source Kiri-OCR (Transformer architecture).
Performs text line detection, bounding box extraction, and Khmer Unicode recognition
from rendered PDF slide pages.
"""

import os
import logging
from typing import Dict, List, Optional, Tuple, Any
from PIL import Image

logger = logging.getLogger(__name__)

class KhmerOCREngine:
    """Singleton wrapper for open-source Khmer OCR."""
    _instance = None
    _ocr = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(KhmerOCREngine, cls).__new__(cls)
        return cls._instance

    def _get_ocr(self):
        if self._ocr is None:
            logger.info("Initializing open-source Khmer OCR model (Kiri-OCR)...")
            from kiri_ocr import OCR
            # Use CPU with fast decoding method for accelerated performance
            self._ocr = OCR(device="cpu", decode_method="fast")
            logger.info("Khmer OCR model loaded successfully.")
        return self._ocr

    def extract_page_ocr(self, image_path: str) -> List[Dict[str, Any]]:
        """
        Runs OCR on an image file (e.g., rendered slide page) and returns a list
        of detected text items with bounding boxes and confidence scores:
        [
            {
                "text": "...",
                "box": [x, y, w, h],  # in image pixel coordinates
                "confidence": 0.95
            }, ...
        ]
        """
        if not os.path.exists(image_path):
            return []

        try:
            ocr = self._get_ocr()
            _, raw_results = ocr.extract_text(image_path)
            
            items = []
            for r in raw_results:
                txt = r.get("text", "").strip()
                if not txt:
                    continue
                # r['box'] is [x, y, w, h] or polygon
                box = r.get("box", [0, 0, 100, 30])
                conf = float(r.get("confidence", 0.9))
                
                # Normalize box to [x, y, w, h]
                if len(box) == 4:
                    x, y, w, h = box
                elif len(box) >= 4 and isinstance(box[0], (list, tuple)):
                    # Polygon points [[x0,y0], [x1,y1], [x2,y2], [x3,y3]]
                    xs = [p[0] for p in box]
                    ys = [p[1] for p in box]
                    x = min(xs)
                    y = min(ys)
                    w = max(xs) - x
                    h = max(ys) - y
                else:
                    x, y, w, h = 0, 0, 100, 30

                items.append({
                    "text": txt,
                    "box": [float(x), float(y), float(w), float(h)],
                    "confidence": conf,
                    "line_number": r.get("line_number", 0)
                })
            return items
        except Exception as e:
            logger.exception(f"Error during Khmer OCR on {image_path}: {e}")
            return []


# Global singleton instance
khmer_ocr_engine = KhmerOCREngine()

def get_khmer_ocr_engine() -> KhmerOCREngine:
    return khmer_ocr_engine
