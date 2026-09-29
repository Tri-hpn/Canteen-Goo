// ============================================================
// PAYMENTSELECTOR.JSX — Chọn hình thức thanh toán (UI component)
// ============================================================
// Props:
//   value         — id phương thức đang chọn
//   onChange      — callback(id)
//   includeWallet — có thêm "Ví Canteen" không (default: false)
//   walletBalance — số dư ví (nếu includeWallet)
//   orderTotal    — tổng tiền đơn (để validate số dư ví)
//
// Fixes (so với bản gốc):
//   - Thêm role="radiogroup" + role="radio" + aria-checked
//   - Thêm aria-label
//   - Default cho value/onChange
//   - Support Ví Canteen (optional)
//   - Guard METHODS rỗng
//   - Memo METHODS khi có wallet
//   - ✅ Disable "Ví Canteen" khi số dư không đủ (trước đó
//     chỉ báo lỗi sau khi mở PaymentModal → UX kém)
//   - ✅ Hiện "Thiếu X đ" ngay dưới label Ví Canteen
//   - ✅ Xoá dead code `walletEnough`/`shortfall` cũ (luôn true/0)
// ============================================================

import { useMemo } from "react";
import {
  Banknote, QrCode, CreditCard, Check, Wallet,
} from "lucide-react";
import { money } from "./UI";

// ============================================================
// CONSTANTS
// ============================================================

const BASE_METHODS = [
  {
    id: "Tiền mặt",
    label: "Tiền mặt",
    desc: "Trả tiền khi nhận món tại quầy",
    icon: Banknote,
    color: "#18a967",
    badge: "Phổ biến",
  },
  {
    id: "QR",
    label: "QR Code",
    desc: "Quét mã QR bằng app ngân hàng / MoMo",
    icon: QrCode,
    color: "#2634d5",
    badge: "Nhanh",
  },
  {
    id: "Thẻ",
    label: "Quẹt thẻ",
    desc: "Visa, Master, ATM nội địa",
    icon: CreditCard,
    color: "#f59e0b",
    badge: "An toàn",
  },
];

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function PaymentSelector({
  value = "Tiền mặt",
  onChange,
  includeWallet = false,
  walletBalance = 0,
  orderTotal = 0,
}) {
  // ---------- Build methods list (có validate ví) ----------

  const methods = useMemo(() => {
    if (!includeWallet) return BASE_METHODS;

    const shortfall = Math.max(0, orderTotal - walletBalance);
    const walletDisabled = shortfall > 0;

    return [
      ...BASE_METHODS,
      {
        id: "Ví Canteen",
        label: "Ví Canteen",
        desc: walletDisabled
          ? "Số dư ví không đủ để thanh toán"
          : "Trừ số dư ví Canteen",
        icon: Wallet,
        color: "#8b5cf6",
        badge: null,
        disabled: walletDisabled,
        disabledReason: walletDisabled
          ? `Thiếu ${money(shortfall)}`
          : null,
      },
    ];
  }, [includeWallet, orderTotal, walletBalance]);

  // ---------- Guard ----------
  if (methods.length === 0) return null;

  // ---------- Handlers ----------
  const handleSelect = (m) => {
    if (m.disabled || m.id === value) return;
    onChange?.(m.id);
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="payment-selector">
      <h4>Chọn hình thức thanh toán</h4>

      <div
        className="payment-grid"
        role="radiogroup"
        aria-label="Chọn hình thức thanh toán"
      >
        {methods.map((m) => {
          const Icon = m.icon;
          const active = value === m.id;
          const isWallet = m.id === "Ví Canteen";
          const isDisabled = !!m.disabled;

          return (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={active}
              aria-disabled={isDisabled}
              aria-label={`${m.label} — ${m.desc}`}
              className={"payment-card " + (active ? "active" : "")}
              onClick={() => handleSelect(m)}
              disabled={isDisabled}
              style={{
                "--pm-color": m.color,
                opacity: isDisabled ? 0.55 : 1,
                cursor: isDisabled ? "not-allowed" : "pointer",
              }}
            >
              <div
                className="pm-icon"
                style={{
                  background: m.color + "18",
                  color: m.color,
                }}
              >
                <Icon size={26} />
              </div>

              <div className="pm-body">
                <div className="pm-head">
                  <b>{m.label}</b>
                  {m.badge && (
                    <span className="pm-badge">{m.badge}</span>
                  )}
                </div>
                <span>{m.desc}</span>

                {/* Số dư ví — chỉ hiện với Ví Canteen */}
                {isWallet && (
                  <span
                    style={{
                      display: "block",
                      marginTop: 4,
                      fontSize: 11,
                      fontWeight: 600,
                      color: m.disabled
                        ? "#ef4444"
                        : "var(--text-muted, #64748b)",
                    }}
                  >
                    Số dư: {money(walletBalance)}
                    {m.disabledReason && (
                      <>
                        {" "}
                        ·{" "}
                        <span style={{ color: "#ef4444" }}>
                          {m.disabledReason}
                        </span>
                      </>
                    )}
                  </span>
                )}
              </div>

              {active && !isDisabled && (
                <div
                  className="pm-check"
                  style={{ background: m.color }}
                  aria-hidden="true"
                >
                  <Check size={14} />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}