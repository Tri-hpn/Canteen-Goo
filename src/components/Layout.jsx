// ============================================================
// LAYOUT.JSX — Layout chính của app
// ============================================================
// ✅ SOURCE-TEXT I18N: dùng tiếng Việt trực tiếp qua t("...")
// ============================================================

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  ChevronDown, Menu, ShoppingCart, LogOut, Globe, Sun, Moon,
  User as UserIcon,
} from "lucide-react";

import Sidebar from "./Sidebar";
import GlobalSearch from "./GlobalSearch";
import NotificationBell from "./NotificationBell";
import Footer from "./Footer";
import HeaderNav from "./HeaderNav";
import BottomNav from "./BottomNav";
import ConfirmDialog, { LogoutIcon } from "./ConfirmDialog";
import { useI18n } from "../hooks/useI18n";

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
 * Auto page-heading theo pathname.
 * Dùng key i18n, không hardcode text.
 */
const PAGE_HEADINGS = [
  // ===== CUSTOMER =====
  { path: "/customer/menu",       title: "Thực đơn",           subtitle: "Chọn món yêu thích" },
  { path: "/customer/cart",       title: "Giỏ hàng",           subtitle: "Món bạn đã chọn" },
  { path: "/customer/checkout",   title: "Thanh toán",         subtitle: "Hoàn tất đơn hàng" },
  { path: "/customer/orders",     title: "Đơn hàng của tôi",   subtitle: "Lịch sử đơn hàng" },
  { path: "/customer/profile",    title: "Hồ sơ cá nhân",      subtitle: "Thông tin tài khoản" },
  { path: "/customer/promotions", title: "Khuyến mãi",         subtitle: "Ưu đãi dành cho bạn" },
  { path: "/customer/wallet",     title: "Ví Canteen",         subtitle: "Nạp tiền & thanh toán nhanh" },
  { path: "/customer/chat",       title: "Chat hỗ trợ",        subtitle: "Nhắn tin với Canteen" },
  { path: "/customer/success",    title: "Đặt hàng thành công", subtitle: "Cảm ơn bạn!" },

  // ===== EMPLOYEE =====
  { path: "/employee/attendance", title: "Chấm công",          subtitle: "Check-in / Check-out" },
  { path: "/employee/orders",     title: "Đơn hàng",           subtitle: "Xử lý đơn khách" },
  { path: "/employee/menu",       title: "Thực đơn",           subtitle: "Xem tình trạng món" },
  { path: "/employee/profile",    title: "Hồ sơ cá nhân",      subtitle: "Thông tin tài khoản" },
  { path: "/employee/chat",       title: "Chat khách hàng",    subtitle: "Hỗ trợ khách hàng" },

  // ===== OWNER (ADMIN) =====
  { path: "/owner/employees",     title: "Quản lý nhân viên",  subtitle: "Danh sách nhân viên" },
  { path: "/owner/shifts",        title: "Quản lý ca",         subtitle: "Phân ca + theo dõi chấm công" },
  { path: "/owner/attendance",    title: "Chấm công",          subtitle: "Lịch sử chấm công nhân viên" },
  { path: "/owner/customers",     title: "Quản lý khách hàng", subtitle: "Danh sách khách hàng" },
  { path: "/owner/menu",          title: "Quản lý thực đơn",   subtitle: "Món ăn" },
  { path: "/owner/price-history", title: "Lịch sử giá",        subtitle: "Theo dõi thay đổi giá món ăn" },
  { path: "/owner/inventory",     title: "Kho hàng",           subtitle: "Nguyên liệu" },
  { path: "/owner/reports",       title: "Báo cáo",            subtitle: "Doanh thu & thống kê" },
  { path: "/owner/permissions",   title: "Phân quyền",         subtitle: "Phân quyền chi tiết cho từng user" },
  { path: "/owner/orders",        title: "Quản lý đơn hàng",   subtitle: "Xử lý đơn khách như nhân viên" },
  { path: "/owner/vouchers",      title: "Quản lý Voucher",    subtitle: "Tạo / sửa / xóa voucher cho khách" },
  { path: "/owner/finance",       title: "Quản lý tài chính",  subtitle: "Tài khoản nhận tiền, doanh thu, chi phí" },
  { path: "/owner/wallet",        title: "Quản lý Ví Canteen", subtitle: "Duyệt nạp / rút / thanh toán của khách" },
  { path: "/owner/settings",      title: "Cài đặt",            subtitle: "Tài khoản nhận tiền + thông tin liên hệ" },
  { path: "/owner/profile",       title: "Hồ sơ cá nhân",      subtitle: "Thông tin tài khoản" },
  { path: "/owner/backup",        title: "Backup dữ liệu",     subtitle: "Xuất / nhập / reset database" },
];

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

function lookupHeading(pathname) {
  if (!pathname) return null;
  const sorted = [...PAGE_HEADINGS].sort(
    (a, b) => b.path.length - a.path.length
  );
  for (const h of sorted) {
    if (pathname === h.path || pathname.startsWith(h.path + "/")) {
      return h;
    }
  }
  return null;
}

