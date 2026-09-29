import re
from datetime import datetime


def normalize_amount(value):
    """Turn '$1,250.00', '₹1,25,000.00', '1.250,00' etc into a clean float."""
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)

    s = str(value).strip()
    if not s:
        return None

    s = re.sub(r"[₹$€£¥]", "", s).strip()

    has_comma = "," in s
    has_dot = "." in s

    if has_comma and has_dot:
        if s.rfind(",") > s.rfind("."):
            s = s.replace(".", "").replace(",", ".")  # European: 1.250,00
        else:
            s = s.replace(",", "")  # US/Indian: 1,250.00 or 1,25,000.00
    elif has_comma and not has_dot:
        parts = s.split(",")
        if len(parts) == 2 and len(parts[1]) == 2:
            s = s.replace(",", ".")  # e.g. 1250,50 -> decimal comma
        else:
            s = s.replace(",", "")  # thousands separator

    s = re.sub(r"[^\d.\-]", "", s)

    try:
        return float(s) if s not in ("", "-", ".") else None
    except ValueError:
        return None


DATE_FORMATS = [
    "%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y",
    "%d %b %Y", "%d %B %Y", "%B %d, %Y", "%b %d, %Y", "%d.%m.%Y",
]


def normalize_date(value):
    """Try common date formats and standardise to YYYY-MM-DD. Falls back to raw value."""
    if not value:
        return None
    s = str(value).strip()
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(s, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return s


def normalize_text_field(value):
    """Trim and collapse internal whitespace — 'ABC   Ltd' -> 'ABC Ltd'."""
    if value is None:
        return None
    s = re.sub(r"\s+", " ", str(value).strip())
    return s if s else None


def normalize_invoice_dict(data: dict) -> dict:
    """Applied to the AI's raw JSON output, before we build our ExtractedInvoice model."""
    data = dict(data)

    data["vendor_name"] = normalize_text_field(data.get("vendor_name"))
    data["invoice_number"] = normalize_text_field(data.get("invoice_number"))
    data["po_number"] = normalize_text_field(data.get("po_number"))
    data["invoice_date"] = normalize_date(data.get("invoice_date"))

    data["subtotal"] = normalize_amount(data.get("subtotal"))
    data["tax"] = normalize_amount(data.get("tax"))
    data["total"] = normalize_amount(data.get("total"))

    normalized_items = []
    for item in data.get("line_items") or []:
        item = dict(item)
        item["quantity"] = normalize_amount(item.get("quantity"))
        item["unit_price"] = normalize_amount(item.get("unit_price"))
        item["amount"] = normalize_amount(item.get("amount"))

        # If the AI didn't return an amount (or it failed to parse), calculate it
        # ourselves from quantity x unit_price — we shouldn't depend on the AI for
        # something we can compute deterministically.
        if item["amount"] is None and item["quantity"] is not None and item["unit_price"] is not None:
            item["amount"] = round(item["quantity"] * item["unit_price"], 2)

        normalized_items.append(item)
    data["line_items"] = normalized_items

    return data