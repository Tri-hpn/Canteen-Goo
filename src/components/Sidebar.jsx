// ============================================================
// SIDEBAR.JSX — Sidebar cho ADMIN & EMPLOYEE
// ============================================================

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { NavLink, Link } from "react-router-dom";
import {
  LayoutDashboard, Utensils, ShoppingBag, Users, UserCog, Warehouse,
  BarChart3, LogOut, ClipboardList, Bell, UserRound, CreditCard,
  MessageCircle, CalendarCheck, Database, TrendingUp, Shield, Wallet, Ticket,
} from "lucide-react";
import { api } from "../api";
import { useTranslation } from "../i18n";

const POLL_MS = 30000;
const BADGE_MAX = 99;

const ICONS = {
  dashboard: LayoutDashboard,
  menu: Utensils,
  orders: ShoppingBag,
  customers: Users,
  employees: UserCog,
  inventory: Warehouse,
  reports: BarChart3,
  process: ClipboardList,
  notifications: Bell,
  profile: UserRound,
  points: Ticket,
  chat: MessageCircle,
  attendance: CalendarCheck,
  backup: Database,
  price: TrendingUp,
  permissions: Shield,
  orders_admin: ShoppingBag,
  finance: Wallet,
  vouchers: Ticket,
  promotions: Ticket,
  wallet: CreditCard,
  wallet_admin: CreditCard,
};

const MENU_CONFIG = {
  ADMIN: [
    ["dashboard", "nav.dashboard", "/owner"],
    ["orders_admin", "nav.orders", "/owner/orders"],
    ["menu", "nav.menu", "/owner/menu"],
    ["price", "nav.price", "/owner/price-history"],
    ["inventory", "nav.inventory", "/owner/inventory"],
    ["vouchers", "nav.vouchers", "/owner/vouchers"],
    ["finance", "nav.finance", "/owner/finance"],
    ["wallet_admin", "nav.wallet_admin", "/owner/wallet"],
    ["reports", "nav.reports", "/owner/reports"],
    ["employees", "nav.employees", "/owner/employees"],
    ["attendance", "nav.shifts", "/owner/shifts"],
    ["customers", "nav.customers", "/owner/customers"],
    ["permissions", "nav.permissions", "/owner/permissions"],
    ["backup", "nav.backup", "/owner/backup"],
  ],
  EMPLOYEE: [
    ["dashboard", "nav.dashboard", "/employee"],
    ["process", "nav.process", "/employee/attendance"],
    ["orders", "nav.orders", "/employee/orders"],
    ["menu", "nav.menu", "/employee/menu"],
    ["chat", "nav.chat_staff", "/employee/chat"],
  ],
  CUSTOMER: [
    ["dashboard", "nav.home", "/customer"],
    ["menu", "nav.menu", "/customer/menu"],
    ["orders", "nav.orders", "/customer/orders"],
    ["wallet", "nav.wallet", "/customer/wallet"],
    ["promotions", "nav.promotions", "/customer/promotions"],
    ["chat", "nav.chat", "/customer/chat"],
    ["profile", "nav.profile", "/customer/profile"],
  ],
};

const PROFILE_CONFIG = {
  ADMIN:    { to: "/owner/profile",    labelKey: "role.admin" },
  EMPLOYEE: { to: "/employee/profile", labelKey: "role.employee" },
  CUSTOMER: { to: "/customer/profile", labelKey: "role.customer" },
};

