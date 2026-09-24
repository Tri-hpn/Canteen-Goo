// ============================================================
// CONFIRMDIALOG.JSX — Modal xác nhận (thay cho confirm() native)
// ============================================================
// Props:
//   open         — boolean, hiện/ẩn
//   title        — tiêu đề (VD: "Xác nhận đăng xuất?")
//   message      — mô tả chi tiết
//   confirmText  — label nút xác nhận (default: "Xác nhận")
//   cancelText   — label nút hủy (default: "Hủy")
//   danger       — boolean, dùng màu đỏ (cho hành động nguy hiểm)
//   loading      — boolean, disable + show spinner (từ parent khi đang async)
//   onConfirm    — callback khi bấm nút xác nhận
//   onClose      — callback khi đóng (bấm Hủy / overlay / ESC)
//
// Đặc điểm:
//   - ESC đóng (khi không loading)
//   - Auto-focus nút Hủy (an toàn hơn focus nút nguy hiểm)
//   - Body scroll lock
//   - Animation vào/ra
//   - role="alertdialog" cho a11y
//   - Overlay click có guard (không đóng khi loading)
// ============================================================

import { useEffect, useRef } from "react";
import { AlertTriangle, LogOut, Loader2 } from "lucide-react";

const MODAL_Z = 2147483600;

export default function ConfirmDialog({
  open,
  title = "Xác nhận",
  message = "",
  confirmText = "Xác nhận",
  cancelText = "Hủy",
  danger = false,
  loading = false,
  icon = null,       // optional: ReactNode, mặc định là AlertTriangle
  onConfirm,
  onClose,
}) {
  const cancelRef = useRef(null);

  // ESC đóng (khi không loading)
  useEffect(() => {
    if (!open) return;

    const handler = (e) => {
      if (e.key === "Escape" && !loading) onClose?.();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, loading, onClose]);

  // Auto-focus nút Hủy khi mở
  useEffect(() => {
    if (open) cancelRef.current?.focus();
  }, [open]);

  // Body scroll lock
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const accent = danger ? "#ef4444" : "#2634d5";
  const softBg = danger ? "rgba(239, 68, 68, 0.12)" : "rgba(38, 52, 213, 0.1)";

  return (
    <div
      onClick={() => !loading && onClose?.()}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        display: "grid",
        placeItems: "center",
        zIndex: MODAL_Z,
        padding: 20,
        animation: "confirmFadeIn 0.15s ease-out",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--card-bg, #fff)",
          borderRadius: 16,
          padding: 24,
          width: "100%",
          maxWidth: 420,
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          animation: "confirmPop 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        {/* ===== ICON + TITLE + MESSAGE ===== */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 20 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: softBg,
              color: accent,
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            {icon || <AlertTriangle size={24} />}
          </div>

          <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
            <h3
              id="confirm-dialog-title"
              style={{
                margin: 0,
                marginBottom: message ? 8 : 0,
                fontSize: 16,
                fontWeight: 700,
                color: "var(--text-primary, #172033)",
                lineHeight: 1.3,
              }}
            >
              {title}
            </h3>

            {message && (
              <p
                style={{
                  margin: 0,
                  fontSize: 13.5,
                  lineHeight: 1.55,
                  color: "var(--text-muted, #64748b)",
                  whiteSpace: "pre-line",
                }}
              >
                {message}
              </p>
            )}
          </div>
        </div>

        {/* ===== ACTIONS ===== */}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            ref={cancelRef}
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              flex: 1,
              padding: 12,
              background: "var(--card-bg, #fff)",
              color: "var(--text-primary, #172033)",
              border: "1px solid var(--border-color, #e5e9ef)",
              borderRadius: 10,
              fontWeight: 600,
              fontSize: 13.5,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.background = "var(--bg-tertiary, #f5f7fb)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--card-bg, #fff)";
            }}
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            style={{
              flex: 1,
              padding: 12,
              background: loading ? "#94a3b8" : accent,
              color: "#fff",
              border: 0,
              borderRadius: 10,
              fontWeight: 700,
              fontSize: 13.5,
              cursor: loading ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              transition: "background 0.15s, transform 0.1s",
            }}
            onMouseDown={(e) => {
              if (!loading) e.currentTarget.style.transform = "scale(0.97)";
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            {loading ? (
              <>
                <Loader2
                  size={14}
                  style={{ animation: "confirmSpin 1s linear infinite" }}
                />
                Đang xử lý...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes confirmFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes confirmPop {
          from { opacity: 0; transform: scale(0.94) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes confirmSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// ============================================================
// EXPORT ICON PRESETS (cho tiện dùng)
// ============================================================
// Ví dụ:
//   import { LogoutIcon } from "./ConfirmDialog";
//   <ConfirmDialog icon={LogoutIcon} ... />
// ============================================================

export const LogoutIcon = <LogOut size={24} />;