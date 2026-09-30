// ============================================================
// EFFECTS.JSX — Hiệu ứng toàn cục + Toast system
// ============================================================
// File này không có text hiển thị trực tiếp (toast nhận message
// từ caller), nên KHÔNG cần i18n.
// ============================================================

import { useEffect, useRef } from "react";

export function CursorGlow() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (typeof window.matchMedia !== "function") return;

    const hasHover = window.matchMedia("(hover: hover)").matches;
    if (!hasHover) return;

    const el = document.createElement("div");
    el.className = "cursor-glow";
    el.setAttribute("aria-hidden", "true");
    document.body.appendChild(el);

    let rafId = null;
    let lastX = 0;
    let lastY = 0;

    const applyPosition = () => {
      rafId = null;
      el.style.transform = `translate3d(${lastX}px, ${lastY}px, 0)`;
    };

    const move = (e) => {
      lastX = e.clientX;
      lastY = e.clientY;
      if (rafId !== null) return;
      rafId = requestAnimationFrame(applyPosition);
    };

    window.addEventListener("mousemove", move, { passive: true });

    return () => {
      window.removeEventListener("mousemove", move);
      if (rafId !== null) cancelAnimationFrame(rafId);
      el.remove();
    };
  }, []);

  return null;
}

export function BgParticles() {
  return <div className="bg-particles" aria-hidden="true" />;
}

const TOAST_CONTAINER_ID = "toast-container";
const TOAST_MAX = 5;
const DEFAULT_DURATION = 3000;
const ANIMATION_OUT_MS = 200;

const ICONS = {
  success:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
  error:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
  warning:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  info:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
};

function getContainer() {
  let container = document.getElementById(TOAST_CONTAINER_ID);
  if (!container) {
    container = document.createElement("div");
    container.id = TOAST_CONTAINER_ID;
    container.className = "toast-container";
    container.setAttribute("role", "status");
    container.setAttribute("aria-live", "polite");
    document.body.appendChild(container);
  }
  return container;
}

function dismissToast(el) {
  if (!el || el.dataset.dismissed === "1") return;
  el.dataset.dismissed = "1";

  el.classList.add("toast-exit");
  setTimeout(() => {
    el.remove();
  }, ANIMATION_OUT_MS);
}

export function toast(message, type = "info", options = {}) {
  if (typeof document === "undefined") return;
  if (!message) return;

  const safeType = ["success", "error", "info", "warning"].includes(type)
    ? type
    : "info";

  const duration = Math.max(1000, options.duration || DEFAULT_DURATION);
  const container = getContainer();

  if (options.center) {
    container.classList.add("toast-container--center");
  }

  if (options.id) {
    const existing = container.querySelector(
      `[data-toast-id="${options.id}"]`
    );
    if (existing) existing.remove();
  }

  const current = container.children;
  if (current.length >= TOAST_MAX) {
    dismissToast(current[0]);
  }

  const el = document.createElement("div");
  el.className =
    `toast toast--${safeType}` + (options.center ? " toast--center" : "");
  if (options.id) el.dataset.toastId = options.id;
  el.setAttribute("role", "alert");

  const iconEl = document.createElement("div");
  iconEl.className = "toast__icon";
  iconEl.innerHTML = ICONS[safeType] || ICONS.info;

  const msgEl = document.createElement("div");
  msgEl.className = "toast__message";
  msgEl.textContent = message;

  const closeEl = document.createElement("button");
  closeEl.className = "toast__close";
  closeEl.setAttribute("aria-label", "Close");
  closeEl.setAttribute("type", "button");
  closeEl.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

  el.appendChild(iconEl);
  el.appendChild(msgEl);
  el.appendChild(closeEl);
  container.appendChild(el);

  const closeBtn = () => dismissToast(el);
  closeEl.addEventListener("click", closeBtn);

  let timer = setTimeout(() => dismissToast(el), duration);

  const pause = () => {
    clearTimeout(timer);
  };
  const resume = () => {
    timer = setTimeout(() => dismissToast(el), 1500);
  };

  el.addEventListener("mouseenter", pause);
  el.addEventListener("mouseleave", resume);

  const observer = new MutationObserver(() => {
    if (!document.body.contains(el)) {
      clearTimeout(timer);
      closeEl.removeEventListener("click", closeBtn);
      el.removeEventListener("mouseenter", pause);
      el.removeEventListener("mouseleave", resume);
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}