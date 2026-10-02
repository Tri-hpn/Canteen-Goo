// ============================================================
// QRCODECARD.JSX — Card hiển thị QR nạp tiền / thanh toán
// ============================================================

import { useMemo, useCallback } from "react";
import { Copy, AlertTriangle, QrCode as QrIcon } from "lucide-react";
import { toast } from "./Effects";
import { useI18n } from "../hooks/useI18n";

const QR_SIZE = 240;
const FALLBACK_QR_API = "https://api.qrserver.com/v1/create-qr-code/";

function makeFallbackQrUrl(data, size = QR_SIZE) {
  const params = new URLSearchParams({
    size: `${size}x${size}`,
    data: String(data || ""),
    margin: "10",
  });
  return `${FALLBACK_QR_API}?${params.toString()}`;
}

function fmtMoney(n) {
  const num = Number(n);
  if (!isFinite(num)) return "0 ₫";
  return num.toLocaleString("vi-VN") + " ₫";
}

async function copyToClipboard(text) {
  if (!text) return false;

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // continue fallback
  }

  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    ta.style.top = "0";
    ta.setAttribute("readonly", "");
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export default function QRCodeCard({ bankInfo, amount, orderCode }) {
  const { t } = useI18n();

  const bank = bankInfo?.bank?.trim() || "";
  const account = bankInfo?.account?.trim() || "";
  const accountName = bankInfo?.name?.trim() || "";

  const hasBankInfo = !!(bank && account);

  const safeAmount = useMemo(() => {
    const n = Number(amount);
    return isFinite(n) && n > 0 ? n : 0;
  }, [amount]);

  const transferContent = useMemo(() => {
    const code = orderCode ? String(orderCode).trim() : "";
    return code ? `CANTEEN ${code}` : "CANTEEN";
  }, [orderCode]);

  const vietQR = useMemo(() => {
    if (!hasBankInfo) return "";
    const params = new URLSearchParams({
      amount: String(safeAmount),
      addInfo: transferContent,
      accountName: accountName || "CANTEEN VWA",
    });
    return (
      `https://img.vietqr.io/image/${encodeURIComponent(bank)}-${encodeURIComponent(account)}` +
      `-compact2.png?${params.toString()}`
    );
  }, [hasBankInfo, bank, account, accountName, safeAmount, transferContent]);

  const fallbackQr = useMemo(() => {
    if (!vietQR) return "";
    return makeFallbackQrUrl(vietQR);
  }, [vietQR]);

  const handleCopy = useCallback(
    async (text) => {
      const ok = await copyToClipboard(text);
      if (ok) {
        toast(t("common.copied"), "success");
      } else {
        toast(t("common.copyError"), "error");
      }
    },
    [t]
  );

  const handleImageError = useCallback(
    (e) => {
      if (e.target.dataset.fallbackTried === "1") {
        e.target.style.display = "none";
        const next = e.target.nextElementSibling;
        if (next && next.dataset.qrError === "1") {
          next.style.display = "flex";
        }
        return;
      }

      e.target.dataset.fallbackTried = "1";
      e.target.src = fallbackQr;
    },
    [fallbackQr]
  );

  if (!hasBankInfo) {
    return (
      <div
        style={{
          background: "var(--card-bg, #fff)",
          borderRadius: 16,
          padding: 32,
          maxWidth: 420,
          margin: "0 auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.06)",
          textAlign: "center",
          border: "1px solid var(--border-color, #e7ebf0)",
        }}
      >
        <AlertTriangle
          size={40}
          style={{ color: "#f59e0b", marginBottom: 12 }}
        />
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: "var(--text-primary, #172033)",
            marginBottom: 6,
          }}
        >
          {t("qr.noBankTitle")}
        </div>
        <div
          style={{
            fontSize: 13,
            color: "var(--text-muted, #64748b)",
            lineHeight: 1.5,
          }}
        >
          {t("qr.noBankDesc")}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: "var(--card-bg, #fff)",
        borderRadius: 16,
        padding: 24,
        maxWidth: 420,
        margin: "0 auto",
        boxShadow: "0 20px 60px rgba(0,0,0,0.06)",
        textAlign: "center",
        border: "1px solid var(--border-color, #e7ebf0)",
      }}
    >
      <div
        style={{
          background: "var(--bg-tertiary, #f8fafc)",
          padding: 16,
          borderRadius: 12,
          display: "inline-block",
          marginBottom: 18,
          position: "relative",
        }}
      >
        {vietQR ? (
          <>
            <img
              src={vietQR}
              alt={t("qr.altText")}
              loading="lazy"
              onError={handleImageError}
              style={{
                display: "block",
                width: QR_SIZE,
                height: QR_SIZE,
                borderRadius: 8,
                maxWidth: "100%",
                height: "auto",
                aspectRatio: "1 / 1",
              }}
            />
            <div
              data-qr-error="1"
              style={{
                display: "none",
                width: QR_SIZE,
                height: QR_SIZE,
                maxWidth: "100%",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                gap: 8,
                color: "var(--text-light, #8993a3)",
                fontSize: 12,
              }}
            >
              <QrIcon size={40} style={{ opacity: 0.4 }} />
              <div>{t("qr.loadFailTitle")}</div>
              <div>{t("qr.loadFailDesc")}</div>
            </div>
          </>
        ) : null}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 0,
          textAlign: "left",
          marginBottom: 16,
        }}
      >
        <InfoRow label={t("qr.bankLabel")} value={bank} />
        <InfoRow
          label={t("qr.accountLabel")}
          value={
            <>
              <span
                style={{
                  fontFamily: "monospace",
                  wordBreak: "break-all",
                }}
              >
                {account}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(account)}
                aria-label={t("qr.copyAccount")}
                title={t("common.copy")}
                style={{
                  background: "var(--bg-tertiary, #f1f5f9)",
                  border: 0,
                  padding: 4,
                  borderRadius: 4,
                  cursor: "pointer",
                  color: "var(--text-muted, #64748b)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginLeft: 6,
                  transition: "all 0.15s",
                }}
              >
                <Copy size={13} />
              </button>
            </>
          }
        />
        <InfoRow
          label={t("qr.ownerLabel")}
          value={accountName || "—"}
        />
        <InfoRow
          label={t("qr.amountLabel")}
          value={
            <b style={{ color: "#2634d5", fontSize: 16 }}>
              {fmtMoney(safeAmount)}
            </b>
          }
        />
        <InfoRow
          label={t("qr.contentLabel")}
          value={
            <b style={{ fontFamily: "monospace", wordBreak: "break-all" }}>
              {transferContent}
            </b>
          }
          last
        />
      </div>

      <p
        style={{
          fontSize: 12,
          color: "#2634d5",
          background: "rgba(38, 52, 213, 0.08)",
          padding: "10px 14px",
          borderRadius: 8,
          margin: 0,
          lineHeight: 1.5,
        }}
      >
        {t("qr.hint")}
      </p>
    </div>
  );
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
      <span style={{ color: "var(--text-muted, #8993a3)", flexShrink: 0 }}>
        {label}
      </span>
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