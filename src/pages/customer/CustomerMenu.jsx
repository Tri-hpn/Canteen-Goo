// ============================================================
// CUSTOMERMENU.JSX — Thực đơn khách hàng
// ============================================================
// Tính năng:
//   - Grid món ăn, filter theo category (chip ngang)
//   - Category sync 2 chiều với URL (?category=...)
//   - Nhận search từ topbar qua URL param ?q= (GlobalSearch)
//   - Click món → mở FoodDetailModal (mode "cart" | "buy")
//   - Badge Hết hàng / Sắp hết trên card
//
// FIX v4:
//   - Dùng className (food-card-info, food-card-category, food-card-name...)
//   - Bỏ hết inline style gây conflict với CSS
//   - Card đồng nhất: category 20px + name 38px + rating 20px
//   - Badge trạng thái kho (Hết hàng / Sắp hết)
// ============================================================

import { SkeletonCard } from "../../components/Skeleton";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Star, ShoppingCart, Zap, AlertCircle, RefreshCw, X, Ban, Clock,
} from "lucide-react";
import { api } from "../../api";
import { money } from "../../components/UI";
import FoodDetailModal from "../../components/FoodDetailModal";
import ChatBotWidget from "../../components/ChatBotWidget";

// ============================================================
// CONSTANTS
// ============================================================

const ALL_CATEGORY = "Tất cả";
const LOW_STOCK_THRESHOLD = 5;

