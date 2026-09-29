"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Inbox } from "lucide-react";
import { API_URL } from "@/lib/api";
import { Trash2 } from "lucide-react";

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

const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  APPROVE: { color: "var(--status-approve)", bg: "var(--status-approve-bg)" },
  FLAG: { color: "var(--status-flag)", bg: "var(--status-flag-bg)" },
  REJECT: { color: "var(--status-reject)", bg: "var(--status-reject-bg)" },
};

export default function Dashboard() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/invoices/runs`)
      .then((res) => res.json())
      .then((data) => {
        setRuns(data);
        setLoading(false);
      });
  }, []);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Invoice history</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            Every invoice processed, with its decision and reasoning.
          </p>
        </div>
        {runs.length > 0 && (
          <button
            onClick={async () => {
              if (!confirm("Clear all run history? This cannot be undone.")) return;
              await fetch(`${API_URL}/invoices/runs`, { method: "DELETE" });
              setRuns([]);
            }}
            className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium"
            style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
          >
            <Trash2 size={13} /> Clear history
          </button>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-10 text-sm" style={{ color: "var(--text-muted)" }}>
          <Loader2 size={16} className="animate-spin" />
          Loading history…
        </div>
      )}

      {!loading && runs.length === 0 && (
        <div
          className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-14 text-center"
          style={{ borderColor: "var(--border)" }}
        >
          <Inbox size={28} style={{ color: "var(--text-muted)" }} />
          <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
            No invoices processed yet.
          </div>
          <Link href="/" className="text-sm font-medium" style={{ color: "var(--accent)" }}>
            Process your first one →
          </Link>
        </div>
      )}

      {!loading && runs.length > 0 && (
        <div className="overflow-hidden rounded-xl border" style={{ borderColor: "var(--border)" }}>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
                {["Invoice", "Vendor", "Total", "Status", "Processed"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => {
                const style = STATUS_STYLE[run.decision.decision];
                return (
                  <tr
                    key={run.run_id}
                    className="transition-colors"
                    style={{ borderBottom: "1px solid var(--border-subtle)" }}
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/${run.run_id}`}
                        className="font-medium hover:underline"
                        style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}
                      >
                        {run.extracted_invoice.invoice_number ?? "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>
                      {run.extracted_invoice.vendor_name ?? "—"}
                    </td>
                    <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
                      ₹{run.extracted_invoice.total?.toLocaleString() ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="rounded-full px-2.5 py-1 text-xs font-semibold"
                        style={{ background: style?.bg, color: style?.color }}
                      >
                        {run.decision.decision}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--text-muted)" }}>
                      {new Date(run.timestamp).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}