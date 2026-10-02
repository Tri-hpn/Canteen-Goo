import fetch from "node-fetch";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_FILE = path.join(__dirname, "translate-cache.json");

const memoryCache = new Map();
let saveTimer = null;

function loadCacheFromFile() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const raw = fs.readFileSync(CACHE_FILE, "utf-8");
      const obj = JSON.parse(raw);
      for (const [k, v] of Object.entries(obj)) memoryCache.set(k, v);
      console.log("[translate] Loaded " + memoryCache.size + " cached entries");
    }
  } catch (e) {
    console.warn("[translate] Cannot load cache:", e.message);
  }
}

function scheduleSaveCache() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      const obj = {};
      for (const [k, v] of memoryCache.entries()) obj[k] = v;
      fs.writeFileSync(CACHE_FILE, JSON.stringify(obj, null, 2), "utf-8");
    } catch (e) {
      console.warn("[translate] Cannot save cache:", e.message);
    }
    saveTimer = null;
  }, 3000);
}

loadCacheFromFile();

function cacheKey(text, lang) {
  return text + "||" + lang;
}

export async function translateOne(text, targetLang) {
  if (!text || !String(text).trim()) return "";
  if (targetLang === "vi") return text;

  const key = cacheKey(text, targetLang);
  if (memoryCache.has(key)) return memoryCache.get(key);

  try {
    const url =
      "https://translate.googleapis.com/translate_a/single" +
      "?client=gtx&sl=vi&tl=" + targetLang + "&dt=t&q=" + encodeURIComponent(text);

    const res = await fetch(url, { timeout: 5000 });
    if (!res.ok) throw new Error("API failed");

    const data = await res.json();
    const translated =
      (data && data[0] && data[0].map((seg) => seg && seg[0]).filter(Boolean).join("")) || text;

    memoryCache.set(key, translated);
    scheduleSaveCache();
    return translated;
  } catch (err) {
    console.warn("[translate] fail " + text + " -> " + targetLang + ":", err.message);
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
      if (!text || plain[field + "_" + lang]) continue;
      tasks.push(
        translateOne(text, lang).then((translated) => {
          plain[field + "_" + lang] = translated;
        })
      );
    }
  }

  await Promise.all(tasks);
  return plain;
}

export async function translateList(items, fields, targetLangs) {
  if (!Array.isArray(items)) return items;
  return Promise.all(items.map((it) => translateFields(it, fields, targetLangs)));
}

export function getCacheSize() {
  return memoryCache.size;
}