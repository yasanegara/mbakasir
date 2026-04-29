"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import BrandBadge from "@/components/brand/BrandBadge";
import TokenMark from "@/components/ui/TokenMark";
import { useAuth, useTheme } from "@/contexts/AppProviders";
import { useBrand } from "@/contexts/BrandContext";
import { useLiveQuery } from "dexie-react-hooks";
import { getDb } from "@/lib/db";

// ============================================================
// SIDEBAR NAVIGASI — Adaptive per Role
// ============================================================

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  roles: Array<"SUPERADMIN" | "AGENT" | "TENANT" | "CASHIER">;
}

// ─── Icon SVGs inline ────────────────────────────────────────

const Icon = {
  pos: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="nav-icon">
      <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  ),
  products: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="nav-icon">
      <path d="m7.5 4.27 9 5.15" /><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><line x1="3.29" y1="7" x2="12" y2="12" /><line x1="12" y1="22" x2="12" y2="12" />
    </svg>
  ),
  inventory: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="nav-icon">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    </svg>
  ),
  report: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="nav-icon">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  token: (
    <TokenMark className="nav-icon" />
  ),
  users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="nav-icon">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="nav-icon">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  stores: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="nav-icon">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="nav-icon">
      <circle cx="12" cy="12" r="3" /><path d="M19.07 4.93l-1.41 1.41" /><path d="M4.93 19.07l1.41-1.41" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="M20 12h2" /><path d="M2 12h2" /><path d="M19.07 19.07l-1.41-1.41" /><path d="M4.93 4.93l1.41 1.41" />
    </svg>
  ),
  logout: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="nav-icon">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  employees: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="nav-icon">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="22" y1="11" x2="16" y2="11" /><line x1="19" y1="8" x2="19" y2="14" />
    </svg>
  ),
  history: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="nav-icon">
      <polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
  alert: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="nav-icon">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  shoppingList: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="nav-icon">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="2" /><path d="M9 14h.01" /><path d="M9 18h.01" /><path d="M13 14h2" /><path d="M13 18h2" />
    </svg>
  ),
  book: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="nav-icon">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  ),
  megaphone: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="nav-icon">
      <path d="M3 11l19-9-9 19-2-8-8-2z" />
    </svg>
  ),
  opname: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="nav-icon">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M9 2h6" />
      <path d="M12 11v6" />
      <path d="M9 14h6" />
    </svg>
  ),
  storefront: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="nav-icon">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  ),
};

const ALL_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: Icon.dashboard, roles: ["SUPERADMIN", "AGENT", "TENANT", "CASHIER"] },
  { href: "/pos", label: "Kasir (POS)", icon: Icon.pos, roles: ["CASHIER", "TENANT"] },
  { href: "/products", label: "Produk", icon: Icon.products, roles: ["TENANT"] },
  { href: "/stock-opname", label: "Stock Opname", icon: Icon.opname, roles: ["TENANT"] },
  { href: "/inventory", label: "Bahan Baku", icon: Icon.inventory, roles: ["TENANT"] },
  { href: "/sales", label: "Riwayat Transaksi", icon: Icon.history, roles: ["TENANT", "CASHIER"] },
  { href: "/customers", label: "Data Pelanggan", icon: Icon.users, roles: ["TENANT"] },
  { href: "/reports", label: "Laporan", icon: Icon.report, roles: ["TENANT"] },
  { href: "/employees", label: "Karyawan", icon: Icon.employees, roles: ["TENANT"] },
  { href: "/stock-alert", label: "Stok Kritis", icon: Icon.alert, roles: ["TENANT"] },
  { href: "/shopping-list", label: "Daftar Belanja", icon: Icon.shoppingList, roles: ["TENANT"] },
  { href: "/orders", label: "Pesanan Online", icon: Icon.storefront, roles: ["TENANT"] },
  { href: "/marketplace", label: "Add On", icon: Icon.inventory, roles: ["TENANT"] },
  { href: "/stores", label: "Kelola Toko", icon: Icon.stores, roles: ["AGENT"] },
  { href: "/tokens", label: "Saldo Token", icon: Icon.token, roles: ["AGENT"] },
  { href: "/learn", label: "Pusat Belajar", icon: Icon.book, roles: ["AGENT", "TENANT"] },
  { href: "/admin/agents", label: "Kelola Agen", icon: Icon.users, roles: ["SUPERADMIN"] },
  { href: "/admin/tokens", label: "Mint Token", icon: Icon.token, roles: ["SUPERADMIN"] },
  { href: "/admin/tenants", label: "Semua Toko", icon: Icon.stores, roles: ["SUPERADMIN"] },
  { href: "/admin/learn", label: "Konten Learn", icon: Icon.book, roles: ["SUPERADMIN"] },
  { href: "/admin/addons-management", label: "Manajemen Add-on", icon: Icon.inventory, roles: ["SUPERADMIN"] },
  { href: "/admin/announcements", label: "Pengumuman", icon: Icon.megaphone, roles: ["SUPERADMIN"] },
];

interface SidebarProps {
  isOpen: boolean;
  isCollapsed: boolean;
  onClose: () => void;
  onToggleCollapse: () => void;
}

