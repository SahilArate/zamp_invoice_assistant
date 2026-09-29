"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { API_URL } from "@/lib/api";

type RunDetail = {
  run_id: string;
  filename: string;
  timestamp: string;
  text_source?: string;
  extracted_invoice: {
    vendor_name: string | null;
    invoice_number: string | null;
    invoice_date: string | null;
    po_number: string | null;
    total: number | null;
    subtotal: number | null;
    tax: number | null;
    line_items: { description: string; quantity: number; unit_price: number; amount: number }[];
    field_confidence?: Record<string, number>;
  };
  validation: { is_valid: boolean; issues: string[]; warnings: string[] };
  po_matching: {
    checks: Record<string, boolean>;
    details: string[];
  };
  decision: { decision: string; reason: string; supporting_details: string[] };
};

const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  APPROVE: { color: "var(--status-approve)", bg: "var(--status-approve-bg)" },
  FLAG: { color: "var(--status-flag)", bg: "var(--status-flag-bg)" },
  REJECT: { color: "var(--status-reject)", bg: "var(--status-reject-bg)" },
};

export default function RunDetail() {
  const params = useParams();
  const runId = params.run_id as string;
  const [run, setRun] = useState<RunDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/invoices/runs/${runId}`)
      .then((res) => res.json())
      .then((data) => {
        setRun(data);
        setLoading(false);
      });
  }, [runId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm" style={{ color: "var(--text-muted)" }}>
        <Loader2 size={16} className="animate-spin" />
        Loading…
      </div>
    );
  }
  if (!run) return <p style={{ color: "var(--text-muted)" }}>Run not found.</p>;

  const statusStyle = STATUS_STYLE[run.decision.decision];

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/dashboard"
        className="mb-4 inline-flex items-center gap-1.5 text-sm hover:underline"
        style={{ color: "var(--text-secondary)" }}
      >
        <ArrowLeft size={14} /> Back to history
      </Link>

      <h1 className="mb-6 text-2xl font-semibold tracking-tight">
        {run.extracted_invoice.invoice_number ?? "Invoice"}
      </h1>

      <div
        className="mb-4 rounded-lg border p-4"
        style={{ background: statusStyle?.bg, borderColor: statusStyle?.color }}
      >
        <div className="text-base font-bold" style={{ color: statusStyle?.color }}>
          {run.decision.decision}
        </div>
        <div className="mt-0.5 text-sm" style={{ color: "var(--text-secondary)" }}>
          {run.decision.reason}
        </div>
      </div>

      {run.text_source && (
        <div className="mb-6 text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
          Source: {run.text_source}
        </div>
      )}

      <Section title="Invoice details">
        <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
          <Row label="Vendor" value={run.extracted_invoice.vendor_name} />
          <Row label="Invoice date" value={run.extracted_invoice.invoice_date} />
          <Row label="PO number" value={run.extracted_invoice.po_number} />
          <Row label="Subtotal" value={`₹${run.extracted_invoice.subtotal?.toLocaleString()}`} />
          <Row label="Tax" value={`₹${run.extracted_invoice.tax?.toLocaleString()}`} />
          <Row label="Total" value={`₹${run.extracted_invoice.total?.toLocaleString()}`} />
        </div>
      </Section>

      <Section title="Line items">
        <div className="space-y-1.5">
          {run.extracted_invoice.line_items.map((item, i) => (
            <div
              key={i}
              className="rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: "var(--border-subtle)", fontFamily: "var(--font-mono)" }}
            >
              {item.description} — Qty {item.quantity} × ₹{item.unit_price} = ₹{item.amount.toLocaleString()}
            </div>
          ))}
        </div>
      </Section>

      {run.extracted_invoice.field_confidence && (
        <Section title="AI extraction confidence">
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(run.extracted_invoice.field_confidence).map(([field, score]) => {
              const n = Number(score);
              const color = n >= 0.8 ? "var(--status-approve)" : n >= 0.6 ? "var(--status-flag)" : "var(--status-reject)";
              return (
                <span
                  key={field}
                  className="rounded-md border px-2 py-0.5 text-xs"
                  style={{ borderColor: color, color, fontFamily: "var(--font-mono)" }}
                >
                  {field} {(n * 100).toFixed(0)}%
                </span>
              );
            })}
          </div>
        </Section>
      )}

      <Section title="Validation">
        {run.validation.is_valid ? (
          <div className="text-sm" style={{ color: "var(--status-approve)" }}>All hard checks passed.</div>
        ) : (
          <div className="space-y-1">
            {run.validation.issues.map((issue, i) => (
              <div key={i} className="text-sm" style={{ color: "var(--text-secondary)" }}>— {issue}</div>
            ))}
          </div>
        )}
        {run.validation.warnings?.length > 0 && (
          <div className="mt-2 space-y-1">
            {run.validation.warnings.map((w, i) => (
              <div key={i} className="text-sm" style={{ color: "var(--status-flag)" }}>⚠ {w}</div>
            ))}
          </div>
        )}
      </Section>

      <Section title="PO matching reasoning trail">
        <div className="space-y-1.5">
          {run.po_matching.details.map((detail, i) => (
            <div key={i} className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              <span style={{ color: "var(--text-muted)" }}>— </span>{detail}
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="mb-2 text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between border-b py-1.5" style={{ borderColor: "var(--border-subtle)" }}>
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <span style={{ fontFamily: "var(--font-mono)" }}>{value ?? "—"}</span>
    </div>
  );
}