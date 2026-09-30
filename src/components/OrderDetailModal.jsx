// ============================================================
// ORDERDETAILMODAL.JSX — Modal chi tiết đơn hàng (chung)
// ============================================================

import { useEffect, useMemo } from "react";
import { X, Package } from "lucide-react";
import { money } from "./UI";
import { useTranslation } from "../i18n";

const MODAL_Z = 2147483600;

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

function calcLineTotal(price, qty) {
  const p = Number(price) || 0;
  const q = Number(qty) || 0;
  return p * q;
}

function InfoRow({ label, value, last = false }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "8px 0",
        borderBottom: last
          ? "none"
          : "1px dashed var(--border-color, #eef2f7)",
        fontSize: 13,
        gap: 10,
      }}
    >
      <span style={{ color: "var(--text-muted, #64748b)" }}>{label}</span>
      <b
        style={{
          color: "var(--text-primary, #172033)",
          textAlign: "right",
          minWidth: 0,
        }}
      >
        {value}
      </b>
    </div>
  );
}

export default function OrderDetailModal({ order, onClose, role }) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!order) return;

    const handler = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [order, onClose]);

  const canPrint = useMemo(
    () => role === "EMPLOYEE" || role === "ADMIN",
    [role]
  );

  const items = useMemo(() => {
    if (!order || !Array.isArray(order.items)) return [];
    return order.items;
  }, [order]);

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
        background: "rgba(0,0,0,0.45)",
        display: "grid",
        placeItems: "center",
        zIndex: MODAL_Z,
        padding: 20,
        overflowY: "auto",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--card-bg, #fff)",
          borderRadius: 14,
          padding: 24,
          width: "100%",
          maxWidth: 480,
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
            gap: 10,
          }}
        >
          <h3
            style={{
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "var(--text-primary, #172033)",
              fontSize: 16,
            }}
          >
            <Package size={20} /> {t("order.detailTitle")}
          </h3>

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
              flexShrink: 0,
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginBottom: 16,
          }}
        >
          <InfoRow label={t("orders.orderCode")} value={order.code || "—"} />
          <InfoRow
            label={t("common.time")}
            value={fmtDateTime(order.created_at)}
          />
          <InfoRow label={t("common.status")} value={order.status || "—"} />
          <InfoRow
            label={t("checkout.payment")}
            value={order.payment || t("checkout.cash")}
            last
          />
        </div>

        <h4
          style={{
            margin: "16px 0 12px",
            color: "var(--text-primary, #172033)",
            fontSize: 14,
          }}
        >
          {t("order.itemsCount").replace("{n}", items.length)}
        </h4>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg-tertiary, #f5f7fb)" }}>
                <th style={thLeft}>{t("menu.title")}</th>
                <th style={thCenter}>{t("common.quantity")}</th>
                <th style={thRight}>{t("common.price")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr
                  key={it.id || i}
                  style={{
                    borderBottom: "1px solid var(--border-color, #eef2f7)",
                  }}
                >
                  <td style={tdLeft}>
                    {it.name || "—"}
                    {it._size && it._size !== "S" && (
                      <span
                        style={{
                          color: "var(--text-light, #94a3b8)",
                          fontSize: 11,
                          marginLeft: 4,
                        }}
                      >
                        ({it._size})
                      </span>
                    )}
                  </td>
                  <td style={tdCenter}>{Number(it.qty) || 0}</td>
                  <td style={tdRight}>
                    {money(calcLineTotal(it.price, it.qty))}
                  </td>
                </tr>
              ))}

              {items.length === 0 && (
                <tr>
                  <td
                    colSpan="3"
                    style={{
                      padding: 20,
                      textAlign: "center",
                      color: "var(--text-light, #8993a3)",
                      fontSize: 13,
                    }}
                  >
                    {t("order.noItems")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "14px 0",
            borderTop: "2px solid var(--border-color, #eef2f7)",
            marginTop: 8,
            gap: 10,
          }}
        >
          <b style={{ color: "var(--text-primary, #172033)" }}>
            {t("cart.total")}
          </b>
          <strong style={{ color: "#2634d5", fontSize: 20 }}>
            {money(Number(order.total) || 0)}
          </strong>
        </div>

        {order.note && (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              background: "var(--bg-tertiary, #f8fafc)",
              borderRadius: 8,
              fontSize: 12,
              color: "var(--text-muted, #64748b)",
              lineHeight: 1.5,
            }}
          >
            <b style={{ color: "var(--text-primary, #172033)" }}>
              {t("checkout.note")}:
            </b>{" "}
            {order.note}
          </div>
        )}

        {!canPrint && (
          <p
            style={{
              marginTop: 16,
              padding: 10,
              background: "rgba(38, 52, 213, 0.08)",
              color: "#2634d5",
              borderRadius: 8,
              fontSize: 12,
              textAlign: "center",
              lineHeight: 1.5,
            }}
          >
            ℹ️ {t("order.printHint")}
          </p>
        )}

        <button
          onClick={onClose}
          type="button"
          style={{
            width: "100%",
            marginTop: 20,
            padding: 12,
            background: "var(--card-bg, #fff)",
            color: "var(--text-primary, #172033)",
            border: "1px solid var(--border-color, #e5e9ef)",
            borderRadius: 10,
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--bg-tertiary, #f5f7fb)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--card-bg, #fff)";
          }}
        >
          {t("common.close")}
        </button>
      </div>
    </div>
  );
}

const thBase = {
  padding: 8,
  fontSize: 11,
  color: "var(--text-muted, #64748b)",
  fontWeight: 600,
  whiteSpace: "nowrap",
};
const thLeft = { ...thBase, textAlign: "left" };
const thCenter = { ...thBase, textAlign: "center" };
const thRight = { ...thBase, textAlign: "right" };

const tdBase = {
  padding: 8,
  fontSize: 13,
  color: "var(--text-primary, #172033)",
};
const tdLeft = { ...tdBase };
const tdCenter = {
  ...tdBase,
  textAlign: "center",
  color: "var(--text-muted, #64748b)",
};
const tdRight = { ...tdBase, textAlign: "right" };