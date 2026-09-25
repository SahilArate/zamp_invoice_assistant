import Link from "next/link";

export default function Sidebar() {
  return (
    <aside
      style={{
        width: "220px",
        height: "100vh",
        borderRight: "1px solid var(--border)",
        padding: "1.5rem 1rem",
        position: "fixed",
        left: 0,
        top: 0,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: "2rem" }}>
        Invoice Assistant
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <Link href="/" style={{ color: "var(--text-primary)", textDecoration: "none" }}>
          Live Run
        </Link>
        <Link href="/dashboard" style={{ color: "var(--text-muted)", textDecoration: "none" }}>
          Dashboard
        </Link>
      </nav>
    </aside>
  );
}