// ============================================================
// EMPLOYEEMENU.JSX — Xem thực đơn (Nhân viên)
// ============================================================
// Nhân viên XEM thực đơn + có thể bật/tắt món (ẩn khi hết hàng).
//
// Fixes (so với bản gốc):
//   - Render nút toggle active (function toggleActive trước đó bị dead-code)
//   - Thêm cột "Đang bán" với badge trạng thái
//   - Error state + retry, loading state
//   - Clear search button
//   - Overflow-x cho bảng (mobile)
//   - Image fallback (SVG placeholder khi lỗi)
//   - Memo filtered
//   - Auto-refresh 30s (silent)
//   - Bỏ unused imports (Eye, EyeOff)
// ============================================================

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Search, X, Loader2, AlertCircle, RefreshCw,
  ToggleLeft, ToggleRight,
} from "lucide-react";
import { api } from "../../api";
import { money, StatusBadge } from "../../components/UI";
import { toast } from "../../components/Effects";

// ============================================================
// CONSTANTS
// ============================================================

const REFRESH_MS = 30000;
const LOW_STOCK_THRESHOLD = 10;

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

export default function EmployeeMenu() {
  // ---------- Data ----------
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // ---------- Filters ----------
  const [q, setQ] = useState("");

  // Toggle active per-item (loading map)
  const [togglingId, setTogglingId] = useState(null);

  // ---------- Load ----------

  const load = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    setError("");

    try {
      const data = await api.menu.list("", "Tất cả", "popular", true);
      setItems(Array.isArray(data) ? data : []);
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

  // Auto-refresh 30s
  useEffect(() => {
    const timer = setInterval(() => load(true), REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  // ---------- Toggle active ----------

  const toggleActive = async (item) => {
    const id = item._id || item.id;
    if (togglingId !== null) return; // Chỉ cho 1 request tại 1 thời điểm
    setTogglingId(id);

    const newActive = item.active ? 0 : 1;
    try {
      await api.menu.update(id, { active: newActive });
      // Update local state (không cần reload toàn bộ)
      setItems((list) =>
        list.map((m) =>
          (m._id || m.id) === id ? { ...m, active: newActive } : m
        )
      );
      toast(newActive ? "Đã bật món" : "Đã tắt món", "success");
    } catch (e) {
      toast(e.message || "Không đổi được trạng thái", "error");
    } finally {
      setTogglingId(null);
    }
  };

  // ---------- Computed ----------

  const filtered = useMemo(() => {
    if (!q.trim()) return items;
    const s = q.toLowerCase().trim();
    return items.filter(
      (m) =>
        m.name?.toLowerCase().includes(s) ||
        m.category?.toLowerCase().includes(s)
    );
  }, [items, q]);

  // Đếm nhanh
  const summary = useMemo(() => {
    const inactive = items.filter((m) => !m.active).length;
    const outOfStock = items.filter((m) => m.stock === 0).length;
    return { total: items.length, inactive, outOfStock };
  }, [items]);

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
            }}
          >
            Thử lại
          </button>
        </div>
      )}

      {/* ============ TOOLBAR ============ */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 20,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {/* Search */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "var(--card-bg, #fff)",
            border: "1px solid var(--border-color, #e5e9ef)",
            borderRadius: 10,
            padding: "10px 14px",
            flex: 1,
            minWidth: 220,
            maxWidth: 400,
          }}
        >
          <Search size={18} style={{ color: "var(--text-light, #8993a3)" }} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setQ("")}
            placeholder="Tìm món ăn..."
            style={{
              flex: 1,
              border: 0,
              outline: "none",
              fontSize: 13,
              background: "transparent",
              color: "var(--text-primary, #172033)",
              minWidth: 0,
            }}
          />
          {q && (
            <button
              onClick={() => setQ("")}
              aria-label="Xoá tìm kiếm"
              style={{
                background: "transparent",
                border: 0,
                cursor: "pointer",
                color: "var(--text-light, #8993a3)",
                padding: 2,
                display: "grid",
                placeItems: "center",
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Refresh */}
        <button
          onClick={() => load(false)}
          disabled={refreshing}
          title="Làm mới"
          aria-label="Làm mới"
          style={{
            padding: "10px 14px",
            background: "var(--card-bg, #fff)",
            border: "1px solid var(--border-color, #e5e9ef)",
            borderRadius: 10,
            cursor: refreshing ? "not-allowed" : "pointer",
            fontSize: 13,
            color: "var(--text-primary, #172033)",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            opacity: refreshing ? 0.6 : 1,
          }}
        >
          {refreshing ? (
            <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
          ) : (
            <RefreshCw size={14} />
          )}
          Làm mới
        </button>

        {/* Summary badges */}
        {summary.inactive > 0 && (
          <span
            style={{
              padding: "6px 12px",
              borderRadius: 20,
              background: "#fef3c7",
              color: "#92400e",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {summary.inactive} món đã ẩn
          </span>
        )}
        {summary.outOfStock > 0 && (
          <span
            style={{
              padding: "6px 12px",
              borderRadius: 20,
              background: "#fee2e2",
              color: "#991b1b",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {summary.outOfStock} món hết hàng
          </span>
        )}
      </div>

      {/* ============ BẢNG ============ */}
      <div
        style={{
          background: "var(--card-bg, #fff)",
          border: "1px solid var(--border-color, #e7ebf0)",
          borderRadius: 12,
          padding: 20,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <h3 style={{ margin: 0, color: "var(--text-primary, #172033)" }}>
            Thực đơn Canteen
          </h3>
          <span style={{ color: "var(--text-light, #8993a3)", fontSize: 12 }}>
            {filtered.length} món
          </span>
        </div>

        {/* Loading lần đầu */}
        {loading && !items.length && (
          <div
            style={{
              textAlign: "center",
              padding: 40,
              color: "var(--text-light, #8993a3)",
            }}
          >
            <Loader2
              size={26}
              style={{ animation: "spin 1s linear infinite", marginBottom: 8 }}
            />
            <div style={{ fontSize: 13 }}>Đang tải thực đơn...</div>
          </div>
        )}

        {/* Bảng dữ liệu */}
        {!loading && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--bg-tertiary, #f5f7fb)" }}>
                  <th style={thLeft}>Ảnh</th>
                  <th style={thLeft}>Món ăn</th>
                  <th style={thLeft}>Danh mục</th>
                  <th style={thRight}>Giá</th>
                  <th style={thCenter}>Tồn</th>
                  <th style={thCenter}>Đã bán</th>
                  <th style={thLeft}>Trạng thái</th>
                  <th style={thCenter}>Đang bán</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => {
                  const id = m._id || m.id;
                  const isToggling = togglingId === id;
                  const isActive = !!m.active;

                  const statusLabel =
                    m.stock === 0
                      ? "Hết hàng"
                      : m.stock < LOW_STOCK_THRESHOLD
                      ? "Sắp hết"
                      : "Còn hàng";

                  return (
                    <tr
                      key={id}
                      style={{
                        borderBottom: "1px solid var(--border-color, #eef2f7)",
                        opacity: isActive ? 1 : 0.55,
                      }}
                    >
                      {/* Ảnh */}
                      <td style={tdBase}>
                        <img
                          src={m.image || FALLBACK_IMG}
                          alt={m.name}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = FALLBACK_IMG;
                          }}
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 8,
                            objectFit: "cover",
                            border: "1px solid var(--border-color, #e5e9ef)",
                          }}
                        />
                      </td>

                      {/* Tên + ID */}
                      <td style={tdBase}>
                        <b
                          style={{
                            color: "var(--text-primary, #172033)",
                            fontSize: 13,
                          }}
                        >
                          {m.name}
                        </b>
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--text-light, #8993a3)",
                            marginTop: 2,
                            fontFamily: "monospace",
                          }}
                        >
                          #{String(id).slice(-4)}
                        </div>
                      </td>

                      {/* Danh mục */}
                      <td
                        style={{
                          ...tdBase,
                          color: "var(--text-muted, #64748b)",
                        }}
                      >
                        {m.category || "—"}
                      </td>

                      {/* Giá */}
                      <td style={{ ...tdBase, textAlign: "right" }}>
                        <b style={{ color: "#18a967", fontSize: 13 }}>
                          {money(m.price)}
                        </b>
                      </td>

                      {/* Tồn */}
                      <td
                        style={{
                          ...tdBase,
                          textAlign: "center",
                          color:
                            m.stock === 0
                              ? "#ef4444"
                              : m.stock < LOW_STOCK_THRESHOLD
                              ? "#f59e0b"
                              : "var(--text-primary, #172033)",
                          fontWeight:
                            m.stock < LOW_STOCK_THRESHOLD ? 700 : 400,
                        }}
                      >
                        {m.stock}
                      </td>

                      {/* Đã bán */}
                      <td
                        style={{
                          ...tdBase,
                          textAlign: "center",
                          color: "var(--text-muted, #64748b)",
                        }}
                      >
                        {m.sold || 0}
                      </td>

                      {/* Trạng thái kho */}
                      <td style={tdBase}>
                        <StatusBadge status={statusLabel} />
                      </td>

                      {/* Nút toggle */}
                      <td style={{ ...tdBase, textAlign: "center" }}>
                        <button
                          onClick={() => toggleActive(m)}
                          disabled={isToggling}
                          title={isActive ? "Tắt món" : "Bật món"}
                          aria-label={isActive ? "Tắt món" : "Bật món"}
                          style={{
                            background: "transparent",
                            border: 0,
                            cursor: isToggling ? "not-allowed" : "pointer",
                            color: isActive ? "#18a967" : "#94a3b8",
                            padding: 4,
                            display: "grid",
                            placeItems: "center",
                            opacity: isToggling ? 0.5 : 1,
                          }}
                        >
                          {isToggling ? (
                            <Loader2
                              size={20}
                              style={{ animation: "spin 1s linear infinite" }}
                            />
                          ) : isActive ? (
                            <ToggleRight size={24} />
                          ) : (
                            <ToggleLeft size={24} />
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {!filtered.length && (
                  <tr>
                    <td
                      colSpan="8"
                      style={{
                        textAlign: "center",
                        padding: 30,
                        color: "var(--text-light, #8993a3)",
                      }}
                    >
                      {q
                        ? `Không có món nào khớp "${q}"`
                        : "Không có món nào"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// ============================================================
// STYLE CONSTANTS
// ============================================================

const thBase = {
  padding: 11,
  fontSize: 12,
  color: "var(--text-muted, #64748b)",
  fontWeight: 600,
  whiteSpace: "nowrap",
};
const thLeft   = { ...thBase, textAlign: "left" };
const thRight  = { ...thBase, textAlign: "right" };
const thCenter = { ...thBase, textAlign: "center" };

const tdBase = {
  padding: 11,
  fontSize: 13,
  color: "var(--text-primary, #172033)",
};