#!/usr/bin/env node
// ============================================================
// FIX I18N DUPLICATE KEYS
// ============================================================
// Tự động xóa key TRÙNG trong file locale JSON.
//
// Quy tắc:
//   - Key trùng → giữ lại key CUỐI CÙNG (vì JSON.parse last-wins,
//     giữ cuối để không đổi hành vi runtime).
//   - Backup file gốc thành *.json.bak trước khi ghi.
//   - Giữ nguyên thứ tự các key còn lại.
//   - Pretty print 2 spaces + newline cuối file.
//
// ⚠️ Chạy `check-i18n-duplicate.mjs` trước để xem report.
// ============================================================

import { readFileSync, writeFileSync, readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const LOCALES_DIR = join(__dirname, "..", "src", "lib", "i18n", "locales");
const BACKUP_SUFFIX = ".bak";

// ---------- Parse key + value từ raw text (giữ nguyên thứ tự) ----------
// Trả về array { key, rawValue, rawLine }
// rawValue = toàn bộ phần value (chuỗi raw, chưa parse)
function parseTopLevelEntries(rawText) {
  const entries = [];
  const len = rawText.length;
  let i = 0;

  // Bỏ qua whitespace + `{`
  while (i < len && /\s/.test(rawText[i])) i++;
  if (rawText[i] !== "{") {
    throw new Error("File không bắt đầu bằng '{'");
  }
  i++; // skip {

  while (i < len) {
    // Skip whitespace + dấu phẩy
    while (i < len && /[\s,]/.test(rawText[i])) i++;
    if (i >= len) break;
    if (rawText[i] === "}") break;

    // Đọc key (string có escape)
    if (rawText[i] !== '"') {
      throw new Error(`Expected '"' at position ${i}, got '${rawText[i]}'`);
    }
    const keyStart = i;
    i++;
    while (i < len) {
      if (rawText[i] === "\\") {
        i += 2;
        continue;
      }
      if (rawText[i] === '"') break;
      i++;
    }
    if (i >= len) throw new Error("Unterminated key string");
    const keyRaw = rawText.slice(keyStart, i + 1); // bao gồm cả 2 dấu "
    i++; // skip closing "

    let key;
    try {
      key = JSON.parse(keyRaw);
    } catch {
      throw new Error(`Invalid key JSON: ${keyRaw}`);
    }

    // Skip whitespace + `:`
    while (i < len && /\s/.test(rawText[i])) i++;
    if (rawText[i] !== ":") {
      throw new Error(`Expected ':' after key "${key}"`);
    }
    i++;
    while (i < len && /\s/.test(rawText[i])) i++;

    // Đọc value (có thể là string / number / bool / null / object / array)
    const valueStart = i;
    i = skipValue(rawText, i);
    const valueRaw = rawText.slice(valueStart, i).trim();

    entries.push({ key, keyRaw, valueRaw });
  }

  return entries;
}

// Skip một JSON value, trả về index ngay sau value
function skipValue(text, i) {
  const len = text.length;
  const c = text[i];

  // String
  if (c === '"') {
    i++;
    while (i < len) {
      if (text[i] === "\\") {
        i += 2;
        continue;
      }
      if (text[i] === '"') return i + 1;
      i++;
    }
    throw new Error("Unterminated string value");
  }

  // Object / Array
  if (c === "{" || c === "[") {
    let depth = 0;
    let inString = false;
    while (i < len) {
      const ch = text[i];
      if (inString) {
        if (ch === "\\") {
          i += 2;
          continue;
        }
        if (ch === '"') inString = false;
      } else {
        if (ch === '"') inString = true;
        else if (ch === "{" || ch === "[") depth++;
        else if (ch === "}" || ch === "]") {
          depth--;
          if (depth === 0) return i + 1;
        }
      }
      i++;
    }
    throw new Error("Unterminated object/array value");
  }

  // Number / bool / null
  while (i < len && !/[,}\]]/.test(text[i])) i++;
  return i;
}

// ---------- Xử lý 1 file ----------
function processFile(filePath) {
  const raw = readFileSync(filePath, "utf8");
  const entries = parseTopLevelEntries(raw);

  // Đếm key
  const counts = new Map();
  for (const e of entries) {
    counts.set(e.key, (counts.get(e.key) || 0) + 1);
  }

  const dupes = [...counts.entries()].filter(([, c]) => c > 1);
  if (dupes.length === 0) {
    return { changed: false, removed: 0, dupes: 0 };
  }

  // Giữ lần xuất hiện CUỐI CÙNG của mỗi key
  const seenLast = new Map(); // key → index của lần xuất hiện cuối
  entries.forEach((e, idx) => {
    seenLast.set(e.key, idx);
  });

  const kept = entries.filter((e, idx) => seenLast.get(e.key) === idx);
  const removedCount = entries.length - kept.length;

  // Ghi lại file (pretty 2 spaces)
  const obj = {};
  for (const e of kept) {
    try {
      obj[e.key] = JSON.parse(e.valueRaw);
    } catch {
      // fallback: giữ raw nếu parse lỗi
      obj[e.key] = e.valueRaw;
    }
  }

  const output = JSON.stringify(obj, null, 2) + "\n";

  // Backup
  const backupPath = filePath + BACKUP_SUFFIX;
  if (!existsSync(backupPath)) {
    writeFileSync(backupPath, raw, "utf8");
  }

  writeFileSync(filePath, output, "utf8");

  return {
    changed: true,
    removed: removedCount,
    dupes: dupes.length,
    keptKeys: kept.length,
  };
}

// ---------- Main ----------
function main() {
  let files;
  try {
    files = readdirSync(LOCALES_DIR).filter(
      (f) => f.endsWith(".json") && !f.endsWith(BACKUP_SUFFIX)
    );
  } catch (err) {
    console.error(`❌ Không đọc được thư mục: ${LOCALES_DIR}`);
    console.error(err.message);
    process.exit(1);
  }

  if (files.length === 0) {
    console.log("ℹ️  Không có file .json nào trong locales/");
    return;
  }

  console.log("🔧 Fixing duplicate i18n keys...\n");

  let totalRemoved = 0;
  let totalFiles = 0;

  for (const file of files) {
    const filePath = join(LOCALES_DIR, file);

    try {
      const result = processFile(filePath);

      if (result.changed) {
        totalFiles++;
        totalRemoved += result.removed;
        console.log(
          `✅ ${file} — xoá ${result.removed} key trùng (${result.dupes} key bị trùng), còn lại ${result.keptKeys} key`
        );
        console.log(`   💾 Backup: ${file}${BACKUP_SUFFIX}`);
      } else {
        console.log(`⚪ ${file} — không có key trùng, bỏ qua`);
      }
    } catch (err) {
      console.error(`❌ ${file} — lỗi: ${err.message}`);
    }
  }

  console.log("\n" + "─".repeat(60));
  if (totalFiles === 0) {
    console.log("✨ Không có gì cần sửa.\n");
  } else {
    console.log(
      `✨ Đã sửa ${totalFiles} file, xoá tổng cộng ${totalRemoved} key trùng.\n`
    );
    console.log("👉 Chạy lại `node scripts/check-i18n-duplicate.mjs` để xác nhận.\n");
  }
}

main();