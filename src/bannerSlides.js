// ============================================================
// bannerSlides.js — Config banner (source-text, không dùng key)
// ============================================================
// ✅ SOURCE-TEXT: Dùng tiếng Việt trực tiếp, không cần key
// Cách dịch: thêm vào src/lib/i18n/locales/{lang}.json
//   VD en.json:
//     "Đổi điểm – Nhận Voucher": "Redeem points – Get Voucher"
// ============================================================

export const DEFAULT_BANNER_OVERLAY =
  "linear-gradient(120deg, rgba(10,15,30,0.15) 0%, rgba(10,15,30,0.08) 55%, rgba(10,15,30,0) 100%)";

export const bannerSlides = [
  // SLIDE 1 — Đổi điểm nhận voucher
  {
    id: "voucher",
    title: "Đổi điểm – Nhận Voucher",
    description: "Tích điểm mỗi lần mua hàng và đổi lấy ưu đãi hấp dẫn.",
    badge: "🏆 Tích điểm mỗi đơn",
    chips: [
      { icon: "gift", text: "1 điểm = 100đ" },
      { icon: "sparkles", text: "Đổi từ 100 điểm" },
    ],
    buttonText: "Đổi voucher ngay",
    buttonLink: "/customer/promotions",
    image: "/banners/slide1.jpg",
    overlay: DEFAULT_BANNER_OVERLAY,
  },

  // SLIDE 2 — Món Signature
  {
    id: "signature",
    title: "Món Signature",
    description: "Khám phá những món ăn đặc trưng được yêu thích tại Canteen VWA.",
    badge: "⭐ Đặc sản Canteen",
    chips: [
      { icon: "utensils", text: "Món chọn lọc" },
      { icon: "sparkles", text: "Yêu thích nhất" },
    ],
    buttonText: "Xem món Signature",
    buttonLink: "#signature-section",
    image: "/banners/slide2.jpg",
    overlay: DEFAULT_BANNER_OVERLAY,
  },

  // SLIDE 3 — Ưu đãi hôm nay
  {
    id: "promotion",
    title: "Ưu đãi hôm nay",
    description: "Những món ngon đang có ưu đãi đặc biệt – đừng bỏ lỡ!",
    badge: "🔥 Combo tiết kiệm",
    chips: [
      { icon: "sparkles", text: "Giảm đến 20%" },
      { icon: "utensils", text: "Nhiều combo mỗi ngày" },
    ],
    buttonText: "Xem ưu đãi",
    buttonLink: "/customer/promotions",
    image: "/banners/slide3.jpg",
    overlay: DEFAULT_BANNER_OVERLAY,
  },
];