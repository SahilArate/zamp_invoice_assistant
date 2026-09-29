# Zamp Invoice Assistant

An automated invoice-to-PO processing system for **PS-1: Invoice Processing**.

It takes a vendor invoice PDF — including text PDFs, scanned/image-only PDFs, and PDFs with garbled text — and produces a clear **APPROVE / FLAG / REJECT** decision with the reasoning and evidence behind every important step.

The central design principle is:

> **The AI reads and structures the invoice; deterministic business rules make the financial decision.**

This keeps the workflow intelligent enough to handle messy invoices while making the actual approval decision reproducible, explainable, and auditable.

---

## Architecture

```text
Invoice PDF
    |
    v
1. INGESTION
    |
    +-- pdfplumber -> usable text? -- YES --> use PDF text
    |                         |
    |                         NO
    |                         v
    |                 pdf2image -> Tesseract OCR
    |
    v
2. AI EXTRACTION (Groq)
    |
    +-- vendor, invoice #, date, PO
    +-- line items
    +-- subtotal / tax / total
    +-- field confidence
    |
    v
3. NORMALIZATION
    |
    +-- numbers / currencies
    +-- dates
    +-- text cleanup
    +-- missing line amount = qty x unit price
    |
    v
4. VALIDATION
    |
    +-- required fields
    +-- arithmetic reconciliation
    +-- confidence warnings
    |
    +--> hard validation failure --> FLAG
    |
    v
5. DUPLICATE CHECK
    |
    +-- vendor + invoice # + date + total
    |
    +--> duplicate --> REJECT
    |
    v
6. PO MATCHING
    |
    +-- Header level
    |   +-- PO exists
    |   +-- vendor matches
    |   +-- first/repeat invoice
    |   +-- remaining balance
    |   +-- amount tolerance
    |
    +-- Line level
        +-- description similarity
        +-- quantity availability
        +-- unit-price tolerance
    |
    v
7. DECISION ENGINE
    |
    +-- duplicate / invalid / wrong vendor / no PO -> REJECT
    +-- balance / line / tolerance issue           -> FLAG
    +-- all checks pass                            -> APPROVE
    |
    v
8. AUDIT TRAIL
    |
    +-- extracted data
    +-- confidence
    +-- every rule
    +-- evidence / reasons
    +-- run ID + timestamp
    |
    +----------------------+----------------------+
    |                                             |
    v                                             v
LIVE RUN VIEW                         DASHBOARD + HISTORY
```

---

## Why this architecture?

A simple `PDF -> LLM -> JSON` workflow is not sufficient for invoice processing.

The LLM is useful for understanding messy, unfamiliar documents, but it should not be responsible for making the financial decision.

The system therefore separates the responsibilities:

- **AI perceives and structures information.**
- **Python normalizes and validates data.**
- **Deterministic business rules perform PO matching.**
- **The decision engine produces APPROVE / FLAG / REJECT.**
- **The audit layer records why the decision happened.**

This makes the workflow easier to test, explain, and debug.

---

## 1. Ingestion and OCR fallback

The system first attempts to extract text from the invoice using `pdfplumber`.

The extracted text is checked for usability rather than assuming that the existence of a PDF text layer means the text is valid.

If the text is empty or effectively unusable/corrupted, the system falls back to:

```text
PDF page -> pdf2image -> Tesseract OCR -> usable invoice text
```

The system records the source of the text and why OCR was required.

This matters because a scanned invoice and a PDF with corrupted text are different failure modes, and both should remain visible in the audit trail.

---

## 2. AI extraction

The extracted invoice text is sent to the Groq LLM.

The model returns structured invoice information such as:

```text
vendor_name
invoice_number
invoice_date
po_number

line_items[]
    description
    quantity
    unit_price
    amount

subtotal
tax
total

field_confidence{}
```

The model is responsible for **reading and structuring the invoice**, not approving it.

A confidence score is captured for each important field.

### Important confidence rule

Confidence does **not** directly decide whether an invoice is approved or rejected.

Instead:

- a low-confidence field creates a review warning;
- if the uncertain field is required for safe downstream processing, validation blocks automatic processing and sends the invoice to `FLAG`;
- otherwise the invoice can continue with a non-blocking warning.

This keeps confidence as evidence rather than turning an LLM-generated score into the business decision itself.

---

## 3. Normalization

Invoices use different formats for numbers and dates.

Examples:

```text
$1,250.00
₹1,25,000.00
1.250,00
```

