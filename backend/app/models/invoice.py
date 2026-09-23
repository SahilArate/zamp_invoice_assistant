from pydantic import BaseModel
from typing import List, Optional


class LineItem(BaseModel):
    description: str
    quantity: float
    unit_price: float
    amount: float


class ExtractedInvoice(BaseModel):
    vendor_name: Optional[str] = None
    invoice_number: Optional[str] = None
    invoice_date: Optional[str] = None
    po_number: Optional[str] = None
    line_items: List[LineItem] = []
    subtotal: Optional[float] = None
    tax: Optional[float] = None
    total: Optional[float] = None
    currency: Optional[str] = "INR"