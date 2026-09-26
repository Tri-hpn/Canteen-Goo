// ============================================================
// OWNERPRICEHISTORY.JSX — Lịch sử thay đổi giá (Admin)
// ============================================================
// Tính năng:
//   - Xem tất cả lần đổi giá (món nào, từ giá nào sang giá nào)
//   - Filter: theo tên món (client) + theo món cụ thể (server)
//   - Stats: tổng lần đổi, số lần tăng, số lần giảm
//
// Endpoints:
//   - api.priceHistory.list(menuItemId?)  → danh sách lịch sử
//   - api.menu.list(..., all=true)        → dropdown chọn món
//
// Lưu ý:
//   - Percent = |diff| / old_price * 100
//     Nếu old_price = 0 → hiện "—" thay vì chia cho 0
//   - Money diff: dùng trực tiếp number (không replace chuỗi)
//   - Race-safe: dùng reqIdRef để bỏ qua response cũ
// ============================================================

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import {
  TrendingUp, TrendingDown, Search, Calendar, X,
  Loader2, AlertCircle, History, Minus,
} from "lucide-react";
import { api } from "../../api";
import { money } from "../../components/UI";

// ============================================================
// CONSTANTS
// ============================================================

const thStyle = {
  padding: 11,
  textAlign: "left",
  fontSize: 12,
  color: "var(--text-muted, #64748b)",
  fontWeight: 600,
};

const tdStyle = {
  padding: 11,
  fontSize: 13,
  color: "var(--text-primary, #172033)",
};