The normalization layer converts these into a consistent internal representation before comparisons happen.

It also:

- standardizes dates;
- cleans whitespace/text;
- normalizes numeric values;
- computes a line amount from `quantity x unit_price` when the model did not provide the line amount and the required values are available.

The goal is to prevent formatting differences from becoming false validation or PO-matching failures.

---

## 4. Validation

Validation is independent from the LLM.

It checks both structural and arithmetic consistency.

### Hard validation failures

Examples:

- required PO number missing;
- required total missing;
- required field is too uncertain to safely continue;
- line-item amounts do not reconcile with the subtotal;
- subtotal + tax does not reconcile with total.

A hard validation failure sends the invoice to:

```text
FLAG -> human review
```

### Soft warnings

Examples:

- uncertain invoice date;
- missing non-critical metadata;
- low-confidence soft field.

Soft warnings remain in the audit trail but do not automatically determine the final decision.

---

## 5. Duplicate detection

Duplicate checking happens before PO matching.

The normalized invoice is compared against previous processed invoices using:

```text
vendor + invoice_number + date + total
```

If the same invoice has already been processed:

```text
REJECT
```

This prevents a duplicate invoice from being approved simply because its PO and amounts happen to match.

---

## 6. PO matching

PO matching is deterministic business logic rather than another LLM decision.

It has two levels.

### 6.1 Header-level PO matching

The system checks:

1. Does the PO exist?
2. Does the invoice vendor match the PO vendor?
3. Is this the first invoice against the PO or a repeat/partial invoice?
4. Is there enough remaining PO balance?
5. Is the amount within the appropriate tolerance?

### First invoice

The invoice is compared against the PO's full expected amount using the configured tolerance.

### Repeat / split invoice

The invoice is evaluated against the PO's remaining balance.

This is important because a legitimate partial invoice should not fail simply because it is smaller than the original PO total.

### 6.2 Line-level PO matching

Header-level totals are not enough.

For example:

```text
PO:
10 units x $100 = $1,000

Invoice:
10 units x $120 = $1,200
```

The system therefore compares individual invoice lines against PO lines.

Line-level checks include:

- description similarity;
- quantity availability;
- unit-price tolerance;
- remaining quantity/balance.

`RapidFuzz` is used for description similarity because PO descriptions and invoice descriptions may use slightly different wording.

Deterministic matching is preferred over another LLM call because the rule is fast, reproducible, and auditable.

---

## 7. Decision engine

The decision engine applies rules in a fixed priority order:

```text
1. Duplicate
      -> REJECT

2. Hard validation failure
      -> FLAG

3. PO does not exist
      -> REJECT

4. Vendor mismatch
      -> REJECT

5. Remaining PO balance exceeded
      -> FLAG

6. Line-level / price / tolerance issue
      -> FLAG

7. All checks pass
      -> APPROVE
```

The exact decision includes:

- final status;
- reason;
- supporting evidence;
- relevant warnings;
- rule results.

### Why three outcomes?

**APPROVE**

The automated checks support the invoice.

**FLAG**

Something requires human review, but it is not necessarily fraudulent or invalid.

**REJECT**

The invoice violates a hard business rule or represents a clear duplicate, wrong-vendor, or nonexistent-PO situation.

This distinction avoids treating every anomaly as fraud.

---

## 8. Audit trail

Every processed invoice receives a unique run ID and timestamp.

The audit record preserves:

- original input information;
- extracted invoice fields;
- field confidence scores;
- normalization results;
- validation results;
- duplicate-check result;
- PO matching results;
- line-level matching results;
- every evaluated rule;
- warnings;
- final decision;
- decision reason.

This means the final APPROVE / FLAG / REJECT result is not a black box.

An interviewer can select an invoice and trace the reasoning from the original extraction through to the final decision.

---

## 9. Live Run View

The Live Run View shows the processing stages as an invoice moves through the workflow.

Example:

```text
[1] Ingestion
[2] AI extraction
[3] Normalization
[4] Validation
[5] Duplicate check
[6] PO matching
[7] Decision
[8] Audit saved
```

The view also displays:

- final verdict;
- confidence indicators;
- important warnings;
- reasoning trail.

The purpose is not just visual polish. It makes the processing pipeline understandable during a live demonstration.

---

## 10. Dashboard and history

The dashboard provides a history of processed invoices.

It includes:

- invoice/vendor information;
- processing timestamp;
- APPROVE / FLAG / REJECT status;
- confidence indicators;
- filtering/search;
- click-through into the complete audit record.

