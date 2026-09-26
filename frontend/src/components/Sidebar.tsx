"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();

  const linkStyle = (path: string) => ({
    color: pathname === path ? "var(--text-primary)" : "var(--text-muted)",
    fontWeight: pathname === path ? 600 : 400,
    textDecoration: "none",
    padding: "0.4rem 0.6rem",
    borderRadius: "6px",
    background: pathname === path ? "var(--surface)" : "transparent",
  });

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

      <nav style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
        <Link href="/" style={linkStyle("/")}>
          Live Run
        </Link>
        <Link href="/dashboard" style={linkStyle("/dashboard")}>
          Dashboard
        </Link>
      </nav>
    </aside>
  );
}