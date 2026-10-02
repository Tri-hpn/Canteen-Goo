// ============================================================
// LANGUAGESWITCHER — Dropdown đổi ngôn ngữ (N ngôn ngữ)
// ============================================================

import { useEffect, useRef, useState } from "react";
import { Globe, Check } from "lucide-react";
import { useI18n } from "../hooks/useI18n";

export default function LanguageSwitcher() {
  const { lang, setLang, languages, t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const esc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", handler);
    window.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", handler);
      window.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="icon-btn topbar-icon-btn topbar-icon-lang"
        title={t("Chọn ngôn ngữ")}
        aria-label={t("Chọn ngôn ngữ")}
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
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
          }}
        >
          {lang}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            minWidth: 200,
            maxHeight: 400,
            overflowY: "auto",
            background: "var(--card-bg, #fff)",
            border: "1px solid var(--border-color, #e5e9ef)",
            borderRadius: 12,
            boxShadow: "0 12px 32px rgba(0,0,0,0.15)",
            zIndex: 9999,
          }}
        >
          {languages.map((l) => {
            const active = l.code === lang;
            return (
              <button
                key={l.code}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  setLang(l.code);
                  setOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  padding: "11px 14px",
                  background: active
                    ? "rgba(139, 92, 246, 0.1)"
                    : "transparent",
                  border: 0,
                  cursor: "pointer",
                  textAlign: "left",
                  fontSize: 13,
                  fontWeight: active ? 700 : 500,
                  color: "var(--text-primary, #172033)",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => {
                  if (!active)
                    e.currentTarget.style.background =
                      "var(--bg-tertiary, #f5f7fb)";
                }}
                onMouseLeave={(e) => {
                  if (!active)
                    e.currentTarget.style.background = "transparent";
                }}
              >
                <span style={{ fontSize: 18 }}>{l.flag}</span>
                <span style={{ flex: 1 }}>{l.label}</span>
                {active && <Check size={14} color="#18a967" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}