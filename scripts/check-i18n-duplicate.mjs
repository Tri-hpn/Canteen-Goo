#!/usr/bin/env node
// ============================================================
// CHECK I18N DUPLICATE KEYS
// ============================================================
// Quét tất cả file locale trong src/lib/i18n/locales/*.json
// và báo cáo các key bị TRÙNG (cùng key xuất hiện nhiều lần).
//
// ⚠️ Lưu ý: JSON.parse() sẽ TỰ ĐỘNG ghi đè key trùng — key sau
// thắng. Vì vậy để phát hiện trùng, phải đọc raw text và regex.
// ============================================================

import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const LOCALES_DIR = join(__dirname, "..", "src", "lib", "i18n", "locales");

// Đọc raw text và đếm số lần xuất hiện của mỗi key (top-level)
function findDuplicateKeys(rawText) {
  const keyCounts = new Map();
  const keyLines = new Map();

  // Match: "key": value  (key nằm trong dấu ngoặc kép ở đầu dòng,
  // có thể có khoảng trắng indent)
  const regex = /^\s*"((?:[^"\\]|\\.)*)"\s*:/gm;

  let match;
  while ((match = regex.exec(rawText)) !== null) {
    const key = match[1];
    const beforeMatch = rawText.slice(0, match.index);
    const line = beforeMatch.split("\n").length;

    keyCounts.set(key, (keyCounts.get(key) || 0) + 1);

    if (!keyLines.has(key)) {
      keyLines.set(key, []);
    }
    keyLines.get(key).push(line);
  }

  const duplicates = [];
  for (const [key, count] of keyCounts.entries()) {
    if (count > 1) {
      duplicates.push({
        key,
        count,
        lines: keyLines.get(key),
      });
    }
  }

  return duplicates;
}

// Format key dài để in gọn
function shortenKey(key, max = 80) {
  const clean = key.replace(/\n/g, "\\n");
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 3) + "...";
}

// Main
function main() {
  let files;
  try {
    files = readdirSync(LOCALES_DIR).filter((f) => f.endsWith(".json"));
  } catch (err) {
    console.error(`❌ Không đọc được thư mục: ${LOCALES_DIR}`);
    console.error(err.message);
    process.exit(1);
  }

  if (files.length === 0) {
    console.log("ℹ️  Không có file .json nào trong locales/");
    return;
  }

  console.log("🔍 Checking duplicate i18n keys...\n");

  let totalDupes = 0;
  let hasError = false;

  for (const file of files) {
    const filePath = join(LOCALES_DIR, file);
    const raw = readFileSync(filePath, "utf8");

    const dupes = findDuplicateKeys(raw);

    if (dupes.length === 0) {
      console.log(`✅ ${file} — OK (không trùng key)`);
      continue;
    }

    hasError = true;
    totalDupes += dupes.length;
    console.log(`\n⚠️  ${file} — ${dupes.length} key bị TRÙNG:\n`);

    // Sắp xếp theo số lần trùng giảm dần
    dupes.sort((a, b) => b.count - a.count);

    for (const d of dupes) {
      console.log(
        `   🔸 "${shortenKey(d.key)}"`
      );
      console.log(
        `      → xuất hiện ${d.count} lần (dòng: ${d.lines.join(", ")})`
      );
    }
    console.log("");
  }

  console.log("\n" + "─".repeat(60));
  if (hasError) {
    console.log(`❌ Tổng cộng: ${totalDupes} key trùng trong các file locale`);
    console.log("💡 Chạy `node scripts/fix-i18n-duplicate.mjs` để tự động sửa.\n");
    process.exit(1);
  } else {
    console.log("✨ Tất cả file locale đều sạch, không có key trùng!\n");
    process.exit(0);
  }
}

main();