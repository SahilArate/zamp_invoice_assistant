import pdfplumber
import pytesseract
from pdf2image import convert_from_path
from pathlib import Path

from app.core.config import TESSERACT_PATH, POPPLER_PATH

pytesseract.pytesseract.tesseract_cmd = TESSERACT_PATH


def extract_text_from_pdf(file_path: Path) -> str:
    full_text = ""

    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                full_text += page_text + "\n"

    full_text = full_text.strip()

    if full_text:
        return full_text

    return extract_text_via_ocr(file_path)


def extract_text_via_ocr(file_path: Path) -> str:
    images = convert_from_path(str(file_path), poppler_path=POPPLER_PATH)

    ocr_text = ""
    for image in images:
        ocr_text += pytesseract.image_to_string(image) + "\n"

    return ocr_text.strip()