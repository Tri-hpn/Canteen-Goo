// ============================================================
// I18N CORE — Source-text based, không cần key thủ công
// ============================================================
// Nguyên tắc:
//   1. Tiếng Việt là SOURCE OF TRUTH (viết trực tiếp trong code)
//   2. Key = chính câu tiếng Việt (không slugify)
//   3. Load locale dynamic import → code-split
//   4. Fallback: thiếu dịch → hiện tiếng Việt (không lỗi)
//   5. Hỗ trợ placeholder + pluralization đơn giản
// ============================================================

import { LANGUAGES, DEFAULT_LANG, STORAGE_KEY } from "./config";

// ---------- State ----------
const localeCache = new Map();
let currentLang = readStoredLang();
let currentDict = {};
let ready = false;
const listeners = new Set();

// ---------- Đọc ngôn ngữ đã lưu ----------
function readStoredLang() {
  if (typeof window === "undefined") return DEFAULT_LANG;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && LANGUAGES.some((l) => l.code === saved)) return saved;

    const browser = (navigator.language || "").split("-")[0].toLowerCase();
    if (browser && LANGUAGES.some((l) => l.code === browser)) return browser;
  } catch {}
  return DEFAULT_LANG;
}

// ---------- Load locale (dynamic import → code split) ----------
async function loadLocale(lang) {
  if (localeCache.has(lang)) return localeCache.get(lang);

  try {
    const mod = await import(`./locales/${lang}.json`);
    const dict = mod.default || mod;
    localeCache.set(lang, dict);
    return dict;
  } catch (e) {
    if (import.meta.env?.DEV) {
      console.warn(`[i18n] Không load được locale "${lang}"`, e);
    }
    return {};
  }
}

// ---------- Interpolation: "Xin chào {name}" ----------
function interpolate(str, vars) {
  if (!vars || typeof str !== "string") return str;
  return str.replace(/\{(\w+)\}/g, (_, k) =>
    vars[k] !== undefined ? String(vars[k]) : `{${k}}`
  );
}

// ---------- Pluralization: "1 item|{n} items" ----------
function pluralize(translated, vars) {
  if (!vars || vars.n === undefined) return translated;
  if (!translated.includes("|")) return translated;

  const [plural, singular] = translated.split("|").map((s) => s.trim());
  const n = Number(vars.n);
  return n === 1 ? singular : plural;
}

// ---------- Core translate ----------
export function t(source, vars) {
  if (!source) return "";

  // VI: trả nguyên gốc (source of truth)
  if (currentLang === DEFAULT_LANG) {
    return interpolate(source, vars);
  }

  // Tra dict
  const translated = currentDict[source];

  // Fallback: thiếu → giữ VI
  if (!translated) {
    if (import.meta.env?.DEV) {
      console.warn(`[i18n] Missing "${currentLang}": "${source}"`);
    }
    return interpolate(source, vars);
  }

  const withPlural = pluralize(translated, vars);
  return interpolate(withPlural, vars);
}

// ---------- Đổi ngôn ngữ ----------
export async function setLang(lang) {
  if (!LANGUAGES.some((l) => l.code === lang)) {
    console.warn(`[i18n] Ngôn ngữ không hợp lệ: "${lang}"`);
    return;
  }
  if (lang === currentLang && ready) return;

  const dict = await loadLocale(lang);
  currentLang = lang;
  currentDict = dict;
  ready = true;

  try {
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;
    const meta = LANGUAGES.find((l) => l.code === lang);
    document.documentElement.dir = meta?.dir || "ltr";
  } catch {}

  listeners.forEach((fn) => {
    try { fn(lang); } catch {}
  });
}

// ---------- Init ----------
export async function initI18n() {
  const dict = await loadLocale(currentLang);
  currentDict = dict;
  ready = true;
  return currentLang;
}

// ---------- Subscribe ----------
export function onLangChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// ---------- Getters ----------
export function getLang() {
  return currentLang;
}

export function getAvailableLangs() {
  return LANGUAGES;
}

export function isReady() {
  return ready;
}

// ---------- Format helpers (dùng locale hiện tại) ----------
export function formatNumber(n, opts) {
  try {
    return new Intl.NumberFormat(currentLang, opts).format(n);
  } catch {
    return String(n);
  }
}

export function formatDate(date, opts) {
  try {
    return new Intl.DateTimeFormat(currentLang, opts).format(new Date(date));
  } catch {
    return String(date);
  }
}

export function formatCurrency(n, currency = "VND") {
  try {
    return new Intl.NumberFormat(currentLang, {
      style: "currency",
      currency,
    }).format(n);
  } catch {
    return String(n) + " " + currency;
  }
}