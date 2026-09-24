from app.models.invoice import ExtractedInvoice
from app.services.po_service import get_po_by_number

AMOUNT_TOLERANCE_PERCENT = 3.0


def match_invoice_to_po(invoice: ExtractedInvoice) -> dict:
    checks = {
        "po_exists": False,
        "vendor_match": False,
        "amount_within_tolerance": False,
        "sufficient_remaining_balance": False,
    }
    details = []

    if not invoice.po_number:
        details.append("Invoice has no PO number — cannot match.")
        return {"checks": checks, "details": details, "matched_po": None}

    po = get_po_by_number(invoice.po_number)

    if po is None:
        details.append(f"PO number {invoice.po_number} does not exist in our records.")
        return {"checks": checks, "details": details, "matched_po": None}

    checks["po_exists"] = True
    details.append(f"PO {po.po_number} found.")

    if invoice.vendor_name and invoice.vendor_name.strip().lower() == po.vendor_name.strip().lower():
        checks["vendor_match"] = True
        details.append(f"Vendor matches: '{invoice.vendor_name}' == '{po.vendor_name}'.")
    else:
        details.append(
            f"Vendor mismatch: invoice says '{invoice.vendor_name}', PO says '{po.vendor_name}'."
        )

    if invoice.total is not None:
        variance_percent = abs(invoice.total - po.po_amount) / po.po_amount * 100
        if variance_percent <= AMOUNT_TOLERANCE_PERCENT:
            checks["amount_within_tolerance"] = True
            details.append(
                f"Amount within tolerance: {variance_percent:.1f}% variance (limit {AMOUNT_TOLERANCE_PERCENT}%)."
            )
        else:
            details.append(
                f"Amount variance too high: {variance_percent:.1f}% (limit {AMOUNT_TOLERANCE_PERCENT}%)."
            )

    if invoice.total is not None:
        if invoice.total <= po.remaining_amount:
            checks["sufficient_remaining_balance"] = True
            details.append(
                f"Invoice amount {invoice.total} fits within remaining PO balance {po.remaining_amount}."
            )
        else:
            details.append(
                f"Invoice amount {invoice.total} EXCEEDS remaining PO balance {po.remaining_amount}."
            )

    return {"checks": checks, "details": details, "matched_po": po.model_dump()}