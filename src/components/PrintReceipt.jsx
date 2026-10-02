// ============================================================
// PRINTRECEIPT.JSX — In hóa đơn đơn hàng
// ============================================================

import { useEffect, useState, useMemo, useCallback } from "react";
import { Printer, X } from "lucide-react";
import { money } from "./UI";
import { api } from "../api";
import { useI18n } from "../hooks/useI18n";

const MODAL_Z = 2147483600;
const DEFAULT_HOTLINE = "0900 000 000";

function calcLineTotal(price, qty) {
  const p = Number(price) || 0;
  const q = Number(qty) || 0;
  return p * q;
}

function fmtDateTime(iso) {
  if (!iso) {
    try {
      return new Date().toLocaleString("vi-VN");
    } catch {
      return "—";
    }
  }
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) {
      return new Date().toLocaleString("vi-VN");
    }
    return d.toLocaleString("vi-VN");
  } catch {
    return "—";
  }
}

export default function PrintReceipt({ order, onClose }) {
  const { t } = useI18n();
  const [hotline, setHotline] = useState(DEFAULT_HOTLINE);

  useEffect(() => {
    let cancelled = false;

    api.settings
      .get()
      .then((s) => {
        if (cancelled || !s) return;
        if (s.hotline && s.hotline.trim()) {
          setHotline(s.hotline.trim());
        }
      })
      .catch(() => {
        /* giữ default */
      });

    return () => {
      cancelled = true;
    };
  }, []);

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

  const items = useMemo(() => {
    if (!order || !Array.isArray(order.items)) return [];
    return order.items;
  }, [order]);

  const total = useMemo(() => Number(order?.total) || 0, [order?.total]);

  const dateStr = useMemo(
    () => fmtDateTime(order?.created_at),
    [order?.created_at]
  );

  const customerName = useMemo(
    () => order?.customer_name || order?.customerName || t("profile.guest"),
    [order, t]
  );

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  if (!order) return null;

  return (
    <div
      className="receipt-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t("receipt.ariaLabel").replace("{code}", order.code || "")}
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
        className="receipt-modal"
        style={{
          background: "#fff",
          borderRadius: 14,
          padding: 30,
          width: "100%",
          maxWidth: 400,
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <div
          className="no-print"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
            gap: 10,
          }}
        >
          <button
            onClick={onClose}
            type="button"
            aria-label={t("common.close")}
            style={{
              padding: "8px 12px",
              border: "1px solid #e5e9ef",
              borderRadius: 8,
              background: "#fff",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              fontWeight: 600,
              color: "#172033",
            }}
          >
            <X size={16} /> {t("common.close")}
          </button>

          <button
            onClick={handlePrint}
            type="button"
            aria-label={t("receipt.print")}
            style={{
              padding: "8px 16px",
              background: "#2634d5",
              color: "#fff",
              border: 0,
              borderRadius: 8,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            <Printer size={16} /> {t("receipt.print")}
          </button>
        </div>

        <div
          className="receipt"
          style={{
            fontFamily: "'Courier New', Courier, monospace",
            fontSize: 12,
            color: "#000",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <h2 style={{ margin: "0 0 4px", fontSize: 18 }}>CANTEEN VWA</h2>
            <p style={{ margin: 0, fontSize: 11 }}>
              {t("receipt.tagline")}
            </p>
            <p style={{ margin: "4px 0 0", fontSize: 11 }}>☎ {hotline}</p>
          </div>

          <div
            style={{
              borderTop: "1px dashed #000",
              borderBottom: "1px dashed #000",
              padding: "10px 0",
              marginBottom: 14,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <span>{t("receipt.orderCode")}:</span>
              <b style={{ wordBreak: "break-all", textAlign: "right" }}>
                {order.code || "—"}
              </b>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <span>{t("receipt.customer")}:</span>
              <b style={{ textAlign: "right" }}>{customerName}</b>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <span>{t("receipt.time")}:</span>
              <b style={{ textAlign: "right" }}>{dateStr}</b>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <span>{t("receipt.payment")}:</span>
              <b>{order.payment || t("checkout.cash")}</b>
            </div>
          </div>

          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginBottom: 14,
            }}
          >
            <thead>
              <tr style={{ borderBottom: "1px dashed #000" }}>
                <th
                  style={{
                    textAlign: "left",
                    padding: "6px 0",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {t("receipt.colItem")}
                </th>
                <th
                  style={{
                    textAlign: "center",
                    padding: "6px 0",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {t("receipt.colQty")}
                </th>
                <th
                  style={{
                    textAlign: "right",
                    padding: "6px 0",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {t("receipt.colPrice")}
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={it.id || i}>
                  <td style={{ padding: "4px 0", fontSize: 11 }}>
                    {it.name || "—"}
                  </td>
                  <td
                    style={{
                      textAlign: "center",
                      padding: "4px 0",
                      fontSize: 11,
                    }}
                  >
                    {Number(it.qty) || 0}
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      padding: "4px 0",
                      fontSize: 11,
                    }}
                  >
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
                      color: "#666",
                      fontSize: 11,
                    }}
                  >
                    {t("order.noItems")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div
            style={{
              borderTop: "1px dashed #000",
              paddingTop: 10,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              <span>{t("receipt.totalLine")}</span>
              <span>{money(total)}</span>
            </div>
          </div>

          <div
            style={{
              textAlign: "center",
              marginTop: 24,
              fontSize: 11,
            }}
          >
            <p style={{ margin: 0 }}>{t("receipt.thanks")}</p>
            <p style={{ margin: "4px 0 0" }}>{t("receipt.seeYou")}</p>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body > *:not(.receipt-overlay) {
            display: none !important;
          }

          .receipt-overlay {
            position: static !important;
            background: #fff !important;
            padding: 0 !important;
            display: block !important;
            inset: auto !important;
            z-index: auto !important;
          }

          .receipt-modal {
            position: static !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            max-width: 100% !important;
            max-height: none !important;
            padding: 10mm !important;
            margin: 0 auto !important;
            overflow: visible !important;
          }

          .no-print {
            display: none !important;
          }

          @page {
            size: A5;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
}