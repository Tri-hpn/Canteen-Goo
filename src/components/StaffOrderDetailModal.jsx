// ============================================================
// STAFFORDERDETAILMODAL.JSX — Modal chi tiết đơn (Staff/Admin)
// ============================================================

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  X, Package, Clock, ChefHat, CheckCircle2, Truck, CreditCard,
  Banknote, QrCode, User, MapPin, ShoppingBag, RefreshCw,
  Loader2,
} from "lucide-react";
import { api } from "../api";
import { money } from "./UI";
import { useTranslation } from "../i18n";

const MODAL_Z = 2147483600;
const POLL_MS = 5000;

const STATUS_FLOW = {
  "Chờ xác nhận":  { step: 1, labelKey: "status.pending",   color: "#f59e0b" },
  "Đã xác nhận":   { step: 2, labelKey: "status.confirmed", color: "#2634d5" },
  "Đang chuẩn bị": { step: 3, labelKey: "status.preparing", color: "#8b5cf6" },
  "Sẵn sàng nhận": { step: 4, labelKey: "status.ready",     color: "#18a967" },
  "Hoàn thành":    { step: 5, labelKey: "status.done",      color: "#18a967" },
  "Đã hủy":        { step: 0, labelKey: "status.cancelled", color: "#ef4444" },
};

const ALL_STEPS = [
  { step: 1, labelKey: "status.pending",   icon: Clock },
  { step: 2, labelKey: "status.confirmed", icon: CheckCircle2 },
  { step: 3, labelKey: "status.preparing", icon: ChefHat },
  { step: 4, labelKey: "status.ready",     icon: Truck },
  { step: 5, labelKey: "status.done",      icon: CheckCircle2 },
];

const PAYMENT_ICONS = {
  "Tiền mặt": Banknote,
  "QR": QrCode,
  "Thẻ": CreditCard,
  "Ví Canteen": CreditCard,
};

function calcLineTotal(price, qty) {
  const p = Number(price) || 0;
  const q = Number(qty) || 0;
  return p * q;
}

function fmtDateTime(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString("vi-VN");
  } catch {
    return "—";
  }
}

function fmtTime(d) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleTimeString("vi-VN");
  } catch {
    return "";
  }
}

function extractPickupTime(note) {
  if (!note) return null;
  const match = String(note).match(
    /Nhận lúc (\d{2}:\d{2}(?:\s*-\s*\d{2}:\d{2})?)/
  );
  return match ? match[1] : null;
}