const FALLBACK_IMG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>
      <rect fill='#f5f7fb' width='100' height='100'/>
      <text x='50' y='58' font-size='40' text-anchor='middle'>🍽️</text>
    </svg>`
  );

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function CustomerMenu({ cart, setCart, user }) {
  // ---------- State ----------
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [category, setCategory] = useState(ALL_CATEGORY);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [mode, setMode] = useState("cart");
  const [searchParams, setSearchParams] = useSearchParams();

  // ---------- Load data ----------
  const load = useCallback(async (silent = false) => {
    setError("");
    try {
      const [menuRes, catRes] = await Promise.all([
        api.menu.list("", ALL_CATEGORY, "popular").catch(() => []),
        api.categories.list().catch(() => []),
      ]);
      const rawList = Array.isArray(menuRes) ? menuRes : [];
      setItems(rawList.filter((m) => m.active));
      setCategories(Array.isArray(catRes) ? catRes : []);
    } catch (e) {
      if (!silent) setError(e.message || "Không tải được thực đơn");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  // ---------- Sync URL params ----------
  const searchParamsStr = searchParams.toString();

  useEffect(() => {
    setCategory(searchParams.get("category") || ALL_CATEGORY);
    setSearch(searchParams.get("q") || "");
  }, [searchParamsStr]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- Listen global search event ----------
  useEffect(() => {
    const handler = (e) => setSearch(e.detail || "");
    window.addEventListener("globalsearch", handler);
    return () => window.removeEventListener("globalsearch", handler);
  }, []);

  // ---------- Category chips ----------
  const categoryChips = useMemo(() => {
    const fromApi = categories.map((cat) => ({
      id: cat.name,
      label: cat.name,
      icon: cat.icon,
    }));
    return [{ id: ALL_CATEGORY, label: ALL_CATEGORY }, ...fromApi];
  }, [categories]);

  const validCategoryIds = useMemo(
    () => new Set(categoryChips.map((c) => c.id)),
    [categoryChips]
  );

  // ---------- Filtered list ----------
  const filtered = useMemo(() => {
    let list = items;

    if (category !== ALL_CATEGORY && validCategoryIds.has(category)) {
      list = list.filter((m) => m.category === category);
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter((m) => {
        const name = (m.name || "").toLowerCase();
        const cat = (m.category || "").toLowerCase();
        return name.includes(q) || cat.includes(q);
      });
    }

    return list;
  }, [items, category, search, validCategoryIds]);

  // ---------- Handlers ----------
  const selectCategory = (id) => {
    setCategory(id);
    const params = {};
    if (id !== ALL_CATEGORY) params.category = id;
    if (search.trim()) params.q = search.trim();
    setSearchParams(params);
  };

  const clearAllFilters = () => {
    setSearch("");
    setCategory(ALL_CATEGORY);
    setSearchParams({});
  };

  const openWithMode = (item, m) => {
    setMode(m);
    setSelected(item);
  };

  const hasFilter = category !== ALL_CATEGORY || search.trim();

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div>
      {/* ============ ERROR BANNER ============ */}
      {error && (
        <div
          style={{
            background: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            borderRadius: 10,
            padding: "12px 16px",
            marginBottom: 16,
            color: "#ef4444",
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 13,
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{error}</span>
          <button
            onClick={() => load(false)}
            style={{
              padding: "6px 12px",
              background: "#ef4444",
              color: "#fff",
              border: 0,
              borderRadius: 6,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 12,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <RefreshCw size={12} /> Thử lại
          </button>
        </div>
      )}

      {/* ============ TOOLBAR — Category chips ============ */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 14,
          marginBottom: 20,
          position: "sticky",
          top: 64,
          zIndex: 9,
          background: "var(--bg-primary, #f5f7fb)",
          paddingTop: 12,
          paddingBottom: 8,
        }}
      >
        <div className="menu-cats-scroll">
          {categoryChips.map((c) => (
            <button
              key={c.id}
              className={"cat-chip" + (category === c.id ? " active" : "")}
              onClick={() => selectCategory(c.id)}
            >
              {c.icon ? `${c.icon} ` : ""}
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* ============ SUMMARY LINE ============ */}
      <div
        style={{
          fontSize: 13,
          color: "var(--text-light, #8993a3)",
          marginBottom: 14,
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <span>
          {filtered.length} món
          {category !== ALL_CATEGORY && ` trong "${category}"`}
          {search && ` — tìm "${search}"`}
        </span>
        {hasFilter && (
          <button
            onClick={clearAllFilters}
            style={{
              padding: "3px 10px",
              background: "transparent",
              border: "1px solid var(--border-color, #e5e9ef)",
              color: "var(--text-muted, #64748b)",
              borderRadius: 12,
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <X size={11} /> Xoá lọc
          </button>
        )}
      </div>

      {/* ============ LOADING ============ */}
      {loading && (
        <div className="menu-food-grid">
          {Array.from({ length: 10 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* ============ EMPTY STATE ============ */}
      {!loading && filtered.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: 60,
            color: "var(--text-light, #8993a3)",
            background: "var(--card-bg, #fff)",
            borderRadius: 14,
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 12 }}>🍽️</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>
            {search
              ? `Không tìm thấy món nào với "${search}"`
              : category !== ALL_CATEGORY
              ? `Chưa có món nào trong "${category}"`
              : "Chưa có món nào trong thực đơn"}
          </div>
          {hasFilter && (
            <button
              onClick={clearAllFilters}
              style={{
                marginTop: 12,
                padding: "8px 16px",
                background: "#2634d5",
                color: "#fff",
                border: 0,
                borderRadius: 8,
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              Xem tất cả món
            </button>
          )}
        </div>
      )}

      {/* ============ GRID ============ */}
      {!loading && filtered.length > 0 && (
        <div className="menu-food-grid">
          {filtered.map((m) => {
            const id = m._id || m.id;
            const isOutOfStock = m.stock === 0;
            const isLowStock =
              typeof m.stock === "number" &&
              m.stock > 0 &&
              m.stock <= LOW_STOCK_THRESHOLD;

            return (
              <div key={id} className="food-card-clickable">
                {/* Ảnh + info (clickable) */}
                <div
                  onClick={() => openWithMode(m, "cart")}
                  style={{ cursor: "pointer", position: "relative" }}
                >
                  <img
                    src={m.image || FALLBACK_IMG}
                    alt={m.name}
                    loading="lazy"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = FALLBACK_IMG;
                    }}
                  />

                  {/* Badge trạng thái kho */}
                  {isOutOfStock && (
                    <div className="food-card-badge food-card-badge--out">
                      <Ban size={11} /> Hết hàng
                    </div>
                  )}
                  {isLowStock && !isOutOfStock && (
                    <div className="food-card-badge food-card-badge--low">
                      <Clock size={11} /> Sắp hết
                    </div>
                  )}

                  <div className="food-card-info">
                    <span className="food-card-category">
                      {m.category}
                    </span>
                    <h4 className="food-card-name">
                      {m.name}
                    </h4>
                    <div className="food-rating-row">
                      {m.rating ? (
                        <>
                          <Star size={13} fill="#f59e0b" color="#f59e0b" />
                          <b className="food-card-rating-value">
                            {m.rating}
                          </b>
                          <span className="food-card-rating-count">
                            ({m.review_count || 0})
                          </span>
                        </>
                      ) : (
                        <span className="food-card-rating-empty">
                          Chưa có đánh giá
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="food-card-actions">
                  <b className="food-card-price">{money(m.price)}</b>
                  <div className="food-card-buttons">
                    <button
                      onClick={() => openWithMode(m, "cart")}
                      title="Thêm vào giỏ"
                      className="food-card-btn-add"
                      disabled={isOutOfStock}
                    >
                      <ShoppingCart size={14} />
                      Thêm
                    </button>
                    <button
                      onClick={() => openWithMode(m, "buy")}
                      className="food-card-btn-buy"
                      disabled={isOutOfStock}
                    >
                      <Zap size={14} />
                      {isOutOfStock ? "Hết hàng" : "Mua ngay"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============ FOOD DETAIL MODAL ============ */}
      {selected && (
        <FoodDetailModal
          item={selected}
          cart={cart}
          setCart={setCart}
          user={user}
          mode={mode}
          onClose={() => setSelected(null)}
        />
      )}

      {/* ============ CHATBOT WIDGET ============ */}
      <ChatBotWidget cart={cart} setCart={setCart} user={user} />
    </div>
  );
}