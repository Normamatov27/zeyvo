"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Menu } from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import { apiFetch } from "@/lib/api";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Sheet, SheetContent, Button } from "@/components/ui";
import { cn } from "@/lib/utils";

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
      { href: "/admin/windows",      label: "windows",      minRole: "manager" },
      { href: "/admin/providers",    label: "providers",    minRole: "org_admin" },
      { href: "/admin/chat",         label: "chat",         minRole: "org_admin" },
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

// ─── Shared nav content ───────────────────────────────────────────────────────

function NavContent({
  rank,
  roleKey,
  displayRole,
  profileName,
  userId,
  isSuper,
  pathname,
  onNavigate,
  signOut,
  t,
}: {
  rank: number;
  roleKey: RoleKey;
  displayRole: string;
  profileName: string | null;
  userId: string | null;
  isSuper: boolean;
  pathname: string;
  onNavigate?: () => void;
  signOut: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <>
      {/* Wordmark */}
      <div className="flex items-center gap-2 px-2.5 pb-3.5 border-b border-hairline mb-2.5">
        <img src="/logo.jpg" alt="" className="logo-brand w-[22px] h-[22px] rounded-[5px] object-cover" />
        <span className="text-sm font-bold tracking-tight">zeyvo</span>
        <span className="text-[10px] text-fg-3 font-mono">admin</span>
      </div>

      {/* User pill */}
      <div className="flex items-center gap-2 px-2.5 py-2 rounded-2 bg-surface-2 mb-3.5">
        <div className="w-6 h-6 rounded-[6px] bg-[oklch(0.55_0.18_25)] text-white grid place-items-center text-xs font-semibold flex-shrink-0">
          {(profileName ?? userId ?? "?").charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12.5px] font-semibold truncate">
            {profileName ?? (userId?.slice(0, 8) + "…")}
          </p>
          <p className="text-[10px] text-fg-3 font-mono">{displayRole}</p>
        </div>
      </div>

      {/* Nav groups */}
      <div className="flex-1 overflow-auto">
        {GROUPS.filter((g) => ROLE_RANK[g.minRole] <= rank).map((group) => {
          const visibleItems = group.items.filter(
            (i) => ROLE_RANK[i.minRole ?? "operator"] <= rank
          );
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.group} className="mb-3.5">
              <p className="px-2.5 pb-1.5 text-[10px] font-mono uppercase tracking-[0.06em] text-fg-4 font-medium">
                {t(`groups.${group.group}`)}
              </p>
              {visibleItems.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href as any}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-2 px-2.5 py-[7px] rounded-[6px] text-[13px] no-underline mb-px transition-colors",
                      active
                        ? "bg-primary-soft text-primary font-medium"
                        : "text-fg-2 hover:bg-surface-2 hover:text-fg"
                    )}
                  >
                    <span className="flex-1">{t(`items.${item.label}`)}</span>
                    {item.live && (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-success bg-success-soft px-1.5 py-0.5 rounded-pill">
                        <span className="w-1 h-1 rounded-full bg-success" />
                        live
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Bottom utilities */}
      <div className="pt-2.5 border-t border-hairline flex flex-col gap-2 mt-auto">
        <ThemeToggle />
        <LocaleSwitcher />
      </div>

      {/* Sign out + links */}
      <div className="pt-3 border-t border-hairline mt-1 flex flex-col gap-1">
        <Link
          href={"/admin/payment" as any}
          onClick={onNavigate}
          className="block px-2.5 py-2 rounded-[6px] bg-warning-soft text-warning text-xs font-medium no-underline"
        >
          Upgrade plan →
        </Link>
        {isSuper && (
          <Link
            href="/platform"
            onClick={onNavigate}
            className="block px-2.5 py-2 rounded-[6px] bg-primary-soft text-primary text-xs font-medium no-underline"
          >
            {t("platformAdmin")} →
          </Link>
        )}
        <button
          onClick={() => { signOut(); onNavigate?.(); }}
          className="w-full px-2.5 py-2 rounded-[6px] text-left text-xs text-fg-3 hover:bg-surface-2 hover:text-fg transition-colors"
        >
          {t("signOut")}
        </button>
      </div>
    </>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { roles, userId, clear, _hydrated } = useAuthStore();
  const [profileName, setProfileName] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const t = useTranslations("admin");

  useEffect(() => {
    if (!_hydrated) return;
    if (!userId || !roles.some((r) => ADMIN_ROLES.has(r))) {
      router.replace(`/sign-in?redirect=${encodeURIComponent(pathname)}` as any);
      return;
    }
    const isOp =
      roles.includes("operator") &&
      !roles.includes("manager") &&
      !roles.includes("org_admin") &&
      !roles.includes("super_admin");
    if (isOp && pathname !== "/admin/queue" && !pathname.startsWith("/admin/queue/")) {
      router.replace("/admin/queue");
    }
  }, [_hydrated, userId, roles, pathname, router]);

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
      <div className="flex items-center justify-center h-screen text-fg-3 text-sm">
        Loading…
      </div>
    );
  }

  if (!userId || !roles.some((r) => ADMIN_ROLES.has(r))) {
    return (
      <div className="flex items-center justify-center h-screen text-fg-3 text-sm">
        Redirecting…
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

  const navProps = {
    rank, roleKey, displayRole, profileName, userId, isSuper,
    pathname, signOut, t,
  };

  return (
    <div className="flex h-svh overflow-hidden">

      {/* ── Desktop sidebar (≥1024px) ── */}
      <aside className="hidden lg:flex w-[220px] flex-shrink-0 flex-col bg-surface border-r border-hairline p-3.5 overflow-auto">
        <NavContent {...navProps} />
      </aside>

      {/* ── Mobile nav drawer (< 1024px) ── */}
      <Sheet
        open={mobileNavOpen}
        onOpenChange={setMobileNavOpen}
        side="right"
        className="w-[260px]"
      >
        <SheetContent className="flex flex-col h-full py-4 px-3">
          <NavContent
            {...navProps}
            onNavigate={() => setMobileNavOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Mobile top bar (< 1024px) */}
        <div className="lg:hidden flex items-center h-12 px-4 border-b border-hairline bg-surface flex-shrink-0 gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <img src="/logo.jpg" alt="" className="logo-brand w-5 h-5 rounded-[4px] object-cover" />
            <span className="text-sm font-bold tracking-tight">zeyvo</span>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={18} />
          </Button>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-auto bg-bg">
          {children}
        </main>
      </div>
    </div>
  );
}
