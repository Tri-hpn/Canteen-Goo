// ============================================================
// CUSTOMERMENU.JSX — Thực đơn khách hàng (GrabFood style)
// ============================================================
// FIX v6:
//   - Dùng class .grab-food-card đã có CSS trong styles.css (PHẦN 38)
//   - Sticky category dùng class .menu-cats-sticky (đúng topbar)
//   - Bỏ toàn bộ inline style rườm rà
// ============================================================

import { SkeletonCard } from "../../components/Skeleton";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Plus, AlertCircle, RefreshCw, X, Flame,
} from "lucide-react";
import { api } from "../../api";
import { money } from "../../components/UI";
import FoodDetailModal from "../../components/FoodDetailModal";
import ChatBotWidget from "../../components/ChatBotWidget";

// ============================================================
// CONSTANTS
// ============================================================

const ALL_CATEGORY = "Tất cả";

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
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [category, setCategory] = useState(ALL_CATEGORY);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [mode, setMode] = useState("cart");
  const [searchParams, setSearchParams] = useSearchParams();

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

  const searchParamsStr = searchParams.toString();
  useEffect(() => {
    setCategory(searchParams.get("category") || ALL_CATEGORY);
    setSearch(searchParams.get("q") || "");
  }, [searchParamsStr]); // eslint-disable-line

  useEffect(() => {
    const handler = (e) => setSearch(e.detail || "");
    window.addEventListener("globalsearch", handler);
    return () => window.removeEventListener("globalsearch", handler);
  }, []);

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

  const openModal = (item) => {
    setMode("cart");
    setSelected(item);
  };

  const hasFilter = category !== ALL_CATEGORY || search.trim();

  return (
    <div>
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

      {/* Category chips — sticky đúng topbar */}
      <div
        className="menu-cats-sticky"
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

      {/* Summary line */}
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

      {/* Loading */}
      {loading && (
        <div className="menu-food-grid">
          {Array.from({ length: 10 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Empty */}
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

      {/* Grid */}
      {!loading && filtered.length > 0 && (
        <div className="menu-food-grid">
          {filtered.map((m) => {
            const id = m._id || m.id;
            const isHot = m.sold >= 50 || m.discount_percent > 0;
            const hasDiscount =
              m.discount_percent > 0 && m.original_price > m.price;
            const isOutOfStock = m.stock === 0;

            return (
              <div
                key={id}
                className="grab-food-card"
                onClick={() => !isOutOfStock && openModal(m)}
              >
                {/* Ảnh + badge + nút + */}
                <div className="grab-food-card__image-wrap">
                  <img
                    src={m.image || FALLBACK_IMG}
                    alt={m.name}
                    loading="lazy"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = FALLBACK_IMG;
                    }}
                  />

                  {/* Badge trên ảnh */}
                  {isOutOfStock ? (
                    <span className="grab-food-card__badge grab-food-card__badge--out">
                      Hết hàng
                    </span>
                  ) : isHot ? (
                    <span className="grab-food-card__badge grab-food-card__badge--hot">
                      <Flame size={10} /> Bán chạy
                    </span>
                  ) : null}

                  {/* Nút + nổi góc dưới phải */}
                  {!isOutOfStock && (
                    <button
                      type="button"
                      className="grab-food-card__add-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        openModal(m);
                      }}
                      aria-label={`Thêm ${m.name}`}
                    >
                      <Plus size={20} strokeWidth={3} />
                    </button>
                  )}
                </div>

                {/* Info bên dưới */}
                <div className="grab-food-card__info">
                  <h4 className="grab-food-card__name">{m.name}</h4>
                  <div className="grab-food-card__price-row">
                    <span className="grab-food-card__price">
                      {money(m.price)}
                    </span>
                    {hasDiscount && (
                      <span className="grab-food-card__price-old">
                        {money(m.original_price)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
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

      <ChatBotWidget cart={cart} setCart={setCart} user={user} />
    </div>
  );
}