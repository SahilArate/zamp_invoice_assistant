import pdfplumber
from pathlib import Path


def extract_text_from_pdf(file_path: Path) -> str:
    full_text = ""

    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                full_text += page_text + "\n"

    return full_text.strip()