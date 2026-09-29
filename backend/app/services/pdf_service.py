import pdfplumber
import pytesseract
from pdf2image import convert_from_path
from pathlib import Path

from app.core.config import TESSERACT_PATH, POPPLER_PATH

pytesseract.pytesseract.tesseract_cmd = TESSERACT_PATH

# Characters that indicate broken/garbled text extraction (encoding corruption,
# missing font mappings, etc.) rather than genuinely empty text.
GARBLED_INDICATOR_CHARS = ["�", "\ufffd", "\x00"]


def is_text_usable(text: str) -> bool:
    """Even non-empty text can be garbage — corrupted encoding, missing font
    mappings, or mostly non-alphanumeric noise. This checks it's actually usable."""
    if not text or not text.strip():
        return False

    stripped = text.strip()

    for indicator in GARBLED_INDICATOR_CHARS:
        if indicator in stripped:
            return False

    alphanumeric_count = sum(c.isalnum() for c in stripped)
    alphanumeric_ratio = alphanumeric_count / len(stripped)

    # Real invoice text is mostly letters/numbers with some punctuation and
    # whitespace. If less than 30% of characters are alphanumeric, the
    # extraction is very likely garbled rather than a legitimately sparse document.
    if alphanumeric_ratio < 0.3:
        return False

    return True


def extract_text_from_pdf(file_path: Path) -> dict:
    full_text = ""

    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                full_text += page_text + "\n"

    full_text = full_text.strip()

    if is_text_usable(full_text):
        return {"text": full_text, "source": "pdf_text"}

    ocr_text = extract_text_via_ocr(file_path)
    reason = "empty_text" if not full_text else "garbled_text"
    return {"text": ocr_text, "source": f"ocr_fallback ({reason})"}


def extract_text_via_ocr(file_path: Path) -> str:
    images = convert_from_path(str(file_path), poppler_path=POPPLER_PATH)

    ocr_text = ""
    for image in images:
        ocr_text += pytesseract.image_to_string(image) + "\n"

    return ocr_text.strip()