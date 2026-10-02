#!/usr/bin/env node
// ============================================================
// AUTO-TRANSLATE-LOCALES.MJS
// ============================================================
// Tự động dịch _source.json → en/ja/ko/zh.json
// Chỉ dịch key CHƯA có (cache) → nhanh, tiết kiệm
//
// Usage:
//   node scripts/auto-translate-locales.mjs              # 1 lần
//   node scripts/auto-translate-locales.mjs --watch      # watcher
//   node scripts/auto-translate-locales.mjs --force      # dịch lại hết
//   node scripts/auto-translate-locales.mjs --lang=en    # chỉ 1 lang
//   node scripts/auto-translate-locales.mjs --dry-run    # chỉ xem
// ============================================================

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { translateWithRetry } from "./lib/google-translate.mjs";
import {
  protectPlaceholders,
  restorePlaceholders,
  shouldSkip,
  sleep,
} from "./lib/locale-utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = path.join(__dirname, "..", "src", "lib", "i18n", "locales");
const OVERRIDES_DIR = path.join(LOCALES_DIR, "_overrides");
const SOURCE_FILE = path.join(LOCALES_DIR, "_source.json");
const CONFIG_FILE = path.join(__dirname, ".translate-config.json");

// ---------- Parse CLI args ----------
const args = process.argv.slice(2);
const FLAGS = {
  watch: args.includes("--watch"),
  force: args.includes("--force"),
  dryRun: args.includes("--dry-run"),
  lang: (() => {
    const i = args.indexOf("--lang");
    return i >= 0 && args[i + 1] ? args[i + 1] : null;
  })(),
};

// ---------- Load config ----------
const config = fs.existsSync(CONFIG_FILE)
  ? JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"))
  : {
      sourceLang: "vi",
      targetLangs: ["en", "ja", "ko", "zh"],
      minLength: 2,
      delayMs: 150,
      maxRetries: 3,
      skipPatterns: [],
      protectPatterns: [],
    };

const targetLangs = FLAGS.lang ? [FLAGS.lang] : config.targetLangs;

// ---------- Load overrides ----------
function loadOverrides(lang) {
  const file = path.join(OVERRIDES_DIR, `${lang}.json`);
  if (!fs.existsSync(file)) return {};
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch {
    return {};
  }
}

// ---------- Load locale file ----------
function loadLocale(lang) {
  const file = path.join(LOCALES_DIR, `${lang}.json`);
  if (!fs.existsSync(file)) return {};
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch {
    return {};
  }
}

function saveLocale(lang, dict) {
  const file = path.join(LOCALES_DIR, `${lang}.json`);
  const sorted = {};
  Object.keys(dict).sort().forEach((k) => {
    sorted[k] = dict[k];
  });
  fs.writeFileSync(file, JSON.stringify(sorted, null, 2) + "\n", "utf-8");
}

