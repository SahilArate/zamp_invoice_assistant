def make_decision(validation_result: dict, po_match_result: dict, is_duplicate: bool = False) -> dict:
    checks = po_match_result["checks"]

    if is_duplicate:
        return {
            "decision": "REJECT",
            "reason": "Duplicate invoice — an identical invoice has already been processed.",
            "supporting_details": ["Matched on vendor, invoice number, date, and total against a previous run."],
        }

    if not validation_result["is_valid"]:
        return {
            "decision": "FLAG",
            "reason": "Invoice failed validation checks.",
            "supporting_details": validation_result["issues"],
        }

    if not checks["po_exists"]:
        return {
            "decision": "REJECT",
            "reason": "Referenced PO number does not exist.",
            "supporting_details": po_match_result["details"],
        }

    if not checks["vendor_match"]:
        return {
            "decision": "REJECT",
            "reason": "Invoice vendor does not match the vendor on record for this PO.",
            "supporting_details": po_match_result["details"],
        }

    if not checks["sufficient_remaining_balance"]:
        return {
            "decision": "FLAG",
            "reason": "Invoice amount exceeds the remaining PO balance.",
            "supporting_details": po_match_result["details"],
        }

    if not checks["amount_within_tolerance"]:
        return {
            "decision": "FLAG",
            "reason": "Invoice amount variance exceeds allowed tolerance.",
            "supporting_details": po_match_result["details"],
        }

    return {
        "decision": "APPROVE",
        "reason": "All checks passed: PO exists, vendor matches, amount within tolerance and PO balance.",
        "supporting_details": po_match_result["details"],
    }