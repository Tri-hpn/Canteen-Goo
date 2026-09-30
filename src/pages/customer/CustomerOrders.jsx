// ============================================================
// CUSTOMERORDERS.JSX — Danh sách đơn hàng của khách
// ============================================================

import { Skeleton, SkeletonText } from "../../components/Skeleton";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import {
  Eye, RefreshCw, Package, Clock, CheckCircle2, XCircle,
  ShoppingBag, Calendar, DollarSign, Loader2, AlertCircle,
  ChefHat, Bell,
} from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../../api";
import { money } from "../../components/UI";
import { useTranslation } from "../../i18n";
import CustomerOrderDetail from "../../components/CustomerOrderDetail";

// ============================================================
// CONSTANTS
// ============================================================

const POLL_MS = 15000;

const ACTIVE_STATUSES = [
  "Chờ xác nhận",
  "Đã xác nhận",
  "Đang chuẩn bị",
  "Sẵn sàng nhận",
];

const STATUS_COLORS = {
  "Chờ xác nhận":  { color: "#f59e0b", bg: "#fef3c7" },
  "Đã xác nhận":   { color: "#2634d5", bg: "#dbeafe" },
  "Đang chuẩn bị": { color: "#8b5cf6", bg: "#ede9fe" },
  "Sẵn sàng nhận": { color: "#18a967", bg: "#d1fae5" },
  "Hoàn thành":    { color: "#18a967", bg: "#d1fae5" },
  "Đã hủy":        { color: "#ef4444", bg: "#fee2e2" },
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function CustomerOrders() {
  const { t } = useTranslation();

  const STATUS_LIST = useMemo(
    () => [
      { id: "Tất cả",        label: t("orders.status.all"),      icon: Package,      color: "#2634d5" },
      { id: "Chờ xác nhận",  label: t("status.pending"),          icon: Bell,         color: "#f59e0b" },
      { id: "Đã xác nhận",   label: t("status.confirmed"),        icon: CheckCircle2, color: "#2634d5" },
      { id: "Đang chuẩn bị", label: t("status.preparing"),        icon: ChefHat,      color: "#8b5cf6" },
      { id: "Sẵn sàng nhận", label: t("status.ready"),            icon: ShoppingBag,  color: "#18a967" },
      { id: "Hoàn thành",    label: t("status.done"),             icon: CheckCircle2, color: "#18a967" },
      { id: "Đã hủy",        label: t("status.cancelled"),        icon: XCircle,      color: "#ef4444" },
    ],
    [t]
  );

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [status, setStatus] = useState("Tất cả");
  const [selected, setSelected] = useState(null);

  const reqIdRef = useRef(0);
  const inFlightRef = useRef(false);

  // ---------- Load ----------
  const load = useCallback(async (silent = false) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    const myReqId = ++reqIdRef.current;
    if (!silent) setRefreshing(true);
    setError("");

    try {
      const data = await api.orders.myOrders();

      if (myReqId !== reqIdRef.current) return;

      const sorted = [...(data || [])].sort((a, b) => {
        const ta = new Date(a.created_at || 0).getTime();
        const tb = new Date(b.created_at || 0).getTime();
        return tb - ta;
      });
      setOrders(sorted);
    } catch (e) {
      if (myReqId === reqIdRef.current) {
        setError(e.message || t("orders.loadError"));
      }
    } finally {
      if (myReqId === reqIdRef.current) {
        setLoading(false);
        if (!silent) setRefreshing(false);
      }
      inFlightRef.current = false;
    }
  }, [t]);

  useEffect(() => {
    load(false);
    const interval = setInterval(() => load(true), POLL_MS);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    try {
      localStorage.setItem("orders_last_seen", Date.now().toString());
      window.dispatchEvent(new CustomEvent("orders-seen"));
    } catch {}
  }, []);

  // ---------- Memoized derived ----------
  const filtered = useMemo(() => {
    if (status === "Tất cả") return orders;
    return orders.filter((o) => o.status === status);
  }, [orders, status]);

  const stats = useMemo(() => {
    let active = 0;
    let completed = 0;
    let totalSpent = 0;

    for (const o of orders) {
      if (ACTIVE_STATUSES.includes(o.status)) active++;
      if (o.status === "Hoàn thành") {
        completed++;
        totalSpent += Number(o.total) || 0;
      }
    }

    return {
      total: orders.length,
      active,
      completed,
      totalSpent,
    };
  }, [orders]);

  const counts = useMemo(() => {
    const map = { "Tất cả": orders.length };
    for (const o of orders) {
      map[o.status] = (map[o.status] || 0) + 1;
    }
    return map;
  }, [orders]);

  return (
    <div>
      {/* ERROR BANNER */}
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
            {t("common.retry")}
          </button>
        </div>
      )}

      {/* STATS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 14,
          marginBottom: 20,
        }}
      >
        <StatCard
          icon={<Package size={20} />}
          label={t("orders.stat.total")}
          value={stats.total}
          color="#2634d5"
        />
        <StatCard
          icon={<Clock size={20} />}
          label={t("orders.stat.active")}
          value={stats.active}
          color="#f59e0b"
        />
        <StatCard
          icon={<CheckCircle2 size={20} />}
          label={t("orders.stat.completed")}
          value={stats.completed}
          color="#18a967"
        />
        <StatCard
          icon={<DollarSign size={20} />}
          label={t("orders.stat.spent")}
          value={money(stats.totalSpent)}
          color="#8b5cf6"
        />
      </div>

      {/* FILTER CHIPS */}
      <div
        className="order-filter-box"
        style={{
          background: "var(--card-bg, #fff)",
          border: "1px solid var(--border-color, #e7ebf0)",
          borderRadius: 12,
          padding: 12,
          marginBottom: 20,
        }}
      >
        <div
          className="order-filter-row"
          style={{ display: "flex", gap: 6, flexWrap: "wrap" }}
        >
          {STATUS_LIST.map((s) => {
            const Icon = s.icon;
            const active = status === s.id;
            const count = counts[s.id] || 0;

            return (
              <button
                key={s.id}
                onClick={() => setStatus(s.id)}
                style={{
                  padding: "8px 14px",
                  borderRadius: 10,
                  border: active
                    ? `1px solid ${s.color}`
                    : "1px solid var(--border-color, #e5e9ef)",
                  background: active ? s.color : "var(--bg-tertiary, #f5f7fb)",
                  color: active ? "#fff" : "var(--text-muted, #475569)",
                  fontSize: 12.5,
                  cursor: "pointer",
                  fontWeight: active ? 700 : 500,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "all 0.2s",
                  whiteSpace: "nowrap",
                }}
              >
                <Icon size={13} />
                {s.label}
                {count > 0 && (
                  <span
                    style={{
                      background: active
                        ? "rgba(255,255,255,0.3)"
                        : "var(--card-bg, #e2e8f0)",
                      color: active ? "#fff" : "var(--text-muted, #64748b)",
                      minWidth: 18,
                      height: 18,
                      padding: "0 6px",
                      borderRadius: 9,
                      fontSize: 10.5,
                      fontWeight: 700,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* HEADER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <h3
          style={{
            margin: 0,
            color: "var(--text-primary, #172033)",
            fontSize: 16,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          📦 {t("orders.listTitle")}
          <span
            style={{
              fontSize: 12,
              color: "var(--text-light, #8993a3)",
              fontWeight: 400,
            }}
          >
            ({filtered.length} {t("orders.count")})
          </span>
        </h3>
        <button
          onClick={() => load(false)}
          disabled={refreshing}
          style={{
            padding: "8px 14px",
            background: "var(--card-bg, #fff)",
            border: "1px solid var(--border-color, #e5e9ef)",
            borderRadius: 8,
            cursor: refreshing ? "not-allowed" : "pointer",
            fontSize: 12.5,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            color: "var(--text-primary, #172033)",
            opacity: refreshing ? 0.6 : 1,
          }}
        >
          {refreshing ? (
            <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />
          ) : (
            <RefreshCw size={13} />
          )}
          {refreshing ? t("common.loading") : t("common.refresh")}
        </button>
      </div>

      {/* LOADING SKELETON */}
      {loading && !orders.length && (
        <div
          className="orders-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
            gap: 14,
          }}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              aria-hidden="true"
              style={{
                background: "var(--card-bg, #fff)",
                border: "1px solid var(--border-color, #e7ebf0)",
                borderRadius: 14,
                padding: 16,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <SkeletonText width="35%" height={14} />
                <Skeleton width={90} height={22} radius={20} />
              </div>

              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <Skeleton width={60} height={60} radius={14} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                  <SkeletonText width="75%" height={13} />
                  <SkeletonText width="40%" height={11} />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                <SkeletonText width={100} height={12} />
                <Skeleton width={90} height={34} radius={9} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* EMPTY */}
      {!loading && filtered.length === 0 && (
        <div
          className="order-card"
          style={{
            background: "var(--card-bg, #fff)",
            border: "1px solid var(--border-color, #e7ebf0)",
            borderRadius: 14,
            padding: 60,
            textAlign: "center",
          }}
        >
          <Package
            size={50}
            style={{
              color: "var(--text-light, #8993a3)",
              opacity: 0.3,
              marginBottom: 12,
            }}
          />
          <h3
            style={{
              margin: "0 0 6px",
              color: "var(--text-primary, #172033)",
              fontSize: 15,
            }}
          >
            {status === "Tất cả"
              ? t("orders.emptyAll")
              : t("orders.emptyStatus").replace("{status}", t("status." + statusMapKey(status)))}
          </h3>
          <p
            style={{
              margin: "0 0 16px",
              color: "var(--text-muted, #64748b)",
              fontSize: 13,
            }}
          >
            {status === "Tất cả"
              ? t("orders.emptyAllDesc")
              : t("orders.emptyStatusDesc")}
          </p>
          {status === "Tất cả" && (
            <Link
              to="/customer/menu"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "#2634d5",
                color: "#fff",
                padding: "10px 20px",
                borderRadius: 10,
                textDecoration: "none",
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              <ShoppingBag size={15} /> {t("orders.orderNow")}
            </Link>
          )}
        </div>
      )}

      {/* ORDERS GRID */}
      {!loading && filtered.length > 0 && (
        <div
          className="orders-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
            gap: 14,
          }}
        >
          {filtered.map((o) => (
            <OrderCard
              key={o._id || o.id}
              order={o}
              onView={() => setSelected(o)}
            />
          ))}
        </div>
      )}

      {/* DETAIL MODAL */}
      {selected && (
        <CustomerOrderDetail
          order={selected}
          onClose={() => setSelected(null)}
          onUpdate={load}
        />
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes rainbow {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  );
}

// ============================================================
// HELPERS
// ============================================================

function statusMapKey(viStatus) {
  return {
    "Chờ xác nhận": "pending",
    "Đã xác nhận": "confirmed",
    "Đang chuẩn bị": "preparing",
    "Sẵn sàng nhận": "ready",
    "Hoàn thành": "done",
    "Đã hủy": "cancelled",
  }[viStatus] || "pending";
}

// ============================================================
// SUB-COMPONENT: OrderCard
// ============================================================

function OrderCard({ order, onView }) {
  const { t } = useTranslation();
  const colors = STATUS_COLORS[order.status] || {
    color: "#64748b",
    bg: "#f1f5f9",
  };

  const items = order.items || [];
  const totalQty = items.reduce((s, it) => s + (Number(it.qty) || 0), 0);
  const firstItemName = items[0]?.name || t("orders.orderLabel");

  const statusLabel =
    t("status." + statusMapKey(order.status)) || order.status;

  return (
    <div
      className="order-card"
      style={{
        background: "var(--card-bg, #fff)",
        border: "1px solid var(--border-color, #e7ebf0)",
        borderRadius: 14,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        transition: "all 0.2s",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "14px 16px",
          borderBottom: "1px dashed var(--border-color, #eef2f7)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "var(--bg-tertiary, #f8fafc)",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              color: "var(--text-light, #8993a3)",
              fontWeight: 600,
              marginBottom: 2,
              textTransform: "uppercase",
            }}
          >
            {t("orders.code")}
          </div>
          <b
            style={{
              fontSize: 14,
              color: "#2634d5",
              fontFamily: "monospace",
            }}
          >
            {order.code}
          </b>
        </div>
        <span
          style={{
            padding: "4px 12px",
            borderRadius: 20,
            fontSize: 11,
            fontWeight: 700,
            background: colors.bg,
            color: colors.color,
            whiteSpace: "nowrap",
          }}
        >
          {statusLabel}
        </span>
      </div>

      {/* Items preview */}
      <div style={{ padding: 14, flex: 1 }}>
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 12,
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: 14,
              background:
                "linear-gradient(135deg, #2634d5, #3b82f6, #8b5cf6, #ec4899, #2634d5)",
              backgroundSize: "300% 300%",
              animation: "rainbow 4s ease infinite",
              color: "#fff",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 1,
              flexShrink: 0,
              boxShadow: "0 4px 16px rgba(38, 52, 213, 0.4)",
            }}
          >
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="3 7 12 3 21 7 12 11 3 7" />
              <polyline points="3 7 3 17 12 21 12 11" />
              <polyline points="21 7 21 17 12 21" />
              <line x1="8" y1="13" x2="8" y2="18" />
              <ellipse cx="8" cy="12" rx="1.2" ry="1" />
              <line x1="16" y1="13" x2="16" y2="18" />
              <line x1="15" y1="12" x2="15" y2="13.5" />
              <line x1="17" y1="12" x2="17" y2="13.5" />
            </svg>
            <span
              style={{
                fontSize: 7,
                fontWeight: 800,
                letterSpacing: 0.3,
                lineHeight: 1,
                marginTop: 1,
              }}
            >
              CANTEEN
            </span>
            <span
              style={{
                fontSize: 6,
                fontWeight: 700,
                letterSpacing: 0.5,
                lineHeight: 1,
                opacity: 0.9,
              }}
            >
              VWA
            </span>
          </div>
          <div style={{ flex: 1, minWidth: 0, marginLeft: 4 }}>
            <b
              style={{
                fontSize: 13,
                color: "var(--text-primary, #172033)",
                display: "block",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {firstItemName}
              {items.length > 1 && (
                <span
                  style={{
                    color: "var(--text-muted, #64748b)",
                    fontWeight: 400,
                  }}
                >
                  {" "}+{items.length - 1} {t("orders.moreItems")}
                </span>
              )}
            </b>
            <span style={{ fontSize: 11, color: "var(--text-light, #8993a3)" }}>
              {totalQty} {t("cart.parts")}
            </span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11.5,
              color: "var(--text-light, #8993a3)",
            }}
          >
            <Calendar size={12} />
            {order.created_at
              ? new Date(order.created_at).toLocaleString("vi-VN", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "—"}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          padding: "12px 16px",
          borderTop: "1px solid var(--border-color, #eef2f7)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "var(--bg-tertiary, #f8fafc)",
        }}
      >
        <div>
          <span
            style={{
              fontSize: 10,
              color: "var(--text-light, #8993a3)",
              display: "block",
              textTransform: "uppercase",
            }}
          >
            {t("cart.total")}
          </span>
          <b style={{ fontSize: 17, color: "#2634d5" }}>
            {money(order.total)}
          </b>
        </div>
        <button
          onClick={onView}
          style={{
            padding: "9px 16px",
            background: "#2634d5",
            color: "#fff",
            border: 0,
            borderRadius: 9,
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 700,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Eye size={14} /> {t("orders.detail")}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// SUB-COMPONENT: StatCard
// ============================================================

function StatCard({ icon, label, value, color }) {
  return (
    <div
      style={{
        background: "var(--card-bg, #fff)",
        border: "1px solid var(--border-color, #e7ebf0)",
        borderRadius: 12,
        padding: 16,
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 11,
          background: color + "18",
          color,
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <span
          style={{
            fontSize: 11.5,
            color: "var(--text-light, #8993a3)",
            display: "block",
          }}
        >
          {label}
        </span>
        <b style={{ fontSize: 18, color, fontWeight: 800 }}>{value}</b>
      </div>
    </div>
  );
}