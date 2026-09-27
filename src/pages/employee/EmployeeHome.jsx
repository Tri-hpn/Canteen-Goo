// ============================================================
// EMPLOYEEHOME.JSX — Trang chủ nhân viên
// ============================================================
// - 4 KPI: đơn hôm nay, chờ xác nhận, đang chuẩn bị, sắp hết hàng
// - Bảng đơn cần xử lý (sort theo thời gian đặt, limit 10)
// - CheckInOutCard ở cột trái
//
// Fixes (so với bản gốc):
//   - getLocalDateStr() — timezone-safe, dùng local date
//   - todayCount so sánh theo local date của created_at
//   - Error state + retry (không silent fail)
//   - Loading state cho lần đầu
//   - Auto-refresh mỗi 20s (silent)
//   - needAction: sort cũ → mới, limit 10, memo
//   - stats memo (không tính lại mỗi render)
//   - Bảng có overflow-x cho mobile
//   - Bỏ dấu "" thừa trong empty state
// ============================================================

import { useEffect, useState, useMemo, useCallback } from "react";
import { ShoppingBag, Clock, AlertTriangle, Utensils, RefreshCw, Loader2, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../../api";
import { money, StatusBadge } from "../../components/UI";
import CheckInOutCard from "../../components/CheckInOutCard";
import { useTranslation } from "../../i18n";

// ============================================================
// CONSTANTS
// ============================================================

const REFRESH_MS = 20000;
const NEED_ACTION_LIMIT = 10;

// Trạng thái cần nhân viên xử lý (theo thứ tự ưu tiên)
const ACTION_STATUSES = ["Chờ xác nhận", "Đã xác nhận", "Đang chuẩn bị"];

// ============================================================
// HELPERS (timezone-safe)
// ============================================================

/**
 * Lấy "YYYY-MM-DD" theo LOCAL time từ một Date (hoặc ISO string).
 * KHÔNG dùng toISOString() vì lệch ngày sau 17h VN (UTC+7).
 */
function getLocalDateStr(input) {
  if (!input) return "";
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dt = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dt}`;
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function EmployeeHome() {
  const { t } = useTranslation();

  // ---------- State ----------
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // ---------- Load ----------

  const load = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    setError("");

    try {
      const [ordersRes, statsRes] = await Promise.all([
        api.orders.all("Tất cả"),
        api.stats(),
      ]);
      setOrders(Array.isArray(ordersRes) ? ordersRes : []);
      setStats(statsRes || null);
    } catch (e) {
      if (!silent) setError(e.message || "Không tải được dữ liệu");
      // Giữ data cũ nếu silent refresh fail
    } finally {
      setLoading(false);
      if (!silent) setRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    load(false);
  }, [load]);

  // Auto-refresh 20s
  useEffect(() => {
    const timer = setInterval(() => load(true), REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  // ---------- Computed (memo) ----------

  const stats2 = useMemo(() => {
    const todayStr = getLocalDateStr(new Date());

    let todayCount = 0;
    let pending = 0;
    let processing = 0;

    for (const o of orders) {
      // Đếm đơn hôm nay theo LOCAL date của created_at
      if (getLocalDateStr(o.created_at) === todayStr) todayCount++;

      if (o.status === "Chờ xác nhận") pending++;
      if (o.status === "Đang chuẩn bị" || o.status === "Đã xác nhận") processing++;
    }

    return { todayCount, pending, processing };
  }, [orders]);

  // Đơn cần xử lý: sort cũ → mới (ưu tiên đơn đặt lâu), limit 10
  const needAction = useMemo(() => {
    return [...orders]
      .filter((o) => ACTION_STATUSES.includes(o.status))
      .sort(
        (a, b) =>
          new Date(a.created_at || 0).getTime() -
          new Date(b.created_at || 0).getTime()
      )
      .slice(0, NEED_ACTION_LIMIT);
  }, [orders]);

  const lowStockCount = stats?.lowStock ?? 0;

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

      {/* ============ KHU VỰC CHÍNH: CHECK-IN + KPI ============ */}
      <div className="emp-home-layout">
  <CheckInOutCard />

  <div className="emp-home-kpi-grid">
    <KpiCard
      icon={<ShoppingBag size={22} />}
      color="#2634d5"
      value={loading ? "..." : stats2.todayCount}
      label={t("employee.ordersToday")}
    />
    <KpiCard
      icon={<Clock size={22} />}
      color="#f59e0b"
      value={loading ? "..." : stats2.pending}
      label={t("employee.pendingOrders")}
    />
    <KpiCard
      icon={<Utensils size={22} />}
      color="#8b5cf6"
      value={loading ? "..." : stats2.processing}
      label="Đang chuẩn bị"
    />
    <KpiCard
      icon={<AlertTriangle size={22} />}
      color="#f59e0b"
      value={loading ? "..." : lowStockCount}
      label={t("employee.lowStock")}
    />
  </div>
</div>

      {/* ============ BẢNG ĐƠN CẦN XỬ LÝ ============ */}
     <div className="emp-need-action-card">
  <div className="emp-need-action-head">
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: 15,
                color: "var(--text-primary, #172033)",
              }}
            >
              {t("employee.processOrder")}
            </h3>
            <span
              style={{
                color: "var(--text-light, #8993a3)",
                fontSize: 12,
              }}
            >
              {t("employee.priority")}
            </span>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              onClick={() => load(false)}
              disabled={refreshing}
              title="Làm mới"
              aria-label="Làm mới"
              style={{
                padding: "6px 12px",
                background: "var(--bg-tertiary, #f5f7fb)",
                border: "1px solid var(--border-color, #e5e9ef)",
                borderRadius: 6,
                cursor: refreshing ? "not-allowed" : "pointer",
                fontSize: 12,
                color: "var(--text-primary, #172033)",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                opacity: refreshing ? 0.6 : 1,
              }}
            >
              {refreshing ? (
                <Loader2
                  size={13}
                  style={{ animation: "spin 1s linear infinite" }}
                />
              ) : (
                <RefreshCw size={13} />
              )}
              Làm mới
            </button>
            <Link
              to="/employee/orders"
              style={{
                color: "#2634d5",
                fontSize: 13,
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              {t("employee.viewAll")} →
            </Link>
          </div>
        </div>

        {/* Loading lần đầu */}
        {loading && !orders.length && (
          <div
            style={{
              textAlign: "center",
              padding: 40,
              color: "var(--text-light, #8993a3)",
            }}
          >
            <Loader2
              size={24}
              style={{ animation: "spin 1s linear infinite", marginBottom: 8 }}
            />
            <div style={{ fontSize: 13 }}>Đang tải đơn hàng...</div>
          </div>
        )}

        {/* Bảng */}
        {!loading && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--bg-tertiary, #f5f7fb)" }}>
                  <th style={thStyle}>{t("orders.code")}</th>
                  <th style={thStyle}>Customer</th>
                  <th style={thStyle}>{t("cart.total")}</th>
                  <th style={thStyle}>{t("common.status")}</th>
                  <th style={thStyle}></th>
                </tr>
              </thead>
              <tbody>
                {needAction.map((o) => (
                  <tr
                    key={o._id || o.id}
                    style={{
                      borderBottom: "1px solid var(--border-color, #eef2f7)",
                    }}
                  >
                    <td style={tdStyle}>
                      <b>{o.code}</b>
                    </td>
                    <td style={tdStyle}>{o.customer_name}</td>
                    <td style={tdStyle}>
                      <b>{money(o.total)}</b>
                    </td>
                    <td style={tdStyle}>
                      <StatusBadge status={o.status} />
                    </td>
                    <td style={tdStyle}>
                      <Link
                        to="/employee/orders"
                        style={{
                          padding: "6px 12px",
                          background: "var(--bg-tertiary, #f5f7fb)",
                          border: "1px solid var(--border-color, #e5e9ef)",
                          borderRadius: 6,
                          fontSize: 12,
                          textDecoration: "none",
                          color: "var(--text-primary, #172033)",
                          display: "inline-block",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {t("employee.process")}
                      </Link>
                    </td>
                  </tr>
                ))}

                {!needAction.length && (
                  <tr>
                    <td
                      colSpan="5"
                      style={{
                        textAlign: "center",
                        padding: 30,
                        color: "var(--text-light, #8993a3)",
                      }}
                    >
                      Không có đơn cần xử lý
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Nếu còn nhiều hơn limit */}
            {needAction.length === NEED_ACTION_LIMIT && (
              <div
                style={{
                  textAlign: "center",
                  padding: "12px 0 0",
                  fontSize: 12,
                  color: "var(--text-light, #8993a3)",
                }}
              >
                Hiển thị {NEED_ACTION_LIMIT} đơn đầu —{" "}
                <Link
                  to="/employee/orders"
                  style={{ color: "#2634d5", fontWeight: 600 }}
                >
                  xem tất cả
                </Link>
              </div>
            )}
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
// SUB-COMPONENT: KpiCard
// ============================================================

function KpiCard({ icon, color, value, label }) {
  return (
    <div className="emp-home-kpi-card">
      <div
        className="kpi-icon"
        style={{
          background: color + "18",
          color,
        }}
      >
        {icon}
      </div>
      <div className="kpi-body">
        <b className="kpi-value">{value}</b>
        <div className="kpi-label">{label}</div>
      </div>
    </div>
  );
}

// ============================================================
// STYLE CONSTANTS
// ============================================================

const thStyle = {
  padding: 11,
  textAlign: "left",
  fontSize: 12,
  color: "var(--text-muted, #64748b)",
  fontWeight: 600,
  whiteSpace: "nowrap",
};

const tdStyle = {
  padding: 11,
  fontSize: 13,
  color: "var(--text-primary, #172033)",
};