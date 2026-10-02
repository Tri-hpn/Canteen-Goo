// ============================================================
// FIND DEAD CODE — Tìm component/file không ai import
// ============================================================
// Usage: node scripts/find-dead-code.mjs
// ============================================================

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");

// Danh sách file cần check
const CANDIDATES = [
  "src/i18n.js",
  "src/components/LanguageToggle.jsx",
  "src/components/PaymentSelector.jsx",
  "src/components/OrderDetailModal.jsx",
  "src/components/ThemeToggle.jsx",
  "src/components/HeaderNav.jsx",
  "src/pages/customer/CustomerPoints.jsx",
];

function walk(dir, files = []) {
  const EXCLUDE = ["node_modules", "dist", ".git"];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (EXCLUDE.some((ex) => full.includes(ex))) continue;
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(jsx?|tsx?|mjs)$/.test(entry.name)) files.push(full);
  }
  return files;
}

const allFiles = walk(SRC);

console.log("═".repeat(60));
console.log("🔍 KIỂM TRA DEAD CODE");
console.log("═".repeat(60));

for (const candidate of CANDIDATES) {
  const fullPath = path.join(ROOT, candidate);
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  ${candidate} — KHÔNG TỒN TẠI`);
    continue;
  }

  // Lấy tên file không có extension
  const baseName = path.basename(candidate, path.extname(candidate));

  // Tìm file import candidate (không tính chính file đó)
  const importers = [];
  for (const file of allFiles) {
    if (file === fullPath) continue;

    const content = fs.readFileSync(file, "utf-8");
    // Match: import ... from '...BaseName' hoặc require('...BaseName')
    const regex = new RegExp(
      `from\\s+["'][^"']*\\/${baseName}(?:\\.jsx?)?["']|` +
      `require\\(\\s*["'][^"']*\\/${baseName}(?:\\.jsx?)?["']\\s*\\)`
    );

    if (regex.test(content)) {
      importers.push(path.relative(ROOT, file));
    }
  }

  if (importers.length === 0) {
    console.log(`\n❌ ${candidate}`);
    console.log(`   → KHÔNG ai import → CÓ THỂ XÓA`);
  } else {
    console.log(`\n✓ ${candidate}`);
    console.log(`   → Được import bởi ${importers.length} file:`);
    importers.forEach((f) => console.log(`      • ${f}`));
  }
}

console.log("\n" + "═".repeat(60));