function getInitials(name) {
  if (!name) return "VWA";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "VWA";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function readCartCount() {
  try {
    const raw = localStorage.getItem("canteen_cart");
    const cart = raw ? JSON.parse(raw) : {};
    if (!cart || typeof cart !== "object") return 0;
    return Object.values(cart).reduce(
      (s, m) => s + (Number(m?.qty) || 0),
      0
    );
  } catch {
    return 0;
  }
}

function readLastSeen(key) {
  try {
    return parseInt(localStorage.getItem(key) || "0", 10) || 0;
  } catch {
    return 0;
  }
}

function ProfileLink({ user, role, onNavClick }) {
  const { t } = useTranslation();
  const cfg = PROFILE_CONFIG[role];
  if (!cfg || !user) return null;

  const initials = getInitials(user.name);

  return (
    <Link
      to={cfg.to}
      onClick={onNavClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        marginTop: 10,
        background: "transparent",
        borderRadius: 12,
        textDecoration: "none",
        transition: "background 0.2s",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = "var(--sky-100, #E0F2FE)")
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.background = "transparent")
      }
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background:
            "linear-gradient(135deg, var(--sky-400, #38BDF8), var(--sky-600, #0284C7))",
          color: "#fff",
          display: "grid",
          placeItems: "center",
          fontSize: 13,
          fontWeight: 700,
          flexShrink: 0,
          overflow: "hidden",
        }}
      >
        {user.avatar ? (
          <img
            src={user.avatar}
            alt={user.name || "Avatar"}
            onError={(e) => {
              e.target.onerror = null;
              e.target.style.display = "none";
            }}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          initials
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <b
          style={{
            display: "block",
            fontSize: 13,
            fontWeight: 700,
            color: "var(--sky-ink-900, #0F172A)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {user.name || t("profile.guest")}
        </b>
        <small
          style={{
            display: "block",
            fontSize: 11,
            color: "var(--sky-ink-500, #64748B)",
          }}
        >
          {t(cfg.labelKey)}
        </small>
      </div>
    </Link>
  );
}

export default function Sidebar({ role, onLogout, user }) {
  const { t } = useTranslation();

  const [open, setOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [orderPending, setOrderPending] = useState(0);
  const [voucherCount, setVoucherCount] = useState(0);

  const [tabVisible, setTabVisible] = useState(
    typeof document === "undefined" || !document.hidden
  );

  const fetchReqIdRef = useRef(0);

  useEffect(() => {
    const toggle = () => setOpen((o) => !o);
    window.addEventListener("toggle-sidebar", toggle);
    return () => window.removeEventListener("toggle-sidebar", toggle);
  }, []);

  useEffect(() => {
    const handler = () => setTabVisible(!document.hidden);
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      if (document.body.style.overflow === "hidden") {
        document.body.style.overflow = prev;
      }
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      document.body.classList.add("sidebar-open");
    } else {
      document.body.classList.remove("sidebar-open");
    }
    return () => document.body.classList.remove("sidebar-open");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  const readCart = useCallback(() => {
    setCartCount(readCartCount());
  }, []);

  useEffect(() => {
    if (role !== "CUSTOMER") return;

    readCart();

    const handler = () => readCart();
    window.addEventListener("cart-updated", handler);
    window.addEventListener("refresh-cart", handler);

    return () => {
      window.removeEventListener("cart-updated", handler);
      window.removeEventListener("refresh-cart", handler);
    };
  }, [role, readCart]);

  const fetchCounts = useCallback(async () => {
    if (role !== "CUSTOMER") return;

    const myReqId = ++fetchReqIdRef.current;

    try {
      const [orders, vouchers] = await Promise.all([
        api.orders.myOrders().catch(() => []),
        api.vouchers.me().catch(() => []),
      ]);

      if (myReqId !== fetchReqIdRef.current) return;

      const lastSeen = readLastSeen("orders_last_seen");
      const pending = (Array.isArray(orders) ? orders : []).filter((o) => {
        const created = new Date(o?.created_at || 0).getTime();
        return !isNaN(created) && created > lastSeen;
      }).length;

      setOrderPending(pending);

      const lastSeenPoints = readLastSeen("points_last_seen");
      const available = (Array.isArray(vouchers) ? vouchers : []).filter((v) => {
        if (v?.used) return false;
        const created = new Date(v?.created_at || 0).getTime();
        return !isNaN(created) && created > lastSeenPoints;
      }).length;

      setVoucherCount(available);
    } catch {
      if (myReqId === fetchReqIdRef.current) {
        setOrderPending(0);
        setVoucherCount(0);
      }
    }
  }, [role]);

  useEffect(() => {
    if (role !== "CUSTOMER") return;

    fetchCounts();
    if (!tabVisible) return;

    const interval = setInterval(fetchCounts, POLL_MS);

    const onRefresh = () => fetchCounts();
    window.addEventListener("refresh-user", onRefresh);
    window.addEventListener("order-updated", onRefresh);
    window.addEventListener("points-seen", onRefresh);
    window.addEventListener("order-reviewed", onRefresh);
    window.addEventListener("orders-seen", onRefresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener("refresh-user", onRefresh);
      window.removeEventListener("order-updated", onRefresh);
      window.removeEventListener("points-seen", onRefresh);
      window.removeEventListener("order-reviewed", onRefresh);
      window.removeEventListener("orders-seen", onRefresh);
    };
  }, [role, fetchCounts, tabVisible]);

  const list = useMemo(
    () => MENU_CONFIG[role] || MENU_CONFIG.CUSTOMER,
    [role]
  );

  const getBadge = useCallback(
    (key) => {
      if (key === "orders" && orderPending > 0) return orderPending;
      if (key === "promotions" && voucherCount > 0) return voucherCount;
      return 0;
    },
    [orderPending, voucherCount]
  );

  const closeSidebar = () => setOpen(false);

  return (
    <>
      {open && (
        <div
          className="mobile-overlay active"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      <aside
        className={"sidebar " + (open ? "mobile-open" : "")}
        aria-label={t("nav.sidebarNav")}
      >
        <div className="brand">
          <div className="brand-mark">C</div>
          <div className="brand-text">
            <strong>CANTEEN</strong>
            <small>VWA</small>
          </div>
        </div>

        <div className="role-chip">
          {role === "ADMIN"
            ? t("role.admin")
            : role === "EMPLOYEE"
            ? t("role.employee")
            : t("role.customer")}
        </div>

        <nav>
          {list.map(([key, labelKey, to]) => {
            const Icon = ICONS[key] || ShoppingBag;
            const badge = getBadge(key);

            return (
              <NavLink
                key={to + labelKey}
                to={to}
                className={({ isActive }) =>
                  "nav-link " + (isActive ? "active" : "")
                }
                end={
                  to === "/owner" ||
                  to === "/employee" ||
                  to === "/customer"
                }
                onClick={closeSidebar}
              >
                <Icon size={18} />
                <span>{t(labelKey)}</span>
                {badge > 0 && (
                  <span
                    className="nav-badge"
                    aria-label={t("common.newCount").replace("{n}", badge)}
                  >
                    {badge > BADGE_MAX ? `${BADGE_MAX}+` : badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <ProfileLink user={user} role={role} onNavClick={closeSidebar} />

        <button className="logout-btn" onClick={onLogout} type="button">
          <LogOut size={18} /> {t("common.logout")}
        </button>
      </aside>
    </>
  );
}