// ============================================================
// BOTTOMNAV.JSX — Bottom navigation cho Customer (mobile)
// ============================================================

import { useEffect, useState, useRef, useCallback } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  Home, UtensilsCrossed, ShoppingCart, Package, User, Menu,
  Wallet, Gift, LogOut, X,
} from "lucide-react";
import { api, setToken } from "../api";
import { useTranslation } from "../i18n";
import ConfirmDialog, { LogoutIcon } from "./ConfirmDialog";

// ============================================================
// CONSTANTS
// ============================================================

const CART_KEY = "canteen_cart";
const ORDERS_SEEN_KEY = "orders_last_seen";

const TABS = [
  { key: "home",   labelKey: "nav.home",   icon: Home,            path: "/customer" },
  { key: "menu",   labelKey: "nav.menu",   icon: UtensilsCrossed, path: "/customer/menu" },
  { key: "cart",   labelKey: "nav.cart",   icon: ShoppingCart,    path: "/customer/cart",   badge: "cart" },
  { key: "orders", labelKey: "nav.orders", icon: Package,         path: "/customer/orders", badge: "orders" },
];

const MORE_ITEMS = [
  { key: "wallet",     labelKey: "nav.wallet",     icon: Wallet, path: "/customer/wallet" },
  { key: "promotions", labelKey: "nav.promotions", icon: Gift,   path: "/customer/promotions" },
  { key: "profile",    labelKey: "nav.profile",    icon: User,   path: "/customer/profile" },
];

const ACTIVE_ORDER_STATUSES = [
  "Chờ xác nhận",
  "Đã xác nhận",
  "Đang chuẩn bị",
  "Sẵn sàng nhận",
];

const POLL_MS = 30000;
const BADGE_MAX = 99;

// ============================================================
// HELPERS
// ============================================================

