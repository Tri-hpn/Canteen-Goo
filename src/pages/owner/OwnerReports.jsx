// ============================================================
// OWNERREPORTS.JSX — Báo cáo doanh thu (Admin)
// ============================================================
// Tính năng:
//   - 4 KPI: doanh thu hôm nay, tổng đơn, TB/đơn, tổng DT kỳ
//   - Bar chart: doanh thu theo kỳ (ngày/tuần/tháng/năm)
//   - Pie chart: trạng thái đơn hàng
//   - Bảng top 5 món bán chạy (realtime)
//
// Auto-refresh mỗi 15s (silent, không nhấp nháy nút).
// Có nút "Làm mới" thủ công.
//
// Endpoints:
//   - api.reports.revenue(period)  → data + totalRevenue + topItems
//   - api.stats()                  → revenue hôm nay + byStatus
//
// Lưu ý:
//   - Race-safe: dùng reqId ref để bỏ qua response cũ
//   - Silent refresh: KHÔNG setLoading → không nhấp nháy
//   - Nếu fetch lỗi: giữ data cũ + hiện error box
// ============================================================

import {
  useEffect, useState, useMemo, useCallback, useRef,
} from "react";
import {
  DollarSign, ShoppingBag, TrendingUp, RefreshCw,
  Loader2, AlertCircle, Inbox,
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

const COLORS = ["#18a967", "#f59e0b", "#2634d5", "#ef4444", "#8b5cf6"];
const REFRESH_MS = 15000;

const PERIODS = [
  { id: "day",   label: "Theo ngày" },
  { id: "week",  label: "Theo tuần" },
  { id: "month", label: "Theo tháng" },
  { id: "year",  label: "Theo năm" },
];

const EMPTY_DATA = {
  data: [],
  totalRevenue: 0,
  totalOrders: 0,
  avgOrder: 0,
  topItems: [],
};

const EMPTY_STATS = {
  revenue: 0,
  orderCount: 0,
  customerCount: 0,
  byStatus: [],
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function OwnerReports() {
  // ---------- State ----------
  const [period, setPeriod] = useState("day");
  const [data, setData] = useState(EMPTY_DATA);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [refreshing, setRefreshing] = useState(false); // manual refresh
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  // Req ID để chống race condition
  const reqIdRef = useRef(0);

  // ---------- Load data ----------

  /**
   * @param {boolean} silent - Nếu true, không set loading (dùng cho interval)
   */
  const load = useCallback(async (silent = false) => {
    const myReqId = ++reqIdRef.current;

    if (!silent) setRefreshing(true);
    setError("");

    try {
      const [statsRes, reportsRes] = await Promise.all([
        api.stats(),
        api.reports.revenue(period),
      ]);

      // Nếu có request mới hơn → bỏ qua response cũ
      if (myReqId !== reqIdRef.current) return;

      setStats(statsRes || EMPTY_STATS);
      setData(reportsRes || EMPTY_DATA);
      setLastUpdated(new Date());
    } catch (e) {
      if (myReqId !== reqIdRef.current) return;
      setError(e.message || "Không tải được báo cáo");
      // KHÔNG reset data — giữ data cũ để user không bị mất context
    } finally {
      if (myReqId === reqIdRef.current && !silent) {
        setRefreshing(false);
      }
    }
  }, [period]);

  // Load khi đổi period
  useEffect(() => {
    load(false);
  }, [load]);

  // Auto-refresh mỗi 15s (silent)
  useEffect(() => {
    const timer = setInterval(() => load(true), REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  // ---------- Computed ----------

  const periodLabel = useMemo(
    () => PERIODS.find((p) => p.id === period)?.label || "",
    [period]
  );

  // Bar chart data
  const chartData = useMemo(() => {
    return (data.data || []).map((d) => ({
      day: d.label,
      value: d.revenue || 0,
    }));
  }, [data.data]);

  // Pie data — empty array nếu chưa có stats
  const statusData = useMemo(() => {
    if (!stats.byStatus?.length) return [];
    return stats.byStatus.map((s) => ({
      name: s._id,
      value: s.count,
    }));
  }, [stats.byStatus]);

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div>
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
          icon={<DollarSign size={22} />}
          label="Doanh thu hôm nay"
          value={money(stats.revenue || 0)}
          color="#18a967"
        />
        <KPI
          icon={<ShoppingBag size={22} />}
          label={`Tổng đơn (${periodLabel.toLowerCase()})`}
          value={data.totalOrders || 0}
          color="#2634d5"
        />
        <KPI
          icon={<TrendingUp size={22} />}
          label="Giá trị TB / đơn"
          value={money(data.avgOrder || 0)}
          color="#f59e0b"
        />
        <KPI
          icon={<DollarSign size={22} />}
          label={`Tổng DT (${periodLabel.toLowerCase()})`}
          value={money(data.totalRevenue || 0)}
          color="#8b5cf6"
        />
      </div>

      {/* ============================================================
          FILTER PERIOD + REFRESH
          ============================================================ */}
      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 20,
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {PERIODS.map((p) => {
            const active = period === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                disabled={refreshing}
                style={{
                  padding: "10px 20px",
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
                  cursor: refreshing ? "not-allowed" : "pointer",
                  fontWeight: active ? 700 : 500,
                  transition: "all 0.2s",
                  opacity: refreshing ? 0.6 : 1,
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          {/* Last updated */}
          {lastUpdated && (
            <span
              style={{
                fontSize: 11,
                color: "var(--text-light, #94a3b8)",
              }}
            >
              Cập nhật: {lastUpdated.toLocaleTimeString("vi-VN")}
            </span>
          )}

          {/* Refresh button */}
          <button
            onClick={() => load(false)}
            disabled={refreshing}
            style={{
              padding: "10px 16px",
              background: "var(--card-bg, #fff)",
              border: "1px solid var(--border-color, #e5e9ef)",
              borderRadius: 10,
              cursor: refreshing ? "not-allowed" : "pointer",
              fontSize: 13,
              color: "var(--text-primary, #172033)",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              opacity: refreshing ? 0.7 : 1,
            }}
          >
            {refreshing ? (
              <>
                <Loader2
                  size={14}
                  style={{ animation: "spin 1s linear infinite" }}
                />
                Đang tải...
              </>
            ) : (
              <>
                <RefreshCw size={14} /> Làm mới
              </>
            )}
          </button>
        </div>
      </div>

      {/* ============================================================
          ERROR BOX
          ============================================================ */}
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

      {/* ============================================================
          CHARTS ROW
          ============================================================ */}
      <div
        className="reports-charts"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)",
          gap: 18,
          marginBottom: 18,
        }}
      >
        {/* ---------- Bar chart: Doanh thu ---------- */}
        <div style={cardStyle}>
          <h3 style={cardTitleStyle}>
            Doanh thu {periodLabel.toLowerCase()}
          </h3>

          {chartData.length === 0 ? (
            <EmptyChart message="Chưa có dữ liệu doanh thu" />
          ) : (
            <div style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
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
                    tickFormatter={formatAxis}
                  />
                  <Tooltip
                    formatter={(v) => [money(v), "Doanh thu"]}
                    contentStyle={tooltipStyle}
                    labelStyle={{ color: "var(--text-primary, #172033)" }}
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
          <h3 style={cardTitleStyle}>Trạng thái đơn</h3>

          {statusData.length === 0 ? (
            <EmptyChart message="Chưa có đơn hàng" small />
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
                      {statusData.map((s, i) => (
                        <Cell
                          key={s.name}
                          fill={COLORS[i % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={tooltipStyle}
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
                        background: COLORS[i % COLORS.length],
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
          TOP 5 MÓN BÁN CHẠY
          ============================================================ */}
      <div style={cardStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <h3 style={{ ...cardTitleStyle, margin: 0, fontSize: 15 }}>
            🔥 Top 5 món bán chạy (realtime)
          </h3>
          <span
            style={{
              fontSize: 11,
              color: "var(--text-light, #94a3b8)",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#18a967",
                animation: "pulse 1.5s infinite",
              }}
            />
            Cập nhật mỗi {REFRESH_MS / 1000}s
          </span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg-tertiary, #f5f7fb)" }}>
                <th style={thStyle}>#</th>
                <th style={thStyle}>Món</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Đã bán</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Doanh thu</th>
              </tr>
            </thead>
            <tbody>
              {(data.topItems || []).map((item, i) => {
                const isTop3 = i < 3;
                return (
                  <tr
                    key={item.id || i}
                    style={{
                      borderBottom:
                        "1px solid var(--border-color, #eef2f7)",
                    }}
                  >
                    <td style={tdStyle}>
                      <span
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          background: isTop3
                            ? "rgba(245, 158, 11, 0.2)"
                            : "var(--bg-tertiary, #f1f5f9)",
                          color: isTop3
                            ? "#f59e0b"
                            : "var(--text-muted, #64748b)",
                          display: "inline-grid",
                          placeItems: "center",
                          fontWeight: 700,
                          fontSize: 13,
                          border: isTop3
                            ? "1px solid rgba(245, 158, 11, 0.4)"
                            : "1px solid transparent",
                        }}
                      >
                        {i + 1}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <b>{item.name || "—"}</b>
                    </td>
                    <td
                      style={{
                        ...tdStyle,
                        textAlign: "right",
                        color: "var(--text-muted, #64748b)",
                      }}
                    >
                      {item.sold || 0} suất
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      <b style={{ color: "#18a967" }}>
                        {money(item.revenue || 0)}
                      </b>
                    </td>
                  </tr>
                );
              })}

              {!data.topItems?.length && (
                <tr>
                  <td
                    colSpan="4"
                    style={{
                      textAlign: "center",
                      padding: 40,
                      color: "var(--text-light, #8993a3)",
                    }}
                  >
                    <Inbox
                      size={36}
                      style={{ opacity: 0.35, marginBottom: 10 }}
                    />
                    <div>Chưa có dữ liệu bán hàng</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.4; }
        }
        @media (max-width: 900px) {
          .reports-charts {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

function KPI({ icon, label, value, color }) {
  return (
    <div style={cardStyle}>
      <div
        style={{
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
            background: color + "18",
            color,
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <span
            style={{
              fontSize: 12,
              color: "var(--text-light, #8993a3)",
              display: "block",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </span>
          <h2
            style={{
              margin: "4px 0 0",
              fontSize: 18,
              color: "var(--text-primary, #172033)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {value}
          </h2>
        </div>
      </div>
    </div>
  );
}

function EmptyChart({ message, small = false }) {
  return (
    <div
      style={{
        height: small ? 200 : 280,
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
      <Inbox size={small ? 30 : 38} style={{ opacity: 0.35, marginBottom: 8 }} />
      <div>{message}</div>
    </div>
  );
}

// ============================================================
// HELPERS
// ============================================================

/**
 * Format số trục Y cho chart:
 *   - >= 1 triệu → "1.5M"
 *   - >= 1 nghìn → "500k"
 *   - < 1000     → hiện số thô
 */
function formatAxis(v) {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + "M";
  if (v >= 1_000) return Math.round(v / 1_000) + "k";
  return String(v);
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
  marginTop: 0,
  marginBottom: 16,
  color: "var(--text-primary, #172033)",
  fontSize: 15,
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
  fontSize: 13,
  color: "var(--text-primary, #172033)",
};

const tooltipStyle = {
  background: "var(--card-bg, #fff)",
  border: "1px solid var(--border-color, #e5e9ef)",
  borderRadius: 8,
  fontSize: 13,
  color: "var(--text-primary, #172033)",
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
};