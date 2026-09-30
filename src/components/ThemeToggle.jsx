// ============================================================
// THEMETOGGLE.JSX — Nút đổi theme (Light / Dark)
// ============================================================

import { useEffect, useState, useCallback, useMemo } from "react";
import { Sun, Moon } from "lucide-react";
import { useTranslation } from "../i18n";

const STORAGE_KEY = "theme";
const THEME_LIGHT = "light";
const THEME_DARK = "dark";

function readStoredTheme() {
  if (typeof window === "undefined") return THEME_LIGHT;

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === THEME_LIGHT || saved === THEME_DARK) return saved;
  } catch {
    /* ignore */
  }

  try {
    if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
      return THEME_DARK;
    }
  } catch {}

  return THEME_LIGHT;
}

function applyTheme(theme) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;

  if (theme === THEME_DARK) {
    root.classList.add("dark-mode");
  } else {
    root.classList.remove("dark-mode");
  }
}

function saveTheme(theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
}

export default function ThemeToggle() {
  const { t } = useTranslation();
  const [theme, setTheme] = useState(readStoredTheme);

  useEffect(() => {
    applyTheme(theme);
    saveTheme(theme);

    try {
      window.dispatchEvent(
        new CustomEvent("themechange", { detail: theme })
      );
    } catch {}
  }, [theme]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = (e) => {
      if (e.key !== STORAGE_KEY) return;

      const next = e.newValue;
      if (next !== THEME_LIGHT && next !== THEME_DARK) return;

      setTheme(next);
    };

    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (typeof window.matchMedia !== "function") return;

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

    if (mq.addEventListener) {
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }

    mq.addListener?.(handler);
    return () => mq.removeListener?.(handler);
  }, []);

  const toggle = useCallback(() => {
    setTheme((current) =>
      current === THEME_DARK ? THEME_LIGHT : THEME_DARK
    );
  }, []);

  const isDark = theme === THEME_DARK;

  const tooltip = useMemo(
    () => (isDark ? t("theme.toLight") : t("theme.toDark")),
    [isDark, t]
  );

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