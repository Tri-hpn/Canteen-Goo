// ============================================================
// LAYOUT.JSX — Layout chính của app
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
import LanguageToggle from "./LanguageToggle";
import Footer from "./Footer";
import HeaderNav from "./HeaderNav";
import BottomNav from "./BottomNav";
import ConfirmDialog, { LogoutIcon } from "./ConfirmDialog";
import { useTranslation } from "../i18n";

const CART_KEY = "canteen_cart";

const FALLBACK_AVATAR =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>
      <rect fill='#0EA5E9' width='100' height='100'/>
      <text x='50' y='58' font-size='40' fill='#fff' text-anchor='middle'>👤</text>
    </svg>`
  );

const PAGE_HEADINGS = [
  { path: "/customer/menu",       titleKey: "page.menu.title",       subtitleKey: "page.menu.subtitle" },
  { path: "/customer/cart",       titleKey: "page.cart.title",       subtitleKey: "page.cart.subtitle" },
  { path: "/customer/checkout",   titleKey: "page.checkout.title",   subtitleKey: "page.checkout.subtitle" },
  { path: "/customer/orders",     titleKey: "page.orders.title",     subtitleKey: "page.orders.subtitle" },
  { path: "/customer/profile",    titleKey: "page.profile.title",    subtitleKey: "page.profile.subtitle" },
  { path: "/customer/promotions", titleKey: "page.promotions.title", subtitleKey: "page.promotions.subtitle" },
  { path: "/customer/wallet",     titleKey: "page.wallet.title",     subtitleKey: "page.wallet.subtitle" },
  { path: "/customer/chat",       titleKey: "page.chat.title",       subtitleKey: "page.chat.subtitle" },
  { path: "/customer/signature",  titleKey: "page.signature.title",  subtitleKey: "page.signature.subtitle" },
  { path: "/customer/success",    titleKey: "page.success.title",    subtitleKey: "page.success.subtitle" },
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
      return { titleKey: h.titleKey, subtitleKey: h.subtitleKey };
    }
  }
  return null;
}

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

function CartTopbarIcon() {
  const [count, setCount] = useState(0);
  const { t } = useTranslation();

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
      title={t("nav.cart")}
      aria-label={`${t("nav.cart")}${count > 0 ? `, ${count}` : ""}`}
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
        title={t("account.menu")}
        aria-label={t("account.menu")}
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
          <b className="profile-name">{user?.name || t("account.user")}</b>
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
            <span>{t("account.profile")}</span>
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
            <span style={{ flex: 1, textAlign: "left" }}>
              {t("account.language")}
            </span>
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
            <span style={{ flex: 1, textAlign: "left" }}>
              {t("account.theme")}
            </span>
            <span
              style={{
                fontSize: 12,
                color: "var(--text-light, #8993a3)",
                fontWeight: 600,
              }}
            >
              {theme === "dark" ? t("account.dark") : t("account.light")}
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
            <span>{t("account.logout")}</span>
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
  const { t, lang } = useTranslation();

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
    if (role === "ADMIN") return t("role.admin");
    if (role === "EMPLOYEE") return t("role.employee");
    return t("role.customer");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, t, lang]);

  const heading = useMemo(() => {
    if (title || subtitle) {
      return { title, subtitle };
    }
    const raw = lookupHeading(location.pathname);
    if (!raw) return null;
    return {
      title: t(raw.titleKey),
      subtitle: t(raw.subtitleKey),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
                aria-label={t("common.openMenu")}
              >
                <Menu size={20} />
              </button>
            )}

            {role === "CUSTOMER" && <GlobalSearch role={role} />}
          </div>

          <div className="topbar-right">
            {role === "CUSTOMER" && <CartTopbarIcon />}

            <LanguageToggle />

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
        title={t("logout.title")}
        message={t("logout.message")}
        confirmText={t("common.logout")}
        cancelText={t("logout.stay")}
        danger
        onConfirm={handleLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
      />
    </div>
  );
}