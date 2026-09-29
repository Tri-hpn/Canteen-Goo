// ============================================================
// ChatBot.js — Logic keyword matching gợi ý món ăn
// ============================================================
// API:
//   getBotReply(userText, menuItems, settings?, t) => { text, items }
//   - t: hàm translate từ useTranslation()
// ============================================================

const DEFAULT_SETTINGS = {
  hotline: "0328 866 959",
  address: "68 Nguyễn Chí Thanh, Phường Láng, Hà Nội",
  openHours: "6:30 — 18:30 hàng ngày",
};

function normalize(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .trim();
}

function parsePrice(text) {
  const t = normalize(text);

  const shortK = t.match(/(\d+)k(\d+)/);
  if (shortK) {
    const thousands = parseInt(shortK[1], 10);
    const rest = parseInt(shortK[2].padEnd(3, "0").slice(0, 3), 10);
    return thousands * 1000 + rest;
  }

  const kMatch = t.match(/(\d+)\s*(k|nghin|ngan|ngàn|nghìn)/);
  if (kMatch) return parseInt(kMatch[1], 10) * 1000;

  const dMatch = t.match(/(\d{1,3}(?:[.,]\d{3})+|\d{4,})\s*(d|đ)?/);
  if (dMatch) return parseInt(dMatch[1].replace(/[.,]/g, ""), 10);

  return null;
}

function pickWithFallback(list, prefix, emptyMsg, limit = 3) {
  const picked = list.slice(0, limit);
  if (!picked.length) return { text: emptyMsg, items: [] };
  return { text: prefix, items: picked };
}

export function getBotReply(userText, menuItems = [], settings = null, t) {
  // Fallback t nếu không truyền (đảm bảo không crash)
  const tr = typeof t === "function" ? t : (k) => k;

  const raw = (userText || "").trim();
  if (!raw) return null;

  const txt = normalize(raw);
  const cfg = { ...DEFAULT_SETTINGS, ...(settings || {}) };
  const menu = Array.isArray(menuItems) ? menuItems : [];

  // ---------- Chào hỏi ----------
  if (/^(chao|hi|hello|hey|xin chao)\s*[!,.]?/.test(txt)) {
    return { text: tr("chatbot.greeting"), items: [] };
  }

  // ---------- Giờ mở cửa ----------
  if (/\b(gio mo|mo cua|dong cua|may gio mo|open|opening hours)\b/.test(txt)) {
    return {
      text: tr("chatbot.hours").replace("{hours}", cfg.openHours),
      items: [],
    };
  }

  // ---------- Địa chỉ ----------
  if (/\b(dia chi|o dau|duong nao|dia diem|address|where)\b/.test(txt)) {
    return {
      text: tr("chatbot.address").replace("{address}", cfg.address),
      items: [],
    };
  }

  // ---------- Hotline ----------
  if (/\b(hotline|so dien thoai|sdt|lien he|contact|phone)\b/.test(txt)) {
    return {
      text: tr("chatbot.hotline").replace("{hotline}", cfg.hotline),
      items: [],
    };
  }

  // ---------- Đặt món / thanh toán ----------
  if (/\b(dat mon|dat hang|order|thanh toan|tra tien|payment|pay)\b/.test(txt)) {
    return { text: tr("chatbot.howToOrder"), items: [] };
  }

  // ---------- Đổi điểm / voucher ----------
  if (/\b(doi diem|voucher|khuyen mai|giam gia|uu dai|promo|discount|points)\b/.test(txt)) {
    return { text: tr("chatbot.voucherInfo"), items: [] };
  }

  // ---------- Top bán chạy ----------
  if (/\b(ban chay|ngon nhat|hot|pho bien|best|best seller)\b/.test(txt)) {
    const top = [...menu]
      .sort((a, b) => (b.sold || 0) - (a.sold || 0))
      .slice(0, 3);
    return pickWithFallback(
      top,
      tr("chatbot.bestSeller"),
      tr("chatbot.noBestSeller")
    );
  }

  // ---------- Món chay ----------
  if (/\b(chay|khong thit|ko thit|an chay|vegetarian|vegan)\b/.test(txt)) {
    const chay = menu.filter((m) => m.category === "Món chay");
    return pickWithFallback(
      chay,
      tr("chatbot.vegetarian"),
      tr("chatbot.noVegetarian")
    );
  }

  // ---------- Đồ uống ----------
  if (/\b(nuoc|uong|tra|ca phe|sinh to|nuoc ep|tra sua|drink|drinks|beverage)\b/.test(txt)) {
    const drinks = menu.filter((m) => m.category === "Đồ uống");
    return pickWithFallback(
      drinks,
      tr("chatbot.drinks"),
      tr("chatbot.noDrinks")
    );
  }

  // ---------- Món cay ----------
  if (/\b(cay|spicy)\b/.test(txt) && !/\bchay\b/.test(txt)) {
    const cay = menu.filter((m) => {
      const n = normalize(m.name || "");
      return /\b(bun bo|hue|sa te|spicy|cay)\b/.test(n);
    });
    if (cay.length) {
      return { text: tr("chatbot.spicy"), items: cay.slice(0, 3) };
    }
    const man = menu.filter((m) => m.category === "Món mặn");
    return pickWithFallback(man, tr("chatbot.savory"), tr("chatbot.noSpicy"));
  }

  // ---------- Món cơm ----------
  if (/\b(com|com rang|com ga|com suon|rice)\b/.test(txt)) {
    const com = menu.filter((m) => m.category === "Cơm");
    return pickWithFallback(com, tr("chatbot.rice"), tr("chatbot.noRice"));
  }

  // ---------- Giá ngân sách ----------
  const price = parsePrice(txt);
  const wantsCheap = /\b(re|duoi|it tien|sinh vien|tiet kiem|cheap|budget|under)\b/.test(txt);

  if (price !== null || wantsCheap) {
    const maxPrice = price !== null ? price : 30000;
    const cheap = menu
      .filter((m) => Number(m.price) <= maxPrice)
      .sort((a, b) => Number(a.price) - Number(b.price))
      .slice(0, 3);

    if (!cheap.length) {
      return {
        text: tr("chatbot.noBudget").replace(
          "{price}",
          maxPrice.toLocaleString("vi-VN")
        ),
        items: [],
      };
    }

    return {
      text: tr("chatbot.budget").replace(
        "{price}",
        maxPrice.toLocaleString("vi-VN")
      ),
      items: cheap,
    };
  }

  // ---------- Gợi ý ngẫu nhiên ----------
  if (/\b(goi y|random|ngau nhien|an gi|mon gi|suggest|recommend)\b/.test(txt)) {
    if (!menu.length) return { text: tr("chatbot.noMenu"), items: [] };
    const rand = menu[Math.floor(Math.random() * menu.length)];
    return { text: tr("chatbot.suggest"), items: [rand] };
  }

  // ---------- Fallback ----------
  return { text: tr("chatbot.fallback"), items: [] };
}

export default getBotReply;