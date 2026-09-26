import json
import uuid
from pathlib import Path
from datetime import datetime, timezone
from typing import List

from app.models.run import InvoiceRun

RUNS_FILE = Path(__file__).resolve().parent.parent.parent / "sample_data" / "runs.json"


def _load_all_runs() -> List[dict]:
    if not RUNS_FILE.exists():
        return []
    with open(RUNS_FILE, "r") as f:
        return json.load(f)


def _save_all_runs(runs: List[dict]) -> None:
    with open(RUNS_FILE, "w") as f:
        json.dump(runs, f, indent=2)


def save_run(filename: str, extracted_invoice: dict, validation: dict, po_matching: dict, decision: dict) -> InvoiceRun:
    run = InvoiceRun(
        run_id=str(uuid.uuid4()),
        filename=filename,
        timestamp=datetime.now(timezone.utc).isoformat(),
        extracted_invoice=extracted_invoice,
        validation=validation,
        po_matching=po_matching,
        decision=decision,
    )

    all_runs = _load_all_runs()
    all_runs.append(run.model_dump())
    _save_all_runs(all_runs)

    return run


def get_all_runs() -> List[dict]:
    runs = _load_all_runs()
    return list(reversed(runs))  # newest first


def get_run_by_id(run_id: str) -> dict:
    runs = _load_all_runs()
    for run in runs:
        if run["run_id"] == run_id:
            return run
    return None

def check_duplicate(vendor_name: str, invoice_number: str, invoice_date: str, total: float) -> bool:
    all_runs = _load_all_runs()
    for run in all_runs:
        inv = run["extracted_invoice"]
        if (
            inv.get("vendor_name") == vendor_name
            and inv.get("invoice_number") == invoice_number
            and inv.get("invoice_date") == invoice_date
            and inv.get("total") == total
        ):
            return True
    return False