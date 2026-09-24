// ============================================================
// OWNERDASHBOARD.JSX — Tổng quan hoạt động Canteen (Admin)
// ============================================================
// Hiển thị:
//   - 4 KPI cards: doanh thu, đơn, KH, sắp hết hàng
//   - Bar chart: doanh thu 7 ngày (lấy từ api.reports.revenue)
//   - Pie chart: trạng thái đơn (lấy từ api.stats.byStatus)
//   - Bảng 5 đơn hàng mới nhất (link sang trang orders)
//
// Auto-refresh mỗi 30s. Có loading + error state + nút refresh thủ công.
// ============================================================

import { useEffect, useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  DollarSign, ShoppingBag, Users, AlertTriangle,
  Loader2, AlertCircle, RefreshCw, TrendingUp, TrendingDown,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, CartesianGrid,
} from "recharts";
import { api } from "../../api";
import { money } from "../../components/UI";

// ============================================================
// CONSTANTS
// ============================================================

// Màu cho Pie chart theo từng status
const STATUS_COLORS = ["#18a967", "#f59e0b", "#2634d5", "#8b5cf6", "#ef4444"];

// Mapping trạng thái → key CSS (dùng cho badge)
const STATUS_KEY = {
  "Chờ xác nhận": "pending",
  "Đã xác nhận": "confirmed",
  "Đang chuẩn bị": "preparing",
  "Sẵn sàng nhận": "ready",
  "Hoàn thành": "done",
  "Đã hủy": "cancelled",
};

// Auto-refresh interval (ms) — 30 giây
const REFRESH_MS = 30000;

