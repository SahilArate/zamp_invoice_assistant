import json
from openai import OpenAI

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

If a field is missing or unclear, set it to null. Only respond with valid JSON, nothing else.

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
    return ExtractedInvoice(**data)