// ---------- Translate 1 lang ----------
async function translateLang(lang, source) {
  const sourceKeys = Object.keys(source);
  const current = loadLocale(lang);
  const overrides = loadOverrides(lang);

  const toTranslate = [];

  for (const key of sourceKeys) {
    if (overrides[key] !== undefined) {
      current[key] = overrides[key];
      continue;
    }

    if (!FLAGS.force && current[key] && current[key] !== key) {
      continue;
    }

    if (shouldSkip(key, config)) {
      current[key] = key;
      continue;
    }

    toTranslate.push(key);
  }

  if (toTranslate.length === 0) {
    console.log(`   ✅ [${lang}] Đã đầy đủ (${sourceKeys.length} keys)`);
    saveLocale(lang, current);
    return { lang, added: 0, total: sourceKeys.length };
  }

  console.log(
    `   🔄 [${lang}] Cần dịch ${toTranslate.length}/${sourceKeys.length} keys...`
  );

  if (FLAGS.dryRun) {
    toTranslate.slice(0, 10).forEach((k) => console.log(`      • "${k}"`));
    if (toTranslate.length > 10) {
      console.log(`      ... và ${toTranslate.length - 10} keys khác`);
    }
    return {
      lang,
      added: 0,
      total: sourceKeys.length,
      pending: toTranslate.length,
    };
  }

  let done = 0;
  let failed = 0;

  for (const key of toTranslate) {
    try {
      const { text: protectedText, placeholders } = protectPlaceholders(
        key,
        config.protectPatterns
      );

      const translated = await translateWithRetry(
        protectedText,
        lang,
        config.sourceLang,
        config.maxRetries
      );

      const finalText = restorePlaceholders(translated, placeholders);

      current[key] = finalText;
      done++;

      if (done % 20 === 0 || done === toTranslate.length) {
        process.stdout.write(
          `      ${done}/${toTranslate.length} (${Math.round(
            (done / toTranslate.length) * 100
          )}%)\r`
        );
      }

      if (config.delayMs > 0 && done < toTranslate.length) {
        await sleep(config.delayMs);
      }
    } catch (err) {
      failed++;
      current[key] = key;
      console.warn(`\n      ⚠️  Fail "${key.slice(0, 50)}": ${err.message}`);
    }
  }

  process.stdout.write("\n");
  saveLocale(lang, current);

  console.log(
    `   ✅ [${lang}] Đã dịch ${done} keys${failed > 0 ? ` (${failed} fail)` : ""}`
  );

  return { lang, added: done, failed, total: sourceKeys.length };
}

// ---------- Main ----------
async function run() {
  console.log("═".repeat(60));
  console.log("🌐 AUTO-TRANSLATE LOCALES");
  console.log("═".repeat(60));

  if (!fs.existsSync(SOURCE_FILE)) {
    console.error("❌ Không tìm thấy _source.json");
    console.error("   Chạy 'npm run dev' 1 lần để Vite plugin sinh file này.");
    process.exit(1);
  }

  const source = JSON.parse(fs.readFileSync(SOURCE_FILE, "utf-8"));
  const sourceKeys = Object.keys(source);

  console.log(`📖 Source: ${sourceKeys.length} keys`);
  console.log(`🌍 Targets: ${targetLangs.join(", ")}`);
  if (FLAGS.force) console.log("   🔨 Force mode (dịch lại hết)");
  if (FLAGS.dryRun) console.log("   🧪 Dry-run mode (không ghi file)");
  console.log("");

  const results = [];

  for (const lang of targetLangs) {
    try {
      const r = await translateLang(lang, source);
      results.push(r);
    } catch (err) {
      console.error(`   ❌ [${lang}] Lỗi: ${err.message}`);
    }
    console.log("");
  }

  console.log("═".repeat(60));
  console.log("📊 KẾT QUẢ");
  console.log("═".repeat(60));
  for (const r of results) {
    if (r.added > 0) {
      console.log(`   ✅ ${r.lang}: +${r.added} keys`);
    } else if (r.pending) {
      console.log(`   ⏸️  ${r.lang}: ${r.pending} keys chờ dịch`);
    } else {
      console.log(`   ✅ ${r.lang}: đã đầy đủ`);
    }
  }
  console.log("═".repeat(60));
}

// ---------- Watch mode ----------
async function watch() {
  console.log("👁️  Watch mode — theo dõi _source.json...\n");
  console.log("   Sửa code → Vite cập nhật _source.json → script tự dịch.");
  console.log("   Ctrl+C để dừng.\n");

  await run();

  let debounceTimer = null;

  fs.watch(SOURCE_FILE, (eventType) => {
    if (eventType !== "change") return;

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      console.log("\n🔔 _source.json thay đổi → dịch lại...\n");
      try {
        await run();
      } catch (err) {
        console.error("❌ Lỗi:", err.message);
      }
    }, 1000);
  });

  process.stdin.resume();
}

// ---------- Entry ----------
(FLAGS.watch ? watch() : run()).catch((err) => {
  console.error("❌ Fatal:", err);
  process.exit(1);
});