// Số đơn gần nhất hiển thị
const RECENT_ORDERS_LIMIT = 5;

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function OwnerDashboard() {
  // ---------- State ----------
  const [stats, setStats] = useState(null);
  const [reports, setReports] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  // ---------- Load data ----------

  const loadAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setRefreshing(true);
    setError("");

    try {
      const [statsRes, reportsRes, ordersRes] = await Promise.all([
        api.stats(),
        api.reports.revenue("day"),
        api.orders.all("Tất cả"),
      ]);

      setStats(statsRes);
      setReports(reportsRes);

      // Sắp xếp đơn mới nhất trước, lấy N đơn đầu
      const sortedOrders = [...(ordersRes || [])].sort(
        (a, b) =>
          new Date(b.created_at || 0) - new Date(a.created_at || 0)
      );
      setOrders(sortedOrders.slice(0, RECENT_ORDERS_LIMIT));
      setLastUpdated(new Date());
    } catch (e) {
      setError(e.message || "Không tải được dữ liệu dashboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Load lần đầu
  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Auto-refresh mỗi 30s
  useEffect(() => {
    const timer = setInterval(() => loadAll(true), REFRESH_MS);
    return () => clearInterval(timer);
  }, [loadAll]);

  // ---------- Computed (memo) ----------

  // Doanh thu 7 ngày từ reports API
  const revenueData = useMemo(() => {
    if (!reports?.data) return [];
    return reports.data.map((d) => ({
      day: d.label,
      value: d.revenue || 0,
      orders: d.orders || 0,
    }));
  }, [reports]);

  // Trend doanh thu: so sánh ngày cuối vs ngày kế cuối
  const revenueTrend = useMemo(() => {
    if (revenueData.length < 2) return null;
    const today = revenueData[revenueData.length - 1].value;
    const yesterday = revenueData[revenueData.length - 2].value;
    if (yesterday === 0) return null;
    const pct = ((today - yesterday) / yesterday) * 100;
    return {
      pct: Math.abs(pct).toFixed(1),
      isUp: pct >= 0,
      raw: pct,
    };
  }, [revenueData]);

  // Pie data từ stats.byStatus — không dùng fallback fake
  const statusData = useMemo(() => {
    if (!stats?.byStatus?.length) return [];
    return stats.byStatus.map((s) => ({
      name: s._id,
      value: s.count,
    }));
  }, [stats]);

  // ============================================================
  // RENDER
  // ============================================================

  // Loading lần đầu
  if (loading && !stats) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: 60,
          color: "var(--text-light, #8993a3)",
        }}
      >
        <Loader2
          size={32}
          style={{ animation: "spin 1s linear infinite", marginBottom: 14 }}
        />
        <div>Đang tải dashboard...</div>
      </div>
    );
  }

  // Error toàn trang
  if (error && !stats) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: 40,
          background: "rgba(239, 68, 68, 0.08)",
          border: "1px solid rgba(239, 68, 68, 0.2)",
          borderRadius: 12,
          color: "#ef4444",
        }}
      >
        <AlertCircle size={32} style={{ marginBottom: 12 }} />
        <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 15 }}>
          Không tải được dashboard
        </div>
        <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 16 }}>
          {error}
        </div>
        <button
          onClick={() => loadAll()}
          style={{
            padding: "10px 20px",
            background: "#ef4444",
            color: "#fff",
            border: 0,
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 13,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <RefreshCw size={14} /> Thử lại
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* ============================================================
          HEADER — Refresh indicator
          ============================================================ */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
            color: "var(--text-light, #8993a3)",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#18a967",
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          />
          <span>
            Realtime · Cập nhật mỗi {REFRESH_MS / 1000}s
            {lastUpdated && (
              <span style={{ marginLeft: 8, opacity: 0.7 }}>
                ({lastUpdated.toLocaleTimeString("vi-VN")})
              </span>
            )}
          </span>
        </div>

        <button
          onClick={() => loadAll()}
          disabled={refreshing}
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
          <RefreshCw
            size={13}
            style={{
              animation: refreshing ? "spin 1s linear infinite" : "none",
            }}
          />
          Làm mới
        </button>
      </div>

      {/* ============================================================
          KPI CARDS
          ============================================================ */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
          marginBottom: 20,
        }}
      >
        <KPI
          icon={<DollarSign />}
          label="Doanh thu hôm nay"
          value={money(stats?.revenue || 0)}
          trend={revenueTrend}
          color="#18a967"
        />
        <KPI
          icon={<ShoppingBag />}
          label="Đơn hàng hôm nay"
          value={(stats?.orderCount || 0) + " đơn"}
          color="#2634d5"
        />
        <KPI
          icon={<Users />}
          label="Tổng khách hàng"
          value={(stats?.customerCount || 0) + " người"}
          color="#f59e0b"
        />
        <KPI
          icon={<AlertTriangle />}
          label="Sắp hết hàng"
          value={(stats?.lowStock || 0) + " món"}
          color="#ef4444"
          badge={
            (stats?.lowStock || 0) > 0
              ? { text: "Cần nhập", color: "#ef4444" }
              : null
          }
        />
      </div>

      {/* ============================================================
          CHARTS ROW
          ============================================================ */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)",
          gap: 18,
          marginBottom: 18,
        }}
        className="dashboard-2col"
      >
        {/* ---------- Bar chart: Doanh thu 7 ngày ---------- */}
        <div style={cardStyle}>
          <div style={{ marginBottom: 16 }}>
            <h3 style={cardTitleStyle}>Doanh thu 7 ngày</h3>
            <span style={cardSubtitleStyle}>Đơn vị: triệu đồng</span>
          </div>

          {revenueData.length === 0 ? (
            <EmptyChart message="Chưa có dữ liệu doanh thu" />
          ) : (
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border-color, #eef2f7)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fontSize: 12,
                      fill: "var(--text-muted, #64748b)",
                    }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fontSize: 12,
                      fill: "var(--text-muted, #64748b)",
                    }}
                    tickFormatter={(v) =>
                      v >= 1000000
                        ? (v / 1000000).toFixed(1) + "M"
                        : (v / 1000).toFixed(0) + "k"
                    }
                  />
                  <Tooltip
                    formatter={(v) => [money(v), "Doanh thu"]}
                    contentStyle={{
                      background: "var(--card-bg, #fff)",
                      border: "1px solid var(--border-color, #e5e9ef)",
                      borderRadius: 8,
                      fontSize: 13,
                    }}
                  />
                  <Bar
                    dataKey="value"
                    fill="#2634d5"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* ---------- Pie chart: Trạng thái đơn ---------- */}
        <div style={cardStyle}>
          <h3 style={{ ...cardTitleStyle, marginBottom: 16 }}>
            Trạng thái đơn
          </h3>

          {statusData.length === 0 ? (
            <EmptyChart message="Chưa có đơn hàng" />
          ) : (
            <>
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      dataKey="value"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                    >
                      {statusData.map((_, i) => (
                        <Cell
                          key={i}
                          fill={STATUS_COLORS[i % STATUS_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "var(--card-bg, #fff)",
                        border: "1px solid var(--border-color, #e5e9ef)",
                        borderRadius: 8,
                        fontSize: 13,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div style={{ marginTop: 10 }}>
                {statusData.map((s, i) => (
                  <div
                    key={s.name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "3px 0",
                      fontSize: 12,
                    }}
                  >
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: STATUS_COLORS[i % STATUS_COLORS.length],
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        flex: 1,
                        color: "var(--text-muted, #64748b)",
                      }}
                    >
                      {s.name}
                    </span>
                    <b style={{ color: "var(--text-primary, #172033)" }}>
                      {s.value}
                    </b>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ============================================================
          RECENT ORDERS TABLE
          ============================================================ */}
      <div style={cardStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <h3 style={{ ...cardTitleStyle, margin: 0 }}>Đơn hàng mới nhất</h3>
          <Link
            to="/owner/orders"
            style={{
              color: "#2634d5",
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Xem tất cả →
          </Link>
        </div>

        {orders.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: 40,
              color: "var(--text-light, #8993a3)",
              fontSize: 13,
            }}
          >
            <ShoppingBag
              size={36}
              style={{ opacity: 0.35, marginBottom: 10 }}
            />
            <div>Chưa có đơn hàng nào</div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--bg-tertiary, #f5f7fb)" }}>
                  <th style={thStyle}>Mã đơn</th>
                  <th style={thStyle}>Khách</th>
                  <th style={thStyle}>Tổng tiền</th>
                  <th style={thStyle}>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr
                    key={o._id || o.id}
                    style={{
                      borderBottom:
                        "1px solid var(--border-color, #eef2f7)",
                    }}
                  >
                    <td style={tdStyle}>
                      <Link
                        to="/owner/orders"
                        style={{
                          color: "#2634d5",
                          textDecoration: "none",
                          fontWeight: 700,
                          fontFamily: "monospace",
                          fontSize: 12,
                        }}
                      >
                        {o.code}
                      </Link>
                    </td>
                    <td style={tdStyle}>{o.customer_name}</td>
                    <td style={tdStyle}>
                      <b>{money(o.total)}</b>
                    </td>
                    <td style={tdStyle}>
                      <OrderStatusBadge status={o.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inline animations */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.5; transform: scale(0.85); }
        }
      `}</style>
    </div>
  );
}

// ============================================================
// SUB-COMPONENT: KPI Card
// ============================================================

function KPI({ icon, label, value, trend, color, badge }) {
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
        transition: "box-shadow 0.2s ease",
      }}
    >
      <div
        style={{
          width: 46,
          height: 46,
          borderRadius: 12,
          background: color + "18",
          color,
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            fontSize: 12,
            color: "var(--text-light, #8993a3)",
            display: "block",
          }}
        >
          {label}
        </span>
        <h2
          style={{
            margin: "4px 0",
            fontSize: 18,
            color: "var(--text-primary, #172033)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {value}
        </h2>

        {/* Trend (chỉ khi có data) */}
        {trend && (
          <small
            style={{
              color: trend.isUp ? "#18a967" : "#ef4444",
              fontSize: 11,
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
            }}
          >
            {trend.isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {trend.isUp ? "+" : "-"}
            {trend.pct}% so với hôm qua
          </small>
        )}

        {/* Badge (chỉ khi có) */}
        {!trend && badge && (
          <small
            style={{
              color: badge.color,
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {badge.text}
          </small>
        )}
      </div>
    </div>
  );
}

// ============================================================
// SUB-COMPONENT: Order Status Badge
// ============================================================

function OrderStatusBadge({ status }) {
  const colorMap = {
    "Chờ xác nhận": { bg: "#fef3c7", fg: "#92400e" },
    "Đã xác nhận": { bg: "#dbeafe", fg: "#1e40af" },
    "Đang chuẩn bị": { bg: "#ede9fe", fg: "#6d28d9" },
    "Sẵn sàng nhận": { bg: "#d1fae5", fg: "#065f46" },
    "Hoàn thành": { bg: "#e8f9f1", fg: "#18a967" },
    "Đã hủy": { bg: "#fee2e2", fg: "#991b1b" },
  };
  const c = colorMap[status] || { bg: "#e2e8f0", fg: "#475569" };

  return (
    <span
      style={{
        display: "inline-flex",
        padding: "4px 10px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 600,
        background: c.bg,
        color: c.fg,
        whiteSpace: "nowrap",
      }}
    >
      {status}
    </span>
  );
}

// ============================================================
// SUB-COMPONENT: Empty Chart placeholder
// ============================================================

function EmptyChart({ message }) {
  return (
    <div
      style={{
        height: 240,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--text-light, #8993a3)",
        fontSize: 13,
        background: "var(--bg-tertiary, #f8fafc)",
        borderRadius: 10,
      }}
    >
      <div style={{ fontSize: 36, opacity: 0.35, marginBottom: 8 }}>📊</div>
      <div>{message}</div>
    </div>
  );
}

// ============================================================
// STYLE CONSTANTS
// ============================================================

const cardStyle = {
  background: "var(--card-bg, #fff)",
  border: "1px solid var(--border-color, #e7ebf0)",
  borderRadius: 12,
  padding: 20,
};

const cardTitleStyle = {
  margin: 0,
  fontSize: 15,
  color: "var(--text-primary, #172033)",
};

const cardSubtitleStyle = {
  fontSize: 12,
  color: "var(--text-light, #8993a3)",
};

const thStyle = {
  padding: 11,
  textAlign: "left",
  fontSize: 12,
  color: "var(--text-muted, #64748b)",
  fontWeight: 600,
};

const tdStyle = {
  padding: 11,
  color: "var(--text-primary, #172033)",
  fontSize: 13,
};