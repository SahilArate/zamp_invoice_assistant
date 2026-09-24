from app.models.invoice import ExtractedInvoice


def validate_invoice(invoice: ExtractedInvoice) -> dict:
    issues = []

    required_fields = {
        "vendor_name": invoice.vendor_name,
        "invoice_number": invoice.invoice_number,
        "po_number": invoice.po_number,
        "total": invoice.total,
    }

    for field_name, value in required_fields.items():
        if value is None or value == "":
            issues.append(f"Missing required field: {field_name}")

    if invoice.line_items and invoice.subtotal is not None:
        calculated_subtotal = round(sum(item.amount for item in invoice.line_items), 2)
        if abs(calculated_subtotal - invoice.subtotal) > 1.0:
            issues.append(
                f"Line items sum to {calculated_subtotal}, but subtotal says {invoice.subtotal}"
            )

    if invoice.subtotal is not None and invoice.tax is not None and invoice.total is not None:
        calculated_total = round(invoice.subtotal + invoice.tax, 2)
        if abs(calculated_total - invoice.total) > 1.0:
            issues.append(
                f"Subtotal + tax = {calculated_total}, but total says {invoice.total}"
            )

    return {
        "is_valid": len(issues) == 0,
        "issues": issues,
    }