export default function Sidebar({
  isOpen,
  isCollapsed,
  onClose,
  onToggleCollapse,
}: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { theme, setTheme, mode, toggleMode } = useTheme();
  const brand = useBrand();
  const storeProfile = useLiveQuery(
    () =>
      user?.role === "TENANT" || user?.role === "CASHIER"
        ? getDb().storeProfile.get("default")
        : undefined,
    [user?.role]
  );

  const activeModules = (user as any)?.activeModules || {};
  const isCrmEnabled =
    !!activeModules["CRM"] || storeProfile?.isCrmEnabled === true;

  const visibleNav = ALL_NAV.filter((item) => {
    const hasRole = user && item.roles.includes(user.role);
    if (item.href === "/customers") {
      return hasRole && isCrmEnabled;
    }
    return hasRole;
  });

  const settingsLabel = user?.role === "CASHIER" ? "PIN & Password" : "Pengaturan";
  const showFooterSettings = true;

  const roleLabel: Record<string, string> = {
    SUPERADMIN: "Super Admin",
    AGENT: "Agen",
    TENANT: "Pemilik Toko",
    CASHIER: "Kasir",
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div className="sidebar-overlay active" onClick={onClose} />
      )}

      <aside
        className={`main-sidebar${isCollapsed ? " collapsed" : ""}${isOpen ? " mobile-open" : ""}`}
      >
        {/* ── Logo ─────────────────────────────────────────── */}
        <div
          style={{
            padding: "20px 16px 16px",
            borderBottom: "1px solid hsl(var(--border))",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            overflow: "hidden",
          }}
        >
          <BrandBadge
            logoUrl={brand?.logoUrl}
            alt={brand?.appName ?? "MbaKasir"}
            size={32}
            style={{
              borderRadius: "10px",
              boxShadow: "none",
            }}
          />
          {!isCollapsed && (
            <div style={{ overflow: "hidden" }}>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 800,
                  color: "hsl(var(--text-primary))",
                  whiteSpace: "nowrap",
                  lineHeight: 1.2,
                }}
              >
                {brand?.appName ?? "MbaKasir"}
              </div>
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  color: "hsl(var(--primary))",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                {brand?.tagline ?? "Teman UMKM Indonesia"}
              </div>
            </div>
          )}

          {/* Collapse toggle — desktop only */}
          {!isCollapsed && (
            <button
              onClick={onToggleCollapse}
              className="btn btn-ghost btn-icon btn-sm"
              style={{ marginLeft: "auto" }}
              title="Ciutkan sidebar"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={16} height={16}>
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          )}
          {isCollapsed && (
            <button
              onClick={onToggleCollapse}
              className="btn btn-ghost btn-icon btn-sm"
              style={{ margin: "0 auto" }}
              title="Buka sidebar"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={16} height={16}>
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          )}
        </div>

        {/* ── User Info ─────────────────────────────────────── */}
        {!isCollapsed && user && (
          <div
            style={{
              padding: "14px 16px",
              borderBottom: "1px solid hsl(var(--border))",
            }}
          >
            <div
              style={{
                fontSize: "13px",
                fontWeight: 700,
                color: "hsl(var(--text-primary))",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {user.name}
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "hsl(var(--primary))",
                fontWeight: 600,
                marginTop: "2px",
              }}
            >
              {roleLabel[user.role] ?? user.role}
            </div>
          </div>
        )}

        {/* ── Navigasi ──────────────────────────────────────── */}
        <nav
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "12px 8px",
            display: "flex",
            flexDirection: "column",
            gap: "2px",
          }}
        >
          {visibleNav.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item${isActive ? " active" : ""}`}
                onClick={onClose}
                title={isCollapsed ? item.label : undefined}
                style={isCollapsed ? { justifyContent: "center", padding: "10px" } : {}}
              >
                {item.icon}
                {!isCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* ── Footer ───────────────────────────────────────── */}
        <div
          style={{
            padding: "12px 8px",
            borderTop: "1px solid hsl(var(--border))",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >

          {/* Theme cycle (Pro, Green, Landing, Chic) */}
          <div style={{
            padding: "8px 12px",
            background: "hsl(var(--bg-elevated))",
            borderRadius: "12px",
            marginBottom: "4px",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: isCollapsed ? "center" : "flex-start",
            gap: "10px"
          }}>
            <button
              onClick={() => {
                const themesList = ["pro", "starbucks", "landing", "chic"];
                const currentIndex = themesList.indexOf(theme);
                const nextIndex = (currentIndex + 1) % themesList.length;
                setTheme(themesList[nextIndex] as any);
              }}
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                background: theme === "pro" ? "#1e40af" : 
                            theme === "starbucks" ? "#00704A" : 
                            theme === "landing" ? "#f97316" : "#db2777",
                border: "2px solid white",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                padding: 0,
                transition: "transform 0.2s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.1)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
              title={`Ganti Aksen (Sekarang: ${theme})`}
            />
            {!isCollapsed && (
              <span style={{ fontSize: "10px", fontWeight: 800, color: "hsl(var(--text-muted))", textTransform: "uppercase" }}>
                Aksen: {theme === "pro" ? "Pro" : theme === "starbucks" ? "Green" : theme === "landing" ? "Landing" : "Chic"}
              </span>
            )}
          </div>

          {/* Settings */}
          {showFooterSettings && (
            <Link
              href="/settings"
              className={`nav-item${pathname === "/settings" ? " active" : ""}`}
              title={isCollapsed ? settingsLabel : undefined}
              style={isCollapsed ? { justifyContent: "center", padding: "10px" } : {}}
            >
              {Icon.settings}
              {!isCollapsed && <span>{settingsLabel}</span>}
            </Link>
          )}

          {/* Logout */}
          <button
            onClick={logout}
            className="nav-item"
            style={{
              ...(isCollapsed ? { justifyContent: "center", padding: "10px" } : {}),
              color: "hsl(var(--error))",
              width: "100%",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
            title={isCollapsed ? "Keluar" : undefined}
          >
            {Icon.logout}
            {!isCollapsed && <span>Keluar</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
