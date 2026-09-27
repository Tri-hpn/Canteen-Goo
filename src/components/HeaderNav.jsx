// ============================================================
// HEADERNAV.JSX — Menu ngang cho Customer (desktop)
// ============================================================
// Hiện trên desktop (>= 769px). Mobile dùng BottomNav.
//
// Fixes (so với bản gốc):
//   - Thêm tab "Giỏ hàng" (đồng bộ với BottomNav)
//   - Badge động cho Giỏ hàng + Đơn hàng
//   - Match path chính xác (tránh sub-route lạ)
//   - aria-label cho nav
//   - ✅ FIX: thêm import api (trước đó thiếu → readOrders throw
//     ReferenceError ngầm, badge đơn hàng không bao giờ hiện)
//   - ✅ FIX MEDIUM: Phân nhóm tab theo màn hình
//     - Desktop lớn (>= 1200px): hiện đủ 7 tab
//     - Desktop nhỏ / Tablet (768-1199px): chỉ hiện 5 tab chính
//       (Home, Menu, Cart, Orders, Profile)
//     - Wallet + Promotions có thể vào từ trang Profile
// ============================================================

import { useEffect, useState, useCallback, useMemo } from "react";
import { NavLink } from "react-router-dom";
import {
  Home, UtensilsCrossed, ShoppingCart, Package, Wallet, Gift, User,
} from "lucide-react";
import { api } from "../api";

// ============================================================
// CONSTANTS
// ============================================================

const CART_KEY = "canteen_cart";
const ORDERS_SEEN_KEY = "orders_last_seen";

const ACTIVE_ORDER_STATUSES = [
  "Chờ xác nhận",
  "Đã xác nhận",
  "Đang chuẩn bị",
  "Sẵn sàng nhận",
];

// priority: 1 = luôn hiện, 2 = ẩn trên tablet/desktop nhỏ
const TABS = [
  { key: "home",       label: "Trang chủ",  icon: Home,            path: "/customer",            priority: 1 },
  { key: "menu",       label: "Thực đơn",   icon: UtensilsCrossed, path: "/customer/menu",       priority: 1 },
  { key: "cart",       label: "Giỏ hàng",   icon: ShoppingCart,    path: "/customer/cart",       badge: "cart",   priority: 1 },
  { key: "orders",     label: "Đơn hàng",   icon: Package,         path: "/customer/orders",     badge: "orders", priority: 1 },
  { key: "profile",    label: "Hồ sơ",      icon: User,            path: "/customer/profile",    priority: 1 },
  { key: "wallet",     label: "Ví Canteen", icon: Wallet,          path: "/customer/wallet",     priority: 2 },
  { key: "promotions", label: "Khuyến mãi", icon: Gift,            path: "/customer/promotions", priority: 2 },
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

/**
 * ✅ Check màn hình có đủ rộng để hiện 7 tab không.
 * Dùng window.matchMedia để reactive.
 */
function useHasWideScreen() {
  const [wide, setWide] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.matchMedia("(min-width: 1200px)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (typeof window.matchMedia !== "function") return;

    const mq = window.matchMedia("(min-width: 1200px)");
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
  const isWide = useHasWideScreen();

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
  }, [readCart, readOrders]);

  // ---------- Filter tabs theo màn hình ----------

  const visibleTabs = useMemo(() => {
    if (isWide) return TABS;
    return TABS.filter((t) => t.priority === 1);
  }, [isWide]);

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

  return (
    <nav className="header-nav" aria-label="Menu chính">
      <div className="header-nav-inner">
        {visibleTabs.map((tab) => {
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
              <span>{tab.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}