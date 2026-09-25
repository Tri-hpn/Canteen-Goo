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
// ============================================================

import { useEffect, useState, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronDown, Menu, ShoppingCart, LogOut } from "lucide-react";

import Sidebar from "./Sidebar";
import GlobalSearch from "./GlobalSearch";
import NotificationBell from "./NotificationBell";
import ThemeToggle from "./ThemeToggle";
import LanguageToggle from "./LanguageToggle";
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

function TopbarProfile({ user, roleLabel, onOpenProfile }) {
  const initials = useMemo(() => getInitials(user?.name), [user?.name]);

  return (
    <button
      type="button"
      onClick={onOpenProfile}
      className="topbar-profile-btn"
      title="Hồ sơ cá nhân"
      aria-label="Hồ sơ cá nhân"
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
        style={{ color: "var(--text-light, #94a3b8)", flexShrink: 0 }}
      />
    </button>
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

            <LanguageToggle />
            <ThemeToggle />
            <NotificationBell />

            {/* ✅ Nút Logout + Profile — CHỈ hiện cho Customer
               (Employee + Admin dùng nút trong sidebar) */}
            {role === "CUSTOMER" && (
              <>
                <button
                  type="button"
                  onClick={openLogoutConfirm}
                  className="icon-btn topbar-icon-btn topbar-icon-logout"
                  title="Đăng xuất"
                  aria-label="Đăng xuất"
                  style={{
                    color: "#ef4444",
                    background: "rgba(239, 68, 68, 0.08)",
                  }}
                >
                  <LogOut size={18} />
                </button>

                <TopbarProfile
                  user={user}
                  roleLabel={roleLabel}
                  onOpenProfile={openProfile}
                />
              </>
            )}
          </div>
        </header>

        {/* ============ HEADER NAV (customer only) ============ */}
        {role === "CUSTOMER" && <HeaderNav />}

        {/* ============ PAGE CONTENT ============ */}
        <section className="page-content">
          {/* Heading — CHỈ hiện cho CUSTOMER (Employee + Admin đã có sidebar) */}
          {role === "CUSTOMER" && !hideHeading && (title || subtitle) && (
            <div className="page-heading">
              {title && <h1>{title}</h1>}
              {subtitle && <p>{subtitle}</p>}
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