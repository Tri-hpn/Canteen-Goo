import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import mongoose from "mongoose";
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.join(__dirname, "canteen-db.json");

// âœ… BUILD VERSION â€” dÃ¹ng Ä‘á»ƒ verify Render Ä‘Ã£ deploy code má»›i chÆ°a
const BUILD_VERSION = "v2-menu-no-filter-" + new Date().toISOString().slice(0, 19);
console.log("ðŸ”– BUILD VERSION:", BUILD_VERSION);


// ============================================================
// âœ… Batch 7 / N1: Date helpers â€” LOCAL timezone (khÃ´ng dÃ¹ng toISOString)
// ============================================================
function getLocalDateStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dt = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dt}`;
}

function toLocalDateStr(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return getLocalDateStr(d);
}

// ============================================================
// âœ… FIX M5 + M5b: helper sinh mÃ£ Ä‘Æ¡n unique (an toÃ n hÆ¡n)
// ============================================================
function generateOrderCode(db) {
  let code;
  let attempts = 0;
  do {
    const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
    code = "VWA-" + Date.now().toString().slice(-8) + "-" + rand;
    attempts++;
  } while ((db.orders || []).some((o) => o.code === code) && attempts < 10);

  // âœ… FIX M5b: throw náº¿u khÃ´ng táº¡o Ä‘Æ°á»£c code unique
  if (attempts >= 10) {
    throw new Error("KhÃ´ng táº¡o Ä‘Æ°á»£c mÃ£ Ä‘Æ¡n unique â€” vui lÃ²ng thá»­ láº¡i");
  }
  return code;
}

// ============================================================
// MONGODB â€” LÆ°u DB dÆ°á»›i dáº¡ng 1 document JSON
// ============================================================
const MONGO_URI = process.env.MONGO_URI;
let MongoModel = null;
let dbCache = null;

// âœ… FIX M1/L10: flag xÃ¡c nháº­n Mongo Ä‘Ã£ connect thÃ nh cÃ´ng
let mongoReady = false;

if (MONGO_URI) {
  const dbSchema = new mongoose.Schema(
    {
      _id: { type: String, default: "main" },
      data: { type: mongoose.Schema.Types.Mixed },
    },
    { collection: "canteen_db", minimize: false }
  );
  MongoModel = mongoose.model("CanteenDB", dbSchema);
}

// ============================================================
// SEED DATA
// ============================================================
function buildSeedData() {
  return {
    users: [
      { id: 1, name: "Quáº£n trá»‹ viÃªn", email: "admin@vwa.vn", password: bcrypt.hashSync("123456", 10), role: "ADMIN", status: "Hoáº¡t Ä‘á»™ng", phone: "0900000001", points: 0, created_at: "2025-01-01T00:00:00.000Z" },
      { id: 2, name: "Tráº§n VÄƒn TrÃ­", email: "nhanvien@vwa.vn", password: bcrypt.hashSync("123456", 10), role: "EMPLOYEE", status: "Hoáº¡t Ä‘á»™ng", phone: "", points: 50, created_at: "2025-01-01T00:00:00.000Z" },
      { id: 3, name: "Tráº§n VÄƒn TrÃ­", email: "sinhvien@vwa.vn", password: bcrypt.hashSync("123456", 10), role: "CUSTOMER", status: "Hoáº¡t Ä‘á»™ng", phone: "", points: 1959, created_at: "2025-01-01T00:00:00.000Z" },
    ],
    menu_items: [],
    categories: [
      { id: 1, name: "CÆ¡m", icon: "ðŸš", order: 1 },
      { id: 2, name: "BÃºn", icon: "ðŸœ", order: 2 },
      { id: 3, name: "Äá»“ uá»‘ng", icon: "ðŸ¥¤", order: 3 },
    ],
    sizes: [
      { id: 1, name: "S", extra_price: 0 },
      { id: 2, name: "M", extra_price: 5000 },
      { id: 3, name: "L", extra_price: 10000 },
    ],
    toppings: [],
    orders: [],
    inventory: [],
    notifications: [],
    vouchers: [],
    reviews: [],
    messages: [],
    attendances: [],
    imports: [],
    price_history: [],
    shifts: [],
    wallets: [],
    wallet_transactions: [],
    settings: { bank: "VCB", account: "", accountName: "", hotline: "", email: "", address: "", qrCustomImage: "" },
  };
}

async function initMongo() {
  if (!MONGO_URI || !MongoModel) {
    console.log("âš ï¸ KhÃ´ng cÃ³ MONGO_URI â†’ dÃ¹ng file JSON local");
    if (!fs.existsSync(DB_FILE)) {
      const seed = buildSeedData();
      fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2), "utf-8");
      dbCache = seed;
      console.log("âœ… ÄÃ£ táº¡o file DB seed");
    } else {
      dbCache = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
    }
    return false;
  }

  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 10000 });
    console.log("âœ… ÄÃ£ káº¿t ná»‘i MongoDB");

    let doc = await MongoModel.findById("main");
    if (!doc) {
      console.log("ðŸ“¦ DB chÆ°a cÃ³ trÃªn MongoDB â†’ khá»Ÿi táº¡o seed...");
      const seed = buildSeedData();
      await MongoModel.create({ _id: "main", data: seed });
      dbCache = seed;
      console.log("âœ… ÄÃ£ seed DB lÃªn MongoDB");
      console.log("   ðŸ‘¤ admin@vwa.vn / 123456");
      console.log("   ðŸ‘¤ nhanvien@vwa.vn / 123456");
      console.log("   ðŸ‘¤ sinhvien@vwa.vn / 123456");
    } else {
      dbCache = doc.data;
      console.log(
        "âœ… ÄÃ£ load DB tá»« MongoDB: " +
          (dbCache.menu_items?.length || 0) + " mÃ³n, " +
          (dbCache.users?.length || 0) + " users"
      );
    }
    mongoReady = true;
    return true;
  } catch (e) {
    console.error("âŒ MongoDB lá»—i:", e.message);
    console.log("âš ï¸ Fallback sang file JSON local");
    mongoReady = false;
    return false;
  }
}

function loadDB() {
  if (dbCache) return dbCache;
  return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
}

function saveDB(data) {
  dbCache = data;
  // âœ… FIX M1/L10: chá»‰ ghi Mongo khi Ä‘Ã£ connect thÃ nh cÃ´ng
  if (mongoReady && MongoModel) {
    MongoModel.updateOne(
      { _id: "main" },
      { $set: { data: data } },
      { upsert: true }
    ).catch((e) => console.error("Mongo save error:", e.message));
  } else {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
    } catch (e) {
      console.error("File save error:", e.message);
    }
  }
}

function notifyNewOrder(db, order) {
  if (!db.notifications) db.notifications = [];
  const staff = db.users.filter(u => u.role === "ADMIN" || u.role === "EMPLOYEE");
  staff.forEach(s => {
    const id = Math.max(0, ...db.notifications.map(n => n.id)) + 1;
    db.notifications.push({
      id, user_id: s.id,
      title: "ÄÆ¡n hÃ ng má»›i",
      content: order.customer_name + " vá»«a Ä‘áº·t Ä‘Æ¡n " + order.code + " (" + order.total.toLocaleString("vi-VN") + "Ä‘)",
      type: "order",
      link: s.role === "ADMIN" ? "/owner" : "/employee/orders",
      read: false, created_at: new Date().toISOString()
    });
  });
}

function notifyOrderStatus(db, order, newStatus) {
  if (!db.notifications) db.notifications = [];
  const id = Math.max(0, ...db.notifications.map(n => n.id)) + 1;
  db.notifications.push({
    id, user_id: order.customer_id,
    title: "ÄÆ¡n hÃ ng " + order.code + " Ä‘Ã£ " + newStatus.toLowerCase(),
    content: "ÄÆ¡n hÃ ng cá»§a báº¡n Ä‘ang á»Ÿ tráº¡ng thÃ¡i: " + newStatus,
    type: "status", link: "/customer/orders", read: false,
    created_at: new Date().toISOString()
  });
}

// ============================================================
// âœ… FIX H1: HoÃ n kho + hoÃ n Ä‘iá»ƒm khi há»§y Ä‘Æ¡n
// ============================================================
function rollbackCancelledOrder(db, order) {
  if (!order || order._stock_rolled_back) return;

  // 1. HoÃ n kho + sold
  (order.items || []).forEach((it) => {
    const m = (db.menu_items || []).find((x) => x.id == it.menu_item_id);
    if (!m) return;
    m.stock = (m.stock || 0) + (it.qty || 0);
    m.sold = Math.max(0, (m.sold || 0) - (it.qty || 0));
  });

  // 2. Trá»« láº¡i Ä‘iá»ƒm Ä‘Ã£ cá»™ng khi táº¡o Ä‘Æ¡n
  const earned = Number(order.points_earned) || 0;
  if (earned > 0) {
    const customer = (db.users || []).find((u) => u.id === order.customer_id);
    if (customer) {
      customer.points = Math.max(0, (customer.points || 0) - earned);
    }
    order.points_earned = 0;
  }

  order._stock_rolled_back = true;
}

const app = express();
app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    /\.vercel\.app$/,
    /\.onrender\.com$/
  ],
  credentials: true
}));
app.use(express.json({ limit: "10mb" }));

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("âŒ FATAL: JWT_SECRET chÆ°a Ä‘Æ°á»£c set trong env!");
  console.error("   Render: Settings â†’ Environment Variables â†’ Add JWT_SECRET");
  process.exit(1);
}

function auth(roles = []) {
  return (req, res, next) => {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: "ChÆ°a Ä‘Äƒng nháº­p" });
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      if (roles.length && !roles.includes(payload.role))
        return res.status(403).json({ message: "KhÃ´ng cÃ³ quyá»n" });
      req.user = payload;
      next();
    } catch {
      res.status(401).json({ message: "Token khÃ´ng há»£p lá»‡" });
    }
  };
}

// ============ AUTH ============
app.post("/api/auth/login", (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: "Thiáº¿u email/máº­t kháº©u" });
    const db = loadDB();
    const user = db.users.find(u => u.email === email.toLowerCase());
    if (!user) return res.status(401).json({ message: "Sai tÃ i khoáº£n hoáº·c máº­t kháº©u" });
    const ok = bcrypt.compareSync(password, user.password);
    if (!ok) return res.status(401).json({ message: "Sai tÃ i khoáº£n hoáº·c máº­t kháº©u" });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (e) {
    console.error("LOGIN ERROR:", e);
    res.status(500).json({ message: e.message });
  }
});

app.post("/api/auth/register", (req, res) => {
  try {
    const { email, password, name, phone } = req.body || {};
    if (!email || !password || !name) return res.status(400).json({ message: "Thiáº¿u thÃ´ng tin" });
    if (password.length < 6) return res.status(400).json({ message: "Máº­t kháº©u pháº£i tá»« 6 kÃ½ tá»±" });
    const db = loadDB();
    if (db.users.find(u => u.email === email.toLowerCase()))
      return res.status(400).json({ message: "Email Ä‘Ã£ Ä‘Æ°á»£c sá»­ dá»¥ng" });
    const hash = bcrypt.hashSync(password, 10);
    const id = Math.max(0, ...db.users.map(u => u.id)) + 1;
    const user = { id, email: email.toLowerCase(), password: hash, name, phone: phone || "", role: "CUSTOMER", status: "Hoáº¡t Ä‘á»™ng", points: 0 };
    db.users.push(user);
    saveDB(db);
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: "7d" });
    res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ============ CHANGE PASSWORD ============
app.put("/api/auth/password", auth(), (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Thiáº¿u thÃ´ng tin" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Máº­t kháº©u pháº£i tá»« 6 kÃ½ tá»±" });
    }
    const db = loadDB();
    const u = db.users.find(x => x.id === req.user.id);
    if (!u) return res.status(404).json({ message: "KhÃ´ng tÃ¬m tháº¥y user" });
    const ok = bcrypt.compareSync(currentPassword, u.password);
    if (!ok) return res.status(401).json({ message: "Máº­t kháº©u hiá»‡n táº¡i khÃ´ng Ä‘Ãºng" });
    u.password = bcrypt.hashSync(newPassword, 10);
    saveDB(db);
    res.json({ ok: true, message: "Äá»•i máº­t kháº©u thÃ nh cÃ´ng" });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.get("/api/auth/me", auth(), (req, res) => {
  const db = loadDB();
  const u = db.users.find(x => x.id === req.user.id);
  if (!u) return res.status(404).json({ message: "KhÃ´ng tÃ¬m tháº¥y user" });
  res.json({ id: u.id, email: u.email, name: u.name, role: u.role, points: u.points || 0, phone: u.phone || "", address: u.address || "", avatar: u.avatar || "" });
});

app.put("/api/auth/profile", auth(), (req, res) => {
  try {
    const db = loadDB();
    const u = db.users.find(x => x.id === req.user.id);
    if (!u) return res.status(404).json({ message: "KhÃ´ng tÃ¬m tháº¥y user" });
    const { name, phone, avatar, address, email } = req.body;
    if (email && email !== u.email) {
      const emailNorm = email.toLowerCase().trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm))
        return res.status(400).json({ message: "Email khÃ´ng há»£p lá»‡" });
      if (db.users.find(x => x.id !== u.id && x.email === emailNorm))
        return res.status(400).json({ message: "Email Ä‘Ã£ Ä‘Æ°á»£c sá»­ dá»¥ng" });
      u.email = emailNorm;
    }
    if (name !== undefined && name.trim()) u.name = name.trim();
    if (phone !== undefined) u.phone = phone.trim();
    if (avatar !== undefined) u.avatar = avatar;
    if (address !== undefined) u.address = address.trim();
    saveDB(db);
    res.json({ id: u.id, email: u.email, name: u.name, role: u.role, phone: u.phone, avatar: u.avatar, address: u.address, points: u.points });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ============================================================
// MENU
// ============================================================
// âœ… FIX CRITICAL: LUÃ”N tráº£ vá» Táº¤T Cáº¢ mÃ³n (ká»ƒ cáº£ active=0).
// KHÃ”NG filter active á»Ÿ backend.
//   - Admin/Employee â†’ tháº¥y Háº¾T (ká»ƒ cáº£ mÃ³n táº¯t)
//   - Customer â†’ FE tá»± filter m.active á»Ÿ client
// Äáº£m báº£o mÃ³n KHÃ”NG BAO GIá»œ bá»‹ "biáº¿n máº¥t" khi táº¯t.
// ============================================================
app.get("/api/menu", (req, res) => {
  try {
    const db = loadDB();
    const { q = "", category = "Táº¥t cáº£" } = req.query;

    let items = [...(db.menu_items || [])];

    if (q) {
      const ql = String(q).toLowerCase();
      items = items.filter((m) => (m.name || "").toLowerCase().includes(ql));
    }
    if (category && category !== "Táº¥t cáº£") {
      items = items.filter((m) => m.category === category);
    }
    res.json(items);
  } catch (e) {
    console.error("GET /api/menu error:", e);
    res.status(500).json({ message: e.message });
  }
});

app.post("/api/menu", auth(["ADMIN", "EMPLOYEE"]), (req, res) => {
  try {
    const db = loadDB();
    const id = Math.max(0, ...db.menu_items.map(m => m.id)) + 1;
    const body = { ...req.body };

    if (!body.name || !body.name.trim()) {
      return res.status(400).json({ message: "TÃªn mÃ³n khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng" });
    }
    if (body.price !== undefined && (isNaN(Number(body.price)) || Number(body.price) < 0)) {
      return res.status(400).json({ message: "GiÃ¡ khÃ´ng Ä‘Æ°á»£c Ã¢m" });
    }
    if (body.discount_percent !== undefined) {
      const d = Number(body.discount_percent);
      if (isNaN(d) || d < 0 || d > 90) {
        return res.status(400).json({ message: "Giáº£m giÃ¡ pháº£i tá»« 0-90%" });
      }
    }
    if (body.original_price !== undefined && (isNaN(Number(body.original_price)) || Number(body.original_price) < 0)) {
      return res.status(400).json({ message: "GiÃ¡ gá»‘c khÃ´ng Ä‘Æ°á»£c Ã¢m" });
    }

    if (body.original_price && body.discount_percent !== undefined) {
      if (body.discount_percent > 0) {
        body.price = Math.round(body.original_price * (1 - body.discount_percent / 100));
      } else {
        body.price = body.original_price;
      }
    }
    const item = { id, active: 1, sold: 0, ...body };
    db.menu_items.push(item);
    saveDB(db);
    res.status(201).json(item);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.put("/api/menu/:id", auth(["ADMIN", "EMPLOYEE"]), (req, res) => {
  try {
    const db = loadDB();
    const i = db.menu_items.findIndex(m => m.id == req.params.id);
    if (i < 0) return res.status(404).json({ message: "KhÃ´ng tÃ¬m tháº¥y mÃ³n" });
    const oldItem = db.menu_items[i];
    const newData = { ...req.body };

    if (newData.price !== undefined && (isNaN(Number(newData.price)) || Number(newData.price) < 0)) {
      return res.status(400).json({ message: "GiÃ¡ khÃ´ng Ä‘Æ°á»£c Ã¢m" });
    }
    if (newData.discount_percent !== undefined) {
      const d = Number(newData.discount_percent);
      if (isNaN(d) || d < 0 || d > 90) {
        return res.status(400).json({ message: "Giáº£m giÃ¡ pháº£i tá»« 0-90%" });
      }
    }
    if (newData.original_price !== undefined && (isNaN(Number(newData.original_price)) || Number(newData.original_price) < 0)) {
      return res.status(400).json({ message: "GiÃ¡ gá»‘c khÃ´ng Ä‘Æ°á»£c Ã¢m" });
    }

    if (newData.original_price && newData.discount_percent !== undefined) {
      if (newData.discount_percent > 0) {
        newData.price = Math.round(newData.original_price * (1 - newData.discount_percent / 100));
      } else {
        newData.price = newData.original_price;
      }
    }

    // âœ… FIX L2: ghi price_history khi giÃ¡ THAY Äá»”I
    if (newData.price !== undefined && Number(newData.price) !== Number(oldItem.price)) {
      if (!db.price_history) db.price_history = [];
      const historyId = Math.max(0, ...db.price_history.map(h => h.id)) + 1;
      db.price_history.push({
        id: historyId, menu_item_id: oldItem.id, menu_item_name: oldItem.name,
        old_price: oldItem.price, new_price: Number(newData.price),
        changed_by: req.user.name, changed_by_id: req.user.id,
        reason: newData.reason || "", created_at: new Date().toISOString()
      });
    }
    delete newData.reason;
    db.menu_items[i] = { ...oldItem, ...newData };
    saveDB(db);
    res.json({ ok: true, item: db.menu_items[i] });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.get("/api/price-history", auth(["ADMIN", "EMPLOYEE"]), (req, res) => {
  const db = loadDB();
  const { menu_item_id } = req.query;
  let list = db.price_history || [];
  if (menu_item_id) list = list.filter(h => h.menu_item_id == menu_item_id);
  list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(list);
});

app.delete("/api/menu/:id", auth(["ADMIN", "EMPLOYEE"]), (req, res) => {
  const db = loadDB();
  db.menu_items = db.menu_items.filter(m => m.id != req.params.id);
  saveDB(db);
  res.json({ ok: true });
});

// ============ USERS ============
app.get("/api/users", auth(["ADMIN"]), (req, res) => {
  const db = loadDB();
  const { role } = req.query;
  const list = role ? db.users.filter(u => u.role === role) : db.users;
  res.json(list.map(u => ({ ...u, password: undefined })));
});

app.post("/api/users", auth(["ADMIN"]), (req, res) => {
  try {
    const db = loadDB();
    const emailNorm = (req.body.email || "").toLowerCase().trim();
    if (!emailNorm) return res.status(400).json({ message: "Thiáº¿u email" });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
      return res.status(400).json({ message: "Email khÃ´ng há»£p lá»‡" });
    }
    if (db.users.find(u => u.email === emailNorm)) {
      return res.status(400).json({ message: "Email Ä‘Ã£ Ä‘Æ°á»£c sá»­ dá»¥ng" });
    }
    const id = Math.max(0, ...db.users.map(u => u.id)) + 1;
    const hash = bcrypt.hashSync(req.body.password || "123456", 10);
    const user = { id, email: emailNorm, password: hash, name: req.body.name, phone: req.body.phone || "", role: req.body.role || "EMPLOYEE", status: "Hoáº¡t Ä‘á»™ng", points: 0 };
    db.users.push(user);
    saveDB(db);
    res.status(201).json({ ...user, password: undefined });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.put("/api/users/:id", auth(["ADMIN"]), (req, res) => {
  try {
    const db = loadDB();
    const i = db.users.findIndex(u => u.id == req.params.id);
    if (i < 0) return res.status(404).json({ message: "KhÃ´ng tÃ¬m tháº¥y user" });

    const data = { ...req.body };

    if (data.email !== undefined) {
      const emailNorm = String(data.email).toLowerCase().trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
        return res.status(400).json({ message: "Email khÃ´ng há»£p lá»‡" });
      }
      const dup = db.users.find(
        (u) => u.id != req.params.id && u.email === emailNorm
      );
      if (dup) {
        return res.status(400).json({ message: "Email Ä‘Ã£ Ä‘Æ°á»£c sá»­ dá»¥ng" });
      }
      data.email = emailNorm;
    }

    if (data.password) data.password = bcrypt.hashSync(data.password, 10);
    else delete data.password;

    db.users[i] = { ...db.users[i], ...data };
    saveDB(db);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.delete("/api/users/:id", auth(["ADMIN"]), (req, res) => {
  const db = loadDB();
  db.users = db.users.filter(u => u.id != req.params.id);
  saveDB(db);
  res.json({ ok: true });
});

// ============================================================
// ORDERS
// ============================================================
app.post("/api/orders", auth(), (req, res) => {
  const db = loadDB();

  // Biáº¿n tracking Ä‘á»ƒ rollback
  let touchedItems = [];
  let wallet = null;
  let total = 0;
  let isWalletPay = false;
  let customer = null;
  let pointsEarned = 0;
  let walletTx = null;

  try {
    const { items, payment = "Tiá»n máº·t", note = "", discount = 0, voucherCode } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Giá» hÃ ng trá»‘ng" });
    }

    // ---------- BÆ¯á»šC 1: Validate toÃ n bá»™ ----------
    let subtotal = 0;
    const detailed = [];

    for (const it of items) {
      const q = Number(it.qty);

      // âœ… FIX H4
      if (!Number.isFinite(q) || q <= 0 || !Number.isInteger(q)) {
        return res.status(400).json({ message: "Sá»‘ lÆ°á»£ng mÃ³n khÃ´ng há»£p lá»‡" });
      }

      const m = db.menu_items.find(x => x.id == it.menuItem);
      if (!m) {
        return res.status(400).json({ message: "MÃ³n khÃ´ng tá»“n táº¡i (id=" + it.menuItem + ")" });
      }

      // âœ… FIX H3
      if (!m.active) {
        return res.status(400).json({ message: `${m.name} Ä‘Ã£ táº¡m ngá»«ng bÃ¡n` });
      }

      if ((m.stock || 0) < q) {
        return res.status(400).json({
          message: `${m.name} khÃ´ng Ä‘á»§ hÃ ng (cÃ²n ${m.stock || 0}, cáº§n ${q})`,
        });
      }

      subtotal += m.price * q;
      detailed.push({ menu_item_id: m.id, name: m.name, price: m.price, qty: q });
      touchedItems.push({ m, q });
    }

    total = Math.max(0, subtotal - Number(discount) || 0);

    // ---------- BÆ¯á»šC 2: Validate vÃ­ ----------
    isWalletPay = payment === "VÃ­ Canteen" || payment === "WALLET";

    if (isWalletPay) {
      wallet = getOrCreateWallet(db, req.user.id);
      if (wallet.balance < total) {
        return res.status(400).json({
          message:
            "Sá»‘ dÆ° vÃ­ khÃ´ng Ä‘á»§. Vui lÃ²ng náº¡p thÃªm " +
            (total - wallet.balance).toLocaleString("vi-VN") + "Ä‘",
        });
      }
    }

    // ---------- BÆ¯á»šC 3: Mutate stock ----------
    touchedItems.forEach(({ m, q }) => {
      m.stock = (m.stock || 0) - q;
      m.sold = (m.sold || 0) + q;
    });

    // ---------- BÆ¯á»šC 4: Trá»« vÃ­ ----------
    if (isWalletPay) {
      wallet.balance -= total;
      wallet.updated_at = new Date().toISOString();
    }

    // ---------- BÆ¯á»šC 5: Cá»™ng Ä‘iá»ƒm ----------
    pointsEarned = Math.floor(total * 0.01);
    customer = db.users.find(u => u.id === req.user.id);
    if (customer) customer.points = (customer.points || 0) + pointsEarned;

    // ---------- BÆ¯á»šC 6: Táº¡o Ä‘Æ¡n ----------
    const id = Math.max(0, ...db.orders.map(o => o.id)) + 1;
    const code = generateOrderCode(db);

    if (isWalletPay) {
      if (!db.wallet_transactions) db.wallet_transactions = [];
      const wtxId = Math.max(0, ...db.wallet_transactions.map(t => t.id)) + 1;
      walletTx = {
        id: wtxId,
        code: "PAY" + Date.now().toString().slice(-8),
        user_id: req.user.id,
        user_name: req.user.name,
        user_email: req.user.email,
        type: "payment",
        amount: total,
        method: "WALLET",
        status: "approved",
        note: "Thanh toÃ¡n Ä‘Æ¡n " + code,
        order_code: code,
        created_at: new Date().toISOString(),
        approved_at: new Date().toISOString()
      };
      db.wallet_transactions.push(walletTx);
    }

    const order = {
      id,
      code,
      customer_id: req.user.id,
      customer_name: req.user.name,
      subtotal,
      discount: Number(discount) || 0,
      total,
      points_earned: pointsEarned,
      status: "Chá» xÃ¡c nháº­n",
      payment,
      note,
      items: detailed,
      created_at: new Date().toISOString()
    };
    db.orders.push(order);

    // ---------- BÆ¯á»šC 7: Ãp voucher ----------
    if (voucherCode) {
      const vc = (db.vouchers || []).find(v =>
        v.code.toUpperCase() === voucherCode.toUpperCase() &&
        v.user_id === req.user.id &&
        !v.used
      );
      if (vc) {
        vc.used = true;
        vc.used_at = new Date().toISOString();
        vc.order_code = order.code;
      }
    }

    notifyNewOrder(db, order);
    saveDB(db);
    res.status(201).json({ ...order, _id: order.id });
  } catch (e) {
    // âœ… FIX H2/M5b: ROLLBACK
    console.error("ORDER CREATE ERROR:", e);

    touchedItems.forEach(({ m, q }) => {
      m.stock = (m.stock || 0) + q;
      m.sold = Math.max(0, (m.sold || 0) - q);
    });

    if (isWalletPay && wallet) {
      wallet.balance += total;
      wallet.updated_at = new Date().toISOString();
      if (walletTx && db.wallet_transactions) {
        db.wallet_transactions = db.wallet_transactions.filter(
          (t) => t.id !== walletTx.id
        );
      }
    }

    if (customer && pointsEarned > 0) {
      customer.points = Math.max(0, (customer.points || 0) - pointsEarned);
    }

    res.status(400).json({ message: e.message });
  }
});

app.get("/api/orders/me", auth(), (req, res) => {
  const db = loadDB();
  const enrich = (o) => {
    const items = (o.items || []).map(it => {
      const menu = (db.menu_items || []).find(m => m.id == it.menu_item_id);
      return { ...it, image: menu?.image || "", category: menu?.category || "" };
    });
    return { ...o, items, _id: o.id };
  };
  res.json(db.orders.filter(o => o.customer_id === req.user.id).map(enrich));
});

app.get("/api/orders", auth(["ADMIN", "EMPLOYEE"]), (req, res) => {
  const db = loadDB();
  const { status } = req.query;
  let list = db.orders;
  if (status && status !== "Táº¥t cáº£") {
    list = list.filter(o => o.status === status);
  }
  res.json(list.map(o => ({ ...o, _id: o.id })));
});

const VALID_ORDER_STATUSES = ["Chá» xÃ¡c nháº­n", "ÄÃ£ xÃ¡c nháº­n", "Äang chuáº©n bá»‹", "Sáºµn sÃ ng nháº­n", "HoÃ n thÃ nh", "ÄÃ£ há»§y"];

app.patch("/api/orders/:id", auth(["ADMIN", "EMPLOYEE"]), (req, res) => {
  try {
    const db = loadDB();
    const o = db.orders.find(x => x.id == req.params.id);
    if (!o) return res.status(404).json({ message: "KhÃ´ng tÃ¬m tháº¥y Ä‘Æ¡n" });

    const newStatus = req.body.status;
    if (!VALID_ORDER_STATUSES.includes(newStatus)) {
      return res.status(400).json({ message: "Tráº¡ng thÃ¡i khÃ´ng há»£p lá»‡: " + newStatus });
    }

    // âœ… FIX H1: rollback khi chuyá»ƒn sang "ÄÃ£ há»§y"
    if (newStatus === "ÄÃ£ há»§y" && o.status !== "ÄÃ£ há»§y") {
      rollbackCancelledOrder(db, o);
    }

    o.status = newStatus;
    o.updated_at = new Date().toISOString();
    notifyOrderStatus(db, o, newStatus);
    saveDB(db);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.post("/api/orders/:id/received", auth(), (req, res) => {
  const db = loadDB();
  const o = db.orders.find(x => x.id == req.params.id);
  if (!o) return res.status(404).json({ message: "KhÃ´ng tÃ¬m tháº¥y Ä‘Æ¡n" });
  if (o.customer_id !== req.user.id) return res.status(403).json({ message: "KhÃ´ng cÃ³ quyá»n" });
  if (o.status !== "Sáºµn sÃ ng nháº­n") return res.status(400).json({ message: "ÄÆ¡n chÆ°a sáºµn sÃ ng nháº­n" });
  o.status = "HoÃ n thÃ nh";
  o.received_at = new Date().toISOString();
  const customer = db.users.find(u => u.id === o.customer_id);
  if (customer) customer.points = (customer.points || 0) + 5;
  notifyOrderStatus(db, o, "HoÃ n thÃ nh");
  saveDB(db);
  res.json({ ok: true, order: o });
});

app.post("/api/orders/:id/cancel", auth(), (req, res) => {
  const db = loadDB();
  const o = db.orders.find(x => x.id == req.params.id);
  if (!o) return res.status(404).json({ message: "KhÃ´ng tÃ¬m tháº¥y Ä‘Æ¡n" });
  if (o.customer_id !== req.user.id) return res.status(403).json({ message: "KhÃ´ng cÃ³ quyá»n" });
  if (o.status !== "Chá» xÃ¡c nháº­n") return res.status(400).json({ message: "Chá»‰ há»§y Ä‘Æ°á»£c Ä‘Æ¡n chá» xÃ¡c nháº­n" });

  rollbackCancelledOrder(db, o);

  o.status = "ÄÃ£ há»§y";
  o.updated_at = new Date().toISOString();
  notifyOrderStatus(db, o, "ÄÃ£ há»§y");
  saveDB(db);
  res.json({ ok: true });
});

// ============ REVIEWS ============
app.get("/api/reviews/can-review/:menuItemId", auth(), (req, res) => {
  const db = loadDB();
  const menuItemId = req.params.menuItemId;
  const hasReviewed = (db.reviews || []).some(r =>
    r.user_id === req.user.id && r.menu_item_id == menuItemId
  );

  const hasPurchased = (db.orders || []).some(o =>
    o.customer_id === req.user.id &&
    o.status === "HoÃ n thÃ nh" &&
    (o.items || []).some(it => it.menu_item_id == menuItemId)
  );

  res.json({
    canReview: !hasReviewed && hasPurchased,
    hasPurchased,
    hasReviewed,
  });
});

app.get("/api/reviews/me", auth(), (req, res) => {
  const db = loadDB();
  const list = (db.reviews || []).filter(r => r.user_id === req.user.id);
  res.json(list);
});

app.get("/api/reviews/:menuItemId", (req, res) => {
  const db = loadDB();
  const reviews = (db.reviews || []).filter(r => r.menu_item_id == req.params.menuItemId);
  res.json(reviews);
});

app.post("/api/reviews", auth(), (req, res) => {
  try {
    const db = loadDB();
    const { menuItemId, rating, comment } = req.body;
    if (!menuItemId || !rating) return res.status(400).json({ message: "Thiáº¿u thÃ´ng tin" });
    if (rating < 1 || rating > 5) return res.status(400).json({ message: "ÄÃ¡nh giÃ¡ pháº£i 1-5 sao" });

    if (!db.reviews) db.reviews = [];

    const alreadyReviewed = db.reviews.find(r =>
      r.user_id === req.user.id && r.menu_item_id == menuItemId
    );
    if (alreadyReviewed) {
      return res.status(400).json({ message: "Báº¡n Ä‘Ã£ Ä‘Ã¡nh giÃ¡ mÃ³n nÃ y rá»“i" });
    }

    const hasPurchased = (db.orders || []).some(o =>
      o.customer_id === req.user.id &&
      o.status === "HoÃ n thÃ nh" &&
      (o.items || []).some(it => it.menu_item_id == menuItemId)
    );
    if (!hasPurchased) {
      return res.status(403).json({
        message: "Báº¡n cáº§n mua mÃ³n nÃ y Ä‘á»ƒ cÃ³ thá»ƒ Ä‘Ã¡nh giÃ¡"
      });
    }

    const id = Math.max(0, ...db.reviews.map(r => r.id)) + 1;
    const review = {
      id,
      menu_item_id: menuItemId,
      user_id: req.user.id,
      user_name: req.user.name,
      rating: +rating,
      comment: comment || "",
      created_at: new Date().toISOString()
    };
    db.reviews.push(review);

    const itemReviews = db.reviews.filter(r => r.menu_item_id == menuItemId);
    const avgRating = itemReviews.reduce((s, r) => s + r.rating, 0) / itemReviews.length;
    const mi = db.menu_items.find(m => m.id == menuItemId);
    if (mi) {
      mi.rating = Math.round(avgRating * 10) / 10;
      mi.review_count = itemReviews.length;
    }
    const authorUser = db.users.find(u => u.id === req.user.id);
    if (authorUser) {
      authorUser.points = (authorUser.points || 0) + 10;
    }
    saveDB(db);
    res.status(201).json({ ...review, pointsEarned: 10 });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ============ POINTS ============
app.get("/api/points/me", auth(), (req, res) => {
  const db = loadDB();
  const u = db.users.find(x => x.id === req.user.id);
  if (!u) return res.status(404).json({ message: "KhÃ´ng tÃ¬m tháº¥y user" });

  const orderHistory = (db.orders || [])
    .filter(o => o.customer_id === req.user.id)
    .map(o => ({ code: o.code, total: o.total, points: o.points_earned || 0, date: o.created_at, type: "earn" }));

  const voucherHistory = (db.vouchers || [])
    .filter(v => v.user_id === req.user.id)
    .map(v => ({ code: v.code, total: v.value, points: -(v.points_used || 0), date: v.created_at, type: "redeem", used: v.used || false }));

  const history = [...orderHistory, ...voucherHistory]
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  res.json({ points: u.points || 0, history });
});

app.post("/api/points/redeem", auth(), (req, res) => {
  try {
    const db = loadDB();
    const { points } = req.body;
    if (!points || points < 100) return res.status(400).json({ message: "Cáº§n Ã­t nháº¥t 100 Ä‘iá»ƒm" });
    const u = db.users.find(x => x.id === req.user.id);
    if (!u) return res.status(404).json({ message: "KhÃ´ng tÃ¬m tháº¥y user" });
    if ((u.points || 0) < points) return res.status(400).json({ message: "KhÃ´ng Ä‘á»§ Ä‘iá»ƒm" });
    u.points -= points;
    const value = points * 100;
    if (!db.vouchers) db.vouchers = [];
    const voucherId = Math.max(0, ...db.vouchers.map(v => v.id)) + 1;
    const code = "VOUCHER" + String(voucherId).padStart(4, "0");
    const voucher = { id: voucherId, code, user_id: req.user.id, value, points_used: points, used: false, created_at: new Date().toISOString() };
    db.vouchers.push(voucher);
    saveDB(db);
    res.status(201).json(voucher);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ============ ADMIN VOUCHERS ============
app.get("/api/vouchers", auth(["ADMIN"]), (req, res) => {
  const db = loadDB();
  res.json((db.vouchers || []).sort((a, b) => (b.id || 0) - (a.id || 0)));
});

app.post("/api/vouchers", auth(["ADMIN"]), (req, res) => {
  try {
    const db = loadDB();
    if (!db.vouchers) db.vouchers = [];
    const { code, value, user_id, points_used } = req.body;
    if (!code || !value) return res.status(400).json({ message: "Thiáº¿u mÃ£ hoáº·c giÃ¡ trá»‹" });
    const id = Math.max(0, ...db.vouchers.map(v => v.id)) + 1;
    const voucher = {
      id,
      code: code.toUpperCase(),
      value: +value,
      user_id: user_id ? +user_id : null,
      points_used: +points_used || 0,
      used: false,
      created_at: new Date().toISOString()
    };
    db.vouchers.push(voucher);
    saveDB(db);
    res.status(201).json(voucher);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.put("/api/vouchers/:id", auth(["ADMIN"]), (req, res) => {
  const db = loadDB();
  const v = (db.vouchers || []).find(x => x.id == req.params.id);
  if (!v) return res.status(404).json({ message: "KhÃ´ng tÃ¬m tháº¥y" });
  if (req.body.value !== undefined) v.value = +req.body.value;
  if (req.body.used !== undefined) v.used = req.body.used;
  if (req.body.code) v.code = req.body.code.toUpperCase();
  saveDB(db);
  res.json({ ok: true, voucher: v });
});

app.delete("/api/vouchers/:id", auth(["ADMIN"]), (req, res) => {
  const db = loadDB();
  db.vouchers = (db.vouchers || []).filter(x => x.id != req.params.id);
  saveDB(db);
  res.json({ ok: true });
});

app.get("/api/vouchers/me", auth(), (req, res) => {
  const db = loadDB();
  res.json((db.vouchers || []).filter(v => v.user_id === req.user.id));
});

app.post("/api/vouchers/validate", auth(), (req, res) => {
  try {
    const db = loadDB();
    const { code } = req.body;
    if (!code) return res.status(400).json({ message: "Thiáº¿u mÃ£ voucher" });
    const voucher = (db.vouchers || []).find(v => v.code.toUpperCase() === code.toUpperCase() && v.user_id === req.user.id && !v.used);
    if (!voucher) return res.status(404).json({ message: "MÃ£ voucher khÃ´ng há»£p lá»‡ hoáº·c Ä‘Ã£ dÃ¹ng" });
    res.json({ valid: true, value: voucher.value, code: voucher.code });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ============ PUBLIC VOUCHERS ============
app.get("/api/vouchers/public", auth(), (req, res) => {
  const db = loadDB();
  const myVouchers = (db.vouchers || []).filter(v => v.user_id === req.user.id);
  const claimedIds = myVouchers.map(v => v.claimed_from).filter(Boolean);

  const publicVouchers = (db.vouchers || []).filter(v =>
    !v.user_id &&
    !v.used &&
    !claimedIds.includes(v.id)
  ).sort((a, b) => (b.value || 0) - (a.value || 0));

  res.json(publicVouchers);
});

app.post("/api/vouchers/claim/:id", auth(), (req, res) => {
  try {
    const db = loadDB();
    const template = (db.vouchers || []).find(v =>
      v.id == req.params.id && !v.user_id
    );
    if (!template) return res.status(404).json({ message: "Voucher khÃ´ng tá»“n táº¡i hoáº·c Ä‘Ã£ háº¿t" });

    const alreadyClaimed = (db.vouchers || []).find(v =>
      v.user_id === req.user.id && v.claimed_from === template.id
    );
    if (alreadyClaimed) return res.status(400).json({ message: "Báº¡n Ä‘Ã£ nháº­n voucher nÃ y rá»“i" });

    const id = Math.max(0, ...db.vouchers.map(v => v.id)) + 1;
    const newVoucher = {
      id,
      code: template.code + "-U" + req.user.id,
      value: template.value,
      user_id: req.user.id,
      points_used: 0,
      used: false,
      claimed_from: template.id,
      created_at: new Date().toISOString()
    };
    db.vouchers.push(newVoucher);
    saveDB(db);
    res.status(201).json({ ok: true, voucher: newVoucher });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ============ PROMOTIONS ============
app.get("/api/promotions", (req, res) => {
  const db = loadDB();
  const list = (db.menu_items || []).filter(m =>
    m.active && m.discount_percent && m.discount_percent > 0
  ).map(m => ({
    id: m.id,
    name: m.name,
    image: m.image,
    category: m.category,
    description: m.description,
    original_price: m.original_price || m.price,
    price: m.price,
    discount_percent: m.discount_percent,
    stock: m.stock,
    sold: m.sold || 0,
    rating: m.rating || 0
  }));
  res.json(list);
});

// ============ CATEGORIES ============
const DEFAULT_CATEGORIES = [
  { id: 1, name: "CÆ¡m", icon: "ðŸš", order: 1 },
  { id: 2, name: "MÃ³n máº·n", icon: "ðŸ¥˜", order: 2 },
  { id: 3, name: "MÃ³n chay", icon: "ðŸ¥—", order: 3 },
  { id: 4, name: "MÃ³n phá»¥", icon: "ðŸ²", order: 4 },
  { id: 5, name: "Äá»“ Äƒn nhanh", icon: "ðŸ”", order: 5 },
  { id: 6, name: "Äá»“ uá»‘ng", icon: "ðŸ¥¤", order: 6 },
  { id: 7, name: "Combo", icon: "ðŸ±", order: 7 }
];

function ensureCategories(db) {
  if (!db.categories || !Array.isArray(db.categories) || db.categories.length === 0) {
    db.categories = [...DEFAULT_CATEGORIES];
    return { categories: db.categories, changed: true };
  }
  return { categories: db.categories, changed: false };
}

app.get("/api/categories", (req, res) => {
  const db = loadDB();
  const { categories, changed } = ensureCategories(db);
  if (changed) saveDB(db);
  res.json([...categories].sort((a, b) => (a.order || 0) - (b.order || 0)));
});

app.post("/api/categories", auth(["ADMIN", "EMPLOYEE"]), (req, res) => {
  try {
    const db = loadDB();
    const { categories } = ensureCategories(db);
    const { name, icon, order } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: "Thiáº¿u tÃªn danh má»¥c" });
    const trimmed = name.trim();
    if (categories.find(c => c.name.toLowerCase() === trimmed.toLowerCase())) {
      return res.status(400).json({ message: "Danh má»¥c Ä‘Ã£ tá»“n táº¡i" });
    }

    let finalOrder;
    if (order !== undefined && order !== null && order !== "") {
      const parsed = Number(order);
      if (!Number.isInteger(parsed) || parsed < 0) {
        return res.status(400).json({ message: "Thá»© tá»± pháº£i lÃ  sá»‘ nguyÃªn >= 0" });
      }
      finalOrder = parsed;
    } else {
      finalOrder = Math.max(0, ...categories.map(c => c.order || 0)) + 1;
    }

    const id = Math.max(0, ...categories.map(c => c.id)) + 1;
    const cat = { id, name: trimmed, icon: icon || "ðŸ½ï¸", order: finalOrder };
    categories.push(cat);
    saveDB(db);
    res.status(201).json(cat);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.put("/api/categories/:id", auth(["ADMIN", "EMPLOYEE"]), (req, res) => {
  try {
    const db = loadDB();
    const { categories } = ensureCategories(db);
    const cat = categories.find(c => c.id == req.params.id);
    if (!cat) return res.status(404).json({ message: "KhÃ´ng tÃ¬m tháº¥y danh má»¥c" });
    const oldName = cat.name;
    const { name, icon, order } = req.body;

    if (name && name.trim()) {
      const trimmed = name.trim();
      if (categories.find(c => c.id != req.params.id && c.name.toLowerCase() === trimmed.toLowerCase())) {
        return res.status(400).json({ message: "TÃªn danh má»¥c Ä‘Ã£ tá»“n táº¡i" });
      }
      cat.name = trimmed;
      if (trimmed !== oldName) {
        (db.menu_items || []).forEach(m => {
          if (m.category === oldName) m.category = trimmed;
        });
      }
    }

    if (icon !== undefined) cat.icon = icon;

    if (order !== undefined && order !== null && order !== "") {
      const parsed = Number(order);
      if (!Number.isInteger(parsed) || parsed < 0) {
        return res.status(400).json({ message: "Thá»© tá»± pháº£i lÃ  sá»‘ nguyÃªn >= 0" });
      }
      cat.order = parsed;
    }

    saveDB(db);
    res.json(cat);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.delete("/api/categories/:id", auth(["ADMIN"]), (req, res) => {
  try {
    const db = loadDB();
    const { categories } = ensureCategories(db);
    const cat = categories.find(c => c.id == req.params.id);
    if (!cat) return res.status(404).json({ message: "KhÃ´ng tÃ¬m tháº¥y danh má»¥c" });
    const usedCount = (db.menu_items || []).filter(m => m.category === cat.name).length;
    if (usedCount > 0) {
      return res.status(400).json({
        message: "KhÃ´ng thá»ƒ xÃ³a â€” cÃ³ " + usedCount + " mÃ³n Ä‘ang dÃ¹ng danh má»¥c nÃ y"
      });
    }
    db.categories = categories.filter(c => c.id != req.params.id);
    saveDB(db);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ============ WALLET ============
function getOrCreateWallet(db, userId) {
  if (!db.wallets) db.wallets = [];
  let w = db.wallets.find(x => x.user_id === userId);
  if (!w) {
    w = {
      user_id: userId,
      balance: 0,
      bank_name: "",
      bank_account: "",
      bank_account_name: "",
      linked_at: "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    db.wallets.push(w);
  }
  return w;
}

app.get("/api/wallet/me", auth(), (req, res) => {
  const db = loadDB();
  const w = getOrCreateWallet(db, req.user.id);
  saveDB(db);
  res.json({
    balance: w.balance || 0,
    bank_name: w.bank_name || "",
    bank_account: w.bank_account || "",
    bank_account_name: w.bank_account_name || "",
    linked_at: w.linked_at || ""
  });
});

app.get("/api/wallet/transactions", auth(), (req, res) => {
  const db = loadDB();
  const list = (db.wallet_transactions || [])
    .filter(t => t.user_id === req.user.id)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 100);
  res.json(list);
});

app.post("/api/wallet/deposit", auth(), (req, res) => {
  try {
    const db = loadDB();
    const { amount, method, note } = req.body;
    const amt = +amount;
    if (!amt || amt < 10000) return res.status(400).json({ message: "Sá»‘ tiá»n tá»‘i thiá»ƒu 10.000Ä‘" });
    if (amt > 50000000) return res.status(400).json({ message: "Sá»‘ tiá»n tá»‘i Ä‘a 50.000.000Ä‘" });
    if (!["QR", "CASH"].includes(method)) return res.status(400).json({ message: "PhÆ°Æ¡ng thá»©c khÃ´ng há»£p lá»‡" });

    if (!db.wallet_transactions) db.wallet_transactions = [];
    const id = Math.max(0, ...db.wallet_transactions.map(t => t.id)) + 1;
    const code = "DEP" + Date.now().toString().slice(-8);
    const tx = {
      id,
      code,
      user_id: req.user.id,
      user_name: req.user.name,
      user_email: req.user.email,
      type: "deposit",
      amount: amt,
      method,
      status: "pending",
      note: note || "",
      admin_note: "",
      created_at: new Date().toISOString()
    };
    db.wallet_transactions.push(tx);
    saveDB(db);
    res.status(201).json({ ok: true, transaction: tx });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post("/api/wallet/withdraw", auth(), (req, res) => {
  try {
    const db = loadDB();
    const { amount, note } = req.body;
    const amt = +amount;
    if (!amt || amt < 20000) return res.status(400).json({ message: "Sá»‘ tiá»n rÃºt tá»‘i thiá»ƒu 20.000Ä‘" });
    const w = getOrCreateWallet(db, req.user.id);
    if (w.balance < amt) return res.status(400).json({ message: "Sá»‘ dÆ° khÃ´ng Ä‘á»§" });
    if (!w.bank_account) return res.status(400).json({ message: "ChÆ°a liÃªn káº¿t tÃ i khoáº£n ngÃ¢n hÃ ng" });

    if (!db.wallet_transactions) db.wallet_transactions = [];
    const id = Math.max(0, ...db.wallet_transactions.map(t => t.id)) + 1;
    const code = "WDR" + Date.now().toString().slice(-8);
    const tx = {
      id,
      code,
      user_id: req.user.id,
      user_name: req.user.name,
      user_email: req.user.email,
      type: "withdraw",
      amount: amt,
      method: "BANK",
      status: "pending",
      note: note || "",
      admin_note: "",
      bank_name: w.bank_name,
      bank_account: w.bank_account,
      bank_account_name: w.bank_account_name,
      created_at: new Date().toISOString()
    };
    db.wallet_transactions.push(tx);
    w.balance -= amt;
    w.updated_at = new Date().toISOString();
    saveDB(db);
    res.status(201).json({ ok: true, transaction: tx, newBalance: w.balance });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post("/api/wallet/link-bank", auth(), (req, res) => {
  try {
    const db = loadDB();
    const { bank_name, bank_account, bank_account_name } = req.body;
    if (!bank_name || !bank_account || !bank_account_name) {
      return res.status(400).json({ message: "Thiáº¿u thÃ´ng tin ngÃ¢n hÃ ng" });
    }
    const w = getOrCreateWallet(db, req.user.id);
    w.bank_name = bank_name;
    w.bank_account = String(bank_account).trim();
    w.bank_account_name = bank_account_name.toUpperCase().trim();
    w.linked_at = new Date().toISOString();
    w.updated_at = new Date().toISOString();
    saveDB(db);
    res.json({ ok: true, wallet: w });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get("/api/wallet/requests", auth(["ADMIN"]), (req, res) => {
  const db = loadDB();
  const { status } = req.query;
  let list = (db.wallet_transactions || []);
  if (status && status !== "all") {
    list = list.filter(t => t.status === status);
  } else {
    list = list.filter(t => t.status === "pending");
  }
  list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  res.json(list);
});

app.get("/api/wallet/all", auth(["ADMIN"]), (req, res) => {
  const db = loadDB();
  const list = [...(db.wallet_transactions || [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(list);
});

app.get("/api/wallet/stats", auth(["ADMIN"]), (req, res) => {
  const db = loadDB();
  const all = db.wallet_transactions || [];
  const wallets = db.wallets || [];
  res.json({
    totalBalance: wallets.reduce((s, w) => s + (w.balance || 0), 0),
    totalUsers: wallets.length,
    totalDeposited: all.filter(t => t.type === "deposit" && t.status === "approved").reduce((s, t) => s + (t.amount || 0), 0),
    totalWithdrawn: all.filter(t => t.type === "withdraw" && t.status === "approved").reduce((s, t) => s + (t.amount || 0), 0),
    totalPaid: all.filter(t => t.type === "payment" && t.status === "approved").reduce((s, t) => s + (t.amount || 0), 0),
    pendingCount: all.filter(t => t.status === "pending").length,
    pendingDepositCount: all.filter(t => t.type === "deposit" && t.status === "pending").length,
    pendingWithdrawCount: all.filter(t => t.type === "withdraw" && t.status === "pending").length
  });
});

app.patch("/api/wallet/requests/:id/approve", auth(["ADMIN"]), (req, res) => {
  try {
    const db = loadDB();
    const tx = (db.wallet_transactions || []).find(t => t.id == req.params.id);
    if (!tx) return res.status(404).json({ message: "KhÃ´ng tÃ¬m tháº¥y giao dá»‹ch" });
    if (tx.status !== "pending") return res.status(400).json({ message: "Giao dá»‹ch Ä‘Ã£ xá»­ lÃ½" });

    const w = getOrCreateWallet(db, tx.user_id);
    if (tx.type === "deposit") {
      w.balance += tx.amount;
    }
    w.updated_at = new Date().toISOString();
    tx.status = "approved";
    tx.approved_by = req.user.name;
    tx.approved_at = new Date().toISOString();
    if (req.body.admin_note) tx.admin_note = req.body.admin_note;
    saveDB(db);
    res.json({ ok: true, transaction: tx, newBalance: w.balance });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.patch("/api/wallet/requests/:id/reject", auth(["ADMIN"]), (req, res) => {
  try {
    const db = loadDB();
    const tx = (db.wallet_transactions || []).find(t => t.id == req.params.id);
    if (!tx) return res.status(404).json({ message: "KhÃ´ng tÃ¬m tháº¥y giao dá»‹ch" });
    if (tx.status !== "pending") return res.status(400).json({ message: "Giao dá»‹ch Ä‘Ã£ xá»­ lÃ½" });

    const w = getOrCreateWallet(db, tx.user_id);
    if (tx.type === "withdraw") {
      w.balance += tx.amount;
      w.updated_at = new Date().toISOString();
    }
    tx.status = "rejected";
    tx.approved_by = req.user.name;
    tx.approved_at = new Date().toISOString();
    if (req.body.admin_note) tx.admin_note = req.body.admin_note;
    saveDB(db);
    res.json({ ok: true, transaction: tx });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post("/api/wallet/pay", auth(), (req, res) => {
  try {
    const db = loadDB();
    const { amount, order_code } = req.body;
    const amt = +amount;
    if (!amt || amt <= 0) return res.status(400).json({ message: "Sá»‘ tiá»n khÃ´ng há»£p lá»‡" });
    const w = getOrCreateWallet(db, req.user.id);
    if (w.balance < amt) return res.status(400).json({ message: "Sá»‘ dÆ° vÃ­ khÃ´ng Ä‘á»§" });

    if (!db.wallet_transactions) db.wallet_transactions = [];
    const id = Math.max(0, ...db.wallet_transactions.map(t => t.id)) + 1;
    const tx = {
      id,
      code: "PAY" + Date.now().toString().slice(-8),
      user_id: req.user.id,
      user_name: req.user.name,
      type: "payment",
      amount: amt,
      method: "WALLET",
      status: "approved",
      note: "Thanh toÃ¡n Ä‘Æ¡n " + (order_code || ""),
      order_code: order_code || "",
      created_at: new Date().toISOString(),
      approved_at: new Date().toISOString()
    };
    db.wallet_transactions.push(tx);
    w.balance -= amt;
    w.updated_at = new Date().toISOString();
    saveDB(db);
    res.status(201).json({ ok: true, transaction: tx, newBalance: w.balance });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ============ VOUCHER STATS & ADMIN ============
app.get("/api/vouchers/stats", auth(["ADMIN"]), (req, res) => {
  const db = loadDB();
  const all = db.vouchers || [];
  const publicTemplates = all.filter(v => !v.user_id);
  const personal = all.filter(v => v.user_id);
  const used = all.filter(v => v.used);

  let totalClaims = 0;
  publicTemplates.forEach(t => {
    totalClaims += all.filter(v => v.claimed_from === t.id).length;
  });

  res.json({
    total: all.length,
    public: publicTemplates.length,
    personal: personal.length,
    used: used.length,
    available: personal.filter(v => !v.used).length,
    totalClaims,
    totalValue: all.reduce((s, v) => s + (v.value || 0), 0),
    usedValue: used.reduce((s, v) => s + (v.value || 0), 0)
  });
});

app.get("/api/vouchers/claims/:templateId", auth(["ADMIN"]), (req, res) => {
  const db = loadDB();
  const claims = (db.vouchers || []).filter(v => v.claimed_from == req.params.templateId);
  const list = claims.map(v => {
    const user = db.users.find(u => u.id === v.user_id);
    return {
      id: v.id,
      code: v.code,
      user_id: v.user_id,
      user_name: user?.name || "User #" + v.user_id,
      user_email: user?.email || "",
      used: v.used,
      used_at: v.used_at,
      created_at: v.created_at
    };
  });
  res.json(list);
});

app.get("/api/vouchers/user/:userId", auth(["ADMIN"]), (req, res) => {
  const db = loadDB();
  const userId = +req.params.userId;
  const user = db.users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ message: "KhÃ´ng tÃ¬m tháº¥y user" });
  const list = (db.vouchers || []).filter(v => v.user_id === userId);
  res.json({
    user: { id: user.id, name: user.name, email: user.email, phone: user.phone, points: user.points || 0 },
    vouchers: list,
    stats: {
      total: list.length,
      used: list.filter(v => v.used).length,
      available: list.filter(v => !v.used).length,
      totalValue: list.reduce((s, v) => s + (v.value || 0), 0)
    }
  });
});

app.delete("/api/vouchers/revoke/:id", auth(["ADMIN"]), (req, res) => {
  const db = loadDB();
  const v = (db.vouchers || []).find(x => x.id == req.params.id);
  if (!v) return res.status(404).json({ message: "KhÃ´ng tÃ¬m tháº¥y voucher" });
  if (v.used) return res.status(400).json({ message: "KhÃ´ng thá»ƒ thu há»“i voucher Ä‘Ã£ dÃ¹ng" });
  db.vouchers = db.vouchers.filter(x => x.id != req.params.id);
  saveDB(db);
  res.json({ ok: true });
});

// ============ CHAT ============
function normalizeUserId(id) {
  if (id === undefined || id === null) return null;
  const n = Number(id);
  return isNaN(n) ? id : n;
}

app.get("/api/chat/conversations", auth(["ADMIN", "EMPLOYEE"]), (req, res) => {
  const db = loadDB();
  const convMap = {};
  (db.messages || []).forEach((m) => {
    const uid = normalizeUserId(m.user_id);
    if (uid === null) return;
    if (!convMap[uid]) {
      convMap[uid] = { user_id: uid, user_name: m.user_name || "KhÃ¡ch", last_message: m.content, last_time: m.created_at, unread: 0 };
    }
    if (m.from === "customer" && !m.read) convMap[uid].unread += 1;
    if (new Date(m.created_at) > new Date(convMap[uid].last_time)) {
      convMap[uid].last_message = m.content;
      convMap[uid].last_time = m.created_at;
      convMap[uid].user_name = m.user_name || convMap[uid].user_name;
    }
  });
  res.json(Object.values(convMap).sort((a, b) => new Date(b.last_time) - new Date(a.last_time)));
});

app.get("/api/chat/me", auth(), (req, res) => {
  const db = loadDB();
  const myId = normalizeUserId(req.user.id);
  const list = (db.messages || []).filter((m) => normalizeUserId(m.user_id) === myId).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  res.json(list);
});

app.get("/api/chat/with/:userId", auth(["ADMIN", "EMPLOYEE"]), (req, res) => {
  const db = loadDB();
  const targetId = normalizeUserId(req.params.userId);
  const list = (db.messages || []).filter((m) => normalizeUserId(m.user_id) === targetId).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  let changed = false;
  (db.messages || []).forEach((m) => {
    if (normalizeUserId(m.user_id) === targetId && m.from === "customer" && !m.read) {
      m.read = true;
      changed = true;
    }
  });
  if (changed) saveDB(db);
  res.json(list);
});

app.post("/api/chat/send", auth(), (req, res) => {
  try {
    const db = loadDB();
    const { content, toUserId } = req.body;
    if (!content?.trim()) return res.status(400).json({ message: "Tin nháº¯n trá»‘ng" });
    if (!db.messages) db.messages = [];
    const id = Math.max(0, ...db.messages.map((m) => m.id)) + 1;
    const isStaff = req.user.role === "ADMIN" || req.user.role === "EMPLOYEE";
    let userId, userName;
    if (isStaff) {
      userId = normalizeUserId(toUserId);
      if (userId === null) return res.status(400).json({ message: "Thiáº¿u toUserId" });
      const customer = db.users.find((u) => normalizeUserId(u.id) === userId);
      userName = customer?.name || "KhÃ¡ch";
    } else {
      userId = normalizeUserId(req.user.id);
      userName = req.user.name;
    }
    const message = { id, user_id: userId, user_name: userName, from: isStaff ? "staff" : "customer", from_name: req.user.name, content: content.trim(), read: false, created_at: new Date().toISOString() };
    db.messages.push(message);
    saveDB(db);
    res.status(201).json(message);
  } catch (e) {
    console.error("CHAT SEND ERROR:", e);
    res.status(500).json({ message: e.message });
  }
});

// ============ NOTIFICATIONS ============
app.get("/api/notifications", auth(), (req, res) => {
  const db = loadDB();
  const list = (db.notifications || []).filter(n => n.user_id === req.user.id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 50);
  const unread = list.filter(n => !n.read).length;
  res.json({ list, unread });
});

app.post("/api/notifications/:id/read", auth(), (req, res) => {
  const db = loadDB();
  const n = (db.notifications || []).find(x => x.id == req.params.id && x.user_id === req.user.id);
  if (n) n.read = true;
  saveDB(db);
  res.json({ ok: true });
});

app.post("/api/notifications/read-all", auth(), (req, res) => {
  const db = loadDB();
  (db.notifications || []).forEach(n => { if (n.user_id === req.user.id) n.read = true; });
  saveDB(db);
  res.json({ ok: true });
});

// ============ TOPPINGS & SIZES ============
app.get("/api/toppings", (req, res) => {
  const db = loadDB();
  const { category } = req.query;
  let list = db.toppings || [];
  if (category) list = list.filter(t => t.applies_to?.includes(category));
  res.json(list);
});

app.get("/api/sizes", (req, res) => {
  const db = loadDB();
  res.json(db.sizes || [
    { id: "S", name: "Nhá»", extra_price: 0 },
    { id: "M", name: "Vá»«a", extra_price: 5000 },
    { id: "L", name: "Lá»›n", extra_price: 10000 }
  ]);
});

// ============ STATS ============
app.get("/api/stats", auth(["ADMIN", "EMPLOYEE"]), (req, res) => {
  try {
    const db = loadDB();
    const today = getLocalDateStr();
    const todayOrders = db.orders.filter(
      (o) => toLocalDateStr(o.created_at) === today
    );
    const byStatus = {};
    db.orders.forEach(o => { byStatus[o.status] = (byStatus[o.status] || 0) + 1; });
    res.json({
      revenue: todayOrders.reduce((s, o) => s + o.total, 0),
      orderCount: todayOrders.length,
      customerCount: db.users.filter(u => u.role === "CUSTOMER").length,
      lowStock: (db.inventory || []).filter(i => i.qty < i.min).length,
      byStatus: Object.entries(byStatus).map(([_id, count]) => ({ _id, count }))
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ============ INVENTORY ============
app.get("/api/inventory", auth(["ADMIN", "EMPLOYEE"]), (req, res) => {
  const db = loadDB();
  res.json(db.inventory);
});

app.post("/api/inventory", auth(["ADMIN"]), (req, res) => {
  try {
    const db = loadDB();
    if (!db.inventory) db.inventory = [];
    const { code, name, qty, unit, min } = req.body;
    if (!code || !name) return res.status(400).json({ message: "Thiáº¿u mÃ£ hoáº·c tÃªn" });
    if (db.inventory.find(x => x.code === code)) return res.status(400).json({ message: "MÃ£ nguyÃªn liá»‡u Ä‘Ã£ tá»“n táº¡i" });
    const item = { code, name, qty: +qty || 0, unit: unit || "kg", min: +min || 0 };
    db.inventory.push(item);
    saveDB(db);
    res.status(201).json(item);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.put("/api/inventory/:code", auth(["ADMIN"]), (req, res) => {
  try {
    const db = loadDB();
    const item = db.inventory?.find(x => x.code === req.params.code);
    if (!item) return res.status(404).json({ message: "KhÃ´ng tÃ¬m tháº¥y nguyÃªn liá»‡u" });
    Object.assign(item, req.body);
    saveDB(db);
    res.json(item);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.delete("/api/inventory/:code", auth(["ADMIN"]), (req, res) => {
  const db = loadDB();
  db.inventory = (db.inventory || []).filter(x => x.code !== req.params.code);
  saveDB(db);
  res.json({ ok: true });
});

app.post("/api/inventory/:code/import", auth(["ADMIN", "EMPLOYEE"]), (req, res) => {
  try {
    const db = loadDB();
    const item = db.inventory?.find(x => x.code === req.params.code);
    if (!item) return res.status(404).json({ message: "KhÃ´ng tÃ¬m tháº¥y nguyÃªn liá»‡u" });
    const { qty, note, supplier } = req.body;
    if (!qty || +qty <= 0) return res.status(400).json({ message: "Sá»‘ lÆ°á»£ng khÃ´ng há»£p lá»‡" });
    const importQty = +qty;
    const before = item.qty;
    item.qty += importQty;
    item.last_import = new Date().toISOString();
    if (!db.imports) db.imports = [];
    const id = Math.max(0, ...db.imports.map(i => i.id)) + 1;
    const record = { id, code: item.code, name: item.name, qty: importQty, before, after: item.qty, unit: item.unit, supplier: supplier || "", note: note || "", imported_by: req.user.name, imported_by_id: req.user.id, created_at: new Date().toISOString() };
    db.imports.push(record);
    saveDB(db);
    res.status(201).json({ message: "Nháº­p kho thÃ nh cÃ´ng", item, record });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.get("/api/inventory/imports", auth(["ADMIN", "EMPLOYEE"]), (req, res) => {
  const db = loadDB();
  res.json((db.imports || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
});

// ============ ATTENDANCE ============
function todayStr() {
  return getLocalDateStr();
}

const SHIFT_START_HOUR = { "Ca sÃ¡ng": 6, "Ca chiá»u": 12, "Ca tá»‘i": 18 };
const SHIFT_END_HOUR   = { "Ca sÃ¡ng": 12, "Ca chiá»u": 18, "Ca tá»‘i": 22 };

app.post("/api/attendance/checkin", auth(["EMPLOYEE", "ADMIN"]), (req, res) => {
  try {
    const db = loadDB();
    if (!db.attendances) db.attendances = [];
    const today = todayStr();
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();

    const { shift: bodyShift } = req.body || {};
    let shift = bodyShift || "";
    if (!shift) {
      if (hour >= 6 && hour < 12) shift = "Ca sÃ¡ng";
      else if (hour >= 12 && hour < 18) shift = "Ca chiá»u";
      else if (hour >= 18 && hour < 22) shift = "Ca tá»‘i";
      else shift = "NgoÃ i giá»";
    }

    const existing = db.attendances.find(a =>
      a.employee_id === req.user.id &&
      a.date === today &&
      a.shift === shift &&
      a.checkIn
    );
    if (existing) {
      return res.status(400).json({ message: "Báº¡n Ä‘Ã£ check-in " + shift + " hÃ´m nay rá»“i" });
    }

    const startHour = SHIFT_START_HOUR[shift] || 8;
    const late = hour > startHour || (hour === startHour && minute > 15);

    const status = late ? "Äi muá»™n" : "ÄÃºng giá»";
    const id = Math.max(0, ...db.attendances.map(a => a.id)) + 1;
    const attendance = {
      id,
      employee_id: req.user.id,
      employee_name: req.user.name,
      date: today,
      shift,
      checkIn: now.toISOString(),
      checkOut: null,
      hours: 0,
      status,
      note: "",
      created_at: now.toISOString()
    };
    db.attendances.push(attendance);
    saveDB(db);
    res.status(201).json({ message: "Check-in " + shift + " thÃ nh cÃ´ng", attendance });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.post("/api/attendance/checkout", auth(["EMPLOYEE", "ADMIN"]), (req, res) => {
  try {
    const db = loadDB();
    const today = todayStr();
    const now = new Date();

    const { shift: bodyShift } = req.body || {};
    let shift = bodyShift || "";
    if (!shift) {
      const hour = now.getHours();
      if (hour >= 6 && hour < 12) shift = "Ca sÃ¡ng";
      else if (hour >= 12 && hour < 18) shift = "Ca chiá»u";
      else if (hour >= 18 && hour < 22) shift = "Ca tá»‘i";
      else shift = "NgoÃ i giá»";
    }

    const att = db.attendances?.find(a =>
      a.employee_id === req.user.id &&
      a.date === today &&
      a.shift === shift &&
      a.checkIn &&
      !a.checkOut
    );
    if (!att) return res.status(400).json({ message: "Báº¡n chÆ°a check-in " + shift + " hÃ´m nay" });

    att.checkOut = now.toISOString();
    att.hours = Math.round(((now - new Date(att.checkIn)) / 3600000) * 100) / 100;

    const endHour = SHIFT_END_HOUR[shift];
    if (endHour !== undefined && now.getHours() < endHour && att.status === "ÄÃºng giá»") {
      att.status = "Vá» sá»›m";
    }
    saveDB(db);
    res.json({ message: "Check-out " + shift + " thÃ nh cÃ´ng", attendance: att });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.get("/api/attendance/today", auth(), (req, res) => {
  const db = loadDB();
  const today = todayStr();
  const att = (db.attendances || []).find(a => a.employee_id === req.user.id && a.date === today);
  res.json(att || null);
});

app.get("/api/attendance/me", auth(), (req, res) => {
  const db = loadDB();
  const list = (db.attendances || []).filter(a => a.employee_id === req.user.id);
  res.json(list.sort((a, b) => b.date.localeCompare(a.date)));
});

app.get("/api/attendance", auth(["ADMIN", "EMPLOYEE"]), (req, res) => {
  const db = loadDB();
  let list = db.attendances || [];
  const { from, to, employee_id, month } = req.query;
  if (month) list = list.filter(a => a.date && a.date.startsWith(month));
  else if (from && to) list = list.filter(a => a.date >= from && a.date <= to);
  if (employee_id) list = list.filter(a => a.employee_id == employee_id);
  list.sort((a, b) => b.date.localeCompare(a.date));
  res.json(list);
});

app.get("/api/attendance/employees", auth(["ADMIN"]), (req, res) => {
  const db = loadDB();
  const list = db.users.filter(u => u.role === "EMPLOYEE");
  res.json(list.map(u => ({ id: u.id, name: u.name, role: u.role })));
});

// ============ PERMISSIONS ============
const ALL_PERMISSIONS = [
  { key: "menu.view", label: "Xem thá»±c Ä‘Æ¡n" },
  { key: "menu.create", label: "ThÃªm mÃ³n" },
  { key: "menu.update", label: "Sá»­a mÃ³n" },
  { key: "menu.toggle", label: "Táº¯t / Báº­t mÃ³n" },
  { key: "menu.delete", label: "XÃ³a mÃ³n" },
  { key: "orders.view", label: "Xem Ä‘Æ¡n hÃ ng" },
  { key: "orders.process", label: "Xá»­ lÃ½ Ä‘Æ¡n hÃ ng" },
  { key: "orders.cancel", label: "Há»§y Ä‘Æ¡n hÃ ng" },
  { key: "inventory.view", label: "Xem kho" },
  { key: "inventory.import", label: "Nháº­p kho" },
  { key: "inventory.manage", label: "Quáº£n lÃ½ kho" },
  { key: "customers.view", label: "Xem khÃ¡ch hÃ ng" },
  { key: "customers.manage", label: "Quáº£n lÃ½ khÃ¡ch hÃ ng" },
  { key: "employees.view", label: "Xem nhÃ¢n viÃªn" },
  { key: "employees.manage", label: "Quáº£n lÃ½ nhÃ¢n viÃªn" },
  { key: "attendance.view", label: "Xem cháº¥m cÃ´ng" },
  { key: "attendance.manage", label: "Quáº£n lÃ½ cháº¥m cÃ´ng" },
  { key: "reports.view", label: "Xem bÃ¡o cÃ¡o" },
  { key: "backup.export", label: "Xuáº¥t backup" },
  { key: "backup.import", label: "Nháº­p backup" },
  { key: "backup.reset", label: "Reset database" },
  { key: "settings.view", label: "Xem cÃ i Ä‘áº·t" },
  { key: "settings.manage", label: "Quáº£n lÃ½ cÃ i Ä‘áº·t" }
];

const ROLE_PERMISSIONS = {
  ADMIN: ALL_PERMISSIONS.map(p => p.key),
  EMPLOYEE: ["menu.view", "menu.update", "orders.view", "orders.process", "inventory.view", "inventory.import", "customers.view", "attendance.view"],
  CUSTOMER: []
};

app.get("/api/permissions", auth(["ADMIN"]), (req, res) => {
  res.json({ all: ALL_PERMISSIONS, roles: ROLE_PERMISSIONS });
});

app.get("/api/permissions/me", auth(), (req, res) => {
  const db = loadDB();
  const u = db.users.find(x => x.id === req.user.id);
  if (!u) return res.status(404).json({ message: "KhÃ´ng tÃ¬m tháº¥y user" });
  const rolePerms = ROLE_PERMISSIONS[u.role] || [];
  const customPerms = u.permissions || [];
  const allPerms = [...new Set([...rolePerms, ...customPerms])];
  res.json({ role: u.role, permissions: allPerms, default: rolePerms, custom: customPerms });
});

app.get("/api/permissions/:userId", auth(["ADMIN"]), (req, res) => {
  const db = loadDB();
  const u = db.users.find(x => x.id == req.params.userId);
  if (!u) return res.status(404).json({ message: "KhÃ´ng tÃ¬m tháº¥y user" });
  const rolePerms = ROLE_PERMISSIONS[u.role] || [];
  const customPerms = u.permissions || [];
  const allPerms = [...new Set([...rolePerms, ...customPerms])];
  res.json({ userId: u.id, userName: u.name, role: u.role, permissions: allPerms, default: rolePerms, custom: customPerms });
});

app.put("/api/permissions/:userId", auth(["ADMIN"]), (req, res) => {
  try {
    const db = loadDB();
    const u = db.users.find(x => x.id == req.params.userId);
    if (!u) return res.status(404).json({ message: "KhÃ´ng tÃ¬m tháº¥y user" });
    if (u.role === "ADMIN") return res.status(400).json({ message: "KhÃ´ng thá»ƒ sá»­a quyá»n ADMIN" });
    const { custom } = req.body;
    if (!Array.isArray(custom)) return res.status(400).json({ message: "custom pháº£i lÃ  array" });
    u.permissions = custom.filter(p => ALL_PERMISSIONS.some(ap => ap.key === p));
    saveDB(db);
    res.json({ ok: true, user: { id: u.id, permissions: u.permissions } });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ============ BACKUP ============
app.get("/api/backup/export", auth(["ADMIN"]), (req, res) => {
  const db = loadDB();
  res.json({ version: "1.0", exported_at: new Date().toISOString(), exported_by: req.user.name, data: db });
});

app.post("/api/backup/import", auth(["ADMIN"]), (req, res) => {
  try {
    const { data } = req.body;
    if (!data) return res.status(400).json({ message: "File backup khÃ´ng há»£p lá»‡" });
    if (!data.users || !data.menu_items) return res.status(400).json({ message: "File backup thiáº¿u dá»¯ liá»‡u cáº§n thiáº¿t" });
    const current = loadDB();
    const backupFile = path.join(__dirname, "canteen-db-auto-backup-" + Date.now() + ".json");
    try {
      fs.writeFileSync(backupFile, JSON.stringify(current, null, 2), "utf-8");
    } catch {
      // Bá» qua náº¿u filesystem khÃ´ng ghi Ä‘Æ°á»£c
    }
    saveDB(data);
    res.json({ message: "Import thÃ nh cÃ´ng!", stats: { users: data.users?.length || 0, menu_items: data.menu_items?.length || 0, orders: data.orders?.length || 0, inventory: data.inventory?.length || 0 }, auto_backup_saved: path.basename(backupFile) });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.get("/api/backup/stats", auth(["ADMIN"]), (req, res) => {
  try {
    const db = loadDB();
    res.json({
      users: db.users?.length || 0,
      customers: db.users?.filter(u => u.role === "CUSTOMER").length || 0,
      employees: db.users?.filter(u => u.role === "EMPLOYEE").length || 0,
      menu_items: db.menu_items?.length || 0,
      orders: db.orders?.length || 0,
      inventory: db.inventory?.length || 0,
      toppings: db.toppings?.length || 0,
      sizes: db.sizes?.length || 0,
      reviews: db.reviews?.length || 0,
      vouchers: db.vouchers?.length || 0,
      notifications: db.notifications?.length || 0,
      messages: db.messages?.length || 0,
      attendances: db.attendances?.length || 0,
      imports: db.imports?.length || 0,
      price_history: db.price_history?.length || 0,
      db_size_bytes: JSON.stringify(db).length
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ============ REPORTS ============
app.get("/api/reports/revenue", auth(["ADMIN", "EMPLOYEE"]), (req, res) => {
  try {
    const db = loadDB();
    const { period = "day" } = req.query;
    const now = new Date();

    const completedOrders = (db.orders || []).filter(o => o.status === "HoÃ n thÃ nh");

    let result = [];
    let totalRevenue = 0;
    let totalOrders = 0;

    if (period === "day") {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = getLocalDateStr(d);
        const dayOrders = completedOrders.filter(
          (o) => toLocalDateStr(o.created_at) === dateStr
        );
        const revenue = dayOrders.reduce((s, o) => s + (o.total || 0), 0);
        const dayLabel = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"][d.getDay()];
        result.push({ label: dayLabel, date: dateStr, revenue, orders: dayOrders.length });
        totalRevenue += revenue;
        totalOrders += dayOrders.length;
      }
    } else if (period === "week") {
      for (let i = 3; i >= 0; i--) {
        const weekEnd = new Date(now);
        weekEnd.setDate(weekEnd.getDate() - i * 7);
        const weekStart = new Date(weekEnd);
        weekStart.setDate(weekStart.getDate() - 6);
        const weekOrders = completedOrders.filter(o => {
          const d = new Date(o.created_at);
          return d >= weekStart && d <= weekEnd;
        });
        const revenue = weekOrders.reduce((s, o) => s + (o.total || 0), 0);
        result.push({
          label: "Tuáº§n " + (4 - i),
          date: weekStart.toISOString().slice(0, 10) + " - " + weekEnd.toISOString().slice(0, 10),
          revenue,
          orders: weekOrders.length
        });
        totalRevenue += revenue;
        totalOrders += weekOrders.length;
      }
    } else if (period === "month") {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const year = d.getFullYear();
        const month = d.getMonth();
        const monthOrders = completedOrders.filter(o => {
          const od = new Date(o.created_at);
          return od.getFullYear() === year && od.getMonth() === month;
        });
        const revenue = monthOrders.reduce((s, o) => s + (o.total || 0), 0);
        result.push({
          label: "T" + (month + 1),
          date: year + "-" + String(month + 1).padStart(2, "0"),
          revenue,
          orders: monthOrders.length
        });
        totalRevenue += revenue;
        totalOrders += monthOrders.length;
      }
    } else if (period === "year") {
      for (let i = 4; i >= 0; i--) {
        const year = now.getFullYear() - i;
        const yearOrders = completedOrders.filter(o => {
          const od = new Date(o.created_at);
          return od.getFullYear() === year;
        });
        const revenue = yearOrders.reduce((s, o) => s + (o.total || 0), 0);
        result.push({ label: String(year), date: String(year), revenue, orders: yearOrders.length });
        totalRevenue += revenue;
        totalOrders += yearOrders.length;
      }
    }

    const menuSold = {};
    (db.orders || []).forEach(o => {
      if (o.status !== "HoÃ n thÃ nh") return;
      (o.items || []).forEach(it => {
        if (!menuSold[it.menu_item_id]) {
          menuSold[it.menu_item_id] = { id: it.menu_item_id, name: it.name, sold: 0, revenue: 0 };
        }
        menuSold[it.menu_item_id].sold += it.qty;
        menuSold[it.menu_item_id].revenue += it.price * it.qty;
      });
    });
    const topItems = Object.values(menuSold)
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 5);

    res.json({
      period,
      data: result,
      totalRevenue,
      totalOrders,
      avgOrder: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
      topItems
    });
  } catch (e) {
    console.error("REPORTS ERROR:", e);
    res.status(500).json({ message: e.message });
  }
});

// ============ SETTINGS ============
app.get("/api/settings", auth(), (req, res) => {
  const db = loadDB();
  const empty = {
    bank: "VCB",
    account: "",
    accountName: "",
    hotline: "",
    email: "",
    address: "",
    qrCustomImage: ""
  };
  res.json({ ...empty, ...(db.settings || {}) });
});

app.put("/api/settings", auth(["ADMIN"]), (req, res) => {
  try {
    const db = loadDB();
    if (!db.settings) db.settings = {};
    const allowed = ["bank", "account", "accountName", "hotline", "email", "address", "qrCustomImage"];
    allowed.forEach(k => {
      if (req.body[k] !== undefined) db.settings[k] = req.body[k];
    });
    saveDB(db);
    res.json({ ok: true, settings: db.settings });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ============ SHIFTS ============
app.get("/api/shifts/me", auth(), (req, res) => {
  const db = loadDB();
  const today = getLocalDateStr();
  const list = (db.shifts || [])
    .filter(s => s.employee_id === req.user.id && s.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  res.json(list);
});

app.get("/api/shifts/pending", auth(["ADMIN"]), (req, res) => {
  const db = loadDB();
  const list = (db.shifts || [])
    .filter(s => s.status === "pending")
    .sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
  res.json(list);
});

app.get("/api/shifts", auth(["ADMIN", "EMPLOYEE"]), (req, res) => {
  const db = loadDB();
  let list = db.shifts || [];
  const { date, employee_id, shift, include_pending } = req.query;
  if (!include_pending) {
    list = list.filter(s => !s.status || s.status === "approved");
  }
  if (date) list = list.filter(s => s.date === date);
  if (employee_id) list = list.filter(s => s.employee_id == employee_id);
  if (shift) list = list.filter(s => s.shift === shift);
  res.json(list);
});

app.post("/api/shifts/register", auth(["EMPLOYEE", "ADMIN"]), (req, res) => {
  try {
    const db = loadDB();
    if (!db.shifts) db.shifts = [];
    const { dates, shifts, note } = req.body;
    if (!dates?.length || !shifts?.length) {
      return res.status(400).json({ message: "Thiáº¿u thÃ´ng tin" });
    }
    const emp = db.users.find(u => u.id === req.user.id);
    if (!emp) return res.status(404).json({ message: "KhÃ´ng tÃ¬m tháº¥y nhÃ¢n viÃªn" });
    let created = 0;
    let skipped = 0;
    let nextId = Math.max(0, ...db.shifts.map(s => s.id)) + 1;
    dates.forEach(date => {
      shifts.forEach(shift => {
        const exists = db.shifts.find(s =>
          s.employee_id === req.user.id && s.date === date && s.shift === shift
        );
        if (exists) { skipped++; return; }
        db.shifts.push({
          id: nextId++,
          employee_id: req.user.id,
          employee_name: emp.name,
          date,
          shift,
          note: note || "",
          status: "pending",
          source: "employee",
          created_by: emp.name,
          created_at: new Date().toISOString()
        });
        created++;
      });
    });
    saveDB(db);
    res.status(201).json({ created, skipped, message: "ÄÃ£ Ä‘Äƒng kÃ½ " + created + " ca" });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.patch("/api/shifts/:id/approve", auth(["ADMIN"]), (req, res) => {
  try {
    const db = loadDB();
    const s = (db.shifts || []).find(x => x.id == req.params.id);
    if (!s) return res.status(404).json({ message: "KhÃ´ng tÃ¬m tháº¥y" });
    s.status = "approved";
    s.approved_by = req.user.name;
    s.approved_at = new Date().toISOString();
    saveDB(db);
    res.json({ ok: true, shift: s });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.delete("/api/shifts/:id/reject", auth(["ADMIN"]), (req, res) => {
  const db = loadDB();
  const before = (db.shifts || []).length;
  db.shifts = (db.shifts || []).filter(x => x.id != req.params.id);
  saveDB(db);
  res.json({ ok: true, removed: before - db.shifts.length });
});

app.post("/api/shifts/bulk", auth(["ADMIN"]), (req, res) => {
  try {
    const db = loadDB();
    if (!db.shifts) db.shifts = [];
    const { employee_id, dates, shifts, note } = req.body;
    if (!employee_id || !dates?.length || !shifts?.length) {
      return res.status(400).json({ message: "Thiáº¿u thÃ´ng tin" });
    }
    const emp = db.users.find(u => u.id == employee_id);
    if (!emp) return res.status(404).json({ message: "KhÃ´ng tÃ¬m tháº¥y nhÃ¢n viÃªn" });
    let created = 0;
    let skipped = 0;
    let nextId = Math.max(0, ...db.shifts.map(s => s.id)) + 1;
    dates.forEach(date => {
      shifts.forEach(shift => {
        const exists = db.shifts.find(s =>
          s.employee_id == employee_id && s.date === date && s.shift === shift
        );
        if (exists) { skipped++; return; }
        db.shifts.push({
          id: nextId++,
          employee_id: +employee_id,
          employee_name: emp.name,
          date,
          shift,
          note: note || "",
          status: "approved",
          source: "admin",
          created_by: req.user.name,
          created_at: new Date().toISOString()
        });
        created++;
      });
    });
    saveDB(db);
    res.status(201).json({ created, skipped, message: "ÄÃ£ phÃ¢n " + created + " ca" });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post("/api/shifts", auth(["ADMIN"]), (req, res) => {
  try {
    const db = loadDB();
    if (!db.shifts) db.shifts = [];
    const { employee_id, date, shift, note } = req.body;
    if (!employee_id || !date || !shift) {
      return res.status(400).json({ message: "Thiáº¿u thÃ´ng tin" });
    }
    const emp = db.users.find(u => u.id == employee_id);
    if (!emp) return res.status(404).json({ message: "KhÃ´ng tÃ¬m tháº¥y nhÃ¢n viÃªn" });
    const existing = db.shifts.find(s =>
      s.employee_id == employee_id && s.date === date && s.shift === shift
    );
    if (existing) {
      return res.status(400).json({ message: "NhÃ¢n viÃªn Ä‘Ã£ Ä‘Æ°á»£c phÃ¢n ca nÃ y rá»“i" });
    }
    const id = Math.max(0, ...db.shifts.map(s => s.id)) + 1;
    const record = {
      id,
      employee_id: +employee_id,
      employee_name: emp.name,
      date,
      shift,
      note: note || "",
      status: "approved",
      source: "admin",
      created_by: req.user.name,
      created_at: new Date().toISOString()
    };
    db.shifts.push(record);
    saveDB(db);
    res.status(201).json(record);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.put("/api/shifts/:id", auth(["ADMIN"]), (req, res) => {
  try {
    const db = loadDB();
    const s = (db.shifts || []).find(x => x.id == req.params.id);
    if (!s) return res.status(404).json({ message: "KhÃ´ng tÃ¬m tháº¥y" });
    if (req.body.date) s.date = req.body.date;
    if (req.body.shift) s.shift = req.body.shift;
    if (req.body.note !== undefined) s.note = req.body.note;
    saveDB(db);
    res.json(s);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.delete("/api/shifts/:id", auth(["ADMIN"]), (req, res) => {
  const db = loadDB();
  db.shifts = (db.shifts || []).filter(x => x.id != req.params.id);
  saveDB(db);
  res.json({ ok: true });
});

// ============ HEALTH ============
app.get("/", (_, res) => res.json({
  ok: true,
  name: "Canteen VWA API (JSON)",
  version: BUILD_VERSION,
  menuEndpoint: "returns ALL items (no active filter)",
  timestamp: new Date().toISOString()
}));

// âœ… DEBUG endpoint â€” Ä‘áº¿m mÃ³n chÃ­nh xÃ¡c tá»« DB
app.get("/api/_debug/menu-count", (_, res) => {
  try {
    const db = loadDB();
    const all = db.menu_items || [];
    const active = all.filter(m => m.active).length;
    const inactive = all.length - active;
    res.json({
      buildVersion: BUILD_VERSION,
      total: all.length,
      active,
      inactive,
      inactiveItems: all.filter(m => !m.active).map(m => ({ id: m.id, name: m.name, active: m.active })),
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    res.status(500).json({ message: e.message, buildVersion: BUILD_VERSION });
  }
});

const PORT = process.env.PORT || 3000;

// ============ BACKUP RESET ============
app.post("/api/backup/reset", auth(["ADMIN"]), (req, res) => {
  try {
    const { confirm } = req.body;
    if (confirm !== "RESET") {
      return res.status(400).json({ message: "Cáº§n xÃ¡c nháº­n 'RESET' Ä‘á»ƒ thá»±c hiá»‡n" });
    }

    const db = loadDB();

    const backupFile = path.join(__dirname, "canteen-db-auto-backup-" + Date.now() + ".json");
    try {
      fs.writeFileSync(backupFile, JSON.stringify(db, null, 2), "utf-8");
      console.log("ðŸ’¾ Auto backup: " + path.basename(backupFile));
    } catch {
      // Bá» qua náº¿u filesystem khÃ´ng ghi Ä‘Æ°á»£c
    }

    db.orders = [];
    db.wallets = [];
    db.wallet_transactions = [];
    db.notifications = [];
    db.messages = [];
    db.attendances = [];
    db.shifts = [];
    db.imports = [];
    db.price_history = [];
    db.reviews = [];

    (db.users || []).forEach(u => { u.points = 0; });

    (db.menu_items || []).forEach(m => {
      if (m.stock !== undefined) m.stock = Math.max(m.stock, 30);
      m.sold = 0;
    });

    saveDB(db);

    res.json({
      ok: true,
      message: "Reset thÃ nh cÃ´ng",
      auto_backup: path.basename(backupFile),
      stats: {
        users: db.users.length,
        menu_items: db.menu_items.length,
        orders: 0,
        wallets: 0
      }
    });
  } catch (e) {
    console.error("RESET ERROR:", e);
    res.status(500).json({ message: e.message });
  }
});

initMongo().then(() => {
  app.listen(PORT, () =>
    console.log("ðŸš€ API (JSON): http://localhost:" + PORT)
  );
});
