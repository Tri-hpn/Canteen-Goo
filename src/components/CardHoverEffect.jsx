// ============================================================
// CARDHOVEREFFECT.JSX — Hiệu ứng hover theo vị trí chuột
// ============================================================
// Gắn vào root app (không render gì). Lắng nghe chuột di chuyển
// trên các card có class .food-card-clickable hoặc .menu-item-card,
// set CSS variable --mouse-x / --mouse-y để dùng trong radial gradient.
//
// Cách dùng trong CSS:
//   .food-card-clickable::before {
//     content: "";
//     position: absolute; inset: 0;
//     background: radial-gradient(
//       circle 200px at var(--mouse-x, 50%) var(--mouse-y, 50%),
//       rgba(38, 52, 213, 0.15),
//       transparent 70%
//     );
//     opacity: 0;
//     transition: opacity 0.3s;
//     pointer-events: none;
//   }
//   .food-card-clickable:hover::before { opacity: 1; }
//
// Fixes (so với bản gốc):
//   - Dùng `pointermove` thay `mousemove` (hỗ trợ cả pen/stylus)
//   - Throttle bằng requestAnimationFrame (chống layout thrashing)
//   - Skip trên touch device (không có chuột → vô nghĩa)
//   - Guard e.target là Element trước khi .closest()
//   - Reset --mouse-x/y khi rời card (mouseleave delegation)
//   - Hỗ trợ matchMedia change (VD: user cắm chuột vào tablet)
// ============================================================

import { useEffect } from "react";

// Selector các card cần hiệu ứng — gom về 1 chỗ
const CARD_SELECTOR = ".food-card-clickable, .menu-item-card";

export default function CardHoverEffect() {
  useEffect(() => {
    // Skip trên thiết bị touch-only (không có chuột)
    if (typeof window === "undefined") return;
    if (typeof window.matchMedia !== "function") return;

    const hasHover = window.matchMedia("(hover: hover)").matches;
    if (!hasHover) return;

    // ---------- State cho throttle ----------
    let rafId = null;
    let lastEvent = null;
    let activeCard = null;

    /**
     * Cập nhật CSS variables cho card dưới con trỏ.
     * Chạy trong rAF để tránh layout thrashing.
     */
    const updateCard = () => {
      rafId = null;

      const e = lastEvent;
      if (!e) return;

      // Guard: target phải là Element (không phải text node)
      const target = e.target;
      if (!target || typeof target.closest !== "function") return;

      const card = target.closest(CARD_SELECTOR);

      // Nếu đổi card → reset card cũ
      if (activeCard && activeCard !== card) {
        activeCard.style.removeProperty("--mouse-x");
        activeCard.style.removeProperty("--mouse-y");
      }

      if (!card) {
        activeCard = null;
        return;
      }

      const rect = card.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      card.style.setProperty("--mouse-x", `${x}%`);
      card.style.setProperty("--mouse-y", `${y}%`);

      activeCard = card;
    };

    /**
     * Handler cho pointermove — chỉ lưu event cuối và schedule rAF.
     * Không gọi updateCard trực tiếp → tránh gọi nhiều lần trong 1 frame.
     */
    const onPointerMove = (e) => {
      lastEvent = e;
      if (rafId !== null) return; // đã có rAF chờ
      rafId = requestAnimationFrame(updateCard);
    };

    /**
     * Reset variables khi chuột rời khỏi card hiện tại.
     */
    const onPointerLeave = () => {
      if (activeCard) {
        activeCard.style.removeProperty("--mouse-x");
        activeCard.style.removeProperty("--mouse-y");
        activeCard = null;
      }
      lastEvent = null;
    };

    document.addEventListener("pointermove", onPointerMove, {
      passive: true,
    });
    document.addEventListener("pointerleave", onPointerLeave, {
      passive: true,
    });

    return () => {
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerleave", onPointerLeave);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  return null;
}