const filterInputStyle = {
  padding: "8px 12px",
  border: "1px solid var(--border-color, #e5e9ef)",
  borderRadius: 8,
  outline: "none",
  fontSize: 13,
  background: "var(--bg-secondary, #fff)",
  color: "var(--text-primary, #172033)",
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function OwnerPriceHistory() {
  // ---------- Data ----------
  const [history, setHistory] = useState([]);
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ---------- Filters ----------
  const [q, setQ] = useState("");
  const [filterItem, setFilterItem] = useState("");

  // Race-safe
  const reqIdRef = useRef(0);

  // ---------- Load menu (1 lần) ----------
  useEffect(() => {
    let cancelled = false;
    api.menu
      .list("", "Tất cả", "popular", true)
      .then((d) => !cancelled && setMenu(Array.isArray(d) ? d : []))
      .catch(() => !cancelled && setMenu([]));
    return () => {
      cancelled = true;
    };
  }, []);

  // ---------- Load history (theo filterItem, race-safe) ----------
  const loadHistory = useCallback(async () => {
    const myReqId = ++reqIdRef.current;
    setLoading(true);
    setError("");

    try {
      const data = await api.priceHistory.list(filterItem);
      if (myReqId !== reqIdRef.current) return;
      setHistory(Array.isArray(data) ? data : []);
    } catch (e) {
      if (myReqId !== reqIdRef.current) return;
      setError(e.message || "Không tải được lịch sử giá");
      setHistory([]);
    } finally {
      if (myReqId === reqIdRef.current) setLoading(false);
    }
  }, [filterItem]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // ---------- Computed (memo) ----------

  const filtered = useMemo(() => {
    if (!q.trim()) return history;
    const s = q.toLowerCase().trim();
    return history.filter((h) =>
      h.menu_item_name?.toLowerCase().includes(s)
    );
  }, [history, q]);

  const stats = useMemo(() => {
    let up = 0;
    let down = 0;
    let unchanged = 0;
    for (const h of filtered) {
      const diff = (h.new_price || 0) - (h.old_price || 0);
      if (diff > 0) up++;
      else if (diff < 0) down++;
      else unchanged++;
    }
    return { total: filtered.length, up, down, unchanged };
  }, [filtered]);

  const hasFilter = filterItem || q.trim();

  const clearFilters = () => {
    setFilterItem("");
    setQ("");
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div>
      {/* ============================================================
          STATS
          ============================================================ */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
          marginBottom: 20,
        }}
      >
        <StatCard
          icon={<History size={20} />}
          label="Tổng lần đổi giá"
          value={stats.total}
          color="#2634d5"
        />
        <StatCard
          icon={<TrendingUp size={20} />}
          label="Tăng giá"
          value={stats.up}
          color="#ef4444"
        />
        <StatCard
          icon={<TrendingDown size={20} />}
          label="Giảm giá"
          value={stats.down}
          color="#18a967"
        />
      </div>

      {/* ============================================================
          FILTERS
          ============================================================ */}
      <div
        style={{
          background: "var(--card-bg, #fff)",
          border: "1px solid var(--border-color, #e7ebf0)",
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {/* Search box */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "var(--bg-tertiary, #f5f7fb)",
            border: "1px solid var(--border-color, #e5e9ef)",
            borderRadius: 8,
            padding: "8px 12px",
            flex: 1,
            minWidth: 200,
            maxWidth: 300,
          }}
        >
          <Search size={16} style={{ color: "var(--text-light, #8993a3)" }} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm theo tên món..."
            style={{
              border: 0,
              outline: "none",
              background: "transparent",
              color: "var(--text-primary, #172033)",
              fontSize: 13,
              flex: 1,
              minWidth: 0,
            }}
          />
          {q && (
            <button
              onClick={() => setQ("")}
              style={clearBtnStyle}
              aria-label="Xoá tìm kiếm"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Menu select */}
        <select
          value={filterItem}
          onChange={(e) => setFilterItem(e.target.value)}
          style={{ ...filterInputStyle, cursor: "pointer", minWidth: 200 }}
        >
          <option value="">Tất cả món</option>
          {menu.map((m) => (
            <option key={m.id || m._id} value={m.id || m._id}>
              {m.name}
            </option>
          ))}
        </select>

        {/* Clear filters */}
        {hasFilter && (
          <button
            onClick={clearFilters}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "8px 12px",
              background: "transparent",
              border: "1px solid #ef4444",
              color: "#ef4444",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#ef4444";
              e.currentTarget.style.color = "#fff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "#ef4444";
            }}
          >
            <X size={13} /> Xoá lọc
          </button>
        )}

        {/* Counter */}
        <div
          style={{
            fontSize: 12,
            color: "var(--text-light, #8993a3)",
            marginLeft: "auto",
          }}
        >
          <b style={{ color: "var(--text-primary, #172033)" }}>
            {filtered.length}
          </b>{" "}
          bản ghi
        </div>
      </div>

      {/* ============================================================
          HISTORY TABLE
          ============================================================ */}
      <div
        style={{
          background: "var(--card-bg, #fff)",
          border: "1px solid var(--border-color, #e7ebf0)",
          borderRadius: 12,
          padding: 20,
        }}
      >
        <h3
          style={{
            marginTop: 0,
            marginBottom: 16,
            color: "var(--text-primary, #172033)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 15,
          }}
        >
          <Calendar size={18} /> Lịch sử thay đổi giá ({filtered.length})
        </h3>

        {/* Loading */}
        {loading && (
          <div style={loadingBoxStyle}>
            <Loader2
              size={26}
              style={{ animation: "spin 1s linear infinite", marginBottom: 10 }}
            />
            <div>Đang tải lịch sử...</div>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <ErrorBox message={error} onRetry={loadHistory} />
        )}

        {/* Data */}
        {!loading && !error && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--bg-tertiary, #f5f7fb)" }}>
                  <th style={thStyle}>Thời gian</th>
                  <th style={thStyle}>Món ăn</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Giá cũ</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Giá mới</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Chênh lệch</th>
                  <th style={thStyle}>Người đổi</th>
                  <th style={thStyle}>Lý do</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((h) => {
                  const oldPrice = h.old_price || 0;
                  const newPrice = h.new_price || 0;
                  const diff = newPrice - oldPrice;

                  // Percent: chia cho 0 → hiện "—"
                  const percent =
                    oldPrice > 0
                      ? Math.abs((diff / oldPrice) * 100)
                      : null;

                  // Direction
                  const isUp = diff > 0;
                  const isDown = diff < 0;
                  const isFlat = diff === 0;

                  // Color
                  const color = isUp
                    ? "#ef4444"
                    : isDown
                    ? "#18a967"
                    : "var(--text-muted, #64748b)";

                  return (
                    <tr
                      key={h.id}
                      style={{
                        borderBottom: "1px solid var(--border-color, #eef2f7)",
                      }}
                    >
                      {/* Thời gian */}
                      <td
                        style={{
                          ...tdStyle,
                          fontSize: 12,
                          color: "var(--text-muted, #64748b)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h.created_at
                          ? new Date(h.created_at).toLocaleString("vi-VN")
                          : "—"}
                      </td>

                      {/* Món ăn */}
                      <td style={tdStyle}>
                        <b>{h.menu_item_name || "—"}</b>
                      </td>

                      {/* Giá cũ */}
                      <td
                        style={{
                          ...tdStyle,
                          textAlign: "right",
                          color: "var(--text-muted, #64748b)",
                        }}
                      >
                        {money(oldPrice)}
                      </td>

                      {/* Giá mới */}
                      <td
                        style={{
                          ...tdStyle,
                          textAlign: "right",
                          fontWeight: 700,
                        }}
                      >
                        {money(newPrice)}
                      </td>

                      {/* Chênh lệch */}
                      <td style={{ ...tdStyle, textAlign: "right" }}>
                        {isFlat ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              color: "var(--text-muted, #64748b)",
                              fontWeight: 600,
                            }}
                          >
                            <Minus size={14} /> Không đổi
                          </span>
                        ) : (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              color,
                              fontWeight: 700,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {isUp ? (
                              <TrendingUp size={14} />
                            ) : (
                              <TrendingDown size={14} />
                            )}
                            {isUp ? "+" : "−"}
                            {money(Math.abs(diff))}
                            {percent !== null && (
                              <span
                                style={{
                                  fontSize: 11,
                                  opacity: 0.85,
                                  marginLeft: 2,
                                }}
                              >
                                ({percent.toFixed(1)}%)
                              </span>
                            )}
                          </span>
                        )}
                      </td>

                      {/* Người đổi */}
                      <td style={tdStyle}>{h.changed_by || "—"}</td>

                      {/* Lý do */}
                      <td
                        style={{
                          ...tdStyle,
                          fontSize: 12,
                          color: "var(--text-muted, #64748b)",
                          maxWidth: 200,
                        }}
                      >
                        {h.reason || "—"}
                      </td>
                    </tr>
                  );
                })}

                {!filtered.length && (
                  <tr>
                    <td
                      colSpan="7"
                      style={{
                        textAlign: "center",
                        padding: 40,
                        color: "var(--text-light, #8993a3)",
                      }}
                    >
                      <History
                        size={36}
                        style={{ opacity: 0.35, marginBottom: 10 }}
                      />
                      <div>
                        {hasFilter
                          ? "Không có bản ghi nào khớp bộ lọc"
                          : "Chưa có lịch sử thay đổi giá"}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

function StatCard({ icon, label, value, color }) {
  return (
    <div
      style={{
        background: "var(--card-bg, #fff)",
        border: "1px solid var(--border-color, #e7ebf0)",
        borderRadius: 12,
        padding: 18,
        display: "flex",
        gap: 12,
        alignItems: "center",
      }}
    >
      <div
        style={{
          width: 46,
          height: 46,
          borderRadius: 12,
          background: color + "20",
          color,
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <span style={{ fontSize: 12, color: "var(--text-light, #8993a3)" }}>
          {label}
        </span>
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "var(--text-primary, #172033)",
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

function ErrorBox({ message, onRetry }) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: 30,
        background: "rgba(239, 68, 68, 0.08)",
        border: "1px solid rgba(239, 68, 68, 0.2)",
        borderRadius: 10,
        color: "#ef4444",
      }}
    >
      <AlertCircle size={26} style={{ marginBottom: 10 }} />
      <div style={{ fontWeight: 600, marginBottom: 4 }}>
        Không tải được dữ liệu
      </div>
      <div
        style={{ fontSize: 13, opacity: 0.85, marginBottom: onRetry ? 12 : 0 }}
      >
        {message}
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            padding: "8px 16px",
            background: "#ef4444",
            color: "#fff",
            border: 0,
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          Thử lại
        </button>
      )}
    </div>
  );
}

// ============================================================
// STYLE CONSTANTS
// ============================================================

const clearBtnStyle = {
  background: "transparent",
  border: 0,
  cursor: "pointer",
  color: "var(--text-light, #8993a3)",
  padding: 2,
  display: "grid",
  placeItems: "center",
};

const loadingBoxStyle = {
  textAlign: "center",
  padding: 40,
  color: "var(--text-light, #8993a3)",
};