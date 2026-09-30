// ============================================================
// GLOBALSEARCH.JSX — Ô tìm kiếm toàn cục trên topbar
// ============================================================

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Search, Utensils, X, Loader2 } from "lucide-react";
import { api } from "../api";
import { money } from "./UI";
import { useTranslation } from "../i18n";

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

function getMenuPath(role) {
  if (role === "ADMIN") return "/owner/menu";
  if (role === "EMPLOYEE") return "/employee/menu";
  return "/customer/menu";
}

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

export default function GlobalSearch({ role }) {
  const { t } = useTranslation();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [menuResults, setMenuResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);

  const boxRef = useRef(null);
  const reqIdRef = useRef(0);
  const navigate = useNavigate();
  const location = useLocation();

  const menuPath = useMemo(() => getMenuPath(role), [role]);

  useEffect(() => {
    const handler = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const urlQ = new URLSearchParams(location.search).get("q") || "";
    setQ(urlQ);
  }, [location.pathname, location.search]);

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
        if (myReqId !== reqIdRef.current) return;

        let list = Array.isArray(menu) ? menu : [];

        if (role === "CUSTOMER") {
          list = list.filter((m) => m.active);
        }

        setMenuResults(list.slice(0, MAX_RESULTS));
      } catch {
        if (myReqId === reqIdRef.current) setMenuResults([]);
      } finally {
        if (myReqId === reqIdRef.current) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [q, role]);

  useEffect(() => {
    setActiveIdx(-1);
  }, [menuResults]);

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

    if (location.pathname.includes("/menu")) {
      const params = new URLSearchParams(location.search);
      params.delete("q");
      const qs = params.toString();
      navigate(qs ? `${menuPath}?${qs}` : menuPath);
    }
  };

  const goToMenu = useCallback(
    (item = null) => {
      const searchVal = item ? item.name : q.trim();

      const params = new URLSearchParams();
      if (searchVal) params.set("q", searchVal);

      if (item && item.category && item.category !== "Tất cả") {
        params.set("category", item.category);
      }

      const qs = params.toString();
      navigate(qs ? `${menuPath}?${qs}` : menuPath);

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

  const total = menuResults.length;
  const hasQuery = q.trim().length > 0;

  return (
    <div ref={boxRef} className="global-search">
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
          placeholder={t("search.placeholder")}
          aria-label={t("search.placeholder")}
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
            aria-label={t("search.clear")}
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

      {open && hasQuery && (
        <div
          className="global-search-dropdown"
          id="global-search-listbox"
          role="listbox"
        >
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
              <div>{t("search.searching")}</div>
            </div>
          )}

          {!loading && total === 0 && (
            <div
              style={{
                padding: 20,
                textAlign: "center",
                color: "var(--text-light, #8993a3)",
                fontSize: 13,
              }}
            >
              {t("search.noResults").replace("{q}", q)}
            </div>
          )}

          {total > 0 && (
            <div>
              <div className="dropdown-section-title">
                <Utensils size={12} /> {t("search.dishesLabel")} ({total})
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
                <kbd>↑</kbd> <kbd>↓</kbd> {t("search.navHintSelect")} ·{" "}
                <kbd>Enter</kbd> {t("search.navHintOpen")}
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
                {t("search.seeAll")} →
              </button>
            </div>
          )}
        </div>
      )}

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