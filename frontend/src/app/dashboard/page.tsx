"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Run = {
  run_id: string;
  filename: string;
  timestamp: string;
  extracted_invoice: {
    invoice_number: string | null;
    vendor_name: string | null;
    total: number | null;
  };
  decision: { decision: string };
};

const STATUS_COLORS: Record<string, string> = {
  APPROVE: "var(--status-approve)",
  FLAG: "var(--status-flag)",
  REJECT: "var(--status-reject)",
};

export default function Dashboard() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/invoices/runs")
      .then((res) => res.json())
      .then((data) => {
        setRuns(data);
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.5rem" }}>
        Invoice history
      </h1>
      <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>
        Every invoice processed, with its decision and reasoning.
      </p>

      {loading && <p style={{ color: "var(--text-muted)" }}>Loading...</p>}

      {!loading && runs.length === 0 && (
        <p style={{ color: "var(--text-muted)" }}>
          No invoices processed yet. Go to Live Run to process your first one.
        </p>
      )}

      {!loading && runs.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <th style={headerStyle}>Invoice</th>
              <th style={headerStyle}>Vendor</th>
              <th style={headerStyle}>Total</th>
              <th style={headerStyle}>Status</th>
              <th style={headerStyle}>Processed</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr key={run.run_id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={cellStyle}>
                  <Link
                    href={`/dashboard/${run.run_id}`}
                    style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}
                  >
                    {run.extracted_invoice.invoice_number ?? "—"}
                  </Link>
                </td>
                <td style={cellStyle}>{run.extracted_invoice.vendor_name ?? "—"}</td>
                <td style={{ ...cellStyle, fontFamily: "var(--font-mono)" }}>
                  ₹{run.extracted_invoice.total?.toLocaleString() ?? "—"}
                </td>
                <td style={cellStyle}>
                  <span style={{ color: STATUS_COLORS[run.decision.decision], fontWeight: 600 }}>
                    {run.decision.decision}
                  </span>
                </td>
                <td style={{ ...cellStyle, color: "var(--text-muted)" }}>
                  {new Date(run.timestamp).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const headerStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "0.6rem 0.5rem",
  color: "var(--text-muted)",
  fontWeight: 500,
  fontSize: "0.85rem",
};

const cellStyle: React.CSSProperties = {
  padding: "0.6rem 0.5rem",
  fontSize: "0.9rem",
};