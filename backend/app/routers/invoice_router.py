from fastapi import APIRouter, UploadFile, File
from pathlib import Path
import shutil

router = APIRouter(prefix="/invoices", tags=["Invoices"])

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "sample_data" / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/upload")
async def upload_invoice(file: UploadFile = File(...)):
    file_path = UPLOAD_DIR / file.filename

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {
        "status": "received",
        "filename": file.filename,
        "saved_path": str(file_path)
    }