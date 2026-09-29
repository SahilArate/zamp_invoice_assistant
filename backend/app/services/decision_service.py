def make_decision(validation_result: dict, po_match_result: dict, is_duplicate: bool = False) -> dict:
    checks = po_match_result["checks"]
    warnings = validation_result.get("warnings", [])
    line_matching = po_match_result.get("line_matching")

    if is_duplicate:
        return {
            "decision": "REJECT",
            "reason": "Duplicate invoice — an identical invoice has already been processed.",
            "supporting_details": ["Matched on vendor, invoice number, date, and total against a previous run."],
            "warnings": warnings,
        }

    if not validation_result["is_valid"]:
        return {
            "decision": "FLAG",
            "reason": "Invoice failed validation checks.",
            "supporting_details": validation_result["issues"],
            "warnings": warnings,
        }

    if not checks["po_exists"]:
        return {
            "decision": "REJECT",
            "reason": "Referenced PO number does not exist.",
            "supporting_details": po_match_result["details"],
            "warnings": warnings,
        }

    if not checks["vendor_match"]:
        return {
            "decision": "REJECT",
            "reason": "Invoice vendor does not match the vendor on record for this PO.",
            "supporting_details": po_match_result["details"],
            "warnings": warnings,
        }

    if not checks["sufficient_remaining_balance"]:
        return {
            "decision": "FLAG",
            "reason": "Invoice amount exceeds the remaining PO balance.",
            "supporting_details": po_match_result["details"],
            "warnings": warnings,
        }

    if line_matching and line_matching["overall_status"] == "UNMATCHED_LINES":
        return {
            "decision": "FLAG",
            "reason": "One or more invoice line items could not be matched to any PO line.",
            "supporting_details": po_match_result["details"],
            "warnings": warnings,
        }

    if line_matching and line_matching["overall_status"] == "QUANTITY_EXCEEDED":
        return {
            "decision": "FLAG",
            "reason": "One or more invoice lines bill more quantity than remains on the matching PO line.",
            "supporting_details": po_match_result["details"],
            "warnings": warnings,
        }

    if line_matching and line_matching["overall_status"] == "PRICE_VARIANCE":
        return {
            "decision": "FLAG",
            "reason": "One or more invoice lines have a unit price that varies from the PO's agreed price, even though quantity and total are within range.",
            "supporting_details": po_match_result["details"],
            "warnings": warnings,
        }

    if not checks["amount_within_tolerance"]:
        return {
            "decision": "FLAG",
            "reason": "Invoice amount variance exceeds allowed tolerance.",
            "supporting_details": po_match_result["details"],
            "warnings": warnings,
        }

    return {
        "decision": "APPROVE",
        "reason": "All checks passed: PO exists, vendor matches, line items matched with correct quantity and price, amount within tolerance and PO balance.",
        "supporting_details": po_match_result["details"],
        "warnings": warnings,
    }