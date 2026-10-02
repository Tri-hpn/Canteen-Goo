// ============================================================
// AUTO TRANSLATE — Dịch text qua Google Translate (free)
// Cache memory + fallback về tiếng Việt nếu API lỗi
// ============================================================

import fetch from "node-fetch";

const memoryCache = new Map();

function cacheKey(text, lang) {
  return `${text}||${lang}`;
}

export async function translateOne(text, targetLang) {
  if (!text || !String(text).trim()) return "";
  if (targetLang === "vi") return text;

  const key = cacheKey(text, targetLang);
  if (memoryCache.has(key)) return memoryCache.get(key);

  try {
    const url =
      `https://translate.googleapis.com/translate_a/single` +
      `?client=gtx&sl=vi&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;

    const res = await fetch(url, { timeout: 5000 });
    if (!res.ok) throw new Error("API failed");

    const data = await res.json();
    const translated =
      data?.[0]?.map((seg) => seg?.[0]).filter(Boolean).join("") || text;

    memoryCache.set(key, translated);
    return translated;
  } catch (err) {
    console.warn(`[translate] fail "${text}" -> ${targetLang}:`, err.message);
    return text;
  }
}

export async function translateFields(obj, fields, targetLangs) {
  if (!obj) return obj;

  const plain = obj.toObject ? obj.toObject() : { ...obj };
  const tasks = [];

  for (const lang of targetLangs) {
    for (const field of fields) {
      const text = plain[field];
      if (!text || plain[`${field}_${lang}`]) continue;

      tasks.push(
        translateOne(text, lang).then((translated) => {
          plain[`${field}_${lang}`] = translated;
        })
      );
    }
  }

  await Promise.all(tasks);
  return plain;
}

export async function translateList(items, fields, targetLangs) {
  if (!Array.isArray(items)) return items;
  return Promise.all(
    items.map((it) => translateFields(it, fields, targetLangs))
  );
}
