import fetch from "node-fetch";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_FILE = path.join(__dirname, "translate-cache.json");

const memoryCache = new Map();
let saveTimer = null;

// ✅ CONCURRENCY LIMITER — tối đa 3 request Google cùng lúc
// Tránh server tự DDoS Google → bị block IP
const MAX_CONCURRENT = 3;
const REQUEST_TIMEOUT_MS = 3000; // 3s timeout thay vì 5s
let running = 0;
const waitQueue = [];

function acquire() {
  return new Promise((resolve) => {
    if (running < MAX_CONCURRENT) {
      running++;
      resolve();
    } else {
      waitQueue.push(resolve);
    }
  });
}

function release() {
  running--;
  if (waitQueue.length > 0) {
    running++;
    const next = waitQueue.shift();
    next();
  }
}

// ---------- Cache ----------
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

// ---------- Translate 1 đoạn ----------
export async function translateOne(text, targetLang) {
  if (!text || !String(text).trim()) return "";
  if (targetLang === "vi") return text;

  const key = cacheKey(text, targetLang);
  if (memoryCache.has(key)) return memoryCache.get(key);

  // ✅ Chờ slot từ limiter
  await acquire();

  try {
    const url =
      "https://translate.googleapis.com/translate_a/single" +
      "?client=gtx&sl=vi&tl=" + targetLang + "&dt=t&q=" + encodeURIComponent(text);

    // ✅ AbortController với timeout 3s
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let res;
    try {
      res = await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!res.ok) throw new Error("HTTP " + res.status);

    const data = await res.json();
    const translated =
      (data && data[0] && data[0].map((seg) => seg && seg[0]).filter(Boolean).join("")) || text;

    memoryCache.set(key, translated);
    scheduleSaveCache();
    return translated;
  } catch (err) {
    // Fail nhanh, không log spam khi timeout
    const isTimeout = err.name === "AbortError" || err.type === "aborted";
    if (!isTimeout) {
      console.warn("[translate] fail " + text.slice(0, 30) + " -> " + targetLang + ":", err.message);
    }
    return text;
  } finally {
    // ✅ Luôn release slot dù thành công hay thất bại
    release();
  }
}

// ---------- Batch translate ----------
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