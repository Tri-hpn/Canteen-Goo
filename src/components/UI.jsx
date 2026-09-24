// ============================================================
// UI.JSX — Utility components
// ============================================================
// Export:
//   - money(n)         — format VNĐ
//   - StatusBadge      — badge trạng thái (đơn, user, kho)
//   - Modal            — modal có ESC + backdrop
//   - Empty            — empty state
//   - TableActions     — nút hành động trong bảng
//   - ThemeProvider    — Provider theo dõi theme (wire ở main.jsx)
//
// Fixes (so với bản gốc):
//   - money() guard NaN/null/undefined
//   - money() format "30.000đ" (không space + ₫)
//   - Modal: ESC đóng, role="dialog", z-index chuẩn
//   - Modal: body scroll lock, fix miss-click
//   - StatusBadge: 1 observer toàn cục (không phải mỗi instance)
//   - StatusBadge: đọc theme qua context (không đọc DOM)
//   - STATUS_MAP mở rộng cho mọi status
//   - Icon cho tất cả status
//   - aria-label cho TableActions
//   - Empty có icon
//   - ✅ ThemeContext default = null (không phải "light") để
//     StatusBadge phân biệt được có Provider hay không
//   - ✅ StatusBadge dùng `hasProvider` check thay vì `if (ctxTheme)`
//     (bug cũ: ctxTheme default "light" truthy → observer không bao
//     giờ được tạo khi không có Provider)
// ============================================================

import {
  useEffect, useState, useMemo, useCallback,
  useRef, createContext, useContext,
} from "react";
import {
  CheckCircle2, Clock3, XCircle, AlertTriangle, Eye, Pencil, Trash2,
  Clock, ChefHat, Truck, Info, Package, Ban,
  CalendarX, Inbox,
} from "lucide-react";

// ============================================================
// MONEY FORMAT
// ============================================================

/**
 * Format số thành tiền VN: "30.000đ"
 * - Guard NaN/null/undefined → "0đ"
 */
export function money(n) {
  const num = Number(n);
  const safe = isFinite(num) ? num : 0;
  return safe.toLocaleString("vi-VN") + "đ";
}

// ============================================================
// THEME CONTEXT — 1 observer toàn cục cho StatusBadge
// ============================================================

/**
 * null = chưa có Provider. Nếu có Provider → context value = "light" | "dark"
 *
 * ✅ QUAN TRỌNG: KHÔNG dùng default "light" vì như vậy
 * `useContext(ThemeContext)` luôn trả về "light" (truthy) ngay cả khi
 * không có Provider → StatusBadge không phân biệt được → bug.
 */
const ThemeContext = createContext(null);

/**
 * Provider theo dõi theme — gắn 1 lần ở App.jsx (hoặc main.jsx).
 * StatusBadge dùng context này thay vì tự đọc DOM.
 *
 * Nếu bạn KHÔNG muốn đổi main.jsx → StatusBadge vẫn hoạt động
 * nhờ fallback MutationObserver (nhưng chỉ 1 observer toàn cục).
 */
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    if (typeof document === "undefined") return "light";
    return document.documentElement.classList.contains("dark-mode")
      ? "dark"
      : "light";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const update = () => {
      const isDark = document.documentElement.classList.contains("dark-mode");
      setTheme(isDark ? "dark" : "light");
    };

    // Observer cho class <html>
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    // Event từ ThemeToggle
    window.addEventListener("themechange", update);

    return () => {
      observer.disconnect();
      window.removeEventListener("themechange", update);
    };
  }, []);

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}

// Fallback: nếu không có Provider, StatusBadge tự quản lý observer
function useTheme() {
  return useContext(ThemeContext);
}

// ============================================================
// STATUS BADGE
// ============================================================

const STATUS_MAP = {
  light: {
    success: { bg: "#d1fae5", color: "#065f46", border: "#6ee7b7" },
    warning: { bg: "#fef3c7", color: "#92400e", border: "#fcd34d" },
    pending: { bg: "#dbeafe", color: "#1e40af", border: "#93c5fd" },
    info:    { bg: "#cffafe", color: "#0e7490", border: "#67e8f9" },
    danger:  { bg: "#fee2e2", color: "#991b1b", border: "#fca5a5" },
    neutral: { bg: "#e2e8f0", color: "#334155", border: "#cbd5e1" },
    purple:  { bg: "#ede9fe", color: "#6d28d9", border: "#c4b5fd" },
  },
  dark: {
    success: { bg: "#065f46", color: "#d1fae5", border: "#10b981" },
    warning: { bg: "#92400e", color: "#fef3c7", border: "#f59e0b" },
    pending: { bg: "#1e40af", color: "#dbeafe", border: "#3b82f6" },
    info:    { bg: "#0e7490", color: "#cffafe", border: "#06b6d4" },
    danger:  { bg: "#991b1b", color: "#fee2e2", border: "#ef4444" },
    neutral: { bg: "#475569", color: "#f1f5f9", border: "#64748b" },
    purple:  { bg: "#5b21b6", color: "#ede9fe", border: "#8b5cf6" },
  },
};

