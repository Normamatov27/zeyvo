"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuthStore } from "@/stores/auth";
import { apiFetch } from "@/lib/api";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";

const NAV = [
  { href: "/platform", label: "Overview", icon: "⬡" },
  { href: "/platform/tenants", label: "Tenants", icon: "🏢" },
  { href: "/platform/flags", label: "Feature flags", icon: "🚩" },
  { href: "/platform/audit", label: "Audit log", icon: "📋" },
];

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { roles, clear, _hydrated } = useAuthStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!_hydrated) return; // wait for localStorage rehydration before deciding
    const isSuperAdmin = roles.some((r) => r === "super_admin");
    if (!isSuperAdmin) {
      router.replace("/sign-in");
    } else {
      setReady(true);
    }
  }, [_hydrated, roles, router]);

  if (!ready) return null;

  return (
    <div style={{ display: "flex", height: "100dvh", background: "var(--color-bg)" }}>
      {/* Sidebar */}
      <div style={{
        width: 220, flexShrink: 0,
        background: "var(--color-surface)",
        borderRight: "1px solid var(--color-hairline)",
        display: "flex", flexDirection: "column",
      }}>
        {/* Logo / brand */}
        <div style={{
          height: 56, padding: "0 18px",
          display: "flex", alignItems: "center", gap: 8,
          borderBottom: "1px solid var(--color-hairline)",
        }}>
          <img src="/logo.jpg" alt="" className="logo-brand" style={{ width: 28, height: 28, borderRadius: 8, objectFit: "cover" }}/>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: -0.3 }}>zeyvo</div>
            <div style={{ fontSize: 9, color: "oklch(0.58 0.2 25)", fontFamily: "var(--font-mono)",
              fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>super admin</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV.map((item) => {
            const active = item.href === "/platform"
              ? pathname === "/platform"
              : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href as any} style={{
                display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
                borderRadius: 8, textDecoration: "none",
                background: active ? "var(--color-danger-soft)" : "transparent",
                color: active ? "oklch(0.58 0.2 25)" : "var(--color-fg-2)",
                fontSize: 13, fontWeight: active ? 600 : 400,
                transition: "all 0.1s",
              }}>
                <span style={{ fontSize: 15 }}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Theme + Locale */}
        <div style={{ padding: "10px 8px", borderTop: "1px solid var(--color-hairline)", display: "flex", flexDirection: "column", gap: 8 }}>
          <ThemeToggle/>
          <LocaleSwitcher/>
        </div>

        {/* Bottom: back to admin + sign out */}
        <div style={{ padding: "12px 8px", borderTop: "1px solid var(--color-hairline)", display: "flex", flexDirection: "column", gap: 2 }}>
          <Link href="/admin/overview" style={{
            display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
            borderRadius: 8, textDecoration: "none",
            color: "var(--color-fg-3)", fontSize: 12,
          }}>
            ← Admin panel
          </Link>
          <button onClick={() => { clear(); router.replace("/sign-in"); }} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
            borderRadius: 8, border: "none", background: "none", cursor: "pointer",
            color: "var(--color-danger)", fontSize: 12, textAlign: "left",
          }}>
            Sign out
          </button>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {children}
      </div>
    </div>
  );
}
