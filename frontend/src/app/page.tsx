"use client";

import { useState } from "react";

type RunResult = {
  run_id: string;
  filename: string;
  extracted_invoice: {
    vendor_name: string | null;
    invoice_number: string | null;
    total: number | null;
    po_number: string | null;
  };
  validation: { is_valid: boolean; issues: string[] };
  po_matching: {
    checks: Record<string, boolean>;
    details: string[];
    matched_po: { po_number: string; vendor_name: string; po_amount: number; remaining_amount?: number } | null;
  };
  decision: { decision: string; reason: string; supporting_details: string[] };
};

const STAGES = ["Upload", "Extract", "Validate", "PO Matching", "Decision"];

const STATUS_COLORS: Record<string, string> = {
  APPROVE: "var(--status-approve)",
  FLAG: "var(--status-flag)",
  REJECT: "var(--status-reject)",
};

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [currentStage, setCurrentStage] = useState(0);

  async function handleUpload() {
    if (!file) return;

    setLoading(true);
    setResult(null);
    setCurrentStage(0);

    for (let i = 0; i < STAGES.length - 1; i++) {
      await new Promise((r) => setTimeout(r, 350));
      setCurrentStage(i + 1);
    }

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("http://127.0.0.1:8000/invoices/upload", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    setCurrentStage(STAGES.length);
    setResult(data);
    setLoading(false);
  }

  return (
    <div style={{ maxWidth: "700px" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.5rem" }}>
        Process an invoice
      </h1>
      <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>
        Upload a vendor invoice PDF to run it through extraction, validation, and PO matching.
      </p>

      <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginBottom: "2rem" }}>
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <button
          onClick={handleUpload}
          disabled={!file || loading}
          style={{
            padding: "0.5rem 1rem",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "6px",
            color: "var(--text-primary)",
            cursor: loading ? "default" : "pointer",
          }}
        >
          {loading ? "Processing..." : "Upload & Process"}
        </button>
      </div>

      {(loading || result) && (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "1.25rem",
          }}
        >
          <div style={{ marginBottom: "1.25rem" }}>
            {STAGES.map((stage, i) => (
              <div
                key={stage}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  padding: "0.35rem 0",
                  color: i < currentStage ? "var(--text-primary)" : "var(--text-muted)",
                }}
              >
                <span>{i < currentStage ? "✓" : "○"}</span>
                <span>{stage}</span>
              </div>
            ))}
          </div>

          {result && (
            <>
              <div
                style={{
                  padding: "1rem",
                  borderRadius: "6px",
                  background: "var(--background)",
                  border: `1px solid ${STATUS_COLORS[result.decision.decision] ?? "var(--border)"}`,
                  marginBottom: "1rem",
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "1.1rem",
                    color: STATUS_COLORS[result.decision.decision] ?? "var(--text-primary)",
                    marginBottom: "0.25rem",
                  }}
                >
                  {result.decision.decision}
                </div>
                <div style={{ color: "var(--text-muted)" }}>{result.decision.reason}</div>
              </div>

              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.9rem", lineHeight: 1.7 }}>
                <div>Invoice: {result.extracted_invoice.invoice_number}</div>
                <div>Vendor: {result.extracted_invoice.vendor_name}</div>
                <div>PO: {result.extracted_invoice.po_number}</div>
                <div>Total: ₹{result.extracted_invoice.total?.toLocaleString()}</div>
              </div>

              <div style={{ marginTop: "1rem" }}>
                <div style={{ color: "var(--text-muted)", marginBottom: "0.4rem" }}>
                  Reasoning trail
                </div>
                {result.po_matching.details.map((detail, i) => (
                  <div key={i} style={{ fontSize: "0.85rem", padding: "0.15rem 0" }}>
                    — {detail}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}