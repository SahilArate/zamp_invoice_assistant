from pydantic import BaseModel
from typing import List, Optional


class POLineItem(BaseModel):
    line_id: str
    description: str
    quantity: float
    unit_price: float
    used_quantity: float = 0.0

    @property
    def remaining_quantity(self) -> float:
        return self.quantity - self.used_quantity

    @property
    def line_total(self) -> float:
        return self.quantity * self.unit_price


class PurchaseOrder(BaseModel):
    po_number: str
    vendor_name: str
    currency: str = "INR"
    line_items: List[POLineItem] = []

    @property
    def po_amount(self) -> float:
        return sum(li.line_total for li in self.line_items)

    @property
    def used_amount(self) -> float:
        return sum(li.used_quantity * li.unit_price for li in self.line_items)

    @property
    def remaining_amount(self) -> float:
        return self.po_amount - self.used_amount