This gives an AP/user-facing view instead of exposing only raw API responses.

---

# Edge cases demonstrated

### 1. Happy path

Clean invoice, matching vendor, valid PO, correct amounts and lines:

```text
-> APPROVE
```

### 2. Arithmetic mismatch

For example:

```text
subtotal + tax != invoice total
```

```text
-> FLAG
```

### 3. Vendor mismatch

A valid PO exists, but the invoice vendor does not match the PO vendor:

```text
-> REJECT
```

### 4. Duplicate invoice

The same invoice is submitted again:

```text
-> REJECT
```

### 5. Split / partial PO

A PO has already been partially invoiced.

An invoice within the remaining balance can be approved, while an invoice exceeding the remaining balance is flagged.

### 6. Scanned invoice

No usable text layer:

```text
pdfplumber
    |
    v
no usable text
    |
    v
OCR fallback
```

The invoice can still proceed through extraction and validation.

### 7. Garbled PDF text

A PDF technically contains a text layer, but the extracted content is corrupted.

The ingestion layer detects unusable text and routes the document through OCR rather than trusting bad text.

### 8. Line-level price variance

The invoice quantity and overall amount may appear acceptable, but a particular unit price does not match the PO.

The line-level matching layer catches the discrepancy and flags it for review.

---

# Project structure

Use the repository's actual directory names here. A representative structure is:

```text
.
├── backend/
│   ├── ...
│   └── ...
├── frontend/
│   ├── ...
│   └── ...
├── data/
│   ├── purchase_orders/
│   └── runs/
├── tests/
└── README.md
```

---

# Technology stack

- **Backend:** Python, FastAPI, Pydantic
- **PDF extraction:** pdfplumber
- **OCR:** Tesseract / pytesseract
- **PDF rendering:** Poppler / pdf2image
- **Fuzzy matching:** RapidFuzz
- **LLM:** Groq API (`openai/gpt-oss-120b`) through an OpenAI-compatible client
- **Frontend:** Next.js, React, TypeScript
- **Storage:** JSON files for the prototype

---

# Why these technologies?

### FastAPI

FastAPI provides a lightweight API layer, request validation, automatic OpenAPI documentation, and a clean separation between frontend and backend.

### Pydantic

Pydantic models provide typed internal data structures and validation so malformed data is caught early.

### Deterministic Python rules

Business rules are intentionally implemented as normal Python rather than additional LLM calls.

This gives:

- reproducibility;
- lower cost;
- lower latency;
- easier testing;
- clear auditability.

A business rule can be inspected and explained directly.

### Groq

Groq provides fast inference through an OpenAI-compatible API and is suitable for the prototype's AI extraction layer.

### RapidFuzz

RapidFuzz is used for PO line-description matching because this is a deterministic text-similarity problem and does not require another AI call.

---

# Running the project

## Backend

Create and activate a Python virtual environment:

```bash
python -m venv venv
```

Windows:

```bash
venv\Scripts\activate
```

macOS/Linux:

```bash
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Configure the Groq API key in `.env`:

```env
GROQ_API_KEY=your_key_here
```

Start the backend using the repository's configured FastAPI command, for example:

```bash
uvicorn app.main:app --reload
```

Use the actual module path in the repository if it differs.

---

# Frontend

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Then open the local URL printed by Next.js.

---

# Processing workflow

```text
Upload invoice
      |
      v
Ingestion
      |
      v
Text / OCR
      |
      v
AI structured extraction
      |
      v
Normalization
      |
      v
Validation
      |
      v
Duplicate detection
      |
      v
PO header matching
      |
      v
PO line matching
      |
      v
Decision
      |
      v
Audit persistence
      |
      v
