// ============================================================
// GLOBALSEARCH.JSX — Ô tìm kiếm toàn cục trên topbar
// ============================================================
// Tính năng:
//   - Debounce 300ms khi gõ
//   - Dropdown kết quả: món ăn (top 5)
//   - Keyboard nav: ↑ ↓ Enter Escape
//   - Highlight keyword trong kết quả
//   - Điều hướng theo role (customer/employee/owner)
//   - Sync sang trang Menu qua URL param ?q=
//
// Fixes (so với bản gốc):
//   - Bỏ dead state orders/users (luôn rỗng)
//   - Route theo role: /customer/menu, /employee/menu, /owner/menu
//   - Race-safe search (reqIdRef)
//   - ✅ FIX: điều hướng bằng URL query `?q=` thay vì location.state
//     → CustomerMenu (đọc searchParams) nhận được giá trị tìm kiếm.
//     Trước đây dùng `navigate(..., { state })` nhưng Menu lắng nghe
//     window event "globalsearch" → 2 cơ chế không gặp nhau.
//   - Keyboard nav (↑ ↓ Enter Esc)
//   - Loading state với spinner
//   - Highlight keyword trong tên món
//   - Memo derived values
//   - aria: role="combobox" + aria-expanded
// ============================================================

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Utensils, X, Loader2 } from "lucide-react";
import { api } from "../api";
import { money } from "./UI";

// ============================================================
// CONSTANTS
// ============================================================

const DEBOUNCE_MS = 300;
const MAX_RESULTS = 5;

