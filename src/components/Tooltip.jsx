// ============================================================
// TOOLTIP.JSX — Custom tooltip (hover 0.3s hiện)
// ============================================================
// Nội dung tooltip do caller truyền vào → KHÔNG cần i18n.
// ============================================================

import { useState, useRef, useEffect } from "react";

export default function Tooltip({
  children,
  content,
  placement = "top",
  delay = 300,
}) {
  const [show, setShow] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const timerRef = useRef(null);

  const updatePosition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const gap = 8;

    let top = 0, left = 0;
    if (placement === "top") {
      top = r.top - gap;
      left = r.left + r.width / 2;
    } else if (placement === "bottom") {
      top = r.bottom + gap;
      left = r.left + r.width / 2;
    } else if (placement === "left") {
      top = r.top + r.height / 2;
      left = r.left - gap;
    } else {
      top = r.top + r.height / 2;
      left = r.right + gap;
    }
    setCoords({ top, left });
  };

  const open = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      updatePosition();
      setShow(true);
    }, delay);
  };

  const close = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setShow(false);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const transformMap = {
    top: "translate(-50%, -100%)",
    bottom: "translate(-50%, 0)",
    left: "translate(-100%, -50%)",
    right: "translate(0, -50%)",
  };

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={open}
        onMouseLeave={close}
        onFocus={open}
        onBlur={close}
        style={{ display: "inline-flex", alignItems: "center" }}
      >
        {children}
      </span>

      {show && content && (
        <span
          role="tooltip"
          style={{
            position: "fixed",
            top: coords.top,
            left: coords.left,
            transform: transformMap[placement],
            background: "#0F172A",
            color: "#fff",
            fontSize: 12,
            fontWeight: 500,
            padding: "6px 10px",
            borderRadius: 8,
            whiteSpace: "nowrap",
            boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
            zIndex: 2147483647,
            pointerEvents: "none",
            animation: "tooltipFadeIn 0.15s ease-out",
          }}
        >
          {content}
          <style>{`
            @keyframes tooltipFadeIn {
              from { opacity: 0; transform: ${transformMap[placement]} scale(0.94); }
              to   { opacity: 1; transform: ${transformMap[placement]} scale(1); }
            }
          `}</style>
        </span>
      )}
    </>
  );
}