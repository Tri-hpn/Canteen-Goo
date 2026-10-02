#!/usr/bin/env node
// fix-p1-004.mjs — Fix riêng P1-004
import fs from "node:fs";
import { execSync } from "node:child_process";

const FILE = "server-json.js";
const stamp = Date.now();
const BACKUP = `.backup-p1/server-json.js.p1-004-${stamp}.bak`;

fs.mkdirSync(".backup-p1", { recursive: true });
fs.copyFileSync(FILE, BACKUP);
console.log(`[OK] Backup: ${BACKUP}\n`);

let content = fs.readFileSync(FILE, "utf-8");
let fixed = 0;

// Tìm block parse note cũ
const oldBlockRegex = /if \(note\)\s*\{\s*const match = String\(note\)\.match\(\/Nhận lúc[\s\S]*?\}\s*\}/;

if (oldBlockRegex.test(content)) {
  const newBlock = `const pickupTimeFromBody = req.body.pickupTime || "";
    if (pickupTimeFromBody) {
      const slotCheck = validatePickupTime(db, pickupTimeFromBody);
      if (!slotCheck.ok) {
        return res.status(400).json({ message: slotCheck.message });
      }
    }`;

  content = content.replace(oldBlockRegex, newBlock);
  console.log("[OK] Đã thay block parse note cũ → pickupTimeFromBody");
  fixed++;
} else {
  console.log("[!] Không match regex block parse note");
}

// Ghi file
if (fixed > 0) {
  fs.writeFileSync(FILE, content, "utf-8");
  console.log(`\n[OK] Đã ghi ${FILE}`);
} else {
  console.log(`\n[X] KHÔNG THỂ FIX TỰ ĐỘNG`);
}

// Validate
console.log("\nĐang kiểm tra syntax...");
try {
  execSync(`node -c ${FILE}`, { stdio: "inherit" });
  console.log("[OK] Syntax OK");
} catch (err) {
  console.log("[X] SYNTAX ERROR! Khôi phục:");
  console.log(`Copy-Item "${BACKUP}" "${FILE}" -Force`);
  process.exit(1);
}