UI result
```

---

# Testing

The business-rule layers are deterministic and can be tested independently from the LLM.

Important test categories include:

- clean invoice approval;
- missing required fields;
- arithmetic mismatch;
- duplicate invoice;
- nonexistent PO;
- vendor mismatch;
- first PO invoice;
- split/partial PO;
- remaining balance exceeded;
- line quantity mismatch;
- line price mismatch;
- OCR fallback;
- garbled PDF fallback;
- confidence warnings;
- final decision priority.

The LLM extraction layer should be tested separately with representative fixture responses so business-rule tests do not depend on live model availability.

---

# Design principles

## 1. AI reads; rules decide

The LLM extracts information from an invoice.

It does not decide whether the company should approve the invoice.

The financial decision is made by deterministic rules.

## 2. Confidence is evidence, not the business decision

An LLM confidence score is useful for identifying uncertainty.

It should not be treated as a financial approval score.

Required uncertain fields can block automated processing and result in `FLAG`, while non-critical uncertainty can remain a warning.

## 3. Validate before matching

There is no point comparing an invoice to a PO if the extracted invoice itself is structurally or mathematically invalid.

## 4. Match at both header and line level

A correct total does not guarantee correct line-level pricing.

Both levels are therefore checked.

## 5. Prefer explainable rules

A business rule should be inspectable:

```text
remaining_balance = PO_total - previously_invoiced
```

rather than hidden inside another LLM prompt.

## 6. Preserve evidence

Every decision should be explainable after the fact.

That is why extraction results, validation results, PO matching results, and final reasons are persisted.

---

# Known limitations

This is a prototype rather than a production AP platform.

### 1. JSON storage

PO master data and run history are stored in JSON files.

For production, this should be replaced with a database such as PostgreSQL for concurrency safety, transactions, indexing, and scalable history.

### 2. PO balance state

The prototype uses deterministic sample PO data.

In production, approving an invoice should atomically update the PO's consumed amount/quantity so subsequent invoices see the new remaining balance.

### 3. Vendor matching

Vendor matching is intentionally conservative.

A production implementation could strengthen matching with stable identifiers such as tax/VAT/GST ID, vendor ID, bank information, and registered address.

### 4. Fuzzy line matching

Line descriptions are currently matched using text similarity.

A production system would prefer stable identifiers such as SKU, product ID, or PO line ID when available.

### 5. Live stage animation

If the backend processes the whole request synchronously, the UI stage progression is presentation rather than true server-side streaming.

True real-time execution could use SSE, WebSockets, or background jobs.

### 6. OCR quality

OCR quality depends on scan quality, resolution, language, and invoice layout.

A production system could add stronger OCR models, language detection, image preprocessing, and human correction workflows.

---

# Production evolution

The prototype can naturally evolve into:

```text
Invoice
   |
   v
Object Storage
   |
   v
OCR / Document Intelligence
   |
   v
Extraction Service
   |
   v
Validation
   |
   v
Duplicate Service
   |
   v
PO Matching Service
   |
   v
Decision Engine
   |
   v
Approval / Human Review
   |
   v
PostgreSQL
   |
   v
Audit / Analytics
   |
   v
Dashboard
```

Potential production additions include:

- PostgreSQL;
- queue-based processing;
- true streaming status updates;
- role-based access control;
- immutable audit logs;
- stronger vendor identity matching;
- ERP integration;
- approval workflows;
- retry/dead-letter handling;
- monitoring and alerting.

These are intentionally outside the minimum assessment scope.

---

# Assessment alignment

This implementation is designed around the PS-1 requirement:

> **From PDF to decision**

The important distinction is that the system does not stop at extraction.

It takes the invoice through:

```text
PDF
 ↓
understanding
 ↓
validation
 ↓
duplicate detection
 ↓
PO matching
 ↓
deterministic decision
 ↓
explanation
 ↓
audit trail
```

The assessment calls for a process that actually runs end-to-end, produces a clear output, deliberately handles edge cases, and gives the interviewer something understandable to see during the demo.

This architecture supports that by making every stage visible and explainable.

---

# Recommended demo scenarios

### Demo 1 — Happy path

```text
Invoice
 -> extraction
 -> validation
 -> PO match
 -> APPROVE
```

### Demo 2 — Vendor mismatch

```text
Invoice
 -> valid PO
 -> wrong vendor
 -> REJECT
```

### Demo 3 — Duplicate

```text
Invoice
 -> duplicate detected
 -> REJECT
```

### Demo 4 — Split PO

```text
Invoice
 -> existing PO
 -> remaining balance check
 -> APPROVE or FLAG
```

### Demo 5 — Scanned invoice

```text
Image-only PDF
 -> OCR fallback
 -> extraction
 -> normal workflow
```

### Demo 6 — Line-level price variance

```text
Invoice
 -> header appears acceptable
 -> line price differs from PO
 -> FLAG
```

These scenarios demonstrate that the system is not simply an LLM wrapper; the deterministic business workflow is what makes the final decision.

---

# Final architecture principle

> **The AI reads and structures the invoice; deterministic business rules make the financial decision.**

The result is a system that combines AI's ability to understand messy documents with deterministic, explainable business logic for financial decisions.