const FALLBACK_IMG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>
      <rect fill='#f5f7fb' width='100' height='100'/>
      <text x='50' y='58' font-size='40' text-anchor='middle'>🍽️</text>
    </svg>`
  );

// ============================================================
// HELPERS
// ============================================================

/** Route đến trang menu theo role. */
function getMenuPath(role) {
  if (role === "ADMIN") return "/owner/menu";
  if (role === "EMPLOYEE") return "/employee/menu";
  return "/customer/menu";
}

/**
 * Highlight keyword trong text.
 * Trả về React fragment với <mark> bao quanh phần khớp đầu tiên.
 */
function highlightText(text, query) {
  if (!text || !query) return text;
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx === -1) return text;

  return (
    <>
      {text.slice(0, idx)}
      <mark
        style={{
          background: "rgba(38, 52, 213, 0.2)",
          color: "inherit",
          padding: "0 2px",
          borderRadius: 3,
          fontWeight: 700,
        }}
      >
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function GlobalSearch({ role }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [menuResults, setMenuResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);

  const boxRef = useRef(null);
  const reqIdRef = useRef(0);
  const navigate = useNavigate();

  // ---------- Menu path theo role ----------

  const menuPath = useMemo(() => getMenuPath(role), [role]);

  // ---------- Click outside để đóng ----------

  useEffect(() => {
    const handler = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ---------- Search (debounced + race-safe) ----------

  useEffect(() => {
    const trimmed = q.trim();

    if (!trimmed) {
      setMenuResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const timer = setTimeout(async () => {
      const myReqId = ++reqIdRef.current;

      try {
        const menu = await api.menu.list(trimmed, "Tất cả", "popular");

        // Bỏ qua nếu có request mới hơn
        if (myReqId !== reqIdRef.current) return;

        const list = Array.isArray(menu) ? menu : [];
        setMenuResults(list.slice(0, MAX_RESULTS));
      } catch {
        if (myReqId === reqIdRef.current) setMenuResults([]);
      } finally {
        if (myReqId === reqIdRef.current) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [q]);

  // Reset active index khi results đổi
  useEffect(() => {
    setActiveIdx(-1);
  }, [menuResults]);

  // ---------- Handlers ----------

  const handleInput = (e) => {
    const val = e.target.value;
    setQ(val);
    setOpen(true);
  };

  const clearSearch = () => {
    setQ("");
    setMenuResults([]);
    setOpen(false);
    setActiveIdx(-1);
  };

  /**
   * Điều hướng đến trang Menu kèm query `?q=...` để Menu filter.
   * ✅ FIX: Dùng URL param thay vì location.state → CustomerMenu
   *         (đọc searchParams) sẽ nhận được giá trị.
   */
  const goToMenu = useCallback(
    (item = null) => {
      // Nếu click 1 món cụ thể → tìm theo tên món đó
      const searchVal = item ? item.name : q.trim();

      const params = new URLSearchParams();
      if (searchVal) params.set("q", searchVal);

      const qs = params.toString();
      navigate(qs ? `${menuPath}?${qs}` : menuPath);

      setQ("");
      setMenuResults([]);
      setOpen(false);
      setActiveIdx(-1);
    },
    [menuPath, navigate, q]
  );

  const handleKeyDown = (e) => {
    if (!open || menuResults.length === 0) {
      if (e.key === "Escape") setOpen(false);
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, menuResults.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (activeIdx >= 0 && menuResults[activeIdx]) {
          goToMenu(menuResults[activeIdx]);
        } else {
          goToMenu();
        }
        break;
      case "Escape":
        setOpen(false);
        setActiveIdx(-1);
        break;
      default:
        break;
    }
  };

  // ---------- Computed ----------

  const total = menuResults.length;
  const hasQuery = q.trim().length > 0;

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div ref={boxRef} className="global-search">
      {/* ============ INPUT ============ */}
      <div
        className="global-search-input"
        role="combobox"
        aria-expanded={open && hasQuery}
        aria-haspopup="listbox"
        aria-controls="global-search-listbox"
      >
        <Search size={16} />

        <input
          value={q}
          onChange={handleInput}
          onFocus={() => hasQuery && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Tìm món ăn..."
          aria-label="Tìm kiếm món ăn"
          aria-autocomplete="list"
          maxLength={100}
        />

        {loading && hasQuery && (
          <Loader2
            size={14}
            className="spin"
            style={{
              animation: "spin 1s linear infinite",
              color: "var(--text-light, #8993a3)",
              flexShrink: 0,
            }}
          />
        )}

        {q && !loading && (
          <button
            onClick={clearSearch}
            className="clear-btn"
            aria-label="Xoá tìm kiếm"
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            style={{
              background: "transparent",
              border: 0,
              cursor: "pointer",
              color: "var(--text-light, #8993a3)",
              padding: 4,
              display: "grid",
              placeItems: "center",
              borderRadius: 6,
              flexShrink: 0,
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* ============ DROPDOWN ============ */}
      {open && hasQuery && (
        <div
          className="global-search-dropdown"
          id="global-search-listbox"
          role="listbox"
        >
          {/* Loading state (lần đầu, chưa có kết quả) */}
          {loading && total === 0 && (
            <div
              style={{
                padding: 20,
                textAlign: "center",
                color: "var(--text-light, #8993a3)",
                fontSize: 13,
              }}
            >
              <Loader2
                size={18}
                style={{
                  animation: "spin 1s linear infinite",
                  marginBottom: 6,
                }}
              />
              <div>Đang tìm...</div>
            </div>
          )}

          {/* Empty state */}
          {!loading && total === 0 && (
            <div
              style={{
                padding: 20,
                textAlign: "center",
                color: "var(--text-light, #8993a3)",
                fontSize: 13,
              }}
            >
              Không tìm thấy "{q}"
            </div>
          )}

          {/* Results */}
          {total > 0 && (
            <div>
              <div className="dropdown-section-title">
                <Utensils size={12} /> Món ăn ({total})
              </div>

              {menuResults.map((m, idx) => {
                const id = m._id || m.id;
                const isActive = idx === activeIdx;

                return (
                  <button
                    key={id}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onClick={() => goToMenu(m)}
                    onMouseEnter={() => setActiveIdx(idx)}
                    className="dropdown-item"
                    style={{
                      background: isActive
                        ? "var(--bg-tertiary, #f5f7fb)"
                        : "transparent",
                    }}
                  >
                    <img
                      src={m.image || FALLBACK_IMG}
                      alt=""
                      loading="lazy"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = FALLBACK_IMG;
                      }}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        objectFit: "cover",
                        flexShrink: 0,
                      }}
                    />

                    <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "var(--text-primary, #172033)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {highlightText(m.name || "", q)}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--text-light, #8993a3)",
                        }}
                      >
                        {m.category || "—"}
                      </div>
                    </div>

                    <b
                      style={{
                        color: "#18a967",
                        fontSize: 12,
                        flexShrink: 0,
                      }}
                    >
                      {money(m.price || 0)}
                    </b>
                  </button>
                );
              })}
            </div>
          )}

          {/* Hint footer */}
          {total > 0 && (
            <div
              style={{
                padding: "8px 14px",
                borderTop: "1px solid var(--border-color, #eef2f7)",
                fontSize: 11,
                color: "var(--text-light, #8993a3)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
              }}
            >
              <span>
                <kbd>↑</kbd> <kbd>↓</kbd> chọn · <kbd>Enter</kbd> mở
              </span>
              <button
                type="button"
                onClick={() => goToMenu()}
                style={{
                  background: "transparent",
                  border: 0,
                  color: "#2634d5",
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                Xem tất cả →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Spinner animation fallback */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .global-search-dropdown kbd {
          display: inline-block;
          padding: 1px 5px;
          border: 1px solid var(--border-color, #e5e9ef);
          border-radius: 4px;
          background: var(--bg-tertiary, #f5f7fb);
          font-family: monospace;
          font-size: 10px;
          color: var(--text-muted, #64748b);
        }
      `}</style>
    </div>
  );
}