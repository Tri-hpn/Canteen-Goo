// ============================================================
// CUSTOMERHOME.JSX — Trang chủ khách hàng
// ============================================================
// Gồm:
//   - Banner carousel (data từ ../../bannerSlides)
//   - Flash marquee (chạy chữ khuyến mãi)
//   - Flash sale (voucher vuông + món giảm giá)
//   - ✅ Món Signature (section mới, dưới Flash Sale)
//   - Bán chạy nhất (top 5 sold)
//   - Món mới lên kệ (4 món mới nhất)
//   - Testimonials
//   - QR truy cập menu (auto-detect origin)
//
// ✅ BANNER: nếu buttonLink bắt đầu bằng "#" → scroll thay vì navigate
// ============================================================

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronLeft, ChevronRight, Star, Clock, Utensils, Gift,
  Sparkles, Zap, ShoppingCart, Quote, AlertCircle, RefreshCw, Plus, Flame,
} from "lucide-react";
import { api } from "../../api";
import { money } from "../../components/UI";
import { SkeletonCard } from "../../components/Skeleton";
import FoodDetailModal from "../../components/FoodDetailModal";
import ChatBotWidget from "../../components/ChatBotWidget";
import { useI18n } from "../../hooks/useI18n";
import { bannerSlides as SLIDES } from "../../bannerSlides";

// ============================================================
// CONSTANTS
// ============================================================

const CAROUSEL_INTERVAL_MS = 4000;
const BEST_SELLERS_LIMIT = 5;
const NEW_ITEMS_LIMIT = 4;
const FLASH_PROMOS_LIMIT = 4;
const FLASH_VOUCHERS_LIMIT = 2;
const SIGNATURE_LIMIT = 5;
const SIGNATURE_ALL_LIMIT = 20;
const SKELETON_COUNT = 5;

const TESTIMONIAL_DATA = [
  { name: "Nguyễn Minh Anh", roleKey: "testimonial.1.role", rating: 5, textKey: "testimonial.1.text" },
  { name: "Trần Quốc Bảo",   roleKey: "testimonial.2.role", rating: 5, textKey: "testimonial.2.text" },
  { name: "Lê Thu Hà",       roleKey: "testimonial.3.role", rating: 4, textKey: "testimonial.3.text" },
];

// ============================================================
// HELPERS
// ============================================================

