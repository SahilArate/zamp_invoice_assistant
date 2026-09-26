"use client";

import { useState } from "react";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function handleUpload() {
    if (!file) return;

    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("http://127.0.0.1:8000/invoices/upload", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    setResult(data);
    setLoading(false);
  }

  return (
    <div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1.5rem" }}>
        Process an invoice
      </h1>

      <input
        type="file"
        accept="application/pdf"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />

      <button
        onClick={handleUpload}
        disabled={!file || loading}
        style={{
          marginLeft: "1rem",
          padding: "0.5rem 1rem",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "6px",
          color: "var(--text-primary)",
          cursor: "pointer",
        }}
      >
        {loading ? "Processing..." : "Upload & Process"}
      </button>

      {result && (
        <pre
          style={{
            marginTop: "2rem",
            background: "var(--surface)",
            padding: "1rem",
            borderRadius: "6px",
            overflow: "auto",
            fontFamily: "var(--font-mono)",
            fontSize: "0.85rem",
          }}
        >
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}