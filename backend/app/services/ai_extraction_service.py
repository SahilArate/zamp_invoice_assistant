import json
from openai import OpenAI
from app.services.normalization_service import normalize_invoice_dict

from app.core.config import GROQ_API_KEY, GROQ_BASE_URL, GROQ_MODEL
from app.models.invoice import ExtractedInvoice

client = OpenAI(api_key=GROQ_API_KEY, base_url=GROQ_BASE_URL)

EXTRACTION_PROMPT = """You are an invoice data extraction assistant.

Given the raw text of an invoice below, extract the following fields as JSON:
- vendor_name (string)
- invoice_number (string)
- invoice_date (string, format YYYY-MM-DD if possible)
- po_number (string)
- line_items (array of objects: description, quantity, unit_price, amount)
- subtotal (number)
- tax (number)
- total (number)
- currency (string, default "INR")
- field_confidence (object): for EACH of these fields — vendor_name, invoice_number, invoice_date, po_number, subtotal, tax, total —
  give a confidence score between 0.0 and 1.0 representing how certain you are that you read that specific value correctly from the text.
  A score of 1.0 means the value was printed clearly and unambiguously. A lower score (e.g. 0.5) means the value was unclear,
  partially cut off, ambiguous, or you had to guess/infer it.

If a field is missing or unclear, set its value to null and its confidence to a low score (e.g. 0.1-0.3).
Only respond with valid JSON, nothing else.

INVOICE TEXT:
{invoice_text}
"""


def extract_invoice_fields(raw_text: str) -> ExtractedInvoice:
    prompt = EXTRACTION_PROMPT.format(invoice_text=raw_text)

    response = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0,
    )

    raw_output = response.choices[0].message.content.strip()

    if raw_output.startswith("```"):
        raw_output = raw_output.strip("`")
        if raw_output.startswith("json"):
            raw_output = raw_output[4:]

    data = json.loads(raw_output)
    data = normalize_invoice_dict(data)
    return ExtractedInvoice(**data)