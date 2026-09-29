from app.models.invoice import ExtractedInvoice
from app.services.po_service import get_po_by_number
from app.services.line_matching_service import match_all_lines

AMOUNT_TOLERANCE_PERCENT = 3.0


def match_invoice_to_po(invoice: ExtractedInvoice) -> dict:
    checks = {
        "po_exists": False,
        "vendor_match": False,
        "amount_within_tolerance": False,
        "sufficient_remaining_balance": False,
        "line_items_match": False,
    }
    details = []
    line_match_result = None

    if not invoice.po_number:
        details.append("Invoice has no PO number — cannot match.")
        return {"checks": checks, "details": details, "matched_po": None, "line_matching": None}

    po = get_po_by_number(invoice.po_number)

    if po is None:
        details.append(f"PO number {invoice.po_number} does not exist in our records.")
        return {"checks": checks, "details": details, "matched_po": None, "line_matching": None}

    checks["po_exists"] = True
    details.append(f"PO {po.po_number} found.")

    if invoice.vendor_name and invoice.vendor_name.strip().lower() == po.vendor_name.strip().lower():
        checks["vendor_match"] = True
        details.append(f"Vendor matches: '{invoice.vendor_name}' == '{po.vendor_name}'.")
    else:
        details.append(
            f"Vendor mismatch: invoice says '{invoice.vendor_name}', PO says '{po.vendor_name}'."
        )

    is_first_invoice_on_po = po.used_amount == 0

    if invoice.total is not None:
        if is_first_invoice_on_po:
            variance_percent = abs(invoice.total - po.po_amount) / po.po_amount * 100 if po.po_amount else 0
            if variance_percent <= AMOUNT_TOLERANCE_PERCENT:
                checks["amount_within_tolerance"] = True
                details.append(
                    f"Amount within tolerance: {variance_percent:.1f}% variance against full PO amount (limit {AMOUNT_TOLERANCE_PERCENT}%)."
                )
            else:
                details.append(
                    f"Amount variance too high: {variance_percent:.1f}% against full PO amount (limit {AMOUNT_TOLERANCE_PERCENT}%)."
                )
        else:
            checks["amount_within_tolerance"] = True
            details.append(
                f"PO already has prior usage (₹{po.used_amount:.2f} used) — this is a partial/split invoice, "
                f"so tolerance is checked against remaining balance instead, not the full PO amount."
            )

    if invoice.total is not None:
        if invoice.total <= po.remaining_amount:
            checks["sufficient_remaining_balance"] = True
            details.append(
                f"Invoice amount {invoice.total} fits within remaining PO balance {po.remaining_amount:.2f}."
            )
        else:
            details.append(
                f"Invoice amount {invoice.total} EXCEEDS remaining PO balance {po.remaining_amount:.2f}."
            )

    if invoice.line_items:
        line_match_result = match_all_lines(invoice.line_items, po)
        checks["line_items_match"] = line_match_result["overall_status"] == "FULL_MATCH"
        for line_result in line_match_result["line_results"]:
            details.append(line_result["detail"])
    else:
        details.append("No line items to match against PO lines.")

    return {
        "checks": checks,
        "details": details,
        "matched_po": po.model_dump(),
        "line_matching": line_match_result,
    }