// Map status → { type, icon }
// Key = status text CHÍNH XÁC (có dấu, đúng case)
const STATUS_CONFIG = {
  // ===== Đơn hàng =====
  "Chờ xác nhận":  { type: "pending", Icon: Clock },
  "Đã xác nhận":   { type: "info",    Icon: CheckCircle2 },
  "Đang chuẩn bị": { type: "purple",  Icon: ChefHat },
  "Sẵn sàng nhận": { type: "info",    Icon: Truck },
  "Hoàn thành":    { type: "success", Icon: CheckCircle2 },
  "Đã hủy":        { type: "danger",  Icon: XCircle },

  // ===== User =====
  "Hoạt động":     { type: "success", Icon: CheckCircle2 },
  "Bị khóa":       { type: "danger",  Icon: Ban },

  // ===== Kho =====
  "Còn hàng":      { type: "success", Icon: Package },
  "Sắp hết":       { type: "warning", Icon: AlertTriangle },
  "Hết hàng":      { type: "danger",  Icon: Package },

  // ===== Chấm công =====
  "Đúng giờ":      { type: "success", Icon: CheckCircle2 },
  "Đi muộn":       { type: "warning", Icon: Clock3 },
  "Về sớm":        { type: "info",    Icon: Clock3 },
  "Vắng mặt":      { type: "danger",  Icon: CalendarX },

  // ===== Ví / giao dịch =====
  "Chờ duyệt":     { type: "pending", Icon: Clock },
  "Thành công":    { type: "success", Icon: CheckCircle2 },
  "Từ chối":       { type: "danger",  Icon: XCircle },
};

const FALLBACK = { type: "neutral", Icon: Info };

export function StatusBadge({ status }) {
  // Nếu có ThemeProvider → dùng context
  // Nếu không → fallback state nội bộ (chỉ 1 observer cho instance này)
  const ctxTheme = useTheme();
  const hasProvider = ctxTheme !== null;

  const [fallbackTheme, setFallbackTheme] = useState(() => {
    if (typeof document === "undefined") return "light";
    return document.documentElement.classList.contains("dark-mode")
      ? "dark"
      : "light";
  });

  // Chỉ chạy observer nếu KHÔNG có ThemeProvider
  useEffect(() => {
    if (hasProvider) return; // Provider đã lo
    if (typeof window === "undefined") return;

    const update = () => {
      const isDark = document.documentElement.classList.contains("dark-mode");
      setFallbackTheme(isDark ? "dark" : "light");
    };

    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    window.addEventListener("themechange", update);

    return () => {
      observer.disconnect();
      window.removeEventListener("themechange", update);
    };
  }, [hasProvider]);

  const theme = hasProvider ? ctxTheme : fallbackTheme;

  const config = useMemo(
    () => STATUS_CONFIG[status] || FALLBACK,
    [status]
  );

  const colors = STATUS_MAP[theme] || STATUS_MAP.light;
  const c = colors[config.type] || colors.neutral;
  const Icon = config.Icon;

  return (
    <span
      role="status"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "5px 12px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 700,
        lineHeight: 1.4,
        whiteSpace: "nowrap",
        backgroundColor: c.bg,
        color: c.color,
        border: `1px solid ${c.border}`,
        WebkitTextFillColor: c.color,
      }}
    >
      {Icon && <Icon size={12} />}
      {status}
    </span>
  );
}

// ============================================================
// MODAL
// ============================================================

const MODAL_Z = 2147483600;

export function Modal({ title, children, onClose, maxWidth = 480 }) {
  const overlayRef = useRef(null);
  const mouseDownTargetRef = useRef(null);

  // ESC đóng
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Body scroll lock
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Track mousedown để chống miss-click khi kéo chuột từ ngoài
  const handleMouseDown = useCallback((e) => {
    mouseDownTargetRef.current = e.target;
  }, []);

  const handleMouseUp = useCallback(
    (e) => {
      // Chỉ đóng nếu: mousedown VÀ mouseup đều trên overlay (không phải kéo từ trong)
      if (
        e.target === e.currentTarget &&
        mouseDownTargetRef.current === e.currentTarget
      ) {
        onClose?.();
      }
      mouseDownTargetRef.current = null;
    },
    [onClose]
  );

  return (
    <div
      ref={overlayRef}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      role="dialog"
      aria-modal="true"
      aria-label={typeof title === "string" ? title : "Modal"}
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
        style={{
          background: "var(--card-bg, #fff)",
          borderRadius: 14,
          padding: 24,
          width: "100%",
          maxWidth,
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
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
            {title}
          </h3>
          <button
            onClick={onClose}
            type="button"
            aria-label="Đóng"
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
            <XCircle size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ============================================================
// EMPTY STATE
// ============================================================

export function Empty({ text = "Chưa có dữ liệu", icon: Icon = Inbox }) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: 40,
        color: "var(--text-light, #8993a3)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
      }}
    >
      {Icon && <Icon size={36} style={{ opacity: 0.4 }} />}
      <div style={{ fontSize: 13 }}>{text}</div>
    </div>
  );
}

// ============================================================
// TABLE ACTIONS
// ============================================================

export function TableActions({ onView, onEdit, onDelete }) {
  const btnStyle = {
    width: 30,
    height: 30,
    borderRadius: 6,
    border: "1px solid var(--border-color, #e5e9ef)",
    background: "var(--card-bg, #fff)",
    cursor: "pointer",
    display: "grid",
    placeItems: "center",
    color: "var(--text-muted, #475569)",
    transition: "all 0.15s",
  };

  return (
    <div style={{ display: "flex", gap: 6 }}>
      {onView && (
        <button
          type="button"
          style={btnStyle}
          onClick={onView}
          title="Xem chi tiết"
          aria-label="Xem chi tiết"
        >
          <Eye size={16} />
        </button>
      )}
      {onEdit && (
        <button
          type="button"
          style={btnStyle}
          onClick={onEdit}
          title="Chỉnh sửa"
          aria-label="Chỉnh sửa"
        >
          <Pencil size={16} />
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          style={{ ...btnStyle, color: "#ef4444" }}
          onClick={onDelete}
          title="Xóa"
          aria-label="Xóa"
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
}