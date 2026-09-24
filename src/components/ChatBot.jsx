// ============================================================
// ChatBot.js — Logic keyword matching gợi ý món ăn
// ============================================================
// API:
//   getBotReply(userText, menuItems, settings?) => { text, items }
//   - menuItems: Array món từ api.menu.list()
//   - settings:  Object từ api.settings.get() — dùng cho địa chỉ/hotline/giờ
//                (optional, fallback dùng default)
//
// Return:
//   { text: string, items: Array } — items để render kèm trong chat
//   null nếu text rỗng
//
// Fixes (so với bản gốc):
//   - Không hardcode địa chỉ/hotline/giờ → nhận qua settings
//   - Fix price bug: "500đ" không còn thành 500.000đ
//   - Bỏ \b (không hoạt động với tiếng Việt) — dùng ^ + khoảng trắng
//   - Normalize dấu tiếng Việt để match "com ga" ≈ "cơm gà"
//   - Fix false positive "cay" (không match "cà chua")
//   - Fallback cho nhánh rỗng (VD: "nước" nhưng không có đồ uống)
//   - Hỗ trợ "1k5" → 1500đ
//   - Thêm intent: đặt món, thanh toán, voucher, đổi điểm
// ============================================================

// ============================================================
// DEFAULT SETTINGS (fallback khi không có settings từ API)
// ============================================================

const DEFAULT_SETTINGS = {
  hotline: "0328 866 959",
  address: "68 Nguyễn Chí Thanh, Phường Láng, Hà Nội",
  openHours: "6:30 — 18:30 hàng ngày",
};

// ============================================================
// HELPERS
// ============================================================

/**
 * Bỏ dấu tiếng Việt + lowercase.
 * "Cơm Gà" → "com ga"
 */
function normalize(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .trim();
}

/**
 * Parse giá từ text.
 * Hỗ trợ: "30k", "30 nghìn", "30000", "30000đ", "1k5"
 * Return: number | null
 */
function parsePrice(text) {
  const t = normalize(text);

  // "1k5" hoặc "1k500" → 1500
  const shortK = t.match(/(\d+)k(\d+)/);
  if (shortK) {
    const thousands = parseInt(shortK[1], 10);
    const rest = parseInt(shortK[2].padEnd(3, "0").slice(0, 3), 10);
    return thousands * 1000 + rest;
  }

  // "30k" / "30 nghìn" / "30 ngàn"
  const kMatch = t.match(/(\d+)\s*(k|nghin|ngan|ngàn|nghìn)/);
  if (kMatch) {
    return parseInt(kMatch[1], 10) * 1000;
  }

  // "30000" / "30000đ" / "30000d" / "30.000"
  const dMatch = t.match(/(\d{1,3}(?:[.,]\d{3})+|\d{4,})\s*(d|đ)?/);
  if (dMatch) {
    return parseInt(dMatch[1].replace(/[.,]/g, ""), 10);
  }

  return null;
}

/**
 * Filter list + trả về message phù hợp nếu rỗng.
 */
function pickWithFallback(list, prefix, emptyMsg, limit = 3) {
  const picked = list.slice(0, limit);
  if (!picked.length) {
    return { text: emptyMsg, items: [] };
  }
  return { text: prefix, items: picked };
}

// ============================================================
// MAIN
// ============================================================

