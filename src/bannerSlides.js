// ============================================================
// bannerSlides.js — Config banner (CHỈ DATA, KHÔNG có JSX)
// ============================================================

export const DEFAULT_BANNER_OVERLAY =
  "linear-gradient(120deg, rgba(10,15,30,0.92) 0%, rgba(10,15,30,0.75) 55%, rgba(10,15,30,0.55) 100%)";

export const bannerSlides = [
  {
    id: "voucher",
    title: "Đổi điểm – Nhận Voucher",
    description: "Tích điểm mỗi lần mua hàng và đổi lấy ưu đãi hấp dẫn.",
    image: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1600&q=80",
    overlay: DEFAULT_BANNER_OVERLAY,
    badge: "🏆 Tích điểm mỗi đơn",
    chips: [
      { icon: "gift", text: "1 điểm = 100đ" },
      { icon: "sparkles", text: "Đổi từ 100 điểm" },
    ],
    buttonText: "Đổi voucher ngay",
    buttonLink: "/customer/promotions",
  },
  {
    id: "signature",
    title: "Món Signature",
    description: "Khám phá những món ăn đặc trưng được yêu thích tại Canteen VWA.",
    image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1600&q=80",
    overlay: DEFAULT_BANNER_OVERLAY,
    badge: "⭐ Đặc sản Canteen",
    chips: [
      { icon: "utensils", text: "Món chọn lọc" },
      { icon: "sparkles", text: "Yêu thích nhất" },
    ],
    buttonText: "Xem món Signature",
    buttonLink: "/customer/signature",
  },
  {
    id: "promotion",
    title: "Ưu đãi hôm nay",
    description: "Những món ngon đang có ưu đãi đặc biệt – đừng bỏ lỡ!",
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1600&q=80",
    overlay: DEFAULT_BANNER_OVERLAY,
    badge: "🔥 Combo tiết kiệm",
    chips: [
      { icon: "sparkles", text: "Giảm đến 20%" },
      { icon: "utensils", text: "Nhiều combo mỗi ngày" },
    ],
    buttonText: "Xem ưu đãi",
    buttonLink: "/customer/promotions",
  },
];