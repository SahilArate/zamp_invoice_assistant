"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type RunDetail = {
  run_id: string;
  filename: string;
  timestamp: string;
  extracted_invoice: {
    vendor_name: string | null;
    invoice_number: string | null;
    invoice_date: string | null;
    po_number: string | null;
    total: number | null;
    subtotal: number | null;
    tax: number | null;
    line_items: { description: string; quantity: number; unit_price: number; amount: number }[];
  };
  validation: { is_valid: boolean; issues: string[] };
  po_matching: {
    checks: Record<string, boolean>;
    details: string[];
    matched_po: { po_number: string; vendor_name: string; po_amount: number } | null;
  };
  decision: { decision: string; reason: string; supporting_details: string[] };
};

const STATUS_COLORS: Record<string, string> = {
  APPROVE: "var(--status-approve)",
  FLAG: "var(--status-flag)",
  REJECT: "var(--status-reject)",
};

export default function RunDetail() {
  const params = useParams();
  const runId = params.run_id as string;

  const [run, setRun] = useState<RunDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`http://127.0.0.1:8000/invoices/runs/${runId}`)
      .then((res) => res.json())
      .then((data) => {
        setRun(data);
        setLoading(false);
      });
  }, [runId]);

  if (loading) return <p style={{ color: "var(--text-muted)" }}>Loading...</p>;
  if (!run) return <p style={{ color: "var(--text-muted)" }}>Run not found.</p>;

  return (
    <div style={{ maxWidth: "700px" }}>
      <Link href="/dashboard" style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
        ← Back to history
      </Link>

      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 1.5rem" }}>
        {run.extracted_invoice.invoice_number ?? "Invoice"}
      </h1>

      <div
        style={{
          padding: "1rem",
          borderRadius: "6px",
          background: "var(--surface)",
          border: `1px solid ${STATUS_COLORS[run.decision.decision] ?? "var(--border)"}`,
          marginBottom: "1.5rem",
        }}
      >
        <div
          style={{
            fontWeight: 700,
            fontSize: "1.1rem",
            color: STATUS_COLORS[run.decision.decision] ?? "var(--text-primary)",
            marginBottom: "0.25rem",
          }}
        >
          {run.decision.decision}
        </div>
        <div style={{ color: "var(--text-muted)" }}>{run.decision.reason}</div>
      </div>

      <Section title="Invoice details">
        <Row label="Vendor" value={run.extracted_invoice.vendor_name} />
        <Row label="Invoice date" value={run.extracted_invoice.invoice_date} />
        <Row label="PO number" value={run.extracted_invoice.po_number} />
        <Row label="Subtotal" value={`₹${run.extracted_invoice.subtotal?.toLocaleString()}`} />
        <Row label="Tax" value={`₹${run.extracted_invoice.tax?.toLocaleString()}`} />
        <Row label="Total" value={`₹${run.extracted_invoice.total?.toLocaleString()}`} />
      </Section>

      <Section title="Line items">
        {run.extracted_invoice.line_items.map((item, i) => (
          <div key={i} style={{ fontSize: "0.9rem", padding: "0.25rem 0", fontFamily: "var(--font-mono)" }}>
            {item.description} — Qty {item.quantity} × ₹{item.unit_price} = ₹{item.amount.toLocaleString()}
          </div>
        ))}
      </Section>

      <Section title="Validation">
        {run.validation.is_valid ? (
          <div style={{ color: "var(--status-approve)" }}>All checks passed.</div>
        ) : (
          run.validation.issues.map((issue, i) => (
            <div key={i} style={{ fontSize: "0.9rem", padding: "0.2rem 0" }}>— {issue}</div>
          ))
        )}
      </Section>

      <Section title="PO matching reasoning trail">
        {run.po_matching.details.map((detail, i) => (
          <div key={i} style={{ fontSize: "0.9rem", padding: "0.2rem 0" }}>— {detail}</div>
        ))}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "0.25rem 0", fontSize: "0.9rem" }}>
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <span style={{ fontFamily: "var(--font-mono)" }}>{value ?? "—"}</span>
    </div>
  );
}