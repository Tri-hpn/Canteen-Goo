// ============================================================
// PAYMENTMODAL.JSX — Modal chọn phương thức thanh toán
// ============================================================
// Props:
//   order          — object đơn hàng tạm (code, total, ...)
//   onClose        — callback đóng modal
//   onConfirm      — callback(method) khi user xác nhận
//   walletBalance  — số dư ví hiện tại (để check Ví Canteen)
//
// Methods:
//   Tiền mặt | QR (VietQR) | Thẻ | Ví Canteen
//
// Fixes (so với bản gốc):
//   - 🔴 Bỏ fallback STK "1234567890" → ẩn QR nếu chưa có settings
//   - 🔴 z-index chuẩn 2147483600
//   - 🔴 alert() → toast
//   - 🔴 Guard popup blocked khi in QR
//   - 🔴 Escape HTML trong print QR (chống XSS)
//   - 🔴 ESC đóng modal
//   - 🔴 role="dialog" + aria-modal + body scroll lock
//   - 🔴 Reset confirmed khi order đổi
//   - 🔴 Modal tự đóng sau khi confirm thành công
//   - 🟡 Disable đóng khi đang confirm
//   - 🟡 VietQR chỉ render khi có đủ bank/account
//   - 🟡 money() cho walletBalance
//   - 🟡 Memo VietQR URL
//   - 🟡 Guard NaN cho order.total
//   - 🟢 QR onError fallback
// ============================================================

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  X, Banknote, QrCode, CreditCard, Printer, Check,
  Wallet, Loader2, AlertTriangle,
} from "lucide-react";
import { money } from "./UI";
import { api } from "../api";
import { toast } from "./Effects";

// ============================================================
// CONSTANTS
// ============================================================

const MODAL_Z = 2147483600;

const METHODS = [
  {
    id: "Tiền mặt",
    label: "Tiền mặt",
    desc: "Trả khi nhận món",
    icon: Banknote,
    color: "#18a967",
  },
  {
    id: "QR",
    label: "QR Code",
    desc: "Quét VietQR / MoMo",
    icon: QrCode,
    color: "#2634d5",
    needsBank: true,
  },
  {
    id: "Thẻ",
    label: "Quẹt thẻ",
    desc: "Visa / Master / ATM",
    icon: CreditCard,
    color: "#f59e0b",
  },
  {
    id: "Ví Canteen",
    label: "Ví Canteen",
    desc: "Trừ số dư ví",
    icon: Wallet,
    color: "#8b5cf6",
    needsWallet: true,
  },
];

// ============================================================
// HELPERS
// ============================================================

