// ============================================================
// CUSTOMERHOME.JSX — Trang chủ khách hàng
// ============================================================
// Gồm:
//   - Banner carousel (data từ ../../bannerSlides)
//   - Flash marquee (chạy chữ khuyến mãi)
//   - Flash sale (voucher + món giảm giá)
//   - Bán chạy nhất (top 5 sold)
//   - Món mới lên kệ (4 món mới nhất)
//   - Testimonials
//   - QR truy cập menu (auto-detect origin)
//
// Fixes (so với bản gốc):
//   - ✅ Banner data tách ra file ../../bannerSlides.js
//   - QR dùng window.location.origin (không hardcode localhost)
//   - Carousel pause khi tab ẩn (visibilitychange)
//   - Banner button: bỏ <a href>, dùng <button> + navigate
//   - Loading state: tách loading vs empty vs error
//   - Error state + nút retry
//   - Flash track: unique key
//   - Memo các computed values
//   - Xoá dòng thừa
//   - ✅ MEDIUM FIX: Skeleton loading cho section "Bán chạy nhất"
//     (thay vì text "Đang tải món...")
// ============================================================

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronLeft, ChevronRight, Star, Clock, Utensils, Gift,
  Sparkles, Zap, ShoppingCart, Quote, AlertCircle, RefreshCw,
} from "lucide-react";
import { api } from "../../api";
import { money } from "../../components/UI";
import { SkeletonCard } from "../../components/Skeleton";
import FoodDetailModal from "../../components/FoodDetailModal";
import ChatBotWidget from "../../components/ChatBotWidget";
import { useTranslation } from "../../i18n";
import { bannerSlides as SLIDES } from "../../bannerSlides";

// ============================================================
// CONSTANTS
// ============================================================

const CAROUSEL_INTERVAL_MS = 4000;
const BEST_SELLERS_LIMIT = 5;
const NEW_ITEMS_LIMIT = 4;
const FLASH_PROMOS_LIMIT = 4;
const FLASH_VOUCHERS_LIMIT = 2;

// Số skeleton card hiển thị khi loading
const SKELETON_COUNT = 5;

// Fallback flash items khi không có voucher/promo
const DEFAULT_FLASH_ITEMS = [
  { text: "🎉 Ưu đãi sinh viên — Giảm 10% khi đặt món qua app" },
  { text: "⚡ Chuẩn bị món 5-8 phút — Nhận ngay tại quầy" },
  { text: "💳 Thanh toán VietQR · Ví Canteen · Tiền mặt" },
];

const TESTIMONIALS = [
  {
    name: "Nguyễn Minh Anh",
    role: "Sinh viên K20",
    rating: 5,
    text: "Món ăn ngon, giá cả hợp lý. Đặt online tiện lợi hơn hẳn so với xếp hàng!",
  },
  {
    name: "Trần Quốc Bảo",
    role: "Cán bộ VWA",
    rating: 5,
    text: "Giao nhanh, nhân viên thân thiện, món ăn luôn nóng hổi. Rất hài lòng.",
  },
  {
    name: "Lê Thu Hà",
    role: "Sinh viên K19",
    rating: 4,
    text: "Canteen sạch sẽ, đồ ăn đa dạng. Đặt món qua app dễ dùng, giao đúng giờ.",
  },
];

// ============================================================
// HELPERS
// ============================================================

