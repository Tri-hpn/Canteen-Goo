import fetch from "node-fetch";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_FILE = path.join(__dirname, "translate-cache.json");

const memoryCache = new Map();
let saveTimer = null;

// ✅ CONCURRENCY LIMITER — tối đa 3 request MyMemory cùng lúc
const MAX_CONCURRENT = 3;
const REQUEST_TIMEOUT_MS = 8000; // MyMemory chậm hơn Google chút

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

// ---------- Translate 1 đoạn qua MyMemory ----------
export async function translateOne(text, targetLang) {
  if (!text || !String(text).trim()) return "";
  if (targetLang === "vi") return text;

  const key = cacheKey(text, targetLang);
  if (memoryCache.has(key)) return memoryCache.get(key);

  // MyMemory giới hạn 500 chars/request
  if (String(text).length > 500) {
    console.warn("[translate] skip: text > 500 chars");
    return text;
  }

  // ✅ Chờ slot từ limiter
  await acquire();

  try {
    const url =
      "https://api.mymemory.translated.net/get" +
      "?q=" + encodeURIComponent(text) +
      "&langpair=vi|" + encodeURIComponent(targetLang);

    // AbortController với timeout 8s (MyMemory chậm hơn Google)
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

    // Check rate limit / quota exceeded
    if (data?.responseStatus === 429 || data?.responseStatus === 403) {
      throw new Error("Rate limit / quota exceeded");
    }

    // MyMemory trả về translatedText trong responseData
    let translated = data?.responseData?.translatedText || "";

    // MyMemory đôi khi trả về string rỗng hoặc message lỗi
    if (!translated || translated === text) {
      // Fallback: giữ nguyên
      memoryCache.set(key, text);
      scheduleSaveCache();
      return text;
    }

    // Cleanup HTML entities nếu có
    translated = translated
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");

    memoryCache.set(key, translated);
    scheduleSaveCache();
    return translated;
  } catch (err) {
    const isTimeout = err.name === "AbortError" || err.type === "aborted";
    if (!isTimeout) {
      console.warn("[translate] fail " + String(text).slice(0, 30) + " -> " + targetLang + ":", err.message);
    }
    // Fallback: trả về text gốc (không cache để lần sau thử lại)
    return text;
  } finally {
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