/** Escape HTML entities để nhúng an toàn vào print HTML. */
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function PaymentModal({
  order,
  onClose,
  onConfirm,
  walletBalance = 0,
}) {
  const [method, setMethod] = useState("Tiền mặt");
  const [confirmed, setConfirmed] = useState(false);
  const [settings, setSettings] = useState(null); // null = chưa load
  const [settingsLoading, setSettingsLoading] = useState(true);

  // ---------- Fetch settings ----------
  useEffect(() => {
    let cancelled = false;

    api.settings
      .get()
      .then((d) => {
        if (cancelled || !d) return;
        setSettings({
          bank: d.bank || "",
          account: d.account || "",
          accountName: d.accountName || "",
        });
      })
      .catch(() => {
        if (!cancelled) setSettings(null);
      })
      .finally(() => {
        if (!cancelled) setSettingsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // ---------- Reset confirmed khi order đổi ----------
  useEffect(() => {
    setConfirmed(false);
  }, [order?.code]);

  // ---------- ESC đóng ----------
  useEffect(() => {
    if (!order) return;

    const handler = (e) => {
      if (e.key !== "Escape") return;
      if (confirmed) return; // không đóng khi đang xử lý
      onClose?.();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [order, confirmed, onClose]);

  // ---------- Body scroll lock ----------
  useEffect(() => {
    if (!order) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [order]);

  // ---------- Memo computed ----------

  const total = useMemo(() => Number(order?.total) || 0, [order?.total]);

  const hasBankInfo = !!(
    settings &&
    settings.bank &&
    settings.account
  );

  const transferContent = order ? `CANTEEN ${order.code || ""}` : "";

  const vietQR = useMemo(() => {
    if (!hasBankInfo || !order) return "";
    const params = new URLSearchParams({
      amount: String(total),
      addInfo: transferContent,
      accountName: settings.accountName || "CANTEEN VWA",
    });
    return (
      `https://img.vietqr.io/image/${settings.bank}-${settings.account}` +
      `-compact2.png?${params.toString()}`
    );
  }, [hasBankInfo, order, settings, total, transferContent]);

  const walletEnough = walletBalance >= total;
  const walletShortfall = Math.max(0, total - walletBalance);

  // ---------- Handlers ----------

  const printQR = useCallback(() => {
    if (!vietQR || !order) return;

    const w = window.open("", "_blank", "width=420,height=640");
    if (!w) {
      toast("Trình duyệt đã chặn popup — vui lòng cho phép để in", "error");
      return;
    }

    // Escape tất cả các field để chống XSS
    const code = escapeHtml(order.code);
    const bank = escapeHtml(settings.bank);
    const acc = escapeHtml(settings.account);
    const accName = escapeHtml(settings.accountName);
    const content = escapeHtml(transferContent);
    const totalText = escapeHtml(money(total));

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>In QR - ${code}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: monospace, "Courier New", monospace; padding: 20px; text-align: center; margin: 0; }
    h2 { margin: 0 0 4px; font-size: 18px; }
    .sub { margin: 0 0 12px; font-size: 12px; color: #555; }
    .code { font-size: 14px; margin: 8px 0 16px; }
    img { width: 260px; height: 260px; display: block; margin: 0 auto; }
    .total { font-size: 22px; font-weight: 800; margin: 16px 0; color: #18a967; }
    .info { font-size: 12px; color: #333; line-height: 1.6; text-align: left; margin: 16px auto 0; max-width: 300px; }
    .info b { color: #000; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h2>CANTEEN VWA</h2>
  <p class="sub">Hệ thống Canteen VWA</p>
  <p class="code">Mã đơn: <b>${code}</b></p>
  <img src="${vietQR}" alt="VietQR" />
  <div class="total">${totalText}</div>
  <div class="info">
    <div>Ngân hàng: <b>${bank}</b></div>
    <div>STK: <b>${acc}</b></div>
    <div>Chủ TK: <b>${accName}</b></div>
    <div>Nội dung: <b>${content}</b></div>
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 400);
    };
  <\/script>
</body>
</html>`;

    w.document.open();
    w.document.write(html);
    w.document.close();
  }, [vietQR, order, settings, total, transferContent]);

  const confirm = useCallback(() => {
    if (confirmed) return;
    if (!order) return;

    // Ví Canteen: check đủ số dư
    if (method === "Ví Canteen" && !walletEnough) {
      toast(
        `Số dư ví không đủ. Cần thêm ${money(walletShortfall)}`,
        "error"
      );
      return;
    }

    // QR: check có bank info
    if (method === "QR" && !hasBankInfo) {
      toast(
        "Chưa có thông tin ngân hàng nhận tiền. Vui lòng chọn phương thức khác.",
        "error"
      );
      return;
    }

    setConfirmed(true);
    onConfirm?.(method);
  }, [
    confirmed,
    order,
    method,
    walletEnough,
    walletShortfall,
    hasBankInfo,
    onConfirm,
  ]);

  // ---------- Early return ----------
  if (!order) return null;

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div
      onClick={() => !confirmed && onClose?.()}
      role="dialog"
      aria-modal="true"
      aria-label="Chọn phương thức thanh toán"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
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
          borderRadius: 16,
          padding: 24,
          width: "100%",
          maxWidth: 520,
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* ============ HEADER ============ */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 18,
            gap: 10,
          }}
        >
          <h3
            style={{
              margin: 0,
              color: "var(--text-primary, #172033)",
              fontSize: 16,
            }}
          >
            Chọn phương thức thanh toán
          </h3>
          <button
            onClick={() => !confirmed && onClose?.()}
            disabled={confirmed}
            type="button"
            aria-label="Đóng"
            style={{
              background: "transparent",
              border: 0,
              cursor: confirmed ? "not-allowed" : "pointer",
              color: "var(--text-light, #8993a3)",
              padding: 4,
              display: "grid",
              placeItems: "center",
              opacity: confirmed ? 0.5 : 1,
              flexShrink: 0,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* ============ ORDER SUMMARY ============ */}
        <div
          style={{
            background: "var(--bg-tertiary, #f5f7fb)",
            borderRadius: 10,
            padding: 14,
            marginBottom: 18,
            fontSize: 13,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 6,
              gap: 10,
            }}
          >
            <span style={{ color: "var(--text-muted, #64748b)" }}>
              Mã đơn
            </span>
            <b
              style={{
                color: "#2634d5",
                fontFamily: "monospace",
              }}
            >
              {order.code}
            </b>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ color: "var(--text-muted, #64748b)" }}>
              Tổng tiền
            </span>
            <b style={{ color: "#18a967", fontSize: 18 }}>
              {money(total)}
            </b>
          </div>
        </div>

        {/* ============ METHODS ============ */}
        <div style={{ display: "grid", gap: 10, marginBottom: 18 }}>
          {METHODS.map((m) => {
            const Icon = m.icon;
            const active = method === m.id;
            const disabled =
              (m.needsWallet && !walletEnough) ||
              (m.needsBank && !hasBankInfo && !settingsLoading);

            return (
              <button
                key={m.id}
                type="button"
                onClick={() => !disabled && !confirmed && setMethod(m.id)}
                disabled={disabled || confirmed}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: 14,
                  background: active
                    ? m.color + "15"
                    : "var(--card-bg, #fff)",
                  border: active
                    ? `2px solid ${m.color}`
                    : "1px solid var(--border-color, #e5e9ef)",
                  borderRadius: 12,
                  cursor:
                    disabled || confirmed ? "not-allowed" : "pointer",
                  textAlign: "left",
                  opacity: disabled ? 0.55 : 1,
                  transition: "all 0.15s",
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 10,
                    background: m.color + "20",
                    color: m.color,
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon size={20} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 14,
                      color: "var(--text-primary, #172033)",
                    }}
                  >
                    {m.label}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-light, #8993a3)",
                    }}
                  >
                    {m.desc}
                    {m.needsWallet && (
                      <span
                        style={{
                          marginLeft: 6,
                          color: walletEnough ? "#18a967" : "#ef4444",
                          fontWeight: 700,
                        }}
                      >
                        · Số dư: {money(walletBalance)}
                        {!walletEnough && ` (thiếu ${money(walletShortfall)})`}
                      </span>
                    )}
                    {m.needsBank && !hasBankInfo && !settingsLoading && (
                      <span
                        style={{
                          marginLeft: 6,
                          color: "#ef4444",
                          fontWeight: 700,
                        }}
                      >
                        · Chưa có STK
                      </span>
                    )}
                  </div>
                </div>
                {active && (
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: m.color,
                      display: "grid",
                      placeItems: "center",
                      color: "#fff",
                      flexShrink: 0,
                    }}
                  >
                    <Check size={14} />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* ============ QR BLOCK ============ */}
        {method === "QR" && !confirmed && (
          <div
            style={{
              background: "var(--card-bg, #fff)",
              borderRadius: 12,
              padding: 20,
              textAlign: "center",
              border: "1px solid var(--border-color, #e5e9ef)",
              marginBottom: 18,
            }}
          >
            {settingsLoading ? (
              <div style={{ color: "var(--text-light, #8993a3)", fontSize: 13 }}>
                <Loader2
                  size={22}
                  style={{
                    animation: "paySpin 1s linear infinite",
                    marginBottom: 8,
                  }}
                />
                <div>Đang tải thông tin ngân hàng...</div>
              </div>
            ) : !hasBankInfo ? (
              <div
                style={{
                  color: "#ef4444",
                  fontSize: 13,
                  padding: 20,
                  lineHeight: 1.6,
                }}
              >
                <AlertTriangle
                  size={28}
                  style={{ marginBottom: 8 }}
                />
                <div style={{ fontWeight: 700, marginBottom: 4 }}>
                  Chưa có thông tin ngân hàng
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted, #64748b)" }}>
                  Vui lòng chọn phương thức khác (Tiền mặt / Thẻ).
                  Admin cần vào <b>Cài đặt → Tài khoản nhận tiền</b> để cấu hình.
                </div>
              </div>
            ) : (
              <>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--text-muted, #64748b)",
                    marginBottom: 10,
                  }}
                >
                  Quét mã QR để thanh toán
                </div>
                <img
                  src={vietQR}
                  alt="VietQR"
                  onError={(e) => {
                    e.target.style.display = "none";
                    if (e.target.nextElementSibling) {
                      e.target.nextElementSibling.style.display = "block";
                    }
                  }}
                  style={{
                    width: 220,
                    height: 220,
                    margin: "0 auto",
                    display: "block",
                    borderRadius: 8,
                  }}
                />
                <div
                  style={{
                    display: "none",
                    color: "#ef4444",
                    fontSize: 12,
                    padding: 20,
                  }}
                >
                  Không tải được QR. Vui lòng chuyển khoản thủ công theo thông
                  tin bên dưới.
                </div>

                <div
                  style={{
                    marginTop: 12,
                    fontSize: 12,
                    color: "var(--text-light, #8993a3)",
                    lineHeight: 1.6,
                  }}
                >
                  <div>
                    <b>{settings.bank}</b> · {settings.account}
                  </div>
                  <div>
                    Chủ TK: <b>{settings.accountName}</b>
                  </div>
                  <div>
                    Nội dung: <b>{transferContent}</b>
                  </div>
                </div>
                <button
                  onClick={printQR}
                  type="button"
                  style={{
                    marginTop: 14,
                    padding: "10px 16px",
                    background: "#2634d5",
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
                  <Printer size={14} /> In mã QR
                </button>
              </>
            )}
          </div>
        )}

        {/* ============ ACTIONS ============ */}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => !confirmed && onClose?.()}
            disabled={confirmed}
            type="button"
            style={{
              flex: 1,
              padding: 12,
              background: "var(--card-bg, #fff)",
              color: "var(--text-primary, #172033)",
              border: "1px solid var(--border-color, #e5e9ef)",
              borderRadius: 10,
              cursor: confirmed ? "not-allowed" : "pointer",
              fontWeight: 600,
              fontSize: 14,
              opacity: confirmed ? 0.5 : 1,
            }}
          >
            Hủy
          </button>
          <button
            onClick={confirm}
            disabled={confirmed}
            type="button"
            style={{
              flex: 2,
              padding: 12,
              background: confirmed ? "#94a3b8" : "#2634d5",
              color: "#fff",
              border: 0,
              borderRadius: 10,
              fontWeight: 700,
              cursor: confirmed ? "not-allowed" : "pointer",
              fontSize: 14,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {confirmed ? (
              <>
                <Loader2
                  size={16}
                  style={{ animation: "paySpin 1s linear infinite" }}
                />
                Đang xử lý...
              </>
            ) : (
              "Xác nhận đặt hàng"
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes paySpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}