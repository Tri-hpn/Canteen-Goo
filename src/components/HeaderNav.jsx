// ============================================================
// HEADERNAV.JSX — Menu ngang cho Customer (desktop)
// ============================================================
// Hiện trên desktop (>= 901px). Tablet/Mobile dùng BottomNav.
//
// 6 tab chính: Trang chủ, Thực đơn, Giỏ hàng, Đơn hàng,
//              Ví Canteen, Khuyến mãi
// (Đã bỏ tab "Hồ sơ" vì thừa — đã có nút profile ở topbar phải)
//
// FIX v3:
//   - 🔴 Bỏ tab "Hồ sơ"
//   - 🔴 Ẩn hoàn toàn khi màn hình <= 900px
//   - 🔴 Không render DOM khi mobile (tối ưu performance)
// ============================================================

import { useEffect, useState, useCallback } from "react";
import { NavLink } from "react-router-dom";
import {
  Home, UtensilsCrossed, Package, Wallet, Gift,
} from "lucide-react";
import { api } from "../api";
import { useTranslation } from "../i18n";

// ============================================================
// CONSTANTS
// ============================================================

const CART_KEY = "canteen_cart";
const ORDERS_SEEN_KEY = "orders_last_seen";
const HIDE_BELOW_PX = 900; // ✅ Ẩn HeaderNav khi <= 900px

const ACTIVE_ORDER_STATUSES = [
  "Chờ xác nhận",
  "Đã xác nhận",
  "Đang chuẩn bị",
  "Sẵn sàng nhận",
];

// 5 tab chính — bỏ "Hồ sơ" (đã có ở topbar) và "Giỏ hàng" (đã có icon topbar)
const TABS = [
  { key: "home",       labelKey: "nav.home",       icon: Home,            path: "/customer" },
  { key: "menu",       labelKey: "nav.menu",       icon: UtensilsCrossed, path: "/customer/menu" },
  { key: "orders",     labelKey: "nav.orders",     icon: Package,         path: "/customer/orders",     badge: "orders" },
  { key: "wallet",     labelKey: "nav.wallet",     icon: Wallet,          path: "/customer/wallet" },
  { key: "promotions", labelKey: "nav.promotions", icon: Gift,            path: "/customer/promotions" },
];

const BADGE_MAX = 99;

// ============================================================
// HELPERS
// ============================================================

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

/** Hook: check màn hình có rộng không (>= HIDE_BELOW_PX) */
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
    // Safari cũ
    mq.addListener?.(handler);
    return () => mq.removeListener?.(handler);
  }, []);

  return wide;
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function HeaderNav() {
  const [cartCount, setCartCount] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const { t } = useTranslation();

  // ✅ Check màn hình — không render DOM khi mobile
  const isWide = useIsWideScreen();

  // ---------- Read cart ----------

  const readCart = useCallback(() => {
    setCartCount(readCartCount());
  }, []);

  // ---------- Read orders ----------

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

  // ---------- Listeners ----------

  useEffect(() => {
    if (!isWide) return; // ✅ Không fetch khi mobile

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

  // ---------- Badge render ----------

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

  // ============================================================
  // RENDER
  // ============================================================

  // ✅ Không render gì khi màn hình nhỏ
  if (!isWide) return null;

  return (
    <nav className="header-nav" aria-label="Menu chính">
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
              <span>{t(tab.labelKey)}</span>
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