"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Zap, LayoutDashboard, FileStack } from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Live Run", icon: Zap },
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 border-r flex flex-col"
      style={{ borderColor: "var(--border)" }}>
      <div className="flex items-center gap-2.5 px-5 py-6">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ background: "var(--accent)" }}
        >
          <FileStack size={16} color="white" strokeWidth={2.25} />
        </div>
        <div>
          <div className="text-sm font-semibold leading-tight">Invoice Assistant</div>
          <div className="text-xs" style={{ color: "var(--text-muted)" }}>Zamp AI Solutions</div>
        </div>
      </div>

      <nav className="flex flex-col gap-1 px-3">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors"
              style={{
                color: active ? "var(--text-primary)" : "var(--text-secondary)",
                background: active ? "var(--surface)" : "transparent",
                fontWeight: active ? 600 : 400,
              }}
            >
              <Icon size={16} strokeWidth={2} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-5 py-5 text-xs" style={{ color: "var(--text-muted)" }}>
        PS-1 · Invoice Processing
      </div>
    </aside>
  );
}