"use client";

import { useState, useRef } from "react";
import { UploadCloud, FileText, Loader2, CheckCircle2, Circle } from "lucide-react";
import { API_URL } from "@/lib/api";

type RunResult = {
  run_id: string;
  filename: string;
  extracted_invoice: {
    vendor_name: string | null;
    invoice_number: string | null;
    total: number | null;
    po_number: string | null;
    field_confidence?: Record<string, number>;
  };
  validation: { is_valid: boolean; issues: string[]; warnings: string[] };
  po_matching: {
    checks: Record<string, boolean>;
    details: string[];
  };
  decision: { decision: string; reason: string; supporting_details: string[] };
};

const STAGES = ["Upload", "Extract", "Validate", "PO Matching", "Decision"];

const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  APPROVE: { color: "var(--status-approve)", bg: "var(--status-approve-bg)" },
  FLAG: { color: "var(--status-flag)", bg: "var(--status-flag-bg)" },
  REJECT: { color: "var(--status-reject)", bg: "var(--status-reject-bg)" },
};

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [currentStage, setCurrentStage] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleUpload() {
    if (!file) return;
    setLoading(true);
    setResult(null);
    setCurrentStage(0);

    for (let i = 0; i < STAGES.length - 1; i++) {
      await new Promise((r) => setTimeout(r, 300));
      setCurrentStage(i + 1);
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${API_URL}/invoices/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      setCurrentStage(STAGES.length);
      setResult(data);
    } finally {
      setLoading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) setFile(dropped);
  }

  const statusStyle = result ? STATUS_STYLE[result.decision.decision] : null;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Process an invoice</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          Upload a vendor invoice PDF to run extraction, validation, and PO matching.
        </p>
      </div>

      {/* Upload zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className="cursor-pointer rounded-xl border border-dashed px-6 py-10 text-center transition-colors"
        style={{
          borderColor: dragActive ? "var(--accent)" : "var(--border)",
          background: dragActive ? "var(--surface-hover)" : "var(--surface)",
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        {file ? (
          <div className="flex flex-col items-center gap-2">
            <FileText size={28} style={{ color: "var(--accent)" }} />
            <div className="text-sm font-medium">{file.name}</div>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>
              Click or drop to replace
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <UploadCloud size={28} style={{ color: "var(--text-muted)" }} />
            <div className="text-sm font-medium">Drop an invoice PDF here</div>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>
              or click to browse
            </div>
          </div>
        )}
      </div>

      <button
        onClick={handleUpload}
        disabled={!file || loading}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-40"
        style={{
          background: "var(--accent)",
          color: "white",
        }}
        onMouseEnter={(e) => { if (file && !loading) e.currentTarget.style.background = "var(--accent-hover)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "var(--accent)"; }}
      >
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Processing…
          </>
        ) : (
          "Upload & Process"
        )}
      </button>

      {(loading || result) && (
        <div
          className="mt-8 rounded-xl border p-6"
          style={{ background: "var(--surface)", borderColor: "var(--border)", animation: "fadeIn 0.3s ease" }}
        >
          <div className="mb-6 flex flex-col gap-2.5">
            {STAGES.map((stage, i) => {
              const done = i < currentStage;
              return (
                <div key={stage} className="flex items-center gap-2.5 text-sm">
                  {done ? (
                    <CheckCircle2 size={16} style={{ color: "var(--status-approve)" }} />
                  ) : (
                    <Circle size={16} style={{ color: "var(--border)" }} />
                  )}
                  <span style={{ color: done ? "var(--text-primary)" : "var(--text-muted)" }}>{stage}</span>
                </div>
              );
            })}
          </div>

          {result && statusStyle && (
            <>
              <div
                className="mb-4 rounded-lg border p-4"
                style={{ background: statusStyle.bg, borderColor: statusStyle.color }}
              >
                <div className="text-base font-bold" style={{ color: statusStyle.color }}>
                  {result.decision.decision}
                </div>
                <div className="mt-0.5 text-sm" style={{ color: "var(--text-secondary)" }}>
                  {result.decision.reason}
                </div>
              </div>

              {result.validation.warnings?.length > 0 && (
                <div
                  className="mb-4 rounded-lg border p-3.5 text-sm"
                  style={{ background: "var(--status-flag-bg)", borderColor: "var(--status-flag)" }}
                >
                  <div className="mb-1 font-semibold" style={{ color: "var(--status-flag)" }}>
                    ⚠ Non-blocking warnings
                  </div>
                  {result.validation.warnings.map((w, i) => (
                    <div key={i} style={{ color: "var(--text-secondary)" }}>— {w}</div>
                  ))}
                </div>
              )}

              <div
                className="mb-4 grid grid-cols-2 gap-x-6 gap-y-2 rounded-lg border p-4 text-sm"
                style={{ borderColor: "var(--border-subtle)", fontFamily: "var(--font-mono)" }}
              >
                <div><span style={{ color: "var(--text-muted)" }}>Invoice </span>{result.extracted_invoice.invoice_number}</div>
                <div><span style={{ color: "var(--text-muted)" }}>Vendor </span>{result.extracted_invoice.vendor_name}</div>
                <div><span style={{ color: "var(--text-muted)" }}>PO </span>{result.extracted_invoice.po_number}</div>
                <div><span style={{ color: "var(--text-muted)" }}>Total </span>₹{result.extracted_invoice.total?.toLocaleString()}</div>
              </div>

              {result.extracted_invoice.field_confidence && (
                <div className="mb-4">
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                    AI extraction confidence
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(result.extracted_invoice.field_confidence).map(([field, score]) => {
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
                </div>
              )}

              <div>
                <div className="mb-2 text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                  Reasoning trail
                </div>
                <div className="space-y-1.5">
                  {result.po_matching.details.map((d, i) => (
                    <div key={i} className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                      <span style={{ color: "var(--text-muted)" }}>— </span>{d}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}