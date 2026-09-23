from pydantic import BaseModel
from typing import Optional


class PurchaseOrder(BaseModel):
    po_number: str
    vendor_name: str
    po_amount: float
    currency: str = "INR"
    used_amount: float = 0.0

    @property
    def remaining_amount(self) -> float:
        return self.po_amount - self.used_amount