function getPublicMenuUrl() {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/customer/menu`;
}

function renderChipIcon(iconName, size = 13) {
  switch (iconName) {
    case "clock":    return <Clock size={size} />;
    case "utensils": return <Utensils size={size} />;
    case "gift":     return <Gift size={size} />;
    case "sparkles": return <Sparkles size={size} />;
    default:         return <Zap size={size} />;
  }
}

function fmtNumber(n) {
  return typeof n === "number" ? n.toLocaleString("vi-VN") : String(n ?? "");
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function CustomerHome({ user, cart, setCart }) {
  const navigate = useNavigate();
  const { t, tData, lang } = useI18n();

  const [items, setItems] = useState([]);
  const [newItems, setNewItems] = useState([]);
  const [signatureItems, setSignatureItems] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [publicVouchers, setPublicVouchers] = useState([]);
  const [flashItems, setFlashItems] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [selected, setSelected] = useState(null);
  const [mode, setMode] = useState("cart");
  const [showAllSignature, setShowAllSignature] = useState(false);

  const [tabVisible, setTabVisible] = useState(
    typeof document === "undefined" || !document.hidden
  );

  const inFlightRef = useRef(false);

  // ---------- Default flash promos (i18n) ----------
  const defaultFlashItems = useMemo(
    () => [
      { text: t("flash.default.1") },
      { text: t("flash.default.2") },
      { text: t("flash.default.3") },
    ],
    [t]
  );

  // ---------- Load ----------
  const load = useCallback(
    async (silent = false) => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;

      if (!silent) setRefreshing(true);
      setError("");

      try {
        const [menuRes, promoRes, pubVoucherRes] = await Promise.all([
          api.menu.list("", "Tất cả", "popular").catch(() => []),
          api.promotions.list().catch(() => []),
          api.vouchers.public().catch(() => []),
        ]);

        const rawList = Array.isArray(menuRes) ? menuRes : [];
        const list = rawList.filter((m) => m.active);

        // Best sellers
        const bestSellers = [...list]
          .filter((m) => (m.sold || 0) > 0)
          .sort((a, b) => (b.sold || 0) - (a.sold || 0))
          .slice(0, BEST_SELLERS_LIMIT);
        setItems(bestSellers);

        // New items
        const sortedById = [...list].sort((a, b) => (b.id || 0) - (a.id || 0));
        setNewItems(sortedById.slice(0, NEW_ITEMS_LIMIT));

        // ✅ Signature items — filter `is_signature === true`
        const sig = list.filter((m) => m.is_signature === true);
        setSignatureItems(sig);

        setPromotions(Array.isArray(promoRes) ? promoRes : []);
        setPublicVouchers(Array.isArray(pubVoucherRes) ? pubVoucherRes : []);

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
        setFlashItems(flash.length > 0 ? flash : []);
      } catch (e) {
        if (!silent) setError(e.message || t("customer.loadError"));
      } finally {
        setLoading(false);
        if (!silent) setRefreshing(false);
        inFlightRef.current = false;
      }
    },
    [t]
  );

  useEffect(() => {
    load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Carousel autoplay ----------
  useEffect(() => {
    if (paused || !tabVisible) return;

    const timer = setInterval(() => {
      setIdx((i) => (i + 1) % SLIDES.length);
    }, CAROUSEL_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [paused, tabVisible]);

  useEffect(() => {
    const handler = () => setTabVisible(!document.hidden);
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  // ---------- Carousel controls ----------
  const goNext = () => setIdx((i) => (i + 1) % SLIDES.length);
  const goPrev = () => setIdx((i) => (i - 1 + SLIDES.length) % SLIDES.length);

  // ---------- Derived ----------
  const publicMenuUrl = useMemo(() => getPublicMenuUrl(), []);

  const qrImageSrc = useMemo(() => {
    if (!publicMenuUrl) return "";
    return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
      publicMenuUrl
    )}&margin=0`;
  }, [publicMenuUrl]);

  const effectiveFlashItems = useMemo(() => {
    if (flashItems.length > 0) return flashItems;
    return defaultFlashItems;
  }, [flashItems, defaultFlashItems]);

  const flashTrack = useMemo(() => {
    if (!effectiveFlashItems.length) return [];
    const out = [];
    for (let round = 0; round < 3; round++) {
      effectiveFlashItems.forEach((item, i) => {
        out.push({ ...item, _key: `${round}-${i}` });
      });
    }
    return out;
  }, [effectiveFlashItems]);

  // ✅ Signature visible items — dựa vào showAllSignature
  const visibleSignature = useMemo(() => {
    if (showAllSignature) return signatureItems.slice(0, SIGNATURE_ALL_LIMIT);
    return signatureItems.slice(0, SIGNATURE_LIMIT);
  }, [signatureItems, showAllSignature]);

  // ✅ Handle banner button click — nếu link bắt đầu bằng "#" thì scroll
  const handleBannerClick = useCallback((link) => {
    if (!link) return;

    if (link.startsWith("#")) {
      const id = link.slice(1);
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return;
    }

    navigate(link);
  }, [navigate]);

  // ✅ Scroll to signature section
  const scrollToSignature = useCallback(() => {
    const el = document.getElementById("signature-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  // ============================================================
  // RENDER FOOD CARD
  // ============================================================

  const renderFoodCard = useCallback(
    (m) => {
      const id = m.id || m._id;
      const isOutOfStock = m.stock === 0;
      const isHot = (m.sold || 0) >= 50;

      return (
        <div
          key={id}
          className="grab-food-card"
          onClick={() => {
            if (isOutOfStock) return;
            setMode("cart");
            setSelected(m);
          }}
        >
          <div className="grab-food-card__image-wrap">
            <img src={m.image} alt={m.name} loading="lazy" />

            {isOutOfStock ? (
              <span className="grab-food-card__badge grab-food-card__badge--out">
                {t("customer.badgeOutOfStock")}
              </span>
            ) : isHot ? (
              <span className="grab-food-card__badge grab-food-card__badge--hot">
                <Flame size={10} /> {t("customer.badgeBestSeller")}
              </span>
            ) : null}

            {!isOutOfStock && (
              <button
                type="button"
                className="grab-food-card__add-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setMode("cart");
                  setSelected(m);
                }}
                aria-label={`${t("customer.addItem")} ${m.name}`}
              >
                <Plus size={20} strokeWidth={3} />
              </button>
            )}
          </div>

          <div className="grab-food-card__info">
            <h4 className="grab-food-card__name">{tData(m, "name")}</h4>
            <div className="grab-food-card__price-row">
              <span className="grab-food-card__price">{money(m.price)}</span>
            </div>
          </div>
        </div>
      );
    },
    [t]
  );

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div>
      {/* ERROR BANNER */}
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
            <RefreshCw size={12} /> {t("customer.retry")}
          </button>
        </div>
      )}

      {/* BANNER CAROUSEL */}
      <div
        className="banner-carousel"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        role="region"
        aria-label={t("customer.bannerAria")}
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

                {/* ✅ FIX: dùng handleBannerClick để hỗ trợ scroll anchor */}
                <button
                  type="button"
                  className="banner-btn"
                  onClick={() => handleBannerClick(s.buttonLink)}
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

        <button
          onClick={goPrev}
          aria-label={t("customer.prevSlide")}
          className="banner-nav banner-nav-left"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          onClick={goNext}
          aria-label={t("customer.nextSlide")}
          className="banner-nav banner-nav-right"
        >
          <ChevronRight size={20} />
        </button>

        <div className="banner-dots">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              aria-label={t("customer.goToSlide").replace("{n}", i + 1)}
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

      {/* FLASH MARQUEE */}
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
            <Sparkles size={12} /> {t("customer.flashLabel")}
          </span>
        </Link>
      )}

      {/* FLASH SALE */}
      {(promotions.length > 0 || publicVouchers.length > 0) && (
        <>
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
                fontSize: 18,
                color: "var(--text-primary, #172033)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 22 }}>⚡</span> {t("customer.flashTitle")}
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
                {t("customer.flashHot")}
              </span>
            </h3>

            <Link
              to="/customer/promotions"
              style={{
                color: "#2634d5",
                fontSize: 13,
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              {t("customer.viewAll")} →
            </Link>
          </div>

          <div style={{ marginBottom: 26 }}>
            <div className="home-food-grid-5">
              {publicVouchers.slice(0, FLASH_VOUCHERS_LIMIT).map((v) => (
                <Link
                  key={`voucher-${v.id}`}
                  to="/customer/promotions"
                  className="grab-food-card voucher-card"
                  style={{ textDecoration: "none" }}
                >
                  <div className="voucher-card__icon">
                    <div className="voucher-card__icon-inner">
                      <span className="voucher-card__emoji">🎟️</span>
                      <span className="voucher-card__value">
                        {fmtNumber(v.value || 0)}đ
                      </span>
                    </div>
                  </div>

                  <div className="grab-food-card__info">
                    <span className="voucher-card__label">
                      {t("customer.voucherLabel")}
                    </span>
                    <h4
                      className="grab-food-card__name"
                      style={{ textAlign: "center" }}
                    >
                      {t("customer.voucherDiscount")} {fmtNumber(v.value || 0)}đ
                    </h4>
                    <div className="voucher-card__code">{v.code}</div>
                    <div className="voucher-card__cta">
                      {t("customer.claimNow")}
                    </div>
                  </div>
                </Link>
              ))}

              {promotions.slice(0, FLASH_PROMOS_LIMIT).map((m) => (
                <div
                  key={`promo-${m.id}`}
                  className="grab-food-card"
                  onClick={() => {
                    setMode("buy");
                    setSelected(m);
                  }}
                >
                  <div className="grab-food-card__image-wrap">
                    <img src={m.image} alt={m.name} loading="lazy" />

                    <span className="grab-food-card__badge grab-food-card__badge--hot grab-food-card__badge--right">
                      -{m.discount_percent}%
                    </span>

                    <button
                      type="button"
                      className="grab-food-card__add-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMode("buy");
                        setSelected(m);
                      }}
                      aria-label={`${t("customer.orderItem")} ${m.name}`}
                    >
                      <Zap size={18} strokeWidth={3} />
                    </button>
                  </div>

                  <div className="grab-food-card__info">
                    <h4 className="grab-food-card__name">{tData(m, "name")}</h4>
                    <div className="grab-food-card__price-row">
                      <span
                        className="grab-food-card__price"
                        style={{ color: "#ef4444" }}
                      >
                        {money(m.price)}
                      </span>
                      {m.original_price > m.price && (
                        <span className="grab-food-card__price-old">
                          {money(m.original_price)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ✅ SIGNATURE SECTION — Dưới Flash Sale */}
      {!loading && signatureItems.length > 0 && (
        <div
          id="signature-section"
          style={{
            marginBottom: 26,
            scrollMarginTop: 80,
          }}
        >
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
                fontSize: 18,
                color: "var(--text-primary, #172033)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 22 }}>⭐</span> {t("signature.title")}
              <span
                style={{
                  background:
                    "linear-gradient(135deg, #f59e0b, #ef4444)",
                  color: "#fff",
                  padding: "3px 10px",
                  borderRadius: 12,
                  fontSize: 10,
                  fontWeight: 800,
                }}
              >
                {t("customer.badgeBestSeller")}
              </span>
            </h3>

            {/* ✅ Nút Xem thêm / Thu gọn */}
            {signatureItems.length > SIGNATURE_LIMIT && (
              <button
                type="button"
                onClick={() => setShowAllSignature((s) => !s)}
                style={{
                  background: "transparent",
                  border: 0,
                  color: "#2634d5",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: 0,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                {showAllSignature
                  ? `${t("common.close")} ↑`
                  : `${t("customer.viewAll")} →`}
              </button>
            )}
          </div>

          <div className="home-food-grid-5">
            {visibleSignature.map(renderFoodCard)}
          </div>

          {/* Nút "Xem tất cả" bên dưới (khi đã show all, có nút đóng) */}
          {showAllSignature && signatureItems.length > SIGNATURE_LIMIT && (
            <div style={{ textAlign: "center", marginTop: 16 }}>
              <button
                type="button"
                onClick={() => setShowAllSignature(false)}
                style={{
                  padding: "10px 20px",
                  background: "var(--bg-tertiary, #f5f7fb)",
                  border: "1px solid var(--border-color, #e5e9ef)",
                  borderRadius: 10,
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--text-muted, #475569)",
                }}
              >
                ↑ {t("common.close")}
              </button>
            </div>
          )}
        </div>
      )}

      {/* BÁN CHẠY NHẤT */}
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
        {loading && items.length === 0 && (
          <>
            {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <SkeletonCard key={`skeleton-${i}`} />
            ))}
          </>
        )}

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
              {t("customer.noBestSellerTitle")}
            </div>
            <div style={{ fontSize: 12 }}>
              {t("customer.noBestSellerDesc")}
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
              <Utensils size={15} /> {t("customer.exploreMenu")}
            </Link>
          </div>
        )}

        {items.map(renderFoodCard)}
      </div>

      {/* MÓN MỚI */}
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
              ✨ {t("customer.newArrivalsTitle")}
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
              {t("customer.viewAll")} →
            </Link>
          </div>
          <div className="home-food-grid-5">
            {newItems.map(renderFoodCard)}
          </div>
        </div>
      )}

      {/* ĐÁNH GIÁ KHÁCH HÀNG */}
      <div style={{ marginBottom: 26 }}>
        <h3
          style={{
            marginBottom: 14,
            fontSize: 16,
            color: "var(--text-primary, #172033)",
          }}
        >
          ⭐ {t("customer.testimonialsTitle")}
        </h3>
        <div className="home-testi-grid">
          {TESTIMONIAL_DATA.map((tm, i) => (
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
                "{t(tm.textKey)}"
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
                    {t(tm.roleKey)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* QR XEM MENU */}
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
              alt={t("customer.qrAlt")}
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
            📱 {t("customer.qrTitle")}
          </h3>
          <p
            style={{
              margin: "0 0 12px",
              fontSize: 13,
              lineHeight: 1.6,
              color: "var(--text-muted, #64748b)",
            }}
          >
            {t("customer.qrDesc")}
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
            {t("customer.qrOrClick")}
          </Link>
        </div>
      </div>

      {/* MODAL */}
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

      {/* CHATBOT WIDGET */}
      <ChatBotWidget cart={cart} setCart={setCart} user={user} />
    </div>
  );
}