from fastapi import APIRouter, UploadFile, File
from pathlib import Path
import shutil

from app.services.pdf_service import extract_text_from_pdf

router = APIRouter(prefix="/invoices", tags=["Invoices"])

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "sample_data" / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/upload")
async def upload_invoice(file: UploadFile = File(...)):
    file_path = UPLOAD_DIR / file.filename

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    extracted_text = extract_text_from_pdf(file_path)

    return {
        "status": "received",
        "filename": file.filename,
        "text_found": bool(extracted_text),
        "extracted_text_preview": extracted_text[:500]
    }