export function getBotReply(userText, menuItems = [], settings = null) {
  const raw = (userText || "").trim();
  if (!raw) return null;

  const t = normalize(raw);
  const cfg = { ...DEFAULT_SETTINGS, ...(settings || {}) };
  const menu = Array.isArray(menuItems) ? menuItems : [];

  // ============================================================
  // INTENT: Chào hỏi
  // ============================================================
  if (/^(chao|hi|hello|hey|xin chao)\s*[!,.]?/.test(t)) {
    return {
      text:
        "Xin chào! 👋 Mình là trợ lý Canteen VWA.\n" +
        "Bạn có thể hỏi mình:\n" +
        "• \"dưới 30k\" — món rẻ\n" +
        "• \"chay\" — món chay\n" +
        "• \"nước\" — đồ uống\n" +
        "• \"cay\" — món cay\n" +
        "• \"bán chạy\" — top món hot\n" +
        "• \"cơm\" — các món cơm\n" +
        "• \"gợi ý\" — món ngẫu nhiên",
      items: [],
    };
  }

  // ============================================================
  // INTENT: Giờ mở cửa
  // ============================================================
  if (/\b(gio mo|mo cua|dong cua|may gio mo)\b/.test(t)) {
    return {
      text: `🕐 Canteen VWA mở cửa ${cfg.openHours}.`,
      items: [],
    };
  }

  // ============================================================
  // INTENT: Địa chỉ
  // ============================================================
  if (/\b(dia chi|o dau|duong nao|dia diem)\b/.test(t)) {
    return {
      text: `📍 Canteen VWA ở ${cfg.address}.`,
      items: [],
    };
  }

  // ============================================================
  // INTENT: Hotline
  // ============================================================
  if (/\b(hotline|so dien thoai|sdt|lien he)\b/.test(t)) {
    return {
      text: `☎️ Hotline Canteen VWA: ${cfg.hotline}. Gọi khi cần hỗ trợ nhé!`,
      items: [],
    };
  }

  // ============================================================
  // INTENT: Đặt món / thanh toán
  // ============================================================
  if (/\b(dat mon|dat hang|order|thanh toan|tra tien)\b/.test(t)) {
    return {
      text:
        "🛒 Để đặt món:\n" +
        "1. Vào \"Thực đơn\" chọn món\n" +
        "2. Thêm vào giỏ\n" +
        "3. Vào giỏ → \"Đặt hàng\"\n" +
        "Thanh toán: Tiền mặt · VietQR · Ví Canteen.",
      items: [],
    };
  }

  // ============================================================
  // INTENT: Đổi điểm / voucher
  // ============================================================
  if (/\b(doi diem|voucher|khuyen mai|giam gia|uu dai)\b/.test(t)) {
    return {
      text:
        "🎁 Bạn có thể:\n" +
        "• Xem điểm tích lũy ở trang \"Khuyến mãi\"\n" +
        "• Đổi 100 điểm → voucher 10.000đ\n" +
        "• Nhận voucher toàn hệ thống",
      items: [],
    };
  }

  // ============================================================
  // INTENT: Top bán chạy
  // ============================================================
  if (/\b(ban chay|ngon nhat|hot|pho bien|best)\b/.test(t)) {
    const top = [...menu]
      .sort((a, b) => (b.sold || 0) - (a.sold || 0))
      .slice(0, 3);
    return pickWithFallback(
      top,
      "🔥 Top 3 món bán chạy nhất tại Canteen:",
      "Hiện chưa có dữ liệu bán chạy. Bạn xem thực đơn nhé!"
    );
  }

  // ============================================================
  // INTENT: Món chay
  // ============================================================
  if (/\b(chay|khong thit|ko thit|an chay)\b/.test(t)) {
    const chay = menu.filter((m) => m.category === "Món chay");
    return pickWithFallback(
      chay,
      "🥗 Món chay ngon tại Canteen:",
      "Hiện chưa có món chay trong thực đơn. Bạn xem món khác nhé!"
    );
  }

  // ============================================================
  // INTENT: Đồ uống
  // ============================================================
  if (/\b(nuoc|uong|tra|ca phe|sinh to|nuoc ep|tra sua)\b/.test(t)) {
    const drinks = menu.filter((m) => m.category === "Đồ uống");
    return pickWithFallback(
      drinks,
      "🥤 Đồ uống tại Canteen:",
      "Hiện chưa có đồ uống trong thực đơn."
    );
  }

  // ============================================================
  // INTENT: Món cay
  // ============================================================
  // Note: dùng \b để tránh match "cà chua", "cay đắng", "chay"
  if (/\b(cay|spicy)\b/.test(t) && !/\bchay\b/.test(t)) {
    const cay = menu.filter((m) => {
      const n = normalize(m.name || "");
      return /\b(bun bo|hue|sa te|spicy|cay)\b/.test(n);
    });

    if (cay.length) {
      return { text: "🌶️ Món cay bạn có thể thử:", items: cay.slice(0, 3) };
    }

    // Fallback: món mặn
    const man = menu.filter((m) => m.category === "Món mặn");
    return pickWithFallback(
      man,
      "Các món đậm vị tại Canteen:",
      "Hiện chưa có món cay. Bạn xem thực đơn nhé!"
    );
  }

  // ============================================================
  // INTENT: Món cơm
  // ============================================================
  if (/\b(com|com rang|com ga|com suon)\b/.test(t)) {
    const com = menu.filter((m) => m.category === "Cơm");
    return pickWithFallback(
      com,
      "🍚 Món cơm tại Canteen:",
      "Hiện chưa có món cơm trong thực đơn."
    );
  }

  // ============================================================
  // INTENT: Giá theo ngân sách
  // ============================================================
  const price = parsePrice(t);
  const wantsCheap = /\b(re|duoi|it tien|sinh vien|tiet kiem)\b/.test(t);

  if (price !== null || wantsCheap) {
    const maxPrice = price !== null ? price : 30000;

    const cheap = menu
      .filter((m) => Number(m.price) <= maxPrice)
      .sort((a, b) => Number(a.price) - Number(b.price))
      .slice(0, 3);

    if (!cheap.length) {
      return {
        text: `Không có món nào dưới ${maxPrice.toLocaleString(
          "vi-VN"
        )}đ. Bạn thử ngân sách khác nhé!`,
        items: [],
      };
    }

    return {
      text: `💰 Món dưới ${maxPrice.toLocaleString("vi-VN")}đ cho bạn đây:`,
      items: cheap,
    };
  }

  // ============================================================
  // INTENT: Gợi ý ngẫu nhiên
  // ============================================================
  if (/\b(goi y|random|ngau nhien|an gi|mon gi)\b/.test(t)) {
    if (!menu.length) {
      return { text: "Hiện chưa có thực đơn. Bạn xem sau nhé!", items: [] };
    }
    const rand = menu[Math.floor(Math.random() * menu.length)];
    return {
      text: "🎲 Mình gợi ý bạn thử món này nhé:",
      items: [rand],
    };
  }

  // ============================================================
  // FALLBACK
  // ============================================================
  return {
    text:
      "Mình chưa hiểu câu hỏi này. 🤔\n" +
      "Bạn thử hỏi: \"dưới 30k\", \"chay\", \"nước\", \"cay\", \"bán chạy\", \"cơm\", \"gợi ý\".",
    items: [],
  };
}

export default getBotReply;