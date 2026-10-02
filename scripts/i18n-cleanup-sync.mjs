import fs from "node:fs";
import path from "node:path";

const LOCALES_DIR = path.join(process.cwd(), "src", "lib", "i18n", "locales");
const ARCHIVE_DIR = path.join(LOCALES_DIR, "_archive");

// ---------- 1. Di chuyen file rac sang _archive ----------
console.log("[1] Di chuyen file rac sang _archive...\n");
const entries = fs.readdirSync(LOCALES_DIR);
let moved = 0;
for (const f of entries) {
  const full = path.join(LOCALES_DIR, f);
  if (!fs.statSync(full).isFile()) continue;
  if (f.endsWith(".bak") || f.includes(".backup-") || f.includes(".dupfix")) {
    const dest = path.join(ARCHIVE_DIR, f);
    fs.renameSync(full, dest);
    console.log("  [MOVED] " + f);
    moved++;
  }
}
if (moved === 0) console.log("  [OK] Khong co file rac");

// ---------- 2. Cleanup _source.json ----------
console.log("\n[2] Cleanup _source.json...\n");
const SOURCE_FILE = path.join(LOCALES_DIR, "_source.json");
const rawSource = fs.readFileSync(SOURCE_FILE, "utf-8");
const sourceObj = JSON.parse(rawSource);

const sourceKeysBefore = Object.keys(sourceObj).length;
const cleanedSource = {};
const removedSource = [];

for (const [k, v] of Object.entries(sourceObj)) {
  const isDotKey = k.includes(".") && !k.includes(" ") && !k.includes("\n");
  const isSelfRef = k === v;
  if (isDotKey && isSelfRef) {
    removedSource.push(k);
    continue;
  }
  cleanedSource[k] = v;
}

fs.writeFileSync(SOURCE_FILE, JSON.stringify(cleanedSource, null, 2) + "\n", "utf-8");
console.log("  Truoc: " + sourceKeysBefore + " keys");
console.log("  Sau:   " + Object.keys(cleanedSource).length + " keys");
console.log("  Da xoa: " + removedSource.length + " key rac\n");

// ---------- 3. Sync locale - chi giu key co trong _source ----------
console.log("[3] Sync locale voi _source...\n");
const sourceKeySet = new Set(Object.keys(cleanedSource));

for (const lang of ["en", "ja", "ko", "zh"]) {
  const p = path.join(LOCALES_DIR, lang + ".json");
  if (!fs.existsSync(p)) {
    console.log("  [" + lang + "] KHONG TON TAI - tao moi");
    fs.writeFileSync(p, "{}\n", "utf-8");
    continue;
  }

  const dict = JSON.parse(fs.readFileSync(p, "utf-8"));
  const before = Object.keys(dict).length;

  const cleaned = {};
  for (const k of Object.keys(cleanedSource)) {
    if (dict[k] !== undefined) cleaned[k] = dict[k];
  }

  const after = Object.keys(cleaned).length;
  const removed = before - after;

  const sorted = {};
  Object.keys(cleaned).sort().forEach((k) => { sorted[k] = cleaned[k]; });

  fs.writeFileSync(p, JSON.stringify(sorted, null, 2) + "\n", "utf-8");
  console.log("  [" + lang + "] " + before + " -> " + after + " (xoa " + removed + " key thua)");
}

// ---------- 4. Coverage sau khi cleanup ----------
console.log("\n[4] Coverage sau cleanup:\n");
const source = JSON.parse(fs.readFileSync(SOURCE_FILE, "utf-8"));
const sourceKeys = Object.keys(source);
console.log("  Source: " + sourceKeys.length + " keys\n");

for (const lang of ["en", "ja", "ko", "zh"]) {
  const p = path.join(LOCALES_DIR, lang + ".json");
  const dict = JSON.parse(fs.readFileSync(p, "utf-8"));
  let translated = 0;
  for (const k of sourceKeys) {
    const v = dict[k];
    if (v && v !== k) translated++;
  }
  const missing = sourceKeys.length - translated;
  const pct = Math.round((translated / sourceKeys.length) * 1000) / 10;
  const status = pct >= 90 ? "SAN SANG" : pct >= 50 ? "TRUNG BINH" : "YEU";
  console.log("  [" + lang + "] " + translated + " / " + sourceKeys.length + " (" + pct + "%) [MISSING: " + missing + "] [" + status + "]");
}

console.log("\n[DONE]");