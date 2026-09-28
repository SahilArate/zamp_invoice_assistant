# Zamp Invoice Assistant

An automated invoice-to-PO processing system. It takes a vendor invoice PDF as input and returns a clear **APPROVE / FLAG / REJECT** decision with the reasoning visible at every step.

Built for the Zamp AI Solutions Associate case study (PS-1: Invoice Processing).

## The core design idea

**AI reads the invoice. Rules make the decision.**

An LLM is good at turning messy, unstructured invoice text into structured data. It is not a good idea to let it decide whether to pay someone. So the system is split in two:

- **AI layer**: extracts fields from the invoice (vendor, invoice number, PO number, line items, totals).
- **Deterministic rule engine**: validates the data, matches it against the PO, and makes the decision.

Every decision comes with the specific rule and evidence behind it, so it can be audited.

## Pipeline

```
Invoice PDF
   ↓
1. Ingestion         pdfplumber for text PDFs, falls back to OCR for scanned ones
   ↓
2. AI Extraction     LLM returns structured JSON (vendor, invoice #, PO #, line items, totals)
   ↓
3. Validation        required fields + arithmetic reconciliation
   ↓
4. PO Matching       PO exists, vendor matches, amount tolerance, remaining balance
   ↓
5. Duplicate check   against all previously processed runs
   ↓
6. Decision          APPROVE / FLAG / REJECT + reason + supporting evidence
   ↓
7. Audit trail       every run saved and viewable
   ↓
Live Run View  +  Dashboard (history) + Run Detail (full audit trail)
```

## Decision rules

Checks run in priority order, and the first failure decides the outcome:

| Order | Check | Result if it fails |
|---|---|---|
| 1 | Duplicate invoice (same vendor + invoice # + date + total) | REJECT |
| 2 | Validation (missing fields, line items don't sum to subtotal, subtotal + tax ≠ total) | FLAG |
| 3 | PO does not exist | REJECT |
| 4 | Invoice vendor does not match the PO's vendor | REJECT |
| 5 | Invoice exceeds remaining PO balance | FLAG |
| 6 | Amount variance above tolerance (3%) | FLAG |
| 7 | All checks pass | APPROVE |

REJECT is used for things that look wrong or fraudulent (wrong vendor, fake PO, duplicate). FLAG is used for things a human should review but that may be legitimate.

## Edge cases demonstrated

1. **Happy path**: clean invoice, matching vendor, amount within tolerance, then APPROVE.
2. **Arithmetic mismatch**: total does not equal subtotal + tax, then FLAG.
3. **Vendor mismatch**: valid PO but a different vendor name, then REJECT.
4. **Duplicate invoice**: same invoice submitted twice, then REJECT.
5. **Split PO**: a PO with a partial balance already used. An invoice that fits the remaining balance is approved, and one that exceeds it is flagged.
6. **Scanned invoice**: image-only PDF with no text layer, handled through the OCR fallback.

## Tech stack

- **Backend**: Python, FastAPI, Pydantic
- **PDF/OCR**: pdfplumber, Tesseract (pytesseract), Poppler (pdf2image)
- **LLM**: Groq API (`openai/gpt-oss-120b`) through the OpenAI-compatible client
- **Frontend**: Next.js, React, TypeScript, Tailwind CSS (dark theme)
- **Storage**: JSON files (PO data and run history)

## Project structure

```
zamp_invoice_assistant/
├── backend/
│   ├── app/
│   │   ├── core/        # config, API keys, paths
│   │   ├── models/      # Invoice, LineItem, PurchaseOrder, InvoiceRun
│   │   ├── routers/     # API endpoints
│   │   └── services/    # pdf, AI extraction, validation, PO matching, decision, run storage
│   ├── sample_data/     # purchase_orders.json
│   └── requirements.txt
└── frontend/
    └── src/
        ├── app/         # Live Run page, Dashboard, Run Detail
        └── components/  # Sidebar
```

## Running it locally

### Prerequisites

- Python 3.11+
- Node.js 18+
- A Groq API key
- [Tesseract OCR](https://github.com/UB-Mannheim/tesseract/wiki) and [Poppler](https://github.com/oschwartz10612/poppler-windows/releases) (only needed for scanned PDFs)

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
python -m pip install -r requirements.txt
```

Create `backend/.env`:

```
GROQ_API_KEY=your_key_here
```

If Tesseract or Poppler are installed somewhere other than the defaults, update `TESSERACT_PATH` and `POPPLER_PATH` in `backend/app/core/config.py`.

```bash
python -m uvicorn app.main:app --reload
```

The API runs at `http://127.0.0.1:8000` (interactive docs at `/docs`).

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

## Assumptions

- Purchase orders are treated as trusted internal records, loaded from `sample_data/purchase_orders.json`. In production this would come from an ERP or procurement system.
- Amount tolerance is set to 3% and can be changed in `po_matching_service.py`.
- Currency is assumed to be INR.
- Vendor names are matched case-insensitively after trimming whitespace.

## Known limitations and what I would build next

- Vendor matching is exact. It should use fuzzy matching so "ABC Ltd" and "ABC Limited" are treated as the same vendor.
- The tolerance check compares the invoice to the full PO amount rather than the remaining balance, so a valid partial invoice on a split PO can be flagged. It should compare against the expected billable amount.
- Used PO amounts are static. Approved invoices should update the PO's used balance automatically.
- The stage-by-stage animation in the Live Run view is paced on the frontend. The backend runs the whole pipeline in one request. Real streaming (server-sent events) would make it truly live.
- Storage is JSON files. A real deployment would use a database.
- There is no automated test suite yet. Validation and matching logic are pure functions and easy to unit test.
- Extraction confidence scores per field are not implemented yet. Low-confidence fields would be routed to human review.