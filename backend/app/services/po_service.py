import json
from pathlib import Path
from typing import List, Optional
from app.models.purchase_order import PurchaseOrder

DATA_FILE = Path(__file__).resolve().parent.parent.parent / "sample_data" / "purchase_orders.json"


def load_purchase_orders() -> List[PurchaseOrder]:
    with open(DATA_FILE, "r") as f:
        raw_data = json.load(f)
    return [PurchaseOrder(**item) for item in raw_data]


def get_po_by_number(po_number: str) -> Optional[PurchaseOrder]:
    all_pos = load_purchase_orders()
    for po in all_pos:
        if po.po_number == po_number:
            return po
    return None