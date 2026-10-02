// ============================================================
// VITE PLUGIN I18N — Auto-extract t("...") khi dev
// ============================================================
// Chạy mỗi khi dev server start hoặc file thay đổi
// Output: src/lib/i18n/locales/_source.json
// ============================================================

import fs from "node:fs";
import path from "node:path";

const T_REGEX = /\bt\(\s*["'`]([^"'`]+)["'`]/g;
const SOURCE_FILE = "src/lib/i18n/locales/_source.json";
const SCAN_DIRS = ["src"];
const EXCLUDE_PARTS = [
  "node_modules",
  "dist",
  ".git",
  "src/lib/i18n",
  "src/hooks/useI18n",
];

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (EXCLUDE_PARTS.some((ex) => full.includes(ex))) continue;
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(jsx?|tsx?|mjs)$/.test(entry.name)) files.push(full);
  }
  return files;
}

function extractFromFiles(root) {
  const keys = new Set();
  const files = SCAN_DIRS.flatMap((d) => walk(path.join(root, d)));

  for (const file of files) {
    let content;
    try {
      content = fs.readFileSync(file, "utf-8");
    } catch {
      continue;
    }
    let match;
    T_REGEX.lastIndex = 0;
    while ((match = T_REGEX.exec(content)) !== null) {
      const key = match[1].trim();
      // Bỏ qua template literal (có ${})
      if (key && !key.includes("${")) keys.add(key);
    }
  }
  return [...keys].sort();
}

export default function i18nPlugin() {
  let root = process.cwd();
  let isDev = false;

  function writeSource() {
    const keys = extractFromFiles(root);
    const fullPath = path.join(root, SOURCE_FILE);

    const current = fs.existsSync(fullPath)
      ? JSON.parse(fs.readFileSync(fullPath, "utf-8"))
      : {};

    const next = {};
    for (const k of keys) next[k] = current[k] ?? k;

    const added = keys.filter((k) => !(k in current));
    const removed = Object.keys(current).filter((k) => !keys.includes(k));

    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, JSON.stringify(next, null, 2), "utf-8");

    if (added.length) {
      console.log(`\n[i18n] ✚ ${added.length} câu mới:`);
      added.slice(0, 8).forEach((k) => console.log(`   + "${k}"`));
      if (added.length > 8) console.log(`   ... +${added.length - 8}`);
    }
    if (removed.length) {
      console.log(`\n[i18n] ✖ ${removed.length} câu không dùng nữa`);
    }

    return { added: added.length, removed: removed.length, total: keys.length };
  }

  return {
    name: "vite-plugin-i18n",
    configResolved(config) {
      root = config.root;
      isDev = config.command === "serve";
    },
    buildStart() {
      const stats = writeSource();
      console.log(`[i18n] ✓ Scan xong: ${stats.total} câu\n`);
    },
    handleHotUpdate({ file }) {
      if (isDev && /\.(jsx?|tsx?)$/.test(file)) {
        writeSource();
      }
    },
  };
}