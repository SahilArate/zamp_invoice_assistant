from rapidfuzz import fuzz
from app.models.invoice import LineItem
from app.models.purchase_order import PurchaseOrder, POLineItem

DESCRIPTION_MATCH_THRESHOLD = 60
UNIT_PRICE_TOLERANCE_PERCENT = 5.0


def match_line_to_po(invoice_line: LineItem, po: PurchaseOrder) -> dict:
    """Find the best-matching PO line for one invoice line, by description similarity."""
    best_match: POLineItem | None = None
    best_score = 0.0

    for po_line in po.line_items:
        score = fuzz.token_sort_ratio(invoice_line.description.lower(), po_line.description.lower())
        if score > best_score:
            best_score = score
            best_match = po_line

    if best_match is None or best_score < DESCRIPTION_MATCH_THRESHOLD:
        return {
            "matched": False,
            "po_line_id": None,
            "match_score": round(best_score, 1),
            "status": "NO_MATCH",
            "detail": f"No PO line matches '{invoice_line.description}' (best similarity {best_score:.0f}%, need {DESCRIPTION_MATCH_THRESHOLD}%).",
        }

    price_variance_percent = (
        abs(invoice_line.unit_price - best_match.unit_price) / best_match.unit_price * 100
        if best_match.unit_price else 0
    )
    price_ok = price_variance_percent <= UNIT_PRICE_TOLERANCE_PERCENT

    quantity_ok = invoice_line.quantity <= best_match.remaining_quantity

    if not quantity_ok:
        status = "EXCEEDS_QUANTITY"
        detail = (
            f"'{invoice_line.description}' matched PO line {best_match.line_id} "
            f"('{best_match.description}', {best_score:.0f}% similarity), but invoice quantity "
            f"{invoice_line.quantity} exceeds remaining PO quantity {best_match.remaining_quantity}."
        )
    elif not price_ok:
        status = "PRICE_VARIANCE"
        detail = (
            f"'{invoice_line.description}' matched PO line {best_match.line_id} "
            f"({best_score:.0f}% similarity), but unit price {invoice_line.unit_price} varies "
            f"{price_variance_percent:.1f}% from PO price {best_match.unit_price} "
            f"(limit {UNIT_PRICE_TOLERANCE_PERCENT}%)."
        )
    else:
        status = "OK"
        detail = (
            f"'{invoice_line.description}' matched PO line {best_match.line_id} "
            f"('{best_match.description}', {best_score:.0f}% similarity). "
            f"Quantity {invoice_line.quantity} within remaining {best_match.remaining_quantity}, "
            f"price within tolerance."
        )

    return {
        "matched": True,
        "po_line_id": best_match.line_id,
        "match_score": round(best_score, 1),
        "status": status,
        "detail": detail,
    }


def match_all_lines(invoice_lines: list[LineItem], po: PurchaseOrder) -> dict:
    line_results = [match_line_to_po(line, po) for line in invoice_lines]

    all_ok = all(r["status"] == "OK" for r in line_results)
    any_no_match = any(r["status"] == "NO_MATCH" for r in line_results)
    any_exceeds_qty = any(r["status"] == "EXCEEDS_QUANTITY" for r in line_results)
    any_price_variance = any(r["status"] == "PRICE_VARIANCE" for r in line_results)

    if all_ok:
        overall = "FULL_MATCH"
    elif any_no_match:
        overall = "UNMATCHED_LINES"
    elif any_exceeds_qty:
        overall = "QUANTITY_EXCEEDED"
    elif any_price_variance:
        overall = "PRICE_VARIANCE"
    else:
        overall = "PARTIAL_MATCH"

    return {"overall_status": overall, "line_results": line_results}