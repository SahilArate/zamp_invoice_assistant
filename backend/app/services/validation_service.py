from app.models.invoice import ExtractedInvoice

LOW_CONFIDENCE_THRESHOLD = 0.6

# Fields where being wrong could cause a bad payment decision — missing or badly
# extracted here should stop the invoice before it reaches PO matching.
HARD_REQUIRED_FIELDS = ["po_number", "total"]

# Fields that matter but are safe to proceed with under human review rather than
# blocking the pipeline outright.
SOFT_FIELDS = ["vendor_name", "invoice_number", "invoice_date"]


def validate_invoice(invoice: ExtractedInvoice) -> dict:
    hard_failures = []
    warnings = []

    for field_name in HARD_REQUIRED_FIELDS:
        value = getattr(invoice, field_name, None)
        if value is None or value == "":
            hard_failures.append(f"Missing required field: {field_name}")

    for field_name in SOFT_FIELDS:
        value = getattr(invoice, field_name, None)
        if value is None or value == "":
            warnings.append(f"Missing field (non-blocking): {field_name}")

    low_confidence_fields = [
        field for field, score in invoice.field_confidence.items()
        if score < LOW_CONFIDENCE_THRESHOLD
    ]

    for field in low_confidence_fields:
        message = f"AI extraction confidence is low for: {field}."
        if field in HARD_REQUIRED_FIELDS:
            hard_failures.append(message + " This field is critical, so the invoice is flagged for review.")
        else:
            warnings.append(message + " Proceeding, but this field should be manually verified.")

    if invoice.line_items and invoice.subtotal is not None:
        calculated_subtotal = round(sum(item.amount for item in invoice.line_items), 2)
        if abs(calculated_subtotal - invoice.subtotal) > 1.0:
            hard_failures.append(
                f"Line items sum to {calculated_subtotal}, but subtotal says {invoice.subtotal}"
            )

    if invoice.subtotal is not None and invoice.tax is not None and invoice.total is not None:
        calculated_total = round(invoice.subtotal + invoice.tax, 2)
        if abs(calculated_total - invoice.total) > 1.0:
            hard_failures.append(
                f"Subtotal + tax = {calculated_total}, but total says {invoice.total}"
            )

    return {
        "is_valid": len(hard_failures) == 0,
        "issues": hard_failures,
        "warnings": warnings,
        "low_confidence_fields": low_confidence_fields,
    }