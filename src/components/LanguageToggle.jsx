// ============================================================
// LANGUAGETOGGLE.JSX — Nút đổi ngôn ngữ (VI / EN)
// ============================================================
// Dùng hook `useTranslation` từ i18n.js — không tự viết lại.
// ============================================================

import { useEffect, useRef, useState } from "react";
import { Globe, Check } from "lucide-react";
import { useTranslation } from "../i18n";

const LANGUAGES = [
  { code: "vi", flag: "🇻🇳", fallbackLabel: "Tiếng Việt" },
  { code: "en", flag: "🇬🇧", fallbackLabel: "English" },
];

export default function LanguageToggle() {
  const [open, setOpen] = useState(false);
  const { t, lang, setLang } = useTranslation();
  const boxRef = useRef(null);

  // ---------- Click ngoài để đóng ----------
  useEffect(() => {
    if (!open) return;

    const handler = (e) => {
      const target = e.target;
      if (!target || typeof target.closest !== "function") return;

      if (boxRef.current && !boxRef.current.contains(target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // ---------- ESC đóng ----------
  useEffect(() => {
    if (!open) return;

    const handler = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  // ---------- Handlers ----------
  const toggle = () => setOpen((s) => !s);

  const change = (code) => {
    if (code === lang) {
      setOpen(false);
      return;
    }
    setLang(code);
    setOpen(false);
  };

  const getLangLabel = (code) => {
    return (
      t(`lang.${code}`) ||
      LANGUAGES.find((l) => l.code === code)?.fallbackLabel ||
      code.toUpperCase()
    );
  };

  return (
    <div ref={boxRef} className="lang-toggle">
      {/* ============ TOGGLE BUTTON ============ */}
      <button
        type="button"
        onClick={toggle}
        className="icon-btn topbar-icon-btn topbar-icon-lang"
        title={t("lang.select") || "Chọn ngôn ngữ"}
        aria-label={t("lang.select") || "Chọn ngôn ngữ"}
        aria-haspopup="menu"
        aria-expanded={open}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          color: "#8b5cf6",
          background: "rgba(139, 92, 246, 0.08)",
        }}
      >
        <Globe size={18} />
        <span
          aria-hidden="true"
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
          }}
        >
          {lang}
        </span>
      </button>

      {/* ============ DROPDOWN ============ */}
      {open && (
        <div className="lang-dropdown" role="menu">
          {LANGUAGES.map(({ code, flag }) => {
            const active = lang === code;

            return (
              <button
                key={code}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => change(code)}
                className={active ? "active" : ""}
              >
                <span aria-hidden="true" style={{ fontSize: 16 }}>
                  {flag}
                </span>
                <span style={{ flex: 1, textAlign: "left" }}>
                  {getLangLabel(code)}
                </span>
                {active && (
                  <Check size={14} style={{ color: "#18a967", flexShrink: 0 }} />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}