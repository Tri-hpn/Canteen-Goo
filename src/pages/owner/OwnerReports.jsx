// ============================================================
// OWNERREPORTS.JSX — Báo cáo doanh thu chuyên sâu (Admin)
// ============================================================
// ✅ SOURCE-TEXT I18N: dùng tiếng Việt trực tiếp qua t("...")
// ============================================================

import {
  useEffect, useState, useMemo, useCallback, useRef,
} from "react";
import {
  DollarSign, ShoppingBag, TrendingUp, TrendingDown, RefreshCw,
  Loader2, AlertCircle, Inbox, Download, CalendarDays, CalendarRange,
  Calendar, ArrowRight, Clock, Percent,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, CartesianGrid,
} from "recharts";
import { api } from "../../api";
import { money } from "../../components/UI";
import { toast } from "../../components/Effects";
import { useI18n } from "../../hooks/useI18n";

// ============================================================
// CONSTANTS
// ============================================================

const COLORS = ["#18a967", "#f59e0b", "#2634d5", "#ef4444", "#8b5cf6"];

const QUICK_RANGES = [
  { id: "today",  label: "Hôm nay",     days: 1 },
  { id: "7d",     label: "7 ngày",      days: 7 },
  { id: "30d",    label: "30 ngày",     days: 30 },
  { id: "90d",    label: "90 ngày",     days: 90 },
  { id: "month",  label: "Tháng này",   months: 1 },
  { id: "year",   label: "Năm nay",     years: 1 },
  { id: "custom", label: "Tùy chọn",    custom: true },
];

// ============================================================
// HELPERS
// ============================================================

function getLocalDateStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dt = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dt}`;
}

function parseDateOnly(s) {
  if (!s) return null;
  const d = new Date(s + "T00:00:00");
  return isNaN(d.getTime()) ? null : d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function startOfDay(d) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function endOfDay(d) {
  const c = new Date(d);
  c.setHours(23, 59, 59, 999);
  return c;
}

function inRange(iso, fromTs, toTs) {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t >= fromTs && t <= toTs;
}

function fmtDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("vi-VN");
}

function calcDelta(current, previous) {
  if (previous === 0) return current > 0 ? { pct: 100, isUp: true } : null;
  const pct = ((current - previous) / previous) * 100;
  return { pct: Math.abs(pct), isUp: pct >= 0 };
}

function csvCell(v) {
  const s = String(v ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function resolveRange(rangeId, customFrom, customTo) {
  const today = startOfDay(new Date());

  const r = QUICK_RANGES.find((x) => x.id === rangeId);
  if (!r || r.custom) {
    const f = parseDateOnly(customFrom);
    const t = parseDateOnly(customTo);

    if (f && t && f <= t) {
      const todayEnd = endOfDay(today);
      const clampedTo = t > todayEnd ? todayEnd : endOfDay(t);
      return { from: startOfDay(f), to: clampedTo };
    }
    return { from: addDays(today, -29), to: endOfDay(today) };
  }

  if (r.days) {
    return {
      from: addDays(today, -(r.days - 1)),
      to: endOfDay(today),
    };
  }

  if (r.months) {
    const f = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: startOfDay(f), to: endOfDay(today) };
  }

  if (r.years) {
    const f = new Date(today.getFullYear(), 0, 1);
    return { from: startOfDay(f), to: endOfDay(today) };
  }

  return { from: addDays(today, -29), to: endOfDay(today) };
}

function getPreviousRange({ from, to }) {
  const lengthMs = endOfDay(to).getTime() - startOfDay(from).getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const lengthDays = Math.max(1, Math.round(lengthMs / dayMs));

  const prevTo = endOfDay(addDays(from, -1));
  const prevFrom = startOfDay(addDays(prevTo, -(lengthDays - 1)));

  return { from: prevFrom, to: prevTo };
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function OwnerReports() {
  const { t } = useI18n();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const [rangeId, setRangeId] = useState("30d");
  const [customFrom, setCustomFrom] = useState(
    getLocalDateStr(addDays(new Date(), -29))
  );
  const [customTo, setCustomTo] = useState(getLocalDateStr());
  const [compare, setCompare] = useState(false);

  const reqIdRef = useRef(0);

  const load = useCallback(async (silent = false) => {
    const myReqId = ++reqIdRef.current;
    if (!silent) setRefreshing(true);
    setError("");

    try {
      const data = await api.orders.all("Tất cả");
      if (myReqId !== reqIdRef.current) return;

      const list = Array.isArray(data) ? data : [];
      const sorted = [...list].sort(
        (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
      );
      setOrders(sorted);
    } catch (e) {
      if (myReqId === reqIdRef.current) {
        setError(e.message || t("Không tải được báo cáo"));
      }
    } finally {
      if (myReqId === reqIdRef.current) {
        setLoading(false);
        if (!silent) setRefreshing(false);
      }
    }
  }, [t]);

  useEffect(() => {
    load(false);
  }, [load]);

  const currentRange = useMemo(
    () => resolveRange(rangeId, customFrom, customTo),
    [rangeId, customFrom, customTo]
  );

  const previousRange = useMemo(
    () => getPreviousRange(currentRange),
    [currentRange]
  );

  const currentOrders = useMemo(() => {
    const fromTs = currentRange.from.getTime();
    const toTs = currentRange.to.getTime();
    return orders.filter((o) => inRange(o.created_at, fromTs, toTs));
  }, [orders, currentRange]);

  const previousOrders = useMemo(() => {
    if (!compare) return [];
    const fromTs = previousRange.from.getTime();
    const toTs = previousRange.to.getTime();
    return orders.filter((o) => inRange(o.created_at, fromTs, toTs));
  }, [orders, previousRange, compare]);

  const calcStats = useCallback((list) => {
    const completed = list.filter((o) => o.status === "Hoàn thành");
    const revenue = completed.reduce((s, o) => s + (o.total || 0), 0);
    const totalOrders = list.length;
    const avgOrder = completed.length > 0
      ? Math.round(revenue / completed.length)
      : 0;

    return {
      revenue,
      totalOrders,
      completedCount: completed.length,
      avgOrder,
      cancelledCount: list.filter((o) => o.status === "Đã hủy").length,
    };
  }, []);

  const stats = useMemo(() => calcStats(currentOrders), [currentOrders, calcStats]);
  const prevStats = useMemo(
    () => (compare ? calcStats(previousOrders) : null),
    [previousOrders, calcStats, compare]
  );

  const chartData = useMemo(() => {
    const dayMs = 24 * 60 * 60 * 1000;
    const startTs = startOfDay(currentRange.from).getTime();
    const endTs = startOfDay(currentRange.to).getTime();
    const days = Math.round((endTs - startTs) / dayMs) + 1;

    const groupByWeek = days > 90;

    if (groupByWeek) {
      const buckets = {};
      currentOrders
        .filter((o) => o.status === "Hoàn thành")
        .forEach((o) => {
          const t = startOfDay(new Date(o.created_at)).getTime();
          const weekStart = startTs + Math.floor((t - startTs) / (7 * dayMs)) * 7 * dayMs;
          const key = weekStart;
          if (!buckets[key]) {
            buckets[key] = { ts: key, revenue: 0, orders: 0 };
          }
          buckets[key].revenue += o.total || 0;
          buckets[key].orders += 1;
        });

      return Object.values(buckets)
        .sort((a, b) => a.ts - b.ts)
        .map((b) => {
          const d = new Date(b.ts);
          return {
            label: `T${Math.floor((d.getDate() - 1) / 7) + 1}/${d.getMonth() + 1}`,
            value: b.revenue,
            orders: b.orders,
          };
        });
    }

    const buckets = {};
    for (let i = 0; i < days; i++) {
      const ts = startTs + i * dayMs;
      buckets[ts] = { ts, revenue: 0, orders: 0 };
    }

    currentOrders
      .filter((o) => o.status === "Hoàn thành")
      .forEach((o) => {
        const ts = startOfDay(new Date(o.created_at)).getTime();
        if (buckets[ts]) {
          buckets[ts].revenue += o.total || 0;
          buckets[ts].orders += 1;
        }
      });

    return Object.values(buckets)
      .sort((a, b) => a.ts - b.ts)
      .map((b) => {
        const d = new Date(b.ts);
        return {
          label: `${d.getDate()}/${d.getMonth() + 1}`,
          value: b.revenue,
          orders: b.orders,
        };
      });
  }, [currentOrders, currentRange]);

  const statusData = useMemo(() => {
    if (!currentOrders.length) return [];
    const map = {};
    for (const o of currentOrders) {
      map[o.status] = (map[o.status] || 0) + 1;
    }
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [currentOrders]);

  const topItems = useMemo(() => {
    const sold = {};
    currentOrders
      .filter((o) => o.status === "Hoàn thành")
      .forEach((o) => {
        (o.items || []).forEach((it) => {
          const key = it.menu_item_id;
          if (!sold[key]) {
            sold[key] = {
              id: key,
              name: it.name,
              sold: 0,
              revenue: 0,
            };
          }
          sold[key].sold += it.qty || 0;
          sold[key].revenue += (it.price || 0) * (it.qty || 0);
        });
      });

    return Object.values(sold)
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 5);
  }, [currentOrders]);

  const hourlyData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      label: `${String(i).padStart(2, "0")}h`,
      orders: 0,
      revenue: 0,
    }));

    currentOrders.forEach((o) => {
      if (!o.created_at) return;
      const h = new Date(o.created_at).getHours();
      if (h >= 0 && h < 24) {
        hours[h].orders += 1;
        if (o.status === "Hoàn thành") {
          hours[h].revenue += o.total || 0;
        }
      }
    });

    return hours;
  }, [currentOrders]);

  const peakHour = useMemo(() => {
    let max = { hour: 0, orders: 0, revenue: 0 };
    for (const h of hourlyData) {
      if (h.orders > max.orders) max = h;
    }
    return max;
  }, [hourlyData]);

  const selectRange = (r) => {
    setRangeId(r.id);
    if (r.custom) {
      if (!customFrom || !customTo) {
        setCustomFrom(getLocalDateStr(addDays(new Date(), -29)));
        setCustomTo(getLocalDateStr());
      }
    }
  };

  const handleExport = () => {
    if (!currentOrders.length) {
      return toast(t("Không có đơn nào trong khoảng thời gian này"), "error");
    }

    let url = null;
    let a = null;
    try {
      const fromStr = getLocalDateStr(currentRange.from);
      const toStr = getLocalDateStr(currentRange.to);

      const rows = [
        ["CANTEEN VWA - BAO CAO DOANH THU"],
        ["Tu ngay", fromStr, "Den ngay", toStr],
        [],
        ["MA DON", "KHACH", "NGAY", "PTTT", "TRANG THAI", "TONG TIEN"],
        ...currentOrders.map((o) => [
          o.code,
          o.customer_name || "",
          fmtDateTime(o.created_at),
          o.payment || t("Tiền mặt"),
          o.status,
          o.total || 0,
        ]),
        [],
        ["TONG DOANH THU (Hoan thanh)", stats.revenue],
        ["TONG DON", stats.totalOrders],
        ["DON HOAN THANH", stats.completedCount],
        ["DON HUY", stats.cancelledCount],
        ["TB/DON", stats.avgOrder],
      ];

      const csv = rows.map((r) => r.map(csvCell).join(",")).join("\n");
      const blob = new Blob(["\uFEFF" + csv], {
        type: "text/csv;charset=utf-8",
      });
      url = URL.createObjectURL(blob);
      a = document.createElement("a");
      a.href = url;
      a.download = `canteen-report-${fromStr}-to-${toStr}.csv`;
      document.body.appendChild(a);
      a.click();

      toast(`${t("Đã xuất")} ${currentOrders.length} ${t("đơn")}`, "success");
    } catch (e) {
      toast(e.message || t("Không xuất được"), "error");
    } finally {
      if (a && a.parentNode) a.parentNode.removeChild(a);
      if (url) URL.revokeObjectURL(url);
    }
  };

  return (
    <div>
      {/* FILTER BAR */}
      <div
        style={{
          background: "var(--card-bg, #fff)",
          border: "1px solid var(--border-color, #e7ebf0)",
          borderRadius: 12,
          padding: 16,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            marginBottom: 12,
          }}
        >
          {QUICK_RANGES.map((r) => {
            const active = rangeId === r.id;
            const Icon =
              r.id === "today" ? Clock :
              r.id === "custom" ? CalendarRange :
              r.days && r.days <= 7 ? Calendar : CalendarDays;
            return (
              <button
                key={r.id}
                onClick={() => selectRange(r)}
                style={{
                  padding: "8px 14px",
                  background: active ? "#2634d5" : "var(--bg-tertiary, #f5f7fb)",
                  color: active ? "#fff" : "var(--text-muted, #475569)",
                  border: "1px solid " + (active ? "#2634d5" : "var(--border-color, #e5e9ef)"),
                  borderRadius: 20,
                  fontSize: 12.5,
                  fontWeight: active ? 700 : 500,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "all 0.15s",
                }}
              >
                <Icon size={13} />
                {t(r.label)}
              </button>
            );
          })}
        </div>

        {rangeId === "custom" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 12,
              marginBottom: 12,
              padding: 12,
              background: "var(--bg-tertiary, #f8fafc)",
              borderRadius: 8,
            }}
          >
            <div>
              <label style={labelStyle}>{t("Từ ngày")}</label>
              <input
                type="date"
                value={customFrom}
                max={customTo}
                onChange={(e) => setCustomFrom(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>{t("Đến ngày")}</label>
              <input
                type="date"
                value={customTo}
                min={customFrom}
                max={getLocalDateStr()}
                onChange={(e) => setCustomTo(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 14px",
              background: compare
                ? "rgba(139, 92, 246, 0.12)"
                : "var(--bg-tertiary, #f5f7fb)",
              border:
                "1px solid " +
                (compare ? "#8b5cf6" : "var(--border-color, #e5e9ef)"),
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 12.5,
              fontWeight: 600,
              color: compare ? "#8b5cf6" : "var(--text-muted, #475569)",
            }}
          >
            <input
              type="checkbox"
              checked={compare}
              onChange={(e) => setCompare(e.target.checked)}
              style={{ cursor: "pointer", accentColor: "#8b5cf6" }}
            />
            {t("So sánh kỳ trước")}
          </label>

          <span
            style={{
              fontSize: 12,
              color: "var(--text-light, #8993a3)",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Calendar size={12} />
            {getLocalDateStr(currentRange.from)} → {getLocalDateStr(currentRange.to)}
          </span>

          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button
              onClick={handleExport}
              disabled={loading || refreshing}
              style={{
                padding: "9px 14px",
                background: "var(--bg-tertiary, #f5f7fb)",
                border: "1px solid var(--border-color, #e5e9ef)",
                borderRadius: 8,
                cursor: loading || refreshing ? "not-allowed" : "pointer",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text-primary, #172033)",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                opacity: loading || refreshing ? 0.6 : 1,
              }}
            >
              <Download size={14} /> {t("Xuất CSV")}
            </button>
            <button
              onClick={() => load(false)}
              disabled={refreshing}
              style={{
                padding: "9px 14px",
                background: "var(--bg-tertiary, #f5f7fb)",
                border: "1px solid var(--border-color, #e5e9ef)",
                borderRadius: 8,
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
              {t("Làm mới")}
            </button>
          </div>
        </div>
      </div>

      {/* ERROR */}
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
            {t("Thử lại")}
          </button>
        </div>
      )}

      {/* KPI CARDS */}
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
          label={t("Doanh thu (hoàn thành)")}
          value={loading ? "..." : money(stats.revenue)}
          color="#18a967"
          delta={compare && prevStats ? calcDelta(stats.revenue, prevStats.revenue) : null}
          t={t}
        />
        <KPI
          icon={<ShoppingBag size={22} />}
          label={t("Tổng đơn trong kỳ")}
          value={loading ? "..." : stats.totalOrders}
          color="#2634d5"
          delta={compare && prevStats ? calcDelta(stats.totalOrders, prevStats.totalOrders) : null}
          t={t}
        />
        <KPI
          icon={<TrendingUp size={22} />}
          label={t("Giá trị TB / đơn")}
          value={loading ? "..." : money(stats.avgOrder)}
          color="#f59e0b"
          delta={compare && prevStats ? calcDelta(stats.avgOrder, prevStats.avgOrder) : null}
          t={t}
        />
        <KPI
          icon={<Percent size={22} />}
          label={t("Tỷ lệ hoàn thành")}
          value={
            loading
              ? "..."
              : (stats.totalOrders > 0
                  ? Math.round((stats.completedCount / stats.totalOrders) * 100)
                  : 0) + "%"
          }
          color="#8b5cf6"
          delta={
            compare && prevStats
              ? calcDelta(
                  stats.totalOrders > 0
                    ? (stats.completedCount / stats.totalOrders) * 100
                    : 0,
                  prevStats.totalOrders > 0
                    ? (prevStats.completedCount / prevStats.totalOrders) * 100
                    : 0
                )
              : null
          }
          t={t}
        />
      </div>

      {/* CHARTS ROW */}
      <div
        className="reports-charts"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)",
          gap: 18,
          marginBottom: 18,
        }}
      >
        <div style={cardStyle}>
          <h3 style={cardTitleStyle}>
            {t("Doanh thu theo")}{" "}
            {chartData.length > 90 ? t("tuần") : t("ngày")}
          </h3>

          {loading ? (
            <ChartSkeleton height={280} />
          ) : chartData.length === 0 ? (
            <EmptyChart message={t("Chưa có dữ liệu doanh thu")} />
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
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fontSize: 11,
                      fill: "var(--text-muted, #64748b)",
                    }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fontSize: 11,
                      fill: "var(--text-muted, #64748b)",
                    }}
                    tickFormatter={formatAxis}
                  />
                  <Tooltip
                    formatter={(v) => [money(v), t("Doanh thu")]}
                    contentStyle={tooltipStyle}
                    labelStyle={{ color: "var(--text-primary, #172033)" }}
                  />
                  <Bar
                    dataKey="value"
                    fill="#2634d5"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div style={cardStyle}>
          <h3 style={cardTitleStyle}>{t("Trạng thái đơn")}</h3>

          {loading ? (
            <ChartSkeleton height={200} />
          ) : statusData.length === 0 ? (
            <EmptyChart message={t("Chưa có đơn hàng")} small />
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
                    <Tooltip contentStyle={tooltipStyle} />
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
                      {t(s.name)}
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

      {/* HOURLY BREAKDOWN */}
      <div style={{ ...cardStyle, marginBottom: 18 }}>
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
          <h3 style={{ ...cardTitleStyle, margin: 0 }}>
            <Clock size={16} style={{ verticalAlign: -3, marginRight: 6 }} />
            {t("Doanh thu theo giờ")}
          </h3>
          {peakHour.orders > 0 && (
            <span
              style={{
                fontSize: 12,
                color: "var(--text-muted, #64748b)",
                padding: "4px 12px",
                background: "rgba(245, 158, 11, 0.1)",
                borderRadius: 12,
                fontWeight: 600,
              }}
            >
              🔥 {t("Giờ cao điểm")}: <b style={{ color: "#f59e0b" }}>
                {String(peakHour.hour).padStart(2, "0")}h
              </b> ({peakHour.orders} {t("đơn")})
            </span>
          )}
        </div>

        {loading ? (
          <ChartSkeleton height={140} />
        ) : (
          <div style={{ height: 140 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyData}>
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fontSize: 10,
                    fill: "var(--text-muted, #64748b)",
                  }}
                  interval={1}
                />
                <Tooltip
                  formatter={(v, name) => [
                    name === "orders" ? `${v} ${t("đơn")}` : money(v),
                    name === "orders" ? t("Số đơn") : t("Doanh thu"),
                  ]}
                  contentStyle={tooltipStyle}
                  labelFormatter={(l) => `${t("Giờ")} ${l}`}
                />
                <Bar
                  dataKey="orders"
                  fill="#18a967"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* TOP ITEMS */}
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
            🔥 {t("Top 5 món bán chạy (trong kỳ)")}
          </h3>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg-tertiary, #f5f7fb)" }}>
                <th style={thStyle}>#</th>
                <th style={thStyle}>{t("Món")}</th>
                <th style={{ ...thStyle, textAlign: "right" }}>{t("Đã bán")}</th>
                <th style={{ ...thStyle, textAlign: "right" }}>{t("Doanh thu")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan="4" style={{ padding: 8 }}>
                      <div
                        style={{
                          height: 32,
                          background: "var(--bg-tertiary, #f5f7fb)",
                          borderRadius: 6,
                          animation: "pulse 1.5s ease-in-out infinite",
                        }}
                      />
                    </td>
                  </tr>
                ))
              ) : topItems.length === 0 ? (
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
                    <div>{t("Chưa có dữ liệu bán hàng trong kỳ")}</div>
                  </td>
                </tr>
              ) : (
                topItems.map((item, i) => {
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
                        {item.sold || 0} {t("suất")}
                      </td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>
                        <b style={{ color: "#18a967" }}>
                          {money(item.revenue || 0)}
                        </b>
                      </td>
                    </tr>
                  );
                })
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
          50%      { opacity: 0.5; }
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

function KPI({ icon, label, value, color, delta, t }) {
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
          {delta && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: delta.isUp ? "#18a967" : "#ef4444",
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
                marginTop: 4,
              }}
            >
              {delta.isUp ? (
                <TrendingUp size={11} />
              ) : (
                <TrendingDown size={11} />
              )}
              {delta.isUp ? "+" : "-"}
              {delta.pct.toFixed(1)}% {t("so kỳ trước")}
            </span>
          )}
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

function ChartSkeleton({ height = 280 }) {
  return (
    <div
      style={{
        height,
        background: "var(--bg-tertiary, #f8fafc)",
        borderRadius: 10,
        display: "grid",
        placeItems: "center",
        color: "var(--text-light, #8993a3)",
      }}
    >
      <Loader2
        size={28}
        style={{ animation: "spin 1s linear infinite" }}
      />
    </div>
  );
}

function formatAxis(v) {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + "M";
  if (v >= 1_000) return Math.round(v / 1_000) + "k";
  return String(v);
}

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

const labelStyle = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  marginBottom: 4,
  color: "var(--text-muted, #475569)",
};

const inputStyle = {
  width: "100%",
  padding: "9px 12px",
  border: "1px solid var(--border-color, #e5e9ef)",
  borderRadius: 8,
  outline: "none",
  background: "var(--bg-secondary, #fff)",
  color: "var(--text-primary, #172033)",
  fontSize: 13,
  boxSizing: "border-box",
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