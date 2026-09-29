// ============================================================
// LAYOUT.JSX — Layout chính của app
// ============================================================
// Cấu trúc:
//   - CUSTOMER: Topbar logo + search + cart + icons + HeaderNav + BottomNav
//   - EMPLOYEE/ADMIN: Sidebar + Topbar hamburger + icons
//
// Fixes:
//   - Fix button profile bị ẩn (display: none) → hiện đúng
//   - Dùng useTranslation hook (không duplicate lang state)
//   - Memo initials + roleLabel
//   - Đổi confirm() → custom mini-modal xác nhận logout
//   - Bỏ inline styles duplicate CSS
//   - CartTopbarIcon extract hook
//   - Guard user null
//   - Avatar onError fallback
//   - Dùng ConfirmDialog chung thay vì LogoutConfirmModal inline
//   - Bỏ page-heading cho EMPLOYEE + ADMIN (chỉ CUSTOMER mới có title)
//   - ✅ ConfirmDialog logout dùng CHUNG cho cả topbar + sidebar
//   - ✅ Nút Logout + Profile topbar CHỈ hiện cho Customer
//     (Employee + Admin đã có trong sidebar)
//   - ✅ MEDIUM FIX: page-heading hiện đồng nhất
//     - Trước: chỉ CUSTOMER mới có page-heading
//     - Sau: TẤT CẢ role đều có page-heading (nếu title/subtitle)
//     - Auto-detect title/subtitle từ route nếu không truyền prop
//   - ✅ Auto page-heading: dùng bảng PAGE_TITLES để lookup theo path
// ============================================================

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ChevronDown, Menu, ShoppingCart, LogOut, Globe, Sun, Moon, User as UserIcon } from "lucide-react";

import Sidebar from "./Sidebar";
import GlobalSearch from "./GlobalSearch";
import NotificationBell from "./NotificationBell";
import Footer from "./Footer";
import HeaderNav from "./HeaderNav";
import BottomNav from "./BottomNav";
import ConfirmDialog, { LogoutIcon } from "./ConfirmDialog";
import { useTranslation } from "../i18n";

// ============================================================
// CONSTANTS
// ============================================================

const CART_KEY = "canteen_cart";

