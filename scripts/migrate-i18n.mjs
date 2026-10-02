// ============================================================
// MIGRATE I18N — Chuyển code cũ sang i18n source-text
// ============================================================
// Usage: node scripts/migrate-i18n.mjs
//
// Việc làm:
//   1. Đọc src/i18n.js → extract map VI (key → text)
//   2. Scan tất cả file .jsx/.js
//   3. Replace t("key") → t("Tiếng Việt")
//   4. Replace import useTranslation → useI18n
//   5. Replace useTranslation() → useI18n()
// ============================================================

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const OLD_I18N_PATH = path.join(ROOT, "src/i18n.js");

if (!fs.existsSync(OLD_I18N_PATH)) {
  console.error("❌ Không tìm thấy src/i18n.js");
  process.exit(1);
}

// ---------- Extract VI block ----------
function extractViMap(content) {
  const viStart = content.indexOf("vi: {");
  if (viStart < 0) return {};

  let depth = 0;
  let start = content.indexOf("{", viStart);
  let end = start;

  for (let i = start; i < content.length; i++) {
    if (content[i] === "{") depth++;
    else if (content[i] === "}") {
      depth--;
      if (depth === 0) { end = i + 1; break; }
    }
  }

  const block = content.slice(start, end);
  const map = {};

  // Match "key": "value"  hoặc  "key": "value with \" escape"
  const lineRegex = /["']([^"']+)["']\s*:\s*"((?:[^"\\]|\\.)*)"/g;
  let m;
  while ((m = lineRegex.exec(block)) !== null) {
    const key = m[1];
    const val = m[2]
      .replace(/\\"/g, '"')
      .replace(/\\n/g, "\\n")
      .replace(/\\\\/g, "\\");
    map[key] = val;
  }
  return map;
}

const oldContent = fs.readFileSync(OLD_I18N_PATH, "utf-8");
const viMap = extractViMap(oldContent);
console.log(`📖 Đọc được ${Object.keys(viMap).length} key VI\n`);

if (Object.keys(viMap).length === 0) {
  console.error("❌ Không parse được VI map. Kiểm tra format i18n.js");
  process.exit(1);
}

// ---------- Walk files ----------
function walk(dir, files = []) {
  const EXCLUDE = [
    "node_modules",
    "dist",
    ".git",
    "src/i18n.js",
    "src/lib/i18n",
    "src/hooks/useI18n",
    "scripts",
  ];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (EXCLUDE.some((ex) => full.includes(ex))) continue;
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(jsx?|tsx?|mjs)$/.test(entry.name)) files.push(full);
  }
  return files;
}

const files = walk(path.join(ROOT, "src"));
console.log(`📂 Tìm thấy ${files.length} file\n`);

// ---------- Migrate ----------
let totalFiles = 0;
let totalReplacements = 0;
const failedFiles = [];

for (const file of files) {
  let content = fs.readFileSync(file, "utf-8");
  const original = content;
  let count = 0;

  // 1. Replace t("key") → t("Tiếng Việt")
  //    Handle: t("key"), t("key", vars), t('key')
  content = content.replace(
    /\bt\(\s*(["'])((?:\\.|(?!\1).)+)\1(\s*,\s*[^)]+)?\s*\)/g,
    (match, quote, key, rest) => {
      const vi = viMap[key];
      if (!vi) return match;

      // Escape cho string literal
      const safe = vi
        .replace(/\\/g, "\\\\")
        .replace(/"/g, '\\"')
        .replace(/\n/g, "\\n");

      count++;
      return rest ? `t("${safe}"${rest})` : `t("${safe}")`;
    }
  );

  // 2. Replace import useTranslation from ...i18n
  content = content.replace(
    /import\s*\{\s*useTranslation\s*(?:,\s*[^}]+)?\s*\}\s*from\s*(["'])(?:[^"']*\/i18n)\1/g,
    (match, quote) => {
      // Tính relative path đến hooks/useI18n dựa vào vị trí file
      const rel = path.relative(
        path.dirname(file),
        path.join(ROOT, "src/hooks/useI18n.js")
      );
      // Normalize slash + strip .js extension
      const cleanRel = rel.replace(/\\/g, "/").replace(/\.js$/, "");
      const finalPath = cleanRel.startsWith(".") ? cleanRel : "./" + cleanRel;

      count++;
      return `import { useI18n } from "${finalPath}"`;
    }
  );

  // 3. Replace useTranslation() → useI18n()
  content = content.replace(/\buseTranslation\s*\(\s*\)/g, () => {
    count++;
    return "useI18n()";
  });

  // 4. Replace import { translations, t as tFunc, setLang, getLang } → xử lý riêng nếu cần
  // (không phổ biến, bỏ qua)

  if (content !== original) {
    try {
      fs.writeFileSync(file, content, "utf-8");
      totalFiles++;
      totalReplacements += count;
      console.log(`✓ ${path.relative(ROOT, file)} (${count} thay đổi)`);
    } catch (e) {
      failedFiles.push(file);
      console.error(`✗ ${path.relative(ROOT, file)} — ${e.message}`);
    }
  }
}

console.log(`\n${"═".repeat(60)}`);
console.log(`✅ Migrate xong!`);
console.log(`   Files thay đổi: ${totalFiles}`);
console.log(`   Replacements:   ${totalReplacements}`);
if (failedFiles.length) {
  console.log(`   ⚠️ Files lỗi:    ${failedFiles.length}`);
}
console.log(`${"═".repeat(60)}`);
console.log(`\n📝 Bước tiếp theo:`);
console.log(`   1. Chạy "npm run dev" để test`);
console.log(`   2. Vite plugin sẽ tự tạo src/lib/i18n/locales/_source.json`);
console.log(`   3. Kiểm tra console tìm key thiếu`);
console.log(`   4. Xóa src/i18n.js và src/components/LanguageToggle.jsx khi OK`);
console.log(`   5. (Optional) Copy _source.json để dịch sang en/ja/ko/zh`);