function TopbarLogo({ role }) {
  const { t } = useI18n();
  const home = getHomePath(role);
  return (
    <Link to={home} className="topbar-logo" title={t("Canteen VWA")}>
      <img
        src="/icon.svg"
        alt={t("Canteen VWA")}
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

function CartTopbarIcon() {
  const { t } = useI18n();
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
      title={t("Giỏ hàng")}
      aria-label={
        count > 0
          ? `${t("Giỏ hàng")} (${count} ${t("sản phẩm")})`
          : t("Giỏ hàng")
      }
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

function TopbarProfile({ user, roleLabel, onOpenProfile, onLogout }) {
  const { t, lang, setLang } = useI18n();
  const initials = useMemo(() => getInitials(user?.name), [user?.name]);
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    if (typeof document === "undefined") return "light";
    return document.documentElement.classList.contains("dark-mode")
      ? "dark"
      : "light";
  });
  const dropdownRef = useRef(null);

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
    try {
      localStorage.setItem("theme", isDark ? "light" : "dark");
    } catch {}
    try {
      window.dispatchEvent(
        new CustomEvent("themechange", { detail: isDark ? "light" : "dark" })
      );
    } catch {}
    setTheme(isDark ? "light" : "dark");
  };

  const toggleLang = () => setLang(lang === "vi" ? "en" : "vi");

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
        title={t("Menu tài khoản")}
        aria-label={t("Menu tài khoản")}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {user?.avatar ? (
          <img
            src={user.avatar}
            alt={user.name || t("Avatar")}
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
          <b className="profile-name">{user?.name || t("Khách")}</b>
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
            <span>{t("Hồ sơ")}</span>
          </button>

          <div
            style={{
              height: 1,
              background: "var(--border-color, #eef2f7)",
              margin: "4px 0",
            }}
          />

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
            <span style={{ flex: 1, textAlign: "left" }}>{t("Ngôn ngữ")}</span>
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
            <span style={{ flex: 1, textAlign: "left" }}>{t("Giao diện")}</span>
            <span
              style={{
                fontSize: 12,
                color: "var(--text-light, #8993a3)",
                fontWeight: 600,
              }}
            >
              {theme === "dark" ? t("Tối") : t("Sáng")}
            </span>
          </button>

          <div
            style={{
              height: 1,
              background: "var(--border-color, #eef2f7)",
              margin: "4px 0",
            }}
          />

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
            <span>{t("Đăng xuất")}</span>
          </button>
        </div>
      )}
    </div>
  );
}

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
  const { t, lang } = useI18n();

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    if (role === "CUSTOMER") {
      document.body.classList.add("has-bottom-nav");
    } else {
      document.body.classList.remove("has-bottom-nav");
    }
    return () => document.body.classList.remove("has-bottom-nav");
  }, [role]);

  const roleLabel = useMemo(() => {
    if (role === "ADMIN") return t("Quản trị viên");
    if (role === "EMPLOYEE") return t("Nhân viên");
    return t("Khách hàng");
  }, [role, t]);

  /**
   * Auto heading:
   *   - Nếu prop title/subtitle → dịch trực tiếp (nếu là key i18n) hoặc dùng raw
   *   - Nếu không → lookup theo path → dịch key
   */
  const heading = useMemo(() => {
    if (title || subtitle) {
      return {
        title: title ? t(title) : title,
        subtitle: subtitle ? t(subtitle) : subtitle,
      };
    }
    const found = lookupHeading(location.pathname);
    if (!found) return null;
    return {
      title: t(found.title),
      subtitle: t(found.subtitle),
    };
  }, [title, subtitle, location.pathname, t, lang]);

  const openProfile = useCallback(() => {
    navigate(getProfilePath(role));
  }, [navigate, role]);

  const toggleSidebar = useCallback(() => {
    window.dispatchEvent(new CustomEvent("toggle-sidebar"));
  }, []);

  const openLogoutConfirm = useCallback(() => {
    setShowLogoutConfirm(true);
  }, []);

  const handleLogoutConfirm = useCallback(() => {
    setShowLogoutConfirm(false);
    onLogout?.();
  }, [onLogout]);

  return (
    <div
      className={
        "app-shell" + (role === "CUSTOMER" ? " customer-layout" : "")
      }
    >
      {role !== "CUSTOMER" && (
        <Sidebar role={role} onLogout={openLogoutConfirm} user={user} />
      )}

      <main className="main">
        <header className="topbar">
          <div className="topbar-left">
            {role === "CUSTOMER" && <TopbarLogo role={role} />}

            {role !== "CUSTOMER" && (
              <button
                type="button"
                className="hamburger-btn"
                onClick={toggleSidebar}
                aria-label={t("Mở menu")}
              >
                <Menu size={20} />
              </button>
            )}

            {role === "CUSTOMER" && <GlobalSearch role={role} />}
          </div>

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

        {role === "CUSTOMER" && <HeaderNav />}

        <section className="page-content">
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

      {role === "CUSTOMER" && <BottomNav onLogout={onLogout} />}

      <ConfirmDialog
        open={showLogoutConfirm}
        icon={LogoutIcon}
        title={t("Đăng xuất khỏi Canteen VWA?")}
        message={t("Giỏ hàng hiện tại sẽ bị xoá. Bạn sẽ cần đăng nhập lại để tiếp tục.")}
        confirmText={t("Đăng xuất")}
        cancelText={t("Ở lại")}
        danger
        onConfirm={handleLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
      />
    </div>
  );
}