export default function StaffOrderDetailModal({
  order: initialOrder,
  onClose,
  onUpdate,
}) {
  const { t } = useTranslation();
  const [order, setOrder] = useState(initialOrder);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState("");
  const [tabVisible, setTabVisible] = useState(
    typeof document === "undefined" || !document.hidden
  );
  const [isScrolling, setIsScrolling] = useState(false);

  const reqIdRef = useRef(0);
  const inFlightRef = useRef(false);
  const prevStatusRef = useRef(initialOrder?.status);
  const modalContentRef = useRef(null);
  const scrollTimerRef = useRef(null);

  useEffect(() => {
    setOrder(initialOrder);
    prevStatusRef.current = initialOrder?.status;
  }, [initialOrder]);

  useEffect(() => {
    if (!order) return;
    const handler = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [order, onClose]);

  useEffect(() => {
    if (!order) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [order]);

  useEffect(() => {
    const handler = () => setTabVisible(!document.hidden);
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  useEffect(() => {
    const el = modalContentRef.current;
    if (!el) return;

    const handler = () => {
      setIsScrolling(true);
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = setTimeout(() => {
        setIsScrolling(false);
        scrollTimerRef.current = null;
      }, 1500);
    };

    el.addEventListener("scroll", handler, { passive: true });

    return () => {
      el.removeEventListener("scroll", handler);
      if (scrollTimerRef.current) {
        clearTimeout(scrollTimerRef.current);
        scrollTimerRef.current = null;
      }
    };
  }, []);

  const orderId = useMemo(
    () => order?._id || order?.id || null,
    [order?._id, order?.id]
  );

  const refresh = useCallback(
    async (silent = false) => {
      if (!orderId) return;
      if (inFlightRef.current) return;
      inFlightRef.current = true;

      const myReqId = ++reqIdRef.current;
      if (!silent) setRefreshing(true);
      setError("");

      try {
        const list = await api.orders.all("Tất cả");

        if (myReqId !== reqIdRef.current) return;

        const updated = (Array.isArray(list) ? list : []).find(
          (o) => String(o._id || o.id) === String(orderId)
        );

        if (!updated) return;

        const newStatus = updated.status;
        if (prevStatusRef.current !== newStatus) {
          prevStatusRef.current = newStatus;
          try {
            onUpdate?.();
          } catch {}
        }

        setOrder(updated);
        setLastUpdated(new Date());
      } catch (e) {
        if (myReqId === reqIdRef.current && !silent) {
          setError(e.message || t("order.refreshError"));
        }
      } finally {
        if (myReqId === reqIdRef.current) setRefreshing(false);
        inFlightRef.current = false;
      }
    },
    [orderId, onUpdate, t]
  );

  useEffect(() => {
    if (!orderId) return;
    if (!tabVisible) return;
    if (isScrolling) return;

    const timer = setInterval(() => refresh(true), POLL_MS);
    return () => clearInterval(timer);
  }, [orderId, tabVisible, isScrolling, refresh]);

  const current = useMemo(() => {
    return STATUS_FLOW[order?.status] || STATUS_FLOW["Chờ xác nhận"];
  }, [order?.status]);

  const isCancelled = useMemo(
    () => order?.status === "Đã hủy",
    [order?.status]
  );

  const isCompleted = useMemo(
    () => order?.status === "Hoàn thành",
    [order?.status]
  );

  const items = useMemo(
    () => (Array.isArray(order?.items) ? order.items : []),
    [order]
  );

  const totalQty = useMemo(
    () => items.reduce((s, it) => s + (Number(it?.qty) || 0), 0),
    [items]
  );

  const pickupTime = useMemo(
    () => extractPickupTime(order?.note),
    [order?.note]
  );

  const paymentStatus = isCompleted
    ? t("order.paymentPaid")
    : isCancelled
    ? t("status.cancelled")
    : t("order.paymentUnpaid");

  const paymentColor = isCompleted
    ? "#18a967"
    : isCancelled
    ? "#ef4444"
    : "#f59e0b";

  const paymentBg = isCompleted
    ? "#e8f9f1"
    : isCancelled
    ? "#fee2e2"
    : "#fff4d8";

  const PaymentIcon = PAYMENT_ICONS[order?.payment] || Banknote;

  const subtotal = useMemo(() => {
    const s = Number(order?.subtotal);
    if (isFinite(s) && s > 0) return s;
    return Number(order?.total) || 0;
  }, [order?.subtotal, order?.total]);

  const discount = useMemo(
    () => Number(order?.discount) || 0,
    [order?.discount]
  );

  if (!order) return null;

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t("order.detailAria").replace("{code}", order.code || "")}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "grid",
        placeItems: "center",
        zIndex: MODAL_Z,
        padding: 20,
        overflowY: "auto",
      }}
    >
      <div
        ref={modalContentRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--card-bg, #fff)",
          borderRadius: 14,
          padding: 24,
          width: "100%",
          maxWidth: 620,
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* HEADER */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "linear-gradient(135deg, #2634d5, #20c779)",
                color: "#fff",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
              }}
            >
              <Package size={22} />
            </div>
            <div>
              <h3
                style={{
                  margin: 0,
                  color: "var(--text-primary, #172033)",
                  fontSize: 16,
                }}
              >
                {t("order.detailTitle")}
              </h3>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 2,
                  flexWrap: "wrap",
                }}
              >
                <b
                  style={{
                    fontSize: 13,
                    color: "#2634d5",
                    fontFamily: "monospace",
                  }}
                >
                  {order.code}
                </b>
                <span
                  style={{
                    fontSize: 10,
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
                      background: error
                        ? "#ef4444"
                        : refreshing
                        ? "#f59e0b"
                        : "#18a967",
                    }}
                  />
                  {error
                    ? t("order.refreshErrorShort")
                    : refreshing
                    ? t("order.refreshing")
                    : t("order.realtime")}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button
              onClick={() => refresh(false)}
              disabled={refreshing}
              type="button"
              aria-label={t("common.refresh")}
              title={t("common.refresh")}
              style={{
                background: "var(--bg-tertiary, #f5f7fb)",
                border: "1px solid var(--border-color, #e5e9ef)",
                borderRadius: 8,
                cursor: refreshing ? "not-allowed" : "pointer",
                padding: 8,
                color: "var(--text-primary, #172033)",
                display: "grid",
                placeItems: "center",
                opacity: refreshing ? 0.6 : 1,
              }}
            >
              {refreshing ? (
                <Loader2
                  size={16}
                  style={{ animation: "staffSpin 1s linear infinite" }}
                />
              ) : (
                <RefreshCw size={16} />
              )}
            </button>
            <button
              onClick={onClose}
              type="button"
              aria-label={t("common.close")}
              style={{
                background: "transparent",
                border: 0,
                cursor: "pointer",
                color: "var(--text-light, #8993a3)",
                padding: 4,
                display: "grid",
                placeItems: "center",
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {error && (
          <div
            style={{
              background: "rgba(239, 68, 68, 0.08)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              borderRadius: 8,
              padding: "8px 12px",
              marginBottom: 14,
              fontSize: 12,
              color: "#ef4444",
            }}
          >
            {error}
          </div>
        )}

        {/* PROGRESS */}
        {!isCancelled && (
          <div
            style={{
              background: "var(--bg-tertiary, #f5f7fb)",
              borderRadius: 12,
              padding: 18,
              marginBottom: 18,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                position: "relative",
              }}
            >
              {ALL_STEPS.map((s, i) => {
                const active = current.step >= s.step;
                const Icon = s.icon;
                return (
                  <div
                    key={s.step}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      flex: 1,
                      position: "relative",
                    }}
                  >
                    {i < ALL_STEPS.length - 1 && (
                      <div
                        style={{
                          position: "absolute",
                          top: 16,
                          left: "50%",
                          right: "-50%",
                          height: 2,
                          background:
                            current.step > s.step
                              ? "#18a967"
                              : "var(--border-color, #e5e9ef)",
                          zIndex: 0,
                        }}
                      />
                    )}
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: active
                          ? "#18a967"
                          : "var(--card-bg, #fff)",
                        color: active
                          ? "#fff"
                          : "var(--text-light, #94a3b8)",
                        border:
                          "2px solid " +
                          (active
                            ? "#18a967"
                            : "var(--border-color, #e5e9ef)"),
                        display: "grid",
                        placeItems: "center",
                        position: "relative",
                        zIndex: 1,
                      }}
                    >
                      <Icon size={14} />
                    </div>
                    <span
                      style={{
                        fontSize: 10,
                        marginTop: 6,
                        textAlign: "center",
                        color: active
                          ? "var(--text-primary, #172033)"
                          : "var(--text-light, #94a3b8)",
                        fontWeight: active ? 700 : 500,
                      }}
                    >
                      {t(s.labelKey)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* CANCELLED */}
        {isCancelled && (
          <div
            style={{
              background: "#fee2e2",
              borderRadius: 12,
              padding: 14,
              marginBottom: 18,
              textAlign: "center",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <X size={20} color="#ef4444" />
            <b style={{ color: "#991b1b", fontSize: 14 }}>
              {t("order.cancelledBanner")}
            </b>
          </div>
        )}

        {/* KPI */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 10,
            marginBottom: 18,
          }}
        >
          <InfoCard
            icon={<PaymentIcon size={14} />}
            label={t("order.paymentLabel")}
            value={paymentStatus}
            sub={order.payment || t("checkout.cash")}
            color={paymentColor}
            bg={paymentBg}
          />
          <InfoCard
            icon={<Clock size={14} />}
            label={t("order.pickupLabel")}
            value={pickupTime || t("order.pickupNotSet")}
            sub={t("order.pickupSubLabel")}
            color="#2634d5"
            bg="rgba(38, 52, 213, 0.08)"
          />
          <InfoCard
            icon={<ShoppingBag size={14} />}
            label={t("order.qtyLabel")}
            value={t("order.qtyValue").replace("{n}", totalQty)}
            sub={t("order.qtySubLabel").replace("{n}", items.length)}
            color="#8b5cf6"
            bg="rgba(139, 92, 246, 0.08)"
          />
        </div>

        {/* CUSTOMER + TIME */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              padding: 12,
              background: "var(--bg-tertiary, #f8fafc)",
              borderRadius: 10,
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: "var(--text-light, #8993a3)",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 4,
              }}
            >
              <User size={11} style={{ display: "inline", marginRight: 4 }} />
              {t("order.customerLabel")}
            </div>
            <b
              style={{
                fontSize: 14,
                color: "var(--text-primary, #172033)",
              }}
            >
              {order.customer_name || t("profile.guest")}
            </b>
          </div>

          <div
            style={{
              padding: 12,
              background: "var(--bg-tertiary, #f8fafc)",
              borderRadius: 10,
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: "var(--text-light, #8993a3)",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 4,
              }}
            >
              <Clock size={11} style={{ display: "inline", marginRight: 4 }} />
              {t("orders.orderTime")}
            </div>
            <b
              style={{
                fontSize: 13,
                color: "var(--text-primary, #172033)",
              }}
            >
              {fmtDateTime(order.created_at)}
            </b>
          </div>
        </div>

        {/* ITEMS */}
        <h4
          style={{
            margin: "0 0 10px",
            color: "var(--text-primary, #172033)",
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <ShoppingBag size={16} />{" "}
          {t("order.itemsCount").replace("{n}", items.length)}
        </h4>

        <div
          style={{
            background: "var(--bg-tertiary, #f8fafc)",
            borderRadius: 10,
            padding: 12,
            marginBottom: 16,
            overflowX: "auto",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thBase}>{t("menu.title").toUpperCase()}</th>
                <th style={{ ...thBase, textAlign: "center", width: 60 }}>
                  {t("common.quantity").toUpperCase()}
                </th>
                <th style={{ ...thBase, textAlign: "right", width: 100 }}>
                  {t("cart.unitPrice").toUpperCase()}
                </th>
                <th style={{ ...thBase, textAlign: "right", width: 100 }}>
                  {t("cart.total").toUpperCase()}
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr
                  key={it.id || i}
                  style={{
                    borderTop: "1px solid var(--border-color, #eef2f7)",
                  }}
                >
                  <td
                    style={{
                      padding: "10px 0",
                      color: "var(--text-primary, #172033)",
                      fontSize: 13,
                    }}
                  >
                    {it.name || "—"}
                    {it._size && it._size !== "S" && (
                      <span
                        style={{
                          fontSize: 11,
                          color: "var(--text-light, #94a3b8)",
                          marginLeft: 4,
                        }}
                      >
                        ({it._size})
                      </span>
                    )}
                  </td>
                  <td
                    style={{
                      padding: "10px 0",
                      textAlign: "center",
                      color: "var(--text-primary, #172033)",
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    ×{Number(it.qty) || 0}
                  </td>
                  <td
                    style={{
                      padding: "10px 0",
                      textAlign: "right",
                      color: "var(--text-muted, #64748b)",
                      fontSize: 13,
                    }}
                  >
                    {money(Number(it.price) || 0)}
                  </td>
                  <td
                    style={{
                      padding: "10px 0",
                      textAlign: "right",
                      color: "var(--text-primary, #172033)",
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    {money(calcLineTotal(it.price, it.qty))}
                  </td>
                </tr>
              ))}

              {items.length === 0 && (
                <tr>
                  <td
                    colSpan="4"
                    style={{
                      padding: 20,
                      textAlign: "center",
                      color: "var(--text-light, #8993a3)",
                      fontSize: 12,
                    }}
                  >
                    {t("order.noItems")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* SUMMARY */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "10px 0",
            borderTop: "1px dashed var(--border-color, #e5e9ef)",
            fontSize: 13,
          }}
        >
          <span style={{ color: "var(--text-muted, #64748b)" }}>
            {t("cart.subtotal")}
          </span>
          <b style={{ color: "var(--text-primary, #172033)" }}>
            {money(subtotal)}
          </b>
        </div>

        {discount > 0 && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "6px 0",
              fontSize: 13,
            }}
          >
            <span style={{ color: "var(--text-muted, #64748b)" }}>
              {t("checkout.discount")}
            </span>
            <b style={{ color: "#18a967" }}>-{money(discount)}</b>
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 0",
            borderTop: "2px solid var(--border-color, #eef2f7)",
            marginTop: 6,
            gap: 10,
          }}
        >
          <b
            style={{
              color: "var(--text-primary, #172033)",
              fontSize: 15,
            }}
          >
            {t("cart.total").toUpperCase()}
          </b>
          <strong style={{ color: "#2634d5", fontSize: 22 }}>
            {money(Number(order.total) || 0)}
          </strong>
        </div>

        {/* NOTE */}
        {order.note && (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              background: "var(--bg-tertiary, #f8fafc)",
              borderRadius: 8,
              fontSize: 12,
              color: "var(--text-muted, #64748b)",
              display: "flex",
              gap: 8,
            }}
          >
            <MapPin
              size={14}
              style={{ color: "#2634d5", flexShrink: 0, marginTop: 2 }}
            />
            <span>
              <b style={{ color: "var(--text-primary, #172033)" }}>
                {t("checkout.note")}:
              </b>{" "}
              {order.note}
            </span>
          </div>
        )}

        {/* FOOTER */}
        <div
          style={{
            marginTop: 18,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{ fontSize: 11, color: "var(--text-light, #94a3b8)" }}
          >
            {lastUpdated
              ? t("order.lastUpdated").replace("{time}", fmtTime(lastUpdated))
              : t("order.notUpdated")}
          </span>
          <button
            onClick={onClose}
            type="button"
            style={{
              padding: "10px 24px",
              background: "#2634d5",
              color: "#fff",
              border: 0,
              borderRadius: 8,
              fontWeight: 600,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            {t("common.close")}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes staffSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function InfoCard({ icon, label, value, sub, color, bg }) {
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 10,
        background: bg,
        border: `1px solid ${color}40`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 11,
          color,
          fontWeight: 700,
          marginBottom: 4,
        }}
      >
        {icon} {label}
      </div>
      <b style={{ fontSize: 13, color, display: "block" }}>{value}</b>
      {sub && (
        <span style={{ fontSize: 11, color, opacity: 0.8 }}>{sub}</span>
      )}
    </div>
  );
}

const thBase = {
  padding: "6px 0",
  textAlign: "left",
  fontSize: 11,
  color: "var(--text-light, #94a3b8)",
  fontWeight: 600,
};