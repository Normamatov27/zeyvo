"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuthStore } from "@/stores/auth";
import { apiFetch } from "@/lib/api";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";

const ADMIN_ROLES = new Set(["operator", "manager", "org_admin", "super_admin"]);

type RoleKey = "operator" | "manager" | "org_admin" | "super_admin";
const ROLE_RANK: Record<RoleKey, number> = { operator: 1, manager: 2, org_admin: 3, super_admin: 4 };

const GROUPS: {
  group: string;
  minRole: RoleKey;
  items: { href: string; label: string; live?: boolean; minRole?: RoleKey }[];
}[] = [
  {
    group: "live",
    minRole: "operator",
    items: [
      { href: "/admin/overview", label: "overview", live: true, minRole: "manager" },
      { href: "/admin/queue",    label: "queue" },
    ],
  },
  {
    group: "operations",
    minRole: "manager",
    items: [
      { href: "/admin/branches",     label: "branches",     minRole: "org_admin" },
      { href: "/admin/staff",        label: "staff",        minRole: "org_admin" },
      { href: "/admin/services",     label: "services",     minRole: "org_admin" },
      { href: "/admin/users",        label: "users",        minRole: "super_admin" },
      { href: "/admin/appointments", label: "appointments" },
    ],
  },
  {
    group: "intelligence",
    minRole: "manager",
    items: [
      { href: "/admin/analytics", label: "analytics" },
      { href: "/admin/predict",   label: "predictions", minRole: "org_admin" },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { roles, userId, clear, _hydrated } = useAuthStore();
  const [profileName, setProfileName] = useState<string | null>(null);
  const t = useTranslations("admin");

  // Auth gate + operator redirect (must run before early returns to satisfy hooks rules)
  useEffect(() => {
    if (!_hydrated) return;
    if (!userId || !roles.some((r) => ADMIN_ROLES.has(r))) {
      router.replace(`/sign-in?redirect=${encodeURIComponent(pathname)}` as any);
      return;
    }
    const isOp = roles.includes("operator") && !roles.includes("manager") && !roles.includes("org_admin") && !roles.includes("super_admin");
    if (isOp && pathname !== "/admin/queue" && !pathname.startsWith("/admin/queue/")) {
      router.replace("/admin/queue");
    }
  }, [_hydrated, userId, roles, pathname]);

  useEffect(() => {
    if (!_hydrated || !userId) return;
    apiFetch<{ fullName: string | null; phone: string | null }>("/api/v1/me")
      .then((p) => setProfileName(p.fullName ?? p.phone ?? null))
      .catch(() => {});
  }, [_hydrated, userId]);

  function signOut() {
    clear();
    router.push("/sign-in");
  }

  if (!_hydrated) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--color-fg-3)" }}>
        Loading…
      </div>
    );
  }
  if (!userId || !roles.some((r) => ADMIN_ROLES.has(r))) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--color-fg-3)" }}>
        Redirecting to sign-in…
      </div>
    );
  }

  const roleKey: RoleKey =
    roles.includes("super_admin") ? "super_admin"
    : roles.includes("org_admin") ? "org_admin"
    : roles.includes("manager") ? "manager"
    : "operator";
  const rank = ROLE_RANK[roleKey];
  const displayRole = t(`roles.${roleKey}`);
  const isSuper = roles.includes("super_admin");


  return (
    <div style={{ display: "flex", height: "100svh", overflow: "hidden" }}>
      {/* Mobile gate — admin is desktop-only */}
      <style>{`
        @media (max-width: 900px) {
          .admin-root { display: none !important; }
          .admin-mobile-gate { display: flex !important; }
        }
      `}</style>
      <div className="admin-mobile-gate" style={{
        display: "none", position: "fixed", inset: 0, zIndex: 9999,
        background: "var(--color-bg)", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: 32, textAlign: "center", gap: 16,
      }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
          stroke="var(--color-fg-3)" strokeWidth="1.5" strokeLinecap="round">
          <rect x="2" y="3" width="20" height="14" rx="2"/>
          <path d="M8 21h8M12 17v4"/>
        </svg>
        <div style={{ fontSize: 17, fontWeight: 600 }}>Open on a larger screen</div>
        <div style={{ fontSize: 13, color: "var(--color-fg-3)", maxWidth: 280, lineHeight: 1.5 }}>
          The admin panel is designed for desktop. Please open it on a device with a screen wider than 900px.
        </div>
      </div>
      <div className="admin-root" style={{ display: "flex", width: "100%", height: "100%", overflow: "hidden" }}>
      {/* Sidebar */}
      <aside style={{
        width: 220, flexShrink: 0,
        background: "var(--color-surface)",
        borderRight: "1px solid var(--color-hairline)",
        display: "flex", flexDirection: "column",
        padding: "14px 10px",
      }}>
        {/* Wordmark */}
        <div style={{
          padding: "6px 10px 14px",
          borderBottom: "1px solid var(--color-hairline)",
          marginBottom: 10,
        }}>
          <span style={{
            fontSize: 15, fontWeight: 700, letterSpacing: -0.5,
            color: "var(--color-primary)",
          }}>zeyvo</span>
          <span style={{ fontSize: 11, color: "var(--color-fg-3)", marginLeft: 6,
            fontFamily: "var(--font-mono)" }}>admin</span>
        </div>

        {/* User pill */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "8px 10px", borderRadius: 8,
          background: "var(--color-surface-2)", marginBottom: 14,
        }}>
          <div style={{
            width: 26, height: 26, borderRadius: 6,
            background: "oklch(0.55 0.18 25)", color: "#fff",
            display: "grid", placeItems: "center",
            fontSize: 12, fontWeight: 600, flex: "none",
          }}>
            {(profileName ?? userId ?? "?").charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
              {profileName ?? userId?.slice(0, 8) + "…"}
            </div>
            <div style={{ fontSize: 10, color: "var(--color-fg-3)",
              fontFamily: "var(--font-mono)" }}>{displayRole}</div>
          </div>
        </div>

        {/* Nav groups */}
        {GROUPS.filter((g) => ROLE_RANK[g.minRole] <= rank).map((group) => {
          const visibleItems = group.items.filter((i) => ROLE_RANK[i.minRole ?? "operator"] <= rank);
          if (visibleItems.length === 0) return null;
          return (
          <div key={group.group} style={{ marginBottom: 14 }}>
            <div style={{
              padding: "4px 10px 6px",
              fontSize: 10, fontFamily: "var(--font-mono)",
              textTransform: "uppercase", letterSpacing: 0.6,
              color: "var(--color-fg-4)", fontWeight: 500,
            }}>{t(`groups.${group.group}`)}</div>
            {visibleItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link key={item.href} href={item.href as any} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "7px 10px", borderRadius: 6,
                  fontSize: 13, textDecoration: "none",
                  background: active ? "var(--color-primary-soft)" : "transparent",
                  color: active ? "var(--color-primary)" : "var(--color-fg-2)",
                  fontWeight: active ? 500 : 400,
                  marginBottom: 1,
                }}>
                  <span style={{ flex: 1 }}>{t(`items.${item.label}`)}</span>
                  {item.live && (
                    <span style={{
                      display: "flex", alignItems: "center", gap: 3,
                      fontSize: 10, fontWeight: 600,
                      color: "var(--color-success)",
                      background: "var(--color-success-soft)",
                      padding: "2px 6px", borderRadius: 999,
                    }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%",
                        background: "var(--color-success)" }}/>
                      live
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
          );
        })}

        {/* Theme + Locale (push to bottom) */}
        <div style={{ marginTop: "auto", padding: "10px 4px 12px", borderTop: "1px solid var(--color-hairline)", display: "flex", flexDirection: "column", gap: 8 }}>
          <ThemeToggle/>
          <LocaleSwitcher/>
        </div>

        {/* Sign out + super_admin shortcut */}
        <div style={{ paddingTop: 12,
          borderTop: "1px solid var(--color-hairline)" }}>
          {isSuper && (
            <Link href="/platform" style={{
              display: "block", padding: "8px 10px", borderRadius: 6,
              background: "var(--color-primary-soft)",
              color: "var(--color-primary)",
              fontSize: 12, fontWeight: 500,
              textDecoration: "none", marginBottom: 6,
            }}>
              {t("platformAdmin")} →
            </Link>
          )}
          <button
            onClick={signOut}
            style={{
              width: "100%", padding: "8px 10px", borderRadius: 6,
              background: "none", border: "none",
              color: "var(--color-fg-3)", fontSize: 12,
              cursor: "pointer", textAlign: "left",
            }}
          >
            {t("signOut")}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: "auto", background: "var(--color-bg)" }}>
        {children}
      </main>
      </div>
    </div>
  );
}
