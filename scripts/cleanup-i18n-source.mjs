import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCE_FILE = path.join(__dirname, "..", "src", "lib", "i18n", "locales", "_source.json");

if (!fs.existsSync(SOURCE_FILE)) {
  console.error("[X] Khong tim thay _source.json");
  process.exit(1);
}

const backup = SOURCE_FILE.replace(".json", ".backup-" + Date.now() + ".json");
fs.copyFileSync(SOURCE_FILE, backup);
console.log("[Backup] " + path.basename(backup));

const source = JSON.parse(fs.readFileSync(SOURCE_FILE, "utf-8"));
const before = Object.keys(source).length;

const cleaned = {};
const removed = [];

for (const [k, v] of Object.entries(source)) {
  const isDotKey = k.includes(".") && !k.includes(" ");
  const isSelfRef = k === v;
  if (isDotKey && isSelfRef) { removed.push(k); continue; }
  cleaned[k] = v;
}

fs.writeFileSync(SOURCE_FILE, JSON.stringify(cleaned, null, 2), "utf-8");

console.log("");
console.log("[OK] Da xoa " + removed.length + " key rac");
console.log("   Truoc: " + before + " keys");
console.log("   Sau:   " + Object.keys(cleaned).length + " keys");
console.log("");

if (removed.length > 0 && removed.length <= 30) {
  removed.forEach((k) => console.log("   - " + k));
} else if (removed.length > 30) {
  removed.slice(0, 30).forEach((k) => console.log("   - " + k));
  console.log("   ... va " + (removed.length - 30) + " key khac");
}