const FALLBACK_AVATAR =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>
      <rect fill='#0EA5E9' width='100' height='100'/>
      <text x='50' y='58' font-size='40' fill='#fff' text-anchor='middle'>👤</text>
    </svg>`
  );

/**
 * ✅ Auto page-heading: bảng title/subtitle theo pathname.
 * Nếu page tự render heading riêng (VD: CustomerHome) → không cần bảng này.
 * Match theo prefix (pathname.startsWith(path)).
 *
 * Thứ tự quan trọng — path dài hơn phải đứng trước.
 */
const PAGE_HEADINGS = [
  // ===== CUSTOMER =====
  { path: "/customer/menu",        title: "Thực đơn",        subtitle: "Chọn món yêu thích" },
  { path: "/customer/cart",        title: "Giỏ hàng",         subtitle: "Món bạn đã chọn" },
  { path: "/customer/checkout",    title: "Thanh toán",       subtitle: "Hoàn tất đơn hàng" },
  { path: "/customer/orders",      title: "Đơn hàng",         subtitle: "Lịch sử đơn hàng" },
  { path: "/customer/profile",     title: "Hồ sơ cá nhân",    subtitle: "Thông tin tài khoản" },
  { path: "/customer/promotions",  title: "Khuyến mãi",       subtitle: "Ưu đãi dành cho bạn" },
  { path: "/customer/wallet",      title: "Ví Canteen",       subtitle: "Nạp tiền & thanh toán nhanh" },
  { path: "/customer/chat",        title: "Chat hỗ trợ",      subtitle: "Nhắn tin với Canteen" },
  { path: "/customer/signature",   title: "Món Signature",    subtitle: "Đặc sản Canteen VWA" },
  { path: "/customer/success",     title: "Đặt hàng thành công", subtitle: "Cảm ơn bạn!" },

  // ===== EMPLOYEE =====
  { path: "/employee/attendance",  title: "Chấm công",        subtitle: "Check-in / Check-out" },
  { path: "/employee/orders",      title: "Đơn hàng",         subtitle: "Xử lý đơn khách" },
  { path: "/employee/menu",        title: "Thực đơn",         subtitle: "Xem tình trạng món" },
  { path: "/employee/profile",     title: "Hồ sơ cá nhân",    subtitle: "Thông tin tài khoản" },
  { path: "/employee/chat",        title: "Chat khách hàng",  subtitle: "Hỗ trợ khách hàng" },

  // ===== OWNER (ADMIN) =====
  { path: "/owner/employees",      title: "Quản lý nhân viên",   subtitle: "Danh sách nhân viên" },
  { path: "/owner/shifts",         title: "Quản lý ca",           subtitle: "Phân ca + theo dõi chấm công" },
  { path: "/owner/attendance",     title: "Chấm công",            subtitle: "Lịch sử chấm công nhân viên" },
  { path: "/owner/customers",      title: "Quản lý khách hàng",   subtitle: "Danh sách khách hàng" },
  { path: "/owner/menu",           title: "Quản lý thực đơn",     subtitle: "Món ăn" },
  { path: "/owner/price-history",  title: "Lịch sử giá",          subtitle: "Theo dõi thay đổi giá món ăn" },
  { path: "/owner/inventory",      title: "Kho hàng",             subtitle: "Nguyên liệu" },
  { path: "/owner/reports",        title: "Báo cáo",              subtitle: "Doanh thu & thống kê" },
  { path: "/owner/permissions",    title: "Phân quyền",           subtitle: "Phân quyền chi tiết cho từng user" },
  { path: "/owner/orders",         title: "Quản lý đơn hàng",     subtitle: "Xử lý đơn khách như nhân viên" },
  { path: "/owner/vouchers",       title: "Quản lý Voucher",      subtitle: "Tạo / sửa / xóa voucher cho khách" },
  { path: "/owner/finance",        title: "Quản lý tài chính",    subtitle: "Tài khoản nhận tiền, doanh thu, chi phí" },
  { path: "/owner/wallet",         title: "Quản lý Ví Canteen",   subtitle: "Duyệt nạp / rút / thanh toán của khách" },
  { path: "/owner/settings",       title: "Cài đặt",              subtitle: "Tài khoản nhận tiền + thông tin liên hệ" },
  { path: "/owner/profile",        title: "Hồ sơ cá nhân",        subtitle: "Thông tin tài khoản" },
  { path: "/owner/backup",         title: "Backup dữ liệu",       subtitle: "Xuất / nhập / reset database" },
];

// ============================================================
// HELPERS
// ============================================================

function getHomePath(role) {
  if (role === "ADMIN") return "/owner";
  if (role === "EMPLOYEE") return "/employee";
  return "/customer";
}

function getProfilePath(role) {
  if (role === "ADMIN") return "/owner/profile";
  if (role === "EMPLOYEE") return "/employee/profile";
  return "/customer/profile";
}

function getInitials(name) {
  if (!name) return "VWA";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "VWA";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function readCartCount() {
  try {
    const raw = localStorage.getItem(CART_KEY);
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

/**
 * ✅ Auto lookup heading theo pathname.
 * Trả về { title, subtitle } hoặc null.
 */
function lookupHeading(pathname) {
  if (!pathname) return null;

  // Sort by length DESC để match path cụ thể trước
  const sorted = [...PAGE_HEADINGS].sort(
    (a, b) => b.path.length - a.path.length
  );

  for (const h of sorted) {
    if (pathname === h.path || pathname.startsWith(h.path + "/")) {
      return { title: h.title, subtitle: h.subtitle };
    }
  }

  return null;
}

// ============================================================
// SUB-COMPONENT: TopbarLogo
// ============================================================

function TopbarLogo({ role }) {
  const home = getHomePath(role);
  return (
    <Link to={home} className="topbar-logo" title="Canteen VWA">
      <img
        src="/icon.svg"
        alt="Canteen VWA"
        className="topbar-logo-img"
        onError={(e) => {
          e.target.onerror = null;
          e.target.src = FALLBACK_AVATAR;
        }}
      />
      <div className="topbar-logo-text">
        <b>CANTEEN</b>
        <small>VWA</small>
      </div>
    </Link>
  );
}

// ============================================================
// SUB-COMPONENT: CartTopbarIcon
// ============================================================

function CartTopbarIcon() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const read = () => setCount(readCartCount());

    read();
    window.addEventListener("cart-updated", read);
    window.addEventListener("refresh-cart", read);

    return () => {
      window.removeEventListener("cart-updated", read);
      window.removeEventListener("refresh-cart", read);
    };
  }, []);

  return (
    <Link
      to="/customer/cart"
      className="cart-topbar-icon"
      title="Giỏ hàng"
      aria-label={`Giỏ hàng${count > 0 ? `, ${count} món` : ""}`}
    >
      <ShoppingCart size={18} />
      {count > 0 && (
        <span className="badge" aria-hidden="true">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}

// ============================================================
// SUB-COMPONENT: TopbarProfile
// ============================================================

function TopbarProfile({ user, roleLabel, onOpenProfile, onLogout }) {
  const initials = useMemo(() => getInitials(user?.name), [user?.name]);
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    if (typeof document === "undefined") return "light";
    return document.documentElement.classList.contains("dark-mode")
      ? "dark"
      : "light";
  });
  const dropdownRef = useRef(null);
  const { t, lang, setLang } = useTranslation();

  // Sync theme từ nơi khác
  useEffect(() => {
    const update = () => {
      setTheme(
        document.documentElement.classList.contains("dark-mode")
          ? "dark"
          : "light"
      );
    };
    window.addEventListener("themechange", update);
    return () => window.removeEventListener("themechange", update);
  }, []);

  // Click outside để đóng
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // ESC đóng
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  const toggleTheme = () => {
    const root = document.documentElement;
    const isDark = root.classList.contains("dark-mode");
    if (isDark) root.classList.remove("dark-mode");
    else root.classList.add("dark-mode");
    try { localStorage.setItem("theme", isDark ? "light" : "dark"); } catch {}
    try {
      window.dispatchEvent(
        new CustomEvent("themechange", { detail: isDark ? "light" : "dark" })
      );
    } catch {}
    setTheme(isDark ? "light" : "dark");
  };

  const toggleLang = () => {
    setLang(lang === "vi" ? "en" : "vi");
  };

  const itemStyle = {
    display: "flex",
    alignItems: "center",
    gap: 10,
    width: "100%",
    padding: "11px 14px",
    background: "transparent",
    border: 0,
    cursor: "pointer",
    fontSize: 13.5,
    fontWeight: 600,
    color: "var(--text-primary, #172033)",
    textAlign: "left",
    transition: "background 0.15s",
  };

  return (
    <div ref={dropdownRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="topbar-profile-btn"
        title="Menu tài khoản"
        aria-label="Menu tài khoản"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {user?.avatar ? (
          <img
            src={user.avatar}
            alt={user.name || "Avatar"}
            className="profile-avatar-img"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = FALLBACK_AVATAR;
            }}
          />
        ) : (
          <span className="profile-avatar-initials">{initials}</span>
        )}

        <span className="profile-info">
          <b className="profile-name">{user?.name || "Người dùng"}</b>
          <small className="profile-role">{roleLabel}</small>
        </span>

        <ChevronDown
          size={16}
          style={{
            color: "var(--text-light, #94a3b8)",
            flexShrink: 0,
            transform: open ? "rotate(180deg)" : "rotate(0)",
            transition: "transform 0.2s",
          }}
        />
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            minWidth: 240,
            background: "var(--card-bg, #fff)",
            border: "1px solid var(--border-color, #e5e9ef)",
            borderRadius: 12,
            boxShadow: "0 12px 32px rgba(0,0,0,0.15)",
            overflow: "hidden",
            zIndex: 2147483600,
          }}
        >
          {/* Hồ sơ */}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onOpenProfile();
            }}
            style={itemStyle}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "var(--bg-tertiary, #f5f7fb)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <UserIcon size={16} />
            <span>Hồ sơ cá nhân</span>
          </button>

          <div
            style={{
              height: 1,
              background: "var(--border-color, #eef2f7)",
              margin: "4px 0",
            }}
          />

          {/* Ngôn ngữ */}
          <button
            type="button"
            role="menuitem"
            onClick={toggleLang}
            style={itemStyle}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "var(--bg-tertiary, #f5f7fb)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <Globe size={16} />
            <span style={{ flex: 1, textAlign: "left" }}>Ngôn ngữ</span>
            <span
              style={{
                fontSize: 12,
                color: "var(--text-light, #8993a3)",
                fontWeight: 600,
              }}
            >
              {lang === "vi" ? "Tiếng Việt" : "English"}
            </span>
          </button>

          {/* Theme */}
          <button
            type="button"
            role="menuitem"
            onClick={toggleTheme}
            style={itemStyle}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "var(--bg-tertiary, #f5f7fb)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            <span style={{ flex: 1, textAlign: "left" }}>Chế độ</span>
            <span
              style={{
                fontSize: 12,
                color: "var(--text-light, #8993a3)",
                fontWeight: 600,
              }}
            >
              {theme === "dark" ? "Tối" : "Sáng"}
            </span>
          </button>

          <div
            style={{
              height: 1,
              background: "var(--border-color, #eef2f7)",
              margin: "4px 0",
            }}
          />

          {/* Đăng xuất */}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            style={{ ...itemStyle, color: "#ef4444" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "rgba(239,68,68,0.08)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <LogOut size={16} />
            <span>Đăng xuất</span>
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function Layout({
  role,
  children,
  title,
  subtitle,
  onLogout,
  user,
  hideHeading = false,
  showFooter = false,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, lang } = useTranslation();

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // ---------- Body class cho customer ----------
  useEffect(() => {
    if (role === "CUSTOMER") {
      document.body.classList.add("has-bottom-nav");
    } else {
      document.body.classList.remove("has-bottom-nav");
    }
    return () => document.body.classList.remove("has-bottom-nav");
  }, [role]);

  // ---------- Role label ----------
  const roleLabel = useMemo(() => {
    if (role === "ADMIN") return t("role.admin");
    if (role === "EMPLOYEE") return t("role.employee");
    return t("role.customer");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, t, lang]);

  // ---------- ✅ Auto page-heading ----------
  // Logic:
  //   1. Nếu truyền prop `title` → dùng prop (highest priority)
  //   2. Nếu không → lookup từ PAGE_HEADINGS theo pathname
  //   3. Nếu không có → null (không render heading)
  const heading = useMemo(() => {
    if (title || subtitle) {
      return { title, subtitle };
    }
    return lookupHeading(location.pathname);
  }, [title, subtitle, location.pathname]);

  // ---------- Handlers ----------

  const openProfile = useCallback(() => {
    navigate(getProfilePath(role));
  }, [navigate, role]);

  const toggleSidebar = useCallback(() => {
    window.dispatchEvent(new CustomEvent("toggle-sidebar"));
  }, []);

  // ✅ Mở ConfirmDialog — dùng chung cho topbar + sidebar
  const openLogoutConfirm = useCallback(() => {
    setShowLogoutConfirm(true);
  }, []);

  // ✅ Chỉ chạy khi user đã xác nhận trong ConfirmDialog
  const handleLogoutConfirm = useCallback(() => {
    setShowLogoutConfirm(false);
    onLogout?.();
  }, [onLogout]);

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div
      className={
        "app-shell" + (role === "CUSTOMER" ? " customer-layout" : "")
      }
    >
      {/* ============ SIDEBAR (non-customer) ============ */}
      {/* ✅ Truyền callback MỞ confirm thay vì logout ngay */}
      {role !== "CUSTOMER" && (
        <Sidebar
          role={role}
          onLogout={openLogoutConfirm}
          user={user}
        />
      )}

      <main className="main">
        {/* ============ TOPBAR ============ */}
        <header className="topbar">
          {/* ----- LEFT ----- */}
          <div className="topbar-left">
            {role === "CUSTOMER" && <TopbarLogo role={role} />}

            {role !== "CUSTOMER" && (
              <button
                type="button"
                className="hamburger-btn"
                onClick={toggleSidebar}
                aria-label="Mở menu"
              >
                <Menu size={20} />
              </button>
            )}

            {role === "CUSTOMER" && <GlobalSearch role={role} />}
          </div>

          {/* ----- RIGHT ----- */}
          <div className="topbar-right">
  {role === "CUSTOMER" && <CartTopbarIcon />}

  <NotificationBell />

  {role === "CUSTOMER" && (
    <TopbarProfile
      user={user}
      roleLabel={roleLabel}
      onOpenProfile={openProfile}
      onLogout={openLogoutConfirm}
    />
  )}
</div>
        </header>

        {/* ============ HEADER NAV (customer only) ============ */}
        {role === "CUSTOMER" && <HeaderNav />}

        {/* ============ PAGE CONTENT ============ */}
        <section className="page-content">
          {/* ✅ Page heading — hiện cho TẤT CẢ role
             (nếu có title/subtitle, không bị ẩn bởi hideHeading) */}
          {!hideHeading && heading && (heading.title || heading.subtitle) && (
            <div className="page-heading">
              {heading.title && <h1>{heading.title}</h1>}
              {heading.subtitle && <p>{heading.subtitle}</p>}
            </div>
          )}

          {children}

          {showFooter && <Footer />}
        </section>
      </main>

      {/* ============ BOTTOM NAV (customer only) ============ */}
      {role === "CUSTOMER" && <BottomNav onLogout={onLogout} />}

      {/* ============ ✅ CONFIRM LOGOUT MODAL (dùng chung) ============ */}
      <ConfirmDialog
        open={showLogoutConfirm}
        icon={LogoutIcon}
        title="Đăng xuất khỏi Canteen VWA?"
        message="Bạn sẽ cần đăng nhập lại để tiếp tục sử dụng."
        confirmText="Đăng xuất"
        cancelText="Ở lại"
        danger
        onConfirm={handleLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
      />
    </div>
  );
}