from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class InvoiceRun(BaseModel):
    run_id: str
    filename: str
    timestamp: str
    extracted_invoice: dict
    validation: dict
    po_matching: dict
    decision: dict