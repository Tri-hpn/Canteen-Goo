// ============================================================
// THEMETOGGLE.JSX — Nút đổi theme (Light / Dark)
// ============================================================
// - Lưu theme vào localStorage
// - Sync giữa các tab (storage event)
// - Respect prefers-color-scheme khi chưa chọn
// - Apply class .dark-mode lên <html>
//
// Fixes (so với bản gốc):
//   - 🔴 Sync giữa các tab (window.storage event)
//   - 🔴 Guard localStorage (private mode / bị chặn)
//   - 🔴 SSR guard (typeof window)
//   - 🔴 Respect system preference lần đầu
//   - 🟡 aria-label + aria-pressed
//   - 🟡 try/catch cho dispatchEvent
//   - 🟡 i18n cho tooltip
//   - 🟢 Smooth transition khi đổi theme
// ============================================================

import { useEffect, useState, useCallback, useMemo } from "react";
import { Sun, Moon } from "lucide-react";
import { useTranslation } from "../i18n";

// ============================================================
// CONSTANTS
// ============================================================

const STORAGE_KEY = "theme";
const THEME_LIGHT = "light";
const THEME_DARK = "dark";

// ============================================================
// HELPERS
// ============================================================

/** Đọc theme đã lưu, fallback về system preference. */
function readStoredTheme() {
  if (typeof window === "undefined") return THEME_LIGHT;

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === THEME_LIGHT || saved === THEME_DARK) return saved;
  } catch {
    /* localStorage bị chặn */
  }

  // Fallback: system preference
  try {
    if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
      return THEME_DARK;
    }
  } catch {}

  return THEME_LIGHT;
}

/** Áp dụng theme lên <html>. */
function applyTheme(theme) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;

  if (theme === THEME_DARK) {
    root.classList.add("dark-mode");
  } else {
    root.classList.remove("dark-mode");
  }
}

/** Lưu theme vào localStorage (an toàn). */
function saveTheme(theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function ThemeToggle() {
  const { t } = useTranslation();
  const [theme, setTheme] = useState(readStoredTheme);

  // ---------- Apply theme khi state đổi ----------
  useEffect(() => {
    applyTheme(theme);
    saveTheme(theme);

    try {
      window.dispatchEvent(
        new CustomEvent("themechange", { detail: theme })
      );
    } catch {}
  }, [theme]);

  // ---------- Sync giữa các tab ----------
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = (e) => {
      // Chỉ xử lý khi key là "theme"
      if (e.key !== STORAGE_KEY) return;

      const next = e.newValue;
      if (next !== THEME_LIGHT && next !== THEME_DARK) return;

      setTheme(next);
    };

    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  // ---------- Listen system preference khi user chưa chọn ----------
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (typeof window.matchMedia !== "function") return;

    // Nếu user đã lưu theme → không auto-switch theo system
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === THEME_LIGHT || saved === THEME_DARK) return;
    } catch {
      return;
    }

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e) => {
      setTheme(e.matches ? THEME_DARK : THEME_LIGHT);
    };

    // Modern API
    if (mq.addEventListener) {
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }

    // Fallback cho Safari cũ
    mq.addListener?.(handler);
    return () => mq.removeListener?.(handler);
  }, []);

  // ---------- Handlers ----------

  const toggle = useCallback(() => {
    setTheme((current) =>
      current === THEME_DARK ? THEME_LIGHT : THEME_DARK
    );
  }, []);

  // ---------- Computed ----------

  const isDark = theme === THEME_DARK;

  const tooltip = useMemo(
    () => (isDark ? t("theme.toLight") || "Chế độ sáng" : t("theme.toDark") || "Chế độ tối"),
    [isDark, t]
  );

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <button
      type="button"
      onClick={toggle}
      className="icon-btn topbar-icon-btn topbar-icon-theme"
      title={tooltip}
      aria-label={tooltip}
      aria-pressed={isDark}
      style={{
        color: "#f59e0b",
        background: "rgba(245, 158, 11, 0.08)",
        transition: "transform 0.2s ease, background 0.2s ease",
      }}
    >
      {isDark ? <Sun size={19} /> : <Moon size={19} />}
    </button>
  );
}