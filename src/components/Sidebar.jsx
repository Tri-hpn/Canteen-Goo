// ============================================================
// SIDEBAR.JSX — Sidebar cho ADMIN & EMPLOYEE
// ============================================================
// - Hiển thị menu theo role
// - Badge động cho Orders (đơn mới), Vouchers
// - Mobile: hamburger toggle + overlay + close button
// - Auto-close khi click nav
//
// Fixes:
//   - fetchCounts race-safe (reqIdRef)
//   - Polling pause khi tab ẩn
//   - Badge cart cho customer
//   - Guard Invalid Date
//   - Extract ProfileLink component (bỏ ~150 dòng duplicate)
//   - Nút X đóng sidebar mobile
//   - Body scroll lock khi sidebar mở
//   - Dùng useTranslation hook
//   - aria-label cho nav
//   - Memo roleLabel
//   - Guard dispatchEvent
//   - ✅ PATCH ProfileLink: màu chữ đậm cho sidebar sáng sky
//     (trước: #fff chữ trắng → invisible trên nền sáng)
// ============================================================

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { NavLink, Link } from "react-router-dom";
import {
  LayoutDashboard, Utensils, ShoppingBag, Users, UserCog, Warehouse,
  BarChart3, LogOut, ClipboardList, Bell, UserRound, X, CreditCard,
  MessageCircle, CalendarCheck, Database, TrendingUp, Shield, Wallet, Ticket,
} from "lucide-react";
import { api } from "../api";
import { useTranslation } from "../i18n";

// ============================================================
// CONSTANTS
// ============================================================

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

// Config menu theo role
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

// Profile link config theo role
const PROFILE_CONFIG = {
  ADMIN:    { to: "/owner/profile",    label: "Quản trị viên" },
  EMPLOYEE: { to: "/employee/profile", label: "Nhân viên" },
  CUSTOMER: { to: "/customer/profile", label: "Khách hàng" },
};

// ============================================================
// HELPERS
// ============================================================

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

// ============================================================
// SUB-COMPONENT: ProfileLink
// ============================================================
// ✅ PATCH: màu chữ đậm để đọc được trên sidebar sáng.
//    Trước: color "#fff" (trắng) + hover "#172635" (đen)
//    → invisible khi sidebar thành nền sáng #F5FAFF.
// ============================================================

function ProfileLink({ user, role, onNavClick }) {
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
      {/* Avatar / Initials */}
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

      {/* Name + Role */}
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
          {user.name || "Người dùng"}
        </b>
        <small
          style={{
            display: "block",
            fontSize: 11,
            color: "var(--sky-ink-500, #64748B)",
          }}
        >
          {cfg.label}
        </small>
      </div>
    </Link>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function Sidebar({ role, onLogout, user }) {
  const { t } = useTranslation();

  const [open, setOpen] = useState(false);

  // Badge counts
  const [cartCount, setCartCount] = useState(0);
  const [orderPending, setOrderPending] = useState(0);
  const [voucherCount, setVoucherCount] = useState(0);

  // Tab visibility để pause polling
  const [tabVisible, setTabVisible] = useState(
    typeof document === "undefined" || !document.hidden
  );

  // Refs
  const fetchReqIdRef = useRef(0);

  // ---------- Listen toggle-sidebar ----------

  useEffect(() => {
    const toggle = () => setOpen((o) => !o);
    window.addEventListener("toggle-sidebar", toggle);
    return () => window.removeEventListener("toggle-sidebar", toggle);
  }, []);

  // ---------- Track tab visibility ----------

  useEffect(() => {
    const handler = () => setTabVisible(!document.hidden);
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  // ---------- Body scroll lock khi sidebar mở ----------

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // ---------- ESC đóng sidebar mobile ----------

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  // ---------- Cart count (customer only) ----------

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

  // ---------- Fetch counts (orders + vouchers) — race-safe ----------

  const fetchCounts = useCallback(async () => {
    if (role !== "CUSTOMER") return;

    const myReqId = ++fetchReqIdRef.current;

    try {
      const [orders, vouchers] = await Promise.all([
        api.orders.myOrders().catch(() => []),
        api.vouchers.me().catch(() => []),
      ]);

      // Bỏ qua nếu có request mới hơn
      if (myReqId !== fetchReqIdRef.current) return;

      // Đếm đơn mới hơn last_seen
      const lastSeen = readLastSeen("orders_last_seen");
      const pending = (Array.isArray(orders) ? orders : []).filter((o) => {
        const created = new Date(o?.created_at || 0).getTime();
        return !isNaN(created) && created > lastSeen;
      }).length;

      setOrderPending(pending);

      // Đếm voucher chưa dùng + mới hơn points_last_seen
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

  // ---------- Polling + events ----------

  useEffect(() => {
    if (role !== "CUSTOMER") return;

    fetchCounts();

    // Chỉ poll khi tab visible
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

  // ---------- Menu list ----------

  const list = useMemo(
    () => MENU_CONFIG[role] || MENU_CONFIG.CUSTOMER,
    [role]
  );

  // ---------- Badge getter ----------

  const getBadge = useCallback(
    (key) => {
      if (key === "orders" && orderPending > 0) return orderPending;
      if (key === "promotions" && voucherCount > 0) return voucherCount;
      return 0;
    },
    [orderPending, voucherCount]
  );

  // ---------- Handlers ----------

  const closeSidebar = () => setOpen(false);

  // ============================================================
  // RENDER
  // ============================================================

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
        aria-label="Menu điều hướng"
      >
        {/* ============ BRAND + CLOSE ============ */}
        <div className="brand">
          <div className="brand-mark">C</div>
          <div className="brand-text">
            <strong>CANTEEN</strong>
            <small>VWA</small>
          </div>
          <button
            type="button"
            className="close-sidebar"
            onClick={closeSidebar}
            aria-label="Đóng menu"
            style={{
              marginLeft: "auto",
              padding: 6,
              background: "transparent",
              border: 0,
              cursor: "pointer",
              color: "#94a3b8",
              borderRadius: 8,
              display: "grid",
              placeItems: "center",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ============ ROLE CHIP ============ */}
        <div className="role-chip">
          {role === "ADMIN"
            ? t("role.admin")
            : role === "EMPLOYEE"
            ? t("role.employee")
            : t("role.customer")}
        </div>

        {/* ============ NAV ============ */}
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
                  <span className="nav-badge" aria-label={`${badge} mới`}>
                    {badge > BADGE_MAX ? `${BADGE_MAX}+` : badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* ============ PROFILE LINK ============ */}
        <ProfileLink user={user} role={role} onNavClick={closeSidebar} />

        {/* ============ LOGOUT ============ */}
        {/* onClick gọi onLogout() → Layout sẽ mở ConfirmDialog */}
        <button className="logout-btn" onClick={onLogout} type="button">
          <LogOut size={18} /> {t("common.logout")}
        </button>
      </aside>
    </>
  );
}