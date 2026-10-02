// ============================================================
// SIDEBAR.JSX — Sidebar cho ADMIN & EMPLOYEE
// ============================================================
// ✅ SOURCE-TEXT I18N: dùng tiếng Việt trực tiếp qua t("...")
// ============================================================

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { NavLink, Link } from "react-router-dom";
import {
  LayoutDashboard, Utensils, ShoppingBag, Users, UserCog, Warehouse,
  BarChart3, LogOut, ClipboardList, Bell, UserRound, CreditCard,
  MessageCircle, CalendarCheck, Database, TrendingUp, Shield, Wallet, Ticket,
} from "lucide-react";
import { api } from "../api";
import { useI18n } from "../hooks/useI18n";

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

// ✅ SOURCE-TEXT: Label giờ là câu tiếng Việt trực tiếp
// Định dạng: [iconKey, labelVI, path]
const MENU_CONFIG = {
  ADMIN: [
    ["dashboard",     "Tổng quan",           "/owner"],
    ["orders_admin",  "Đơn hàng",            "/owner/orders"],
    ["menu",          "Thực đơn",            "/owner/menu"],
    ["price",         "Lịch sử giá",         "/owner/price-history"],
    ["inventory",     "Kho hàng",            "/owner/inventory"],
    ["vouchers",      "Voucher",             "/owner/vouchers"],
    ["finance",       "Tài chính",           "/owner/finance"],
    ["wallet_admin",  "Ví Canteen",          "/owner/wallet"],
    ["reports",       "Báo cáo",             "/owner/reports"],
    ["employees",     "Nhân viên",           "/owner/employees"],
    ["attendance",    "Ca làm & chấm công",  "/owner/shifts"],
    ["customers",     "Khách hàng",          "/owner/customers"],
    ["permissions",   "Phân quyền",          "/owner/permissions"],
    ["backup",        "Backup dữ liệu",      "/owner/backup"],
  ],
  EMPLOYEE: [
    ["dashboard",   "Tổng quan",       "/employee"],
    ["process",     "Chấm công",       "/employee/attendance"],
    ["orders",      "Đơn hàng",        "/employee/orders"],
    ["menu",        "Thực đơn",        "/employee/menu"],
    ["chat",        "Chat khách",      "/employee/chat"],
  ],
  CUSTOMER: [
    ["dashboard",   "Trang chủ",       "/customer"],
    ["menu",        "Thực đơn",        "/customer/menu"],
    ["orders",      "Đơn hàng",        "/customer/orders"],
    ["wallet",      "Ví Canteen",      "/customer/wallet"],
    ["promotions",  "Khuyến mãi",      "/customer/promotions"],
    ["chat",        "Chat hỗ trợ",     "/customer/chat"],
    ["profile",     "Hồ sơ",           "/customer/profile"],
  ],
};

const PROFILE_CONFIG = {
  ADMIN:    { to: "/owner/profile",    label: "Quản trị viên" },
  EMPLOYEE: { to: "/employee/profile", label: "Nhân viên" },
  CUSTOMER: { to: "/customer/profile", label: "Khách hàng" },
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
  const { t } = useI18n();
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
            alt={user.name || t("Avatar")}
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
          {user.name || t("Khách")}
        </b>
        <small
          style={{
            display: "block",
            fontSize: 11,
            color: "var(--sky-ink-500, #64748B)",
          }}
        >
          {t(cfg.label)}
        </small>
      </div>
    </Link>
  );
}

export default function Sidebar({ role, onLogout, user }) {
  const { t } = useI18n();

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
        aria-label={t("Điều hướng chính")}
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
            ? t("Quản trị viên")
            : role === "EMPLOYEE"
            ? t("Nhân viên")
            : t("Khách hàng")}
        </div>

        <nav>
          {list.map(([key, label, to]) => {
            const Icon = ICONS[key] || ShoppingBag;
            const badge = getBadge(key);

            return (
              <NavLink
                key={to + label}
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
                {/* ✅ SOURCE-TEXT: t(label) */}
                <span>{t(label)}</span>
                {badge > 0 && (
                  <span
                    className="nav-badge"
                    aria-label={`${badge} ${t("mới")}`}
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
          <LogOut size={18} /> {t("Đăng xuất")}
        </button>
      </aside>
    </>
  );
}