// ============================================================
// CUSTOMERMENU.JSX — Thực đơn khách hàng
// ============================================================
// Tính năng:
//   - Grid món ăn, filter theo category (chip ngang)
//   - Category sync 2 chiều với URL (?category=...)
//   - Nhận search từ topbar qua URL param ?q= (GlobalSearch)
//   - Click món → mở FoodDetailModal (mode "cart" | "buy")
//
// Fixes (so với bản gốc):
//   - URL sync ngược: Back button → category reset về "Tất cả"
//   - Search dùng includes thay startsWith (đồng bộ các page khác)
//   - Validate category từ URL (không tồn tại → fallback)
//   - Guard m.name undefined
//   - Error state + retry
//   - Bỏ CATEGORIES const + cartCount dead code
//   - Image fallback SVG
//   - Empty state theo context (category / search)
//   - Deps của useSearchParams effect dùng .toString()
//   - ✅ FIX: đọc `?q=` từ URL (GlobalSearch navigate) → setSearch
// ============================================================

import { SkeletonCard } from "../../components/Skeleton";
import { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Star, ShoppingCart, Zap, Loader2, AlertCircle, RefreshCw, X,
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
  // ---------- Data ----------
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // ---------- Filters ----------
  const [category, setCategory] = useState(ALL_CATEGORY);
  const [search, setSearch] = useState("");

  // ---------- Modal ----------
  const [selected, setSelected] = useState(null);
  const [mode, setMode] = useState("cart");

  // ---------- URL params ----------
  const [searchParams, setSearchParams] = useSearchParams();

  // ---------- Load ----------

  const load = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    setError("");

    try {
      const [menuRes, catRes] = await Promise.all([
        api.menu.list("", ALL_CATEGORY, "popular").catch(() => []),
        api.categories.list().catch(() => []),
      ]);
      setItems(Array.isArray(menuRes) ? menuRes : []);
      setCategories(Array.isArray(catRes) ? catRes : []);
    } catch (e) {
      if (!silent) setError(e.message || "Không tải được thực đơn");
    } finally {
      setLoading(false);
      if (!silent) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  // ---------- ✅ Sync BOTH category + search với URL ----------
  // Đọc `?category=` VÀ `?q=` từ URL khi mount / khi URL đổi
  // (bao gồm cả trường hợp GlobalSearch navigate tới `?q=...`)
  const searchParamsStr = searchParams.toString();

  useEffect(() => {
    const urlCategory = searchParams.get("category") || ALL_CATEGORY;
    const urlQ = searchParams.get("q") || "";

    setCategory(urlCategory);
    setSearch(urlQ);
  }, [searchParamsStr]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- Listen global search (giữ tương thích) ----------
  // Vẫn giữ window event "globalsearch" để nếu component nào cũ
  // fire event thì vẫn hoạt động.
  useEffect(() => {
    const handler = (e) => setSearch(e.detail || "");
    window.addEventListener("globalsearch", handler);
    return () => window.removeEventListener("globalsearch", handler);
  }, []);

  // ---------- Category list (memo) ----------

  // Gộp "Tất cả" + categories từ API
  const categoryChips = useMemo(() => {
    const fromApi = categories.map((cat) => ({
      id: cat.name,
      label: cat.name,
      icon: cat.icon,
    }));
    return [{ id: ALL_CATEGORY, label: ALL_CATEGORY }, ...fromApi];
  }, [categories]);

  // Set các category hợp lệ để validate
  const validCategoryIds = useMemo(
    () => new Set(categoryChips.map((c) => c.id)),
    [categoryChips]
  );

  // ---------- Filtered items ----------

  const filtered = useMemo(() => {
    let list = items;

    // Filter theo category (chỉ khi category hợp lệ)
    if (category !== ALL_CATEGORY && validCategoryIds.has(category)) {
      list = list.filter((m) => m.category === category);
    }

    // Search
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

    // Giữ lại `?q=` nếu có
    const params = {};
    if (id !== ALL_CATEGORY) params.category = id;
    if (search.trim()) params.q = search.trim();

    setSearchParams(params);
  };

  const clearSearch = () => {
    setSearch("");
    // Xoá `?q=` khỏi URL nhưng giữ `?category=`
    const params = {};
    if (category !== ALL_CATEGORY) params.category = category;
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

  // ---------- Render helpers ----------

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

      {/* ============ TOOLBAR (sticky) ============ */}
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
        <div
          className="menu-cats-scroll"
          style={{
            display: "flex",
            gap: 8,
            flex: "1 1 auto",
            minWidth: 0,
            overflowX: "auto",
            flexWrap: "nowrap",
            paddingBottom: 4,
          }}
        >
          {categoryChips.map((c) => {
            const active = category === c.id;
            return (
              <button
                key={c.id}
                className={"cat-chip" + (active ? " active" : "")}
                onClick={() => selectCategory(c.id)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 20,
                  border: active
                    ? "1px solid #2634d5"
                    : "1px solid var(--border-color, #e5e9ef)",
                  background: active
                    ? "#2634d5"
                    : "var(--card-bg, #fff)",
                  color: active
                    ? "#fff"
                    : "var(--text-muted, #475569)",
                  fontSize: 13,
                  cursor: "pointer",
                  fontWeight: active ? 600 : 500,
                  transition: "all 0.2s",
                  flexShrink: 0,
                  whiteSpace: "nowrap",
                }}
              >
                {c.icon ? `${c.icon} ` : ""}
                {c.label}
              </button>
            );
          })}
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

        {/* Clear filters button khi có filter */}
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

          {/* ============ LOADING (skeleton grid) ============ */}
      {loading && (
        <div
          className="menu-food-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 220px))",
            gap: 18,
          }}
        >
          {Array.from({ length: 8 }).map((_, i) => (
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
        <div
          className="menu-food-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 220px))",
            gap: 18,
          }}
        >
          {filtered.map((m) => {
            const id = m._id || m.id;
            return (
              <div
                key={id}
                className="food-card-clickable"
                style={{
                  background: "var(--card-bg, #fff)",
                  border: "1px solid var(--border-color, #e5e9ef)",
                  borderRadius: 14,
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {/* Phần ảnh + info — click mở modal mode cart */}
                <div
                  onClick={() => openWithMode(m, "cart")}
                  style={{ cursor: "pointer" }}
                >
                  <img
                    src={m.image || FALLBACK_IMG}
                    alt={m.name}
                    loading="lazy"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = FALLBACK_IMG;
                    }}
                    style={{
                      width: "100%",
                      height: 160,
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                  <div style={{ padding: "14px 14px 0" }}>
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--text-light, #8993a3)",
                        textTransform: "uppercase",
                        letterSpacing: 0.4,
                      }}
                    >
                      {m.category}
                    </span>
                    <h4
                      style={{
                        margin: "6px 0",
                        fontSize: 15,
                        color: "var(--text-primary, #172033)",
                        fontWeight: 700,
                        lineHeight: 1.3,
                      }}
                    >
                      {m.name}
                    </h4>

                    {m.rating ? (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          marginBottom: 8,
                          fontSize: 12,
                        }}
                      >
                        <Star size={13} fill="#f59e0b" color="#f59e0b" />
                        <b style={{ color: "var(--text-primary, #172033)" }}>
                          {m.rating}
                        </b>
                        <span style={{ color: "var(--text-light, #8993a3)" }}>
                          ({m.review_count || 0})
                        </span>
                      </div>
                    ) : (
                      <div style={{ minHeight: 24, marginBottom: 8 }} />
                    )}
                  </div>
                </div>

                {/* Giá + 2 nút */}
                <div
                  style={{
                    padding: "0 14px 14px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    marginTop: "auto",
                  }}
                >
                  <b style={{ color: "#18a967", fontSize: 17, fontWeight: 800 }}>
                    {money(m.price)}
                  </b>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 8,
                    }}
                  >
                    <button
                      onClick={() => openWithMode(m, "cart")}
                      title="Thêm vào giỏ"
                      style={{
                        background: "var(--bg-tertiary, #f5f7fb)",
                        color: "var(--text-primary, #172033)",
                        border: "1px solid var(--border-color, #e5e9ef)",
                        padding: "10px 8px",
                        borderRadius: 9,
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: 600,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 5,
                        whiteSpace: "nowrap",
                      }}
                    >
                      <ShoppingCart size={14} />
                      Thêm
                    </button>

                    <button
                      onClick={() => openWithMode(m, "buy")}
                      style={{
                        background: "#2634d5",
                        color: "#fff",
                        border: 0,
                        padding: "10px 8px",
                        borderRadius: 9,
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: 700,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 5,
                        whiteSpace: "nowrap",
                      }}
                    >
                      <Zap size={14} />
                      Mua ngay
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

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}