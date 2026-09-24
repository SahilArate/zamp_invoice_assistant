from fastapi import APIRouter, UploadFile, File
from pathlib import Path
import shutil

from app.services.pdf_service import extract_text_from_pdf
from app.services.ai_extraction_service import extract_invoice_fields
from app.services.validation_service import validate_invoice
from app.services.po_matching_service import match_invoice_to_po

router = APIRouter(prefix="/invoices", tags=["Invoices"])

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "sample_data" / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/upload")
async def upload_invoice(file: UploadFile = File(...)):
    file_path = UPLOAD_DIR / file.filename

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    raw_text = extract_text_from_pdf(file_path)

    if not raw_text:
        return {
            "status": "error",
            "message": "No text could be extracted from this PDF. It may be a scanned image (OCR not yet implemented)."
        }

    extracted_invoice = extract_invoice_fields(raw_text)
    validation_result = validate_invoice(extracted_invoice)
    po_match_result = match_invoice_to_po(extracted_invoice)

    return {
        "status": "processed",
        "filename": file.filename,
        "extracted_invoice": extracted_invoice.model_dump(),
        "validation": validation_result,
        "po_matching": po_match_result
    }