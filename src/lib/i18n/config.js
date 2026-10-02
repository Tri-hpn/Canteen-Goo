// ============================================================
// I18N CONFIG — Danh sách ngôn ngữ hỗ trợ
// ============================================================
// Thêm ngôn ngữ mới = thêm 1 dòng vào LANGUAGES
// + tạo file src/lib/i18n/locales/{code}.json
// ============================================================

export const DEFAULT_LANG = "vi";
export const STORAGE_KEY = "canteen_lang";

export const LANGUAGES = [
  { code: "vi", label: "Tiếng Việt", flag: "🇻🇳", dir: "ltr" },
  { code: "en", label: "English",    flag: "🇬🇧", dir: "ltr" },
  { code: "ja", label: "日本語",      flag: "🇯🇵", dir: "ltr" },
  { code: "ko", label: "한국어",      flag: "🇰🇷", dir: "ltr" },
  { code: "zh", label: "中文",        flag: "🇨🇳", dir: "ltr" },
];