/** Lấy origin hiện tại — dùng cho QR code, không hardcode. */
function getPublicMenuUrl() {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/customer/menu`;
}

/** Render icon theo key trong slide.chips. */
function renderChipIcon(iconName, size = 13) {
  switch (iconName) {
    case "clock":
      return <Clock size={size} />;
    case "utensils":
      return <Utensils size={size} />;
    case "gift":
      return <Gift size={size} />;
    case "sparkles":
      return <Sparkles size={size} />;
    default:
      return <Zap size={size} />;
  }
}

/** Format số nguyên VN. */
function fmtNumber(n) {
  return typeof n === "number" ? n.toLocaleString("vi-VN") : String(n ?? "");
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function CustomerHome({ user, cart, setCart }) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // ---------- Data ----------
  const [items, setItems] = useState([]);
  const [newItems, setNewItems] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [publicVouchers, setPublicVouchers] = useState([]);
  const [flashItems, setFlashItems] = useState(DEFAULT_FLASH_ITEMS);

  // ---------- UI state ----------
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [selected, setSelected] = useState(null);
  const [mode, setMode] = useState("cart");

  // Track visibility tab
  const [tabVisible, setTabVisible] = useState(
    typeof document === "undefined" || !document.hidden
  );

  // Refs
  const inFlightRef = useRef(false);

  // ---------- Load ----------

  const load = useCallback(async (silent = false) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    if (!silent) setRefreshing(true);
    setError("");

    try {
      const [menuRes, promoRes, pubVoucherRes] = await Promise.all([
        api.menu.listActive("", "Tất cả", "popular").catch(() => []),
        api.promotions.list().catch(() => []),
        api.vouchers.public().catch(() => []),
      ]);

      const list = Array.isArray(menuRes) ? menuRes : [];

      // Best sellers: sort theo sold giảm dần
      const bestSellers = [...list]
        .filter((m) => (m.sold || 0) > 0)
        .sort((a, b) => (b.sold || 0) - (a.sold || 0))
        .slice(0, BEST_SELLERS_LIMIT);
      setItems(bestSellers);

      // Món mới: sort theo id giảm dần
      const sortedById = [...list].sort((a, b) => (b.id || 0) - (a.id || 0));
      setNewItems(sortedById.slice(0, NEW_ITEMS_LIMIT));

      setPromotions(Array.isArray(promoRes) ? promoRes : []);
      setPublicVouchers(Array.isArray(pubVoucherRes) ? pubVoucherRes : []);

      // Build flash items
      const flash = [];
      (Array.isArray(pubVoucherRes) ? pubVoucherRes : []).forEach((v) => {
        flash.push({
          text: `🎁 GIẢM ${fmtNumber(v.value || 0)}đ — Mã ${v.code}`,
        });
      });
      (Array.isArray(promoRes) ? promoRes : []).forEach((m) => {
        flash.push({
          text: `🔥 ${m.name} GIẢM ${m.discount_percent}% (còn ${fmtNumber(m.price || 0)}đ)`,
        });
      });
      setFlashItems(flash.length > 0 ? flash : DEFAULT_FLASH_ITEMS);
    } catch (e) {
      if (!silent) setError(e.message || "Không tải được dữ liệu trang chủ");
    } finally {
      setLoading(false);
      if (!silent) setRefreshing(false);
      inFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  // ---------- Carousel autoplay ----------

  useEffect(() => {
    if (paused || !tabVisible) return;

    const timer = setInterval(() => {
      setIdx((i) => (i + 1) % SLIDES.length);
    }, CAROUSEL_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [paused, tabVisible]);

  // Track visibilitychange
  useEffect(() => {
    const handler = () => setTabVisible(!document.hidden);
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  // ---------- Carousel controls ----------

  const goNext = () => setIdx((i) => (i + 1) % SLIDES.length);
  const goPrev = () =>
    setIdx((i) => (i - 1 + SLIDES.length) % SLIDES.length);

  // ---------- Derived ----------

  const publicMenuUrl = useMemo(() => getPublicMenuUrl(), []);

  const qrImageSrc = useMemo(() => {
    if (!publicMenuUrl) return "";
    return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
      publicMenuUrl
    )}&margin=0`;
  }, [publicMenuUrl]);

  // Chia flash items thành 3 phần cho marquee (key unique)
  const flashTrack = useMemo(() => {
    if (!flashItems.length) return [];
    const out = [];
    for (let round = 0; round < 3; round++) {
      flashItems.forEach((item, i) => {
        out.push({ ...item, _key: `${round}-${i}` });
      });
    }
    return out;
  }, [flashItems]);

  // ============================================================
  // RENDER HELPERS
  // ============================================================

  const renderFoodCard = useCallback((m) => {
    const id = m.id || m._id;
    return (
      <div
        key={id}
        className="food-card-clickable"
        style={{
          background: "var(--card-bg, #fff)",
          border: "1px solid var(--border-color, #e5e9ef)",
          borderRadius: 12,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <img
          src={m.image}
          alt={m.name}
          loading="lazy"
          style={{
            width: "100%",
            height: 120,
            objectFit: "cover",
            display: "block",
          }}
        />
        <div
          style={{
            padding: 10,
            display: "flex",
            flexDirection: "column",
            flex: 1,
          }}
        >
          <span
            style={{
              fontSize: 10,
              color: "var(--text-light, #8993a3)",
              textTransform: "uppercase",
              letterSpacing: 0.4,
            }}
          >
            {m.category}
          </span>
          <h4
            style={{
              margin: "4px 0",
              fontSize: 13,
              color: "var(--text-primary, #172033)",
              fontWeight: 700,
              lineHeight: 1.3,
            }}
          >
            {m.name}
          </h4>

          {m.rating && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 3,
                marginBottom: 6,
                fontSize: 11,
              }}
            >
              <Star size={11} fill="#f59e0b" color="#f59e0b" />
              <b style={{ color: "var(--text-primary, #172033)" }}>
                {m.rating}
              </b>
              <span style={{ color: "var(--text-light, #8993a3)" }}>
                ({m.review_count || 0})
              </span>
            </div>
          )}

          <b
            style={{
              color: "#18a967",
              fontSize: 14,
              marginTop: "auto",
            }}
          >
            {money(m.price)}
          </b>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 6,
              marginTop: 8,
            }}
          >
            <button
              onClick={() => {
                setMode("cart");
                setSelected(m);
              }}
              style={{
                background: "var(--bg-tertiary, #f5f7fb)",
                color: "var(--text-primary, #172033)",
                border: "1px solid var(--border-color, #e5e9ef)",
                padding: "6px 4px",
                borderRadius: 7,
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                whiteSpace: "nowrap",
              }}
            >
              <ShoppingCart size={12} /> Thêm
            </button>
            <button
              onClick={() => {
                setMode("buy");
                setSelected(m);
              }}
              style={{
                background: "#2634d5",
                color: "#fff",
                border: 0,
                padding: "6px 4px",
                borderRadius: 7,
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                whiteSpace: "nowrap",
              }}
            >
              <Zap size={12} /> Mua
            </button>
          </div>
        </div>
      </div>
    );
  }, []);

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div>
      {/* ============ ERROR BANNER ============ */}
      {error && (
        <div
          style={{
            background: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            borderRadius: 10,
            padding: "12px 16px",
            marginBottom: 16,
            color: "#ef4444",
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 13,
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{error}</span>
          <button
            onClick={() => load(false)}
            style={{
              padding: "6px 12px",
              background: "#ef4444",
              color: "#fff",
              border: 0,
              borderRadius: 6,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 12,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <RefreshCw size={12} /> Thử lại
          </button>
        </div>
      )}

      {/* ============ BANNER CAROUSEL ============ */}
      <div
        className="banner-carousel"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        role="region"
        aria-label="Banner khuyến mãi"
      >
        <div
          style={{
            display: "flex",
            width: `${SLIDES.length * 100}%`,
            height: "100%",
            maxWidth: "none",
            transform: `translateX(-${idx * (100 / SLIDES.length)}%)`,
            transition: "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          {SLIDES.map((s) => (
            <div
              key={s.id}
              style={{
                width: `${100 / SLIDES.length}%`,
                minWidth: `${100 / SLIDES.length}%`,
                height: "100%",
                flexShrink: 0,
                boxSizing: "border-box",
                backgroundImage: s.overlay
                  ? `${s.overlay}, url(${s.image})`
                  : `url(${s.image})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                padding: "0 70px",
                position: "relative",
              }}
            >
              <div
                className="banner-content"
                style={{ maxWidth: 680, position: "relative", zIndex: 2 }}
              >
                {s.badge && (
                  <span
                    className="banner-badge"
                    style={{
                      display: "inline-block",
                      background: "rgba(245, 158, 11, 0.3)",
                      border: "1px solid rgba(245, 158, 11, 0.6)",
                      padding: "6px 14px",
                      borderRadius: 20,
                      fontSize: 12,
                      color: "#fff",
                      fontWeight: 600,
                      marginBottom: 10,
                    }}
                  >
                    {s.badge}
                  </span>
                )}

                <h2
                  className="banner-title"
                  style={{
                    margin: "6px 0 10px",
                    fontSize: 28,
                    color: "#fff",
                    fontWeight: 800,
                    lineHeight: 1.2,
                    textShadow: "0 2px 10px rgba(0,0,0,0.5)",
                  }}
                >
                  {s.useName && user?.name ? `${user.name} ơi, ` : ""}
                  {s.title}
                </h2>

                <p
                  className="banner-desc"
                  style={{
                    margin: "0 0 14px",
                    opacity: 0.95,
                    color: "#e5e7eb",
                    fontSize: 14,
                    lineHeight: 1.6,
                    maxWidth: 620,
                    textShadow: "0 1px 4px rgba(0,0,0,0.4)",
                  }}
                >
                  {s.description}
                </p>

                {s.chips && s.chips.length > 0 && (
                  <div
                    className="banner-chips"
                    style={{
                      display: "flex",
                      gap: 10,
                      flexWrap: "wrap",
                      marginBottom: 18,
                      alignItems: "center",
                    }}
                  >
                    {s.chips.map((c, i) => (
                      <span
                        key={i}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          background: "rgba(255,255,255,0.15)",
                          border: "1px solid rgba(255,255,255,0.25)",
                          padding: "6px 12px",
                          borderRadius: 20,
                          fontSize: 12,
                          color: "#fff",
                        }}
                      >
                        {renderChipIcon(c.icon)}
                        {c.text}
                      </span>
                    ))}
                  </div>
                )}

                {/* Banner button: dùng <button> thay vì <a href> */}
                <button
                  type="button"
                  className="banner-btn"
                  onClick={() => navigate(s.buttonLink)}
                  style={{
                    display: "inline-block",
                    background: "#fff",
                    color: "#2634d5",
                    padding: "12px 24px",
                    borderRadius: 10,
                    border: 0,
                    fontWeight: 700,
                    fontSize: 13,
                    boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
                    transition: "all 0.2s",
                    cursor: "pointer",
                  }}
                >
                  {s.buttonText}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Nav buttons */}
        <button
          onClick={goPrev}
          aria-label="Slide trước"
          className="banner-nav banner-nav-left"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          onClick={goNext}
          aria-label="Slide tiếp theo"
          className="banner-nav banner-nav-right"
        >
          <ChevronRight size={20} />
        </button>

        {/* Dots */}
        <div className="banner-dots">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              aria-label={`Đi đến slide ${i + 1}`}
              aria-current={i === idx ? "true" : "false"}
              style={{
                width: i === idx ? 28 : 10,
                height: 10,
                borderRadius: 20,
                border: 0,
                cursor: "pointer",
                background: i === idx ? "#fff" : "rgba(255,255,255,0.5)",
                transition: "all 0.3s ease",
                padding: 0,
              }}
            />
          ))}
        </div>
      </div>

      {/* ============ FLASH MARQUEE ============ */}
      {flashTrack.length > 0 && (
        <Link
          to="/customer/promotions"
          className="flash-marquee"
          style={{
            display: "block",
            background: "linear-gradient(90deg, #ef4444, #f59e0b, #ef4444)",
            color: "#fff",
            padding: "10px 0",
            borderRadius: 12,
            marginBottom: 16,
            overflow: "hidden",
            textDecoration: "none",
            position: "relative",
          }}
        >
          <div className="flash-track">
            {flashTrack.map((item) => (
              <span key={item._key} className="flash-item">
                <span className="flash-dot" />
                {item.text}
                <span className="flash-sep">•</span>
              </span>
            ))}
          </div>
          <span className="flash-label">
            <Sparkles size={12} /> ƯU ĐÃI
          </span>
        </Link>
      )}

      {/* ============ FLASH SALE ============ */}
      {(promotions.length > 0 || publicVouchers.length > 0) && (
        <>
          <h3
            style={{
              marginBottom: 14,
              fontSize: 18,
              color: "var(--text-primary, #172033)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 22 }}>⚡</span> FLASH SALE
            <span
              style={{
                background: "linear-gradient(135deg, #ef4444, #f59e0b)",
                color: "#fff",
                padding: "3px 10px",
                borderRadius: 12,
                fontSize: 10,
                fontWeight: 800,
              }}
            >
              HOT
            </span>
          </h3>

          <div style={{ marginBottom: 26 }}>
            <div className="home-food-grid-5">
              {/* Voucher cards */}
              {publicVouchers.slice(0, FLASH_VOUCHERS_LIMIT).map((v) => (
                <Link
                  key={`voucher-${v.id}`}
                  to="/customer/promotions"
                  className="food-card-clickable"
                  style={{
                    textDecoration: "none",
                    borderRadius: 12,
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    position: "relative",
                    background: "var(--card-bg, #fff)",
                    border: "1px solid var(--border-color, #e5e9ef)",
                  }}
                >
                  <div
                    style={{
                      width: 130,
                      height: 130,
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #8b5cf6, #ec4899)",
                      display: "grid",
                      placeItems: "center",
                      color: "#fff",
                      margin: "12px auto 8px",
                      border: "3px solid #fff",
                      boxShadow: "0 6px 20px rgba(139, 92, 246, 0.3)",
                    }}
                  >
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 32 }}>🎟️</div>
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 800,
                          marginTop: 2,
                        }}
                      >
                        {fmtNumber(v.value || 0)}đ
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      padding: "0 10px 10px",
                      textAlign: "center",
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        color: "#8b5cf6",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: 0.4,
                      }}
                    >
                      VOUCHER
                    </span>
                    <h4
                      style={{
                        margin: "4px 0",
                        fontSize: 13,
                        fontWeight: 700,
                        color: "var(--text-primary, #172033)",
                        textAlign: "center",
                        minHeight: 34,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      Giảm {fmtNumber(v.value || 0)}đ
                    </h4>
                    <div
                      style={{
                        fontSize: 10,
                        color: "var(--text-light, #8993a3)",
                        fontFamily: "monospace",
                        marginBottom: 8,
                      }}
                    >
                      {v.code}
                    </div>
                    <div
                      style={{
                        marginTop: "auto",
                        background:
                          "linear-gradient(135deg, #8b5cf6, #a855f7)",
                        color: "#fff",
                        padding: "8px 6px",
                        borderRadius: 8,
                        textAlign: "center",
                        fontSize: 12,
                        fontWeight: 700,
                        height: 34,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      Nhận ngay
                    </div>
                  </div>
                </Link>
              ))}

              {/* Promo cards */}
              {promotions.slice(0, FLASH_PROMOS_LIMIT).map((m) => (
                <div
                  key={`promo-${m.id}`}
                  className="food-card-clickable"
                  style={{
                    background: "var(--card-bg, #fff)",
                    border: "1px solid var(--border-color, #e5e9ef)",
                    borderRadius: 12,
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: 10,
                      right: 10,
                      background:
                        "linear-gradient(135deg, #ef4444, #f59e0b)",
                      color: "#fff",
                      padding: "4px 10px",
                      borderRadius: 20,
                      fontSize: 11,
                      fontWeight: 800,
                      zIndex: 2,
                      boxShadow: "0 4px 10px rgba(239, 68, 68, 0.4)",
                    }}
                  >
                    -{m.discount_percent}%
                  </div>
                  <img
                    src={m.image}
                    alt={m.name}
                    loading="lazy"
                    style={{
                      width: "100%",
                      height: 120,
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                  <div
                    style={{
                      padding: 10,
                      display: "flex",
                      flexDirection: "column",
                      flex: 1,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        color: "var(--text-light, #8993a3)",
                        textTransform: "uppercase",
                        letterSpacing: 0.4,
                      }}
                    >
                      {m.category}
                    </span>
                    <h4
                      style={{
                        margin: "4px 0",
                        fontSize: 13,
                        color: "var(--text-primary, #172033)",
                        fontWeight: 700,
                        lineHeight: 1.3,
                      }}
                    >
                      {m.name}
                    </h4>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        gap: 8,
                        marginBottom: 8,
                      }}
                    >
                      <b style={{ color: "#ef4444", fontSize: 15 }}>
                        {money(m.price)}
                      </b>
                      {m.original_price > m.price && (
                        <span
                          style={{
                            fontSize: 11,
                            color: "var(--text-light, #94a3b8)",
                            textDecoration: "line-through",
                          }}
                        >
                          {money(m.original_price)}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setMode("buy");
                        setSelected(m);
                      }}
                      style={{
                        marginTop: "auto",
                        width: "100%",
                        background: "#2634d5",
                        color: "#fff",
                        border: 0,
                        padding: "8px 6px",
                        borderRadius: 8,
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 700,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 5,
                      }}
                    >
                      <Zap size={13} /> Đặt ngay
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ============ BÁN CHẠY NHẤT ============ */}
      <h3
        style={{
          marginBottom: 14,
          fontSize: 16,
          color: "var(--text-primary, #172033)",
        }}
      >
        🔥 {t("customer.bestSeller")}
      </h3>

      <div className="home-food-grid-5" style={{ marginBottom: 26 }}>
        {/* ✅ Loading: Skeleton cards thay vì text */}
        {loading && items.length === 0 && (
          <>
            {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <SkeletonCard key={`skeleton-${i}`} />
            ))}
          </>
        )}

        {/* Empty state (chỉ hiện khi đã load xong) */}
        {!loading && items.length === 0 && (
          <div
            style={{
              gridColumn: "1 / -1",
              textAlign: "center",
              padding: 40,
              color: "#8993a3",
              background: "var(--card-bg, #fff)",
              borderRadius: 14,
              border: "1px solid var(--border-color, #e7ebf0)",
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 12 }}>🍽️</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
              Chưa có món bán chạy nào
            </div>
            <div style={{ fontSize: 12 }}>
              Khám phá thực đơn để chọn món yêu thích.
            </div>
            <Link
              to="/customer/menu"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                marginTop: 14,
                padding: "10px 20px",
                background: "#2634d5",
                color: "#fff",
                borderRadius: 10,
                textDecoration: "none",
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              <Utensils size={15} /> Xem thực đơn
            </Link>
          </div>
        )}

        {/* Data */}
        {items.map(renderFoodCard)}
      </div>

      {/* ============ MÓN MỚI LÊN KỆ ============ */}
      {newItems.length > 0 && (
        <div style={{ marginBottom: 26 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 14,
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: 16,
                color: "var(--text-primary, #172033)",
              }}
            >
              ✨ Món mới lên kệ
            </h3>
            <Link
              to="/customer/menu"
              style={{
                color: "#2634d5",
                fontSize: 13,
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Xem tất cả →
            </Link>
          </div>
          <div className="home-food-grid-5">
            {newItems.map(renderFoodCard)}
          </div>
        </div>
      )}

      {/* ============ ĐÁNH GIÁ KHÁCH HÀNG ============ */}
      <div style={{ marginBottom: 26 }}>
        <h3
          style={{
            marginBottom: 14,
            fontSize: 16,
            color: "var(--text-primary, #172033)",
          }}
        >
          ⭐ Khách hàng nói gì về Canteen VWA
        </h3>
        <div className="home-testi-grid">
          {TESTIMONIALS.map((tm, i) => (
            <div
              key={i}
              style={{
                background: "var(--card-bg, #fff)",
                border: "1px solid var(--border-color, #e5e9ef)",
                borderRadius: 14,
                padding: 18,
                position: "relative",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Quote
                size={28}
                style={{
                  color: "#2634d5",
                  opacity: 0.15,
                  position: "absolute",
                  top: 12,
                  right: 12,
                }}
              />
              <div style={{ display: "flex", gap: 2, marginBottom: 10 }}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    size={14}
                    fill={s <= tm.rating ? "#f59e0b" : "none"}
                    color={s <= tm.rating ? "#f59e0b" : "#cbd5e1"}
                  />
                ))}
              </div>
              <p
                style={{
                  margin: "0 0 14px",
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: "var(--text-muted, #64748b)",
                  fontStyle: "italic",
                  flex: 1,
                }}
              >
                "{tm.text}"
              </p>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  paddingTop: 12,
                  borderTop: "1px solid var(--border-color, #eef2f7)",
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #2634d5, #20c779)",
                    color: "#fff",
                    display: "grid",
                    placeItems: "center",
                    fontSize: 12,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {tm.name
                    .split(" ")
                    .map((w) => w[0])
                    .slice(-2)
                    .join("")
                    .toUpperCase()}
                </div>
                <div>
                  <b
                    style={{
                      fontSize: 13,
                      color: "var(--text-primary, #172033)",
                      display: "block",
                    }}
                  >
                    {tm.name}
                  </b>
                  <span
                    style={{ fontSize: 11, color: "var(--text-light, #8993a3)" }}
                  >
                    {tm.role}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ============ QR XEM MENU ============ */}
      <div
        style={{
          marginBottom: 26,
          background:
            "linear-gradient(135deg, rgba(38, 52, 213, 0.06), rgba(32, 199, 121, 0.06))",
          border: "1px solid rgba(38, 52, 213, 0.2)",
          borderRadius: 16,
          padding: "24px 28px",
          display: "flex",
          alignItems: "center",
          gap: 24,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            width: 100,
            height: 100,
            background: "#fff",
            borderRadius: 12,
            padding: 6,
            display: "grid",
            placeItems: "center",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            flexShrink: 0,
          }}
        >
          {qrImageSrc && (
            <img
              src={qrImageSrc}
              alt="QR truy cập menu"
              loading="lazy"
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h3
            style={{
              margin: "0 0 6px",
              fontSize: 17,
              color: "var(--text-primary, #172033)",
              fontWeight: 800,
            }}
          >
            📱 Quét mã QR để xem menu
          </h3>
          <p
            style={{
              margin: "0 0 12px",
              fontSize: 13,
              lineHeight: 1.6,
              color: "var(--text-muted, #64748b)",
            }}
          >
            Mở camera điện thoại và quét mã để truy cập thực đơn Canteen VWA
            ngay — không cần tải app.
          </p>
          <Link
            to="/customer/menu"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "#2634d5",
              color: "#fff",
              padding: "10px 18px",
              borderRadius: 8,
              textDecoration: "none",
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            Hoặc bấm vào đây →
          </Link>
        </div>
      </div>

      {/* ============ MODAL ============ */}
      {selected && (
        <FoodDetailModal
          item={selected}
          cart={cart}
          setCart={setCart}
          user={user}
          mode={mode}
          onClose={() => setSelected(null)}
        />
      )}

      {/* ============ CHATBOT WIDGET ============ */}
      <ChatBotWidget cart={cart} setCart={setCart} user={user} />
    </div>
  );
}