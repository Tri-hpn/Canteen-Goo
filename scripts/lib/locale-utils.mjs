// ============================================================
// LOCALE-UTILS.MJS — Helpers cho auto-translate
// ============================================================

/**
 * Che placeholder `{name}`, `{n}` → `__PH0__`, `__PH1__`
 * để Google Translate không dịch chúng.
 * Sau khi dịch xong → restore lại.
 */
export function protectPlaceholders(text, patterns = []) {
  const placeholders = [];
  const defaultPattern = /\{[^}]+\}/g;
  const allPatterns = [defaultPattern];

  // Compile custom patterns từ config
  for (const p of patterns) {
    try {
      allPatterns.push(new RegExp(p, "g"));
    } catch {}
  }

  let protectedText = text;
  for (const regex of allPatterns) {
    protectedText = protectedText.replace(regex, (match) => {
      const idx = placeholders.push(match) - 1;
      return `__PH${idx}__`;
    });
  }

  return { text: protectedText, placeholders };
}

export function restorePlaceholders(text, placeholders) {
  return text.replace(/__PH(\d+)__/g, (_, idx) => {
    const orig = placeholders[+idx];
    return orig !== undefined ? orig : "";
  });
}

/**
 * Có nên skip (không dịch) text này không?
 */
export function shouldSkip(text, config) {
  if (!text || typeof text !== "string") return true;
  if (text.trim().length < (config.minLength || 2)) return true;

  for (const pattern of config.skipPatterns || []) {
    try {
      if (new RegExp(pattern, "u").test(text)) return true;
    } catch {}
  }

  return false;
}

/**
 * Sleep helper
 */
export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}