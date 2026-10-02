// ============================================================
// HEADERNAV.JSX — Menu ngang cho Customer (desktop)
// ============================================================

import { useEffect, useState, useCallback } from "react";
import { NavLink } from "react-router-dom";
import {
  Home, UtensilsCrossed, Package, Wallet, Gift,
} from "lucide-react";
import { api } from "../api";
import { useI18n } from "../hooks/useI18n";

const CART_KEY = "canteen_cart";
const ORDERS_SEEN_KEY = "orders_last_seen";
const HIDE_BELOW_PX = 900;

const ACTIVE_ORDER_STATUSES = [
  "Chờ xác nhận",
  "Đã xác nhận",
  "Đang chuẩn bị",
  "Sẵn sàng nhận",
];

// ✅ SOURCE-TEXT: Dùng tiếng Việt trực tiếp thay vì key
const TABS = [
  { key: "home",       label: "Trang chủ",      icon: Home,            path: "/customer" },
  { key: "menu",       label: "Thực đơn",        icon: UtensilsCrossed, path: "/customer/menu" },
  { key: "orders",     label: "Đơn hàng",        icon: Package,         path: "/customer/orders",     badge: "orders" },
  { key: "wallet",     label: "Ví Canteen",      icon: Wallet,          path: "/customer/wallet" },
  { key: "promotions", label: "Khuyến mãi",      icon: Gift,            path: "/customer/promotions" },
];

const BADGE_MAX = 99;

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

function useIsWideScreen() {
  const [wide, setWide] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.matchMedia(`(min-width: ${HIDE_BELOW_PX + 1}px)`).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (typeof window.matchMedia !== "function") return;

    const mq = window.matchMedia(`(min-width: ${HIDE_BELOW_PX + 1}px)`);
    const handler = (e) => setWide(e.matches);

    if (mq.addEventListener) {
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
    mq.addListener?.(handler);
    return () => mq.removeListener?.(handler);
  }, []);

  return wide;
}

export default function HeaderNav() {
  const [cartCount, setCartCount] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const { t } = useI18n();

  const isWide = useIsWideScreen();

  const readCart = useCallback(() => {
    setCartCount(readCartCount());
  }, []);

  const readOrders = useCallback(async () => {
    try {
      const token = sessionStorage.getItem("token");
      if (!token) {
        setOrderCount(0);
        return;
      }

      const data = await api.orders.myOrders().catch(() => []);
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
      setOrderCount(0);
    }
  }, []);

  useEffect(() => {
    if (!isWide) return;

    readCart();
    readOrders();

    const onCart = () => readCart();
    const onOrder = () => readOrders();

    window.addEventListener("cart-updated", onCart);
    window.addEventListener("refresh-cart", onCart);
    window.addEventListener("orders-seen", onOrder);
    window.addEventListener("order-updated", onOrder);

    return () => {
      window.removeEventListener("cart-updated", onCart);
      window.removeEventListener("refresh-cart", onCart);
      window.removeEventListener("orders-seen", onOrder);
      window.removeEventListener("order-updated", onOrder);
    };
  }, [isWide, readCart, readOrders]);

  const renderBadge = (count) => {
    if (!count || count <= 0) return null;
    return (
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          top: -6,
          right: -10,
          minWidth: 18,
          height: 18,
          padding: "0 5px",
          borderRadius: 9,
          background: "#ef4444",
          color: "#fff",
          fontSize: 10,
          fontWeight: 800,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          border: "2px solid var(--card-bg, #fff)",
          lineHeight: 1,
          boxShadow: "0 1px 3px rgba(239, 68, 68, 0.4)",
        }}
      >
        {count > BADGE_MAX ? `${BADGE_MAX}+` : count}
      </span>
    );
  };

  if (!isWide) return null;

  return (
    <nav className="header-nav" aria-label={t("Menu chính")}>
      <div
        className="header-nav-inner"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 4,
          flexWrap: "nowrap",
          overflowX: "auto",
          scrollbarWidth: "none",
          padding: "0 16px",
        }}
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const badge =
            tab.badge === "cart"
              ? cartCount
              : tab.badge === "orders"
              ? orderCount
              : 0;

          return (
            <NavLink
              key={tab.key}
              to={tab.path}
              end={tab.path === "/customer"}
              className={({ isActive }) =>
                "header-nav-item" + (isActive ? " active" : "")
              }
              style={{ flexShrink: 0 }}
            >
              <span
                style={{
                  position: "relative",
                  display: "inline-flex",
                  alignItems: "center",
                  flexShrink: 0,
                }}
              >
                <Icon size={16} />
                {renderBadge(badge)}
              </span>
              {/* ✅ SOURCE-TEXT: t(tab.label) thay vì t(tab.labelKey) */}
              <span>{t(tab.label)}</span>
            </NavLink>
          );
        })}
      </div>

      <style>{`
        .header-nav-inner::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </nav>
  );
}