function readCartFromStorage() {
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

function isPathActive(currentPath, targetPath) {
  if (!currentPath || !targetPath) return false;
  if (currentPath === targetPath) return true;
  return currentPath.startsWith(targetPath + "/");
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function BottomNav({ onLogout }) {
  const [cartCount, setCartCount] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [showMore, setShowMore] = useState(false);
  const { t } = useTranslation();

  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const orderReqIdRef = useRef(0);

  // ---------- Read cart ----------
  const readCart = useCallback(() => {
    setCartCount(readCartFromStorage());
  }, []);

  // ---------- Read orders ----------
  const readOrders = useCallback(async () => {
    const myReqId = ++orderReqIdRef.current;

    try {
      const token = sessionStorage.getItem("token");
      if (!token) {
        setOrderCount(0);
        return;
      }

      const data = await api.orders.myOrders();
      if (myReqId !== orderReqIdRef.current) return;

      const lastSeen = parseInt(
        localStorage.getItem(ORDERS_SEEN_KEY) || "0",
        10
      );

      const count = (Array.isArray(data) ? data : []).filter((o) => {
        if (!ACTIVE_ORDER_STATUSES.includes(o.status)) return false;
        const created = new Date(o.created_at || 0).getTime();
        return created > lastSeen;
      }).length;

      setOrderCount(count);
    } catch {
      if (myReqId === orderReqIdRef.current) setOrderCount(0);
    }
  }, []);

  // ---------- Setup listeners + polling ----------
  useEffect(() => {
    readCart();
    readOrders();

    const onCart = () => readCart();
    const onOrder = () => readOrders();

    window.addEventListener("cart-updated", onCart);
    window.addEventListener("refresh-cart", onCart);
    window.addEventListener("orders-seen", onOrder);
    window.addEventListener("order-updated", onOrder);

    const timer = setInterval(readOrders, POLL_MS);

    return () => {
      window.removeEventListener("cart-updated", onCart);
      window.removeEventListener("refresh-cart", onCart);
      window.removeEventListener("orders-seen", onOrder);
      window.removeEventListener("order-updated", onOrder);
      clearInterval(timer);
    };
  }, [readCart, readOrders]);

  // ---------- Close More menu khi đổi route ----------
  useEffect(() => {
    setShowMore(false);
  }, [location.pathname]);

  // ---------- ESC đóng More + lock scroll ----------
  useEffect(() => {
    if (!showMore) return;

    const handler = (e) => {
      if (e.key === "Escape") setShowMore(false);
    };
    window.addEventListener("keydown", handler);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = prevOverflow;
    };
  }, [showMore]);

  // ---------- Handlers ----------
  const getBadge = (key) => {
    if (key === "cart") return cartCount;
    if (key === "orders") return orderCount;
    return 0;
  };

  const isMoreActive = MORE_ITEMS.some((i) =>
    isPathActive(location.pathname, i.path)
  );

  const openLogoutConfirm = () => {
    setShowMore(false);
    setConfirmLogout(true);
  };

  const performLogout = () => {
    setLoggingOut(true);
    try {
      localStorage.removeItem(ORDERS_SEEN_KEY);
      localStorage.removeItem("canteen_cart_selected");
    } catch {}

    document.body.style.overflow = "";
    document.body.classList.remove("has-bottom-nav");
    document.body.classList.remove("mobile-open");

    if (onLogout) {
      onLogout();
    } else {
      setToken(null);
      navigate("/");
    }
  };

  const handleMoreToggle = () => setShowMore((s) => !s);

  const renderBadge = (count) => {
    if (!count || count <= 0) return null;
    return (
      <span className="bottom-nav-badge" aria-hidden="true">
        {count > BADGE_MAX ? `${BADGE_MAX}+` : count}
      </span>
    );
  };

  return (
    <>
      {/* ============ MORE MENU ============ */}
      {showMore && (
        <div
          className="bottom-nav-more-overlay"
          onClick={() => setShowMore(false)}
          role="dialog"
          aria-modal="true"
          aria-label={t("more.menuTitle")}
        >
          <div
            className="bottom-nav-more-menu"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bottom-nav-more-head">
              <span>{t("more.menu")}</span>
              <button
                onClick={() => setShowMore(false)}
                className="bottom-nav-more-close"
                aria-label={t("common.close")}
                type="button"
              >
                <X size={16} />
              </button>
            </div>

            {MORE_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isPathActive(location.pathname, item.path);

              return (
                <button
                  key={item.key}
                  type="button"
                  className={"bottom-nav-more-item" + (active ? " active" : "")}
                  onClick={() => {
                    setShowMore(false);
                    navigate(item.path);
                  }}
                >
                  <Icon size={20} />
                  <span>{t(item.labelKey)}</span>
                </button>
              );
            })}

            <div className="bottom-nav-more-sep" />

            <button
              type="button"
              className="bottom-nav-more-item danger"
              onClick={openLogoutConfirm}
            >
              <LogOut size={20} />
              <span>{t("common.logout")}</span>
            </button>
          </div>
        </div>
      )}

      {/* ============ BOTTOM NAV ============ */}
      <nav className="bottom-nav" aria-label={t("nav.main")}>
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const badge = getBadge(tab.badge);

          return (
            <NavLink
              key={tab.key}
              to={tab.path}
              end={tab.path === "/customer"}
              className={({ isActive }) =>
                "bottom-nav-item" + (isActive ? " active" : "")
              }
            >
              <div className="bottom-nav-icon">
                <Icon size={22} />
                {renderBadge(badge)}
              </div>
              <span className="bottom-nav-label">{t(tab.labelKey)}</span>
            </NavLink>
          );
        })}

        {/* Nút "Thêm" */}
        <button
          type="button"
          className={
            "bottom-nav-item" + (isMoreActive || showMore ? " active" : "")
          }
          onClick={handleMoreToggle}
          aria-label={t("nav.moreLabel")}
          aria-expanded={showMore}
          aria-haspopup="menu"
        >
          <div className="bottom-nav-icon">
            <Menu size={22} />
          </div>
          <span className="bottom-nav-label">{t("nav.more")}</span>
        </button>
      </nav>

      {/* ============ CONFIRM LOGOUT MODAL ============ */}
      <ConfirmDialog
        open={confirmLogout}
        icon={LogoutIcon}
        title={t("logout.title")}
        message={t("logout.messageCart")}
        confirmText={t("common.logout")}
        cancelText={t("logout.stay")}
        danger
        loading={loggingOut}
        onConfirm={performLogout}
        onClose={() => !loggingOut && setConfirmLogout(false)}
      />
    </>
  );
}