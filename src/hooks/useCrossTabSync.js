// ============================================================
// useCrossTabSync.js - Sync state giua cac tab qua localStorage
// ============================================================
import { useEffect, useState, useCallback } from "react";

export function useCrossTabSync(key, defaultValue = null) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    const handler = (e) => {
      if (e.key !== key) return;
      try {
        const next = e.newValue ? JSON.parse(e.newValue) : defaultValue;
        setValue(next);
      } catch {
        setValue(defaultValue);
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [key, defaultValue]);

  // Reset khi auth-expired / logout
  useEffect(() => {
    const reset = () => {
      try {
        localStorage.removeItem(key);
      } catch {}
      setValue(defaultValue);
    };
    window.addEventListener("auth-expired", reset);
    window.addEventListener("logout", reset);
    return () => {
      window.removeEventListener("auth-expired", reset);
      window.removeEventListener("logout", reset);
    };
  }, [key, defaultValue]);

  const set = useCallback(
    (next) => {
      try {
        const value = typeof next === "function" ? next(value) : next;
        if (value === null || value === undefined) {
          localStorage.removeItem(key);
        } else {
          localStorage.setItem(key, JSON.stringify(value));
        }
        setValue(value);
      } catch (err) {
        console.error("[useCrossTabSync] " + key + ":", err);
      }
    },
    [key, value]
  );

  return [value, set];
}