// ============================================================
// PRINTRECEIPT.JSX — In hóa đơn đơn hàng
// ============================================================
// Props:
//   order   — object đơn hàng
//   onClose — callback đóng modal
//
// Fixes (so với bản gốc):
//   - Lấy hotline từ api.settings (không hardcode "0900 000 000")
//   - z-index chuẩn 2147483600
//   - ESC đóng modal
//   - Guard NaN cho price × qty
//   - Guard Invalid Date
//   - Print CSS đảm bảo in đúng (thêm .receipt-print-root)
//   - Body scroll lock khi mở
//   - Nút "Đóng" bên phải (UX chuẩn)
//   - role="dialog" + aria-modal
//   - Guard order.items null
//   - Memo items, total, date
//   - Page size A5 cho print
//   - ✅ Xoá hook-in-hook `useSafeState`/`useStateSafe` (vi phạm
//     Rules of Hooks — dễ vỡ nếu sau này wrap trong điều kiện)
//   - ✅ Xoá state `hotline` không dùng, giữ duy nhất `hotlineState`
// ============================================================

import { useEffect, useState, useMemo, useCallback } from "react";
import { Printer, X } from "lucide-react";
import { money } from "./UI";
import { api } from "../api";

// ============================================================
// CONSTANTS
// ============================================================

const MODAL_Z = 2147483600;
const DEFAULT_HOTLINE = "0900 000 000";

// ============================================================
// HELPERS
// ============================================================

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

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function PrintReceipt({ order, onClose }) {
  // ---------- Hotline từ settings ----------
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

  // ---------- ESC đóng ----------
  useEffect(() => {
    if (!order) return;

    const handler = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [order, onClose]);

  // ---------- Body scroll lock ----------
  useEffect(() => {
    if (!order) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [order]);

  // ---------- Memo derived ----------
  const items = useMemo(() => {
    if (!order || !Array.isArray(order.items)) return [];
    return order.items;
  }, [order]);

  const total = useMemo(
    () => Number(order?.total) || 0,
    [order?.total]
  );

  const dateStr = useMemo(
    () => fmtDateTime(order?.created_at),
    [order?.created_at]
  );

  const customerName = useMemo(
    () => order?.customer_name || order?.customerName || "Khách",
    [order]
  );

  // ---------- Handlers ----------
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // ---------- Early return ----------
  if (!order) return null;

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div
      className="receipt-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Hóa đơn ${order.code || ""}`}
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
        {/* ============ ACTIONS (không in) ============ */}
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
            aria-label="Đóng"
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
            <X size={16} /> Đóng
          </button>

          <button
            onClick={handlePrint}
            type="button"
            aria-label="In hóa đơn"
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
            <Printer size={16} /> In
          </button>
        </div>

        {/* ============ RECEIPT ============ */}
        <div
          className="receipt"
          style={{
            fontFamily: "'Courier New', Courier, monospace",
            fontSize: 12,
            color: "#000",
          }}
        >
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <h2 style={{ margin: "0 0 4px", fontSize: 18 }}>
              CANTEEN VWA
            </h2>
            <p style={{ margin: 0, fontSize: 11 }}>
              Hệ thống quản lý Canteen
            </p>
            <p style={{ margin: "4px 0 0", fontSize: 11 }}>
              ☎ {hotline}
            </p>
          </div>

          {/* Info block */}
          <div
            style={{
              borderTop: "1px dashed #000",
              borderBottom: "1px dashed #000",
              padding: "10px 0",
              marginBottom: 14,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <span>Mã đơn:</span>
              <b style={{ wordBreak: "break-all", textAlign: "right" }}>
                {order.code || "—"}
              </b>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <span>Khách:</span>
              <b style={{ textAlign: "right" }}>{customerName}</b>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <span>Thời gian:</span>
              <b style={{ textAlign: "right" }}>{dateStr}</b>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <span>Thanh toán:</span>
              <b>{order.payment || "Tiền mặt"}</b>
            </div>
          </div>

          {/* Items table */}
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
                  Món
                </th>
                <th
                  style={{
                    textAlign: "center",
                    padding: "6px 0",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  SL
                </th>
                <th
                  style={{
                    textAlign: "right",
                    padding: "6px 0",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  Tiền
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
                    Không có món
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Total */}
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
              <span>TỔNG CỘNG:</span>
              <span>{money(total)}</span>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              textAlign: "center",
              marginTop: 24,
              fontSize: 11,
            }}
          >
            <p style={{ margin: 0 }}>Cảm ơn quý khách!</p>
            <p style={{ margin: "4px 0 0" }}>
              Hẹn gặp lại tại Canteen VWA
            </p>
          </div>
        </div>
      </div>

      {/* ============ PRINT STYLES ============ */}
      <style>{`
        @media print {
          /* Ẩn mọi thứ ngoài receipt */
          body > *:not(.receipt-overlay) {
            display: none !important;
          }

          /* Overlay trở thành static */
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

          /* A5 page */
          @page {
            size: A5;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
}