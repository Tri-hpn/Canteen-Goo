// ============================================================
// CUSTOMERPROMOTIONS.JSX — Khuyến mãi & Voucher
// ============================================================
// Sections:
//   1. Hero (điểm, ví, ưu đãi)
//   2. Điểm tích lũy + đổi điểm
//   3. Món đang giảm giá
//   4. Ưu đãi toàn hệ thống (public vouchers)
//   5. Ví voucher của tôi (active / used)
//   6. Modal chọn voucher theo mệnh giá
//
// Fixes (so với bản gốc):
//   - Error state + retry (không silent fail)
//   - setTimeout copy feedback có cleanup
//   - Modal: ESC close, role/aria, disable khi busy
//   - scrollToSection: chỉ scroll khi section đã render
//   - Loading tách: initial vs refreshing (khi redeem/claim)
//   - groupByValue memo, key unique hơn
//   - claiming dùng Set (đơn giản hơn)
//   - doRedeem: guard double-submit
//   - Bỏ activeValue dead code
//   - loadAll useCallback
//   - Disable tất cả nút "Nhận ngay" khi 1 cái đang claim
// ============================================================

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Copy, Check, Gift, Sparkles, Clock, ArrowRight, Ticket, Flame,
  Percent, ShoppingBag, Plus, Wallet, Loader2, AlertCircle, RefreshCw, X,
} from "lucide-react";
import { api } from "../../api";
import { money } from "../../components/UI";
import { toast } from "../../components/Effects";

// ============================================================
// CONSTANTS
// ============================================================

const MODAL_Z = 2147483600;
const COPY_FEEDBACK_MS = 1500;
const MIN_REDEEM = 100;
const POINT_TO_VND = 100;
const REDEEM_OPTIONS = [100, 200, 500, 1000];

// ============================================================
// HELPERS
// ============================================================

/**
 * Group vouchers theo value.
 * Sắp xếp theo value giảm dần.
 */
function groupByValue(list) {
  const map = new Map();

  for (const v of list) {
    const key = String(v.value);
    if (!map.has(key)) {
      map.set(key, {
        value: v.value,
        count: 0,
        vouchers: [],
        used: 0,
        available: 0,
      });
    }
    const g = map.get(key);
    g.count++;
    g.vouchers.push(v);
    if (v.used) g.used++;
    else g.available++;
  }

  return Array.from(map.values()).sort((a, b) => b.value - a.value);
}

/** Unique key cho group card. */
function makeGroupKey(g) {
  return `grp-${g.value}-${g.available}-${g.used}-${g.count}`;
}

/** Format date an toàn. */
function fmtDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("vi-VN");
  } catch {
    return "";
  }
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function CustomerPromotions() {
  const navigate = useNavigate();

  // ---------- Data ----------
  const [vouchers, setVouchers] = useState([]);
  const [publicVouchers, setPublicVouchers] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [points, setPoints] = useState(0);
  const [walletBalance, setWalletBalance] = useState(0);

  // ---------- Load state ----------
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // ---------- UI ----------
  const [tab, setTab] = useState("active");
  const [copiedId, setCopiedId] = useState(null);
  const [claimingIds, setClaimingIds] = useState(() => new Set());
  const [openedGroup, setOpenedGroup] = useState(null);

  // ---------- Redeem ----------
  const [redeemPoints, setRedeemPoints] = useState(MIN_REDEEM);
  const [redeemLoading, setRedeemLoading] = useState(false);

  // ---------- Refs ----------
  const copyTimerRef = useRef(null);
  const inFlightRef = useRef(false);

  // ---------- Load ----------

  const loadAll = useCallback(async (silent = false) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    if (!silent) setRefreshing(true);
    setError("");

    try {
      const [myRes, pubRes, promoRes, pointsRes, walletRes] = await Promise.all([
        api.vouchers.me().catch(() => []),
        api.vouchers.public().catch(() => []),
        api.promotions.list().catch(() => []),
        api.points.me().catch(() => ({ points: 0 })),
        api.wallet.me().catch(() => ({ balance: 0 })),
      ]);

      setVouchers(Array.isArray(myRes) ? myRes : []);
      setPublicVouchers(Array.isArray(pubRes) ? pubRes : []);
      setPromotions(Array.isArray(promoRes) ? promoRes : []);
      setPoints(Number(pointsRes?.points) || 0);
      setWalletBalance(Number(walletRes?.balance) || 0);
    } catch (e) {
      if (!silent) setError(e.message || "Không tải được dữ liệu khuyến mãi");
    } finally {
      setLoading(false);
      if (!silent) setRefreshing(false);
      inFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    loadAll(false);
  }, [loadAll]);

  // Cleanup copy timer
  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  // ---------- Derived ----------

  const { active, used } = useMemo(() => {
    const activeList = vouchers.filter((v) => !v.used);
    const usedList = vouchers.filter((v) => v.used);
    return { active: activeList, used: usedList };
  }, [vouchers]);

  const list = tab === "active" ? active : used;

  const grouped = useMemo(() => groupByValue(list), [list]);

  const canRedeem = points >= redeemPoints && redeemPoints >= MIN_REDEEM;

  // ---------- Handlers ----------

  const scrollToSection = useCallback((id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const doRedeem = async () => {
    if (redeemLoading) return;

    if (redeemPoints < MIN_REDEEM) {
      toast(`Cần ít nhất ${MIN_REDEEM} điểm`, "error");
      return;
    }
    if (redeemPoints > points) {
      toast("Không đủ điểm", "error");
      return;
    }

    setRedeemLoading(true);
    try {
      const voucher = await api.points.redeem({ points: redeemPoints });
      toast(
        `Đổi thành công ${voucher.code} — ${money(voucher.value)}`,
        "success"
      );
      setRedeemPoints(MIN_REDEEM);
      await loadAll(true);
      setTab("active");
    } catch (e) {
      toast(e.message || "Không đổi được voucher", "error");
    } finally {
      setRedeemLoading(false);
    }
  };

  const copyCode = (v) => {
    try {
      navigator.clipboard.writeText(v.code);
    } catch {
      toast("Không sao chép được", "error");
      return;
    }

    setCopiedId(v.id);
    toast(`Đã sao chép mã ${v.code}`, "success");

    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => {
      setCopiedId(null);
      copyTimerRef.current = null;
    }, COPY_FEEDBACK_MS);
  };

  const claimVoucher = async (v) => {
    if (claimingIds.has(v.id)) return;

    setClaimingIds((s) => new Set(s).add(v.id));
    try {
      await api.vouchers.claim(v.id);
      toast(`Đã nhận voucher ${money(v.value)}!`, "success");
      await loadAll(true);
      setTab("active");
    } catch (e) {
      toast(e.message || "Lỗi nhận voucher", "error");
    } finally {
      setClaimingIds((s) => {
        const n = new Set(s);
        n.delete(v.id);
        return n;
      });
    }
  };

  // ESC đóng modal chọn voucher
  useEffect(() => {
    if (!openedGroup) return;
    const handler = (e) => {
      if (e.key === "Escape") setOpenedGroup(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [openedGroup]);

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
            onClick={() => loadAll(false)}
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

      {/* ============ HERO ============ */}
      <div
        style={{
          background:
            "linear-gradient(135deg, #2634d5 0%, #8b5cf6 50%, #ec4899 100%)",
          borderRadius: 18,
          padding: "28px 32px",
          marginBottom: 20,
          color: "#fff",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -30,
            right: -30,
            fontSize: 140,
            opacity: 0.12,
            transform: "rotate(-15deg)",
          }}
        >
          🎁
        </div>
        <div style={{ position: "relative", zIndex: 2 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
              opacity: 0.9,
              marginBottom: 8,
              letterSpacing: 1,
            }}
          >
            <Sparkles size={14} /> KHUYẾN MÃI CANTEEN VWA
          </div>
          <h1 style={{ margin: "0 0 6px", fontSize: 28, fontWeight: 800 }}>
            Ưu đãi hôm nay
          </h1>
          <p style={{ margin: "0 0 18px", fontSize: 14, opacity: 0.95 }}>
            Nhận voucher và khám phá món đang giảm giá
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <HeroButton
              icon={<Ticket size={16} />}
              label="Ưu đãi"
              value={publicVouchers.length}
              onClick={() => scrollToSection("section-public-vouchers")}
              disabled={publicVouchers.length === 0}
            />
            <HeroButton
              icon={<Wallet size={16} />}
              label="Ví Canteen"
              value={money(walletBalance)}
              onClick={() => navigate("/customer/wallet")}
            />
            <HeroButton
              icon={<Flame size={16} />}
              label="Món giảm giá"
              value={promotions.length}
              onClick={() => scrollToSection("section-promotions")}
              disabled={promotions.length === 0}
            />
          </div>
        </div>
      </div>

      {/* ============ ĐIỂM + ĐỔI VOUCHER ============ */}
      <div
        style={{
          background: "linear-gradient(135deg, #2634d5, #18a967)",
          borderRadius: 18,
          padding: "24px 28px",
          marginBottom: 24,
          color: "#fff",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -20,
            right: 20,
            fontSize: 120,
            opacity: 0.15,
          }}
        >
          🏆
        </div>
        <div
          style={{
            position: "relative",
            zIndex: 2,
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 24,
            alignItems: "center",
          }}
          className="promo-points-grid"
        >
          <div>
            <div
              style={{
                fontSize: 12,
                opacity: 0.9,
                fontWeight: 600,
                letterSpacing: 1,
                marginBottom: 6,
              }}
            >
              💎 ĐIỂM TÍCH LŨY CỦA BẠN
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 12,
                marginBottom: 8,
              }}
            >
              <div style={{ fontSize: 48, fontWeight: 900, lineHeight: 1 }}>
                {points}
              </div>
              <div style={{ fontSize: 14, opacity: 0.9 }}>điểm</div>
            </div>
            <div style={{ fontSize: 13, opacity: 0.9 }}>
              1 điểm = 100đ · Cần tối thiểu 100 điểm để đổi voucher
            </div>
          </div>

          <div
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: 14,
              padding: 16,
              minWidth: 260,
            }}
          >
            <div
              style={{
                fontSize: 11,
                opacity: 0.9,
                fontWeight: 600,
                marginBottom: 10,
                letterSpacing: 0.5,
              }}
            >
              🎁 ĐỔI ĐIỂM THÀNH VOUCHER
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 4,
                marginBottom: 10,
              }}
            >
              {REDEEM_OPTIONS.map((p) => {
                const disabled = points < p;
                const active = redeemPoints === p;
                return (
                  <button
                    key={p}
                    onClick={() => setRedeemPoints(p)}
                    disabled={disabled}
                    style={{
                      padding: "7px 4px",
                      background: active ? "#fff" : "rgba(255,255,255,0.15)",
                      color: active ? "#2634d5" : "#fff",
                      border: 0,
                      borderRadius: 7,
                      cursor: disabled ? "not-allowed" : "pointer",
                      fontWeight: 700,
                      fontSize: 12,
                      opacity: disabled ? 0.4 : 1,
                    }}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
            <div
              style={{
                fontSize: 13,
                marginBottom: 10,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ opacity: 0.9 }}>Nhận voucher:</span>
              <b style={{ fontSize: 18 }}>
                {money(redeemPoints * POINT_TO_VND)}
              </b>
            </div>
            <button
              onClick={doRedeem}
              disabled={redeemLoading || !canRedeem}
              style={{
                width: "100%",
                padding: "11px 16px",
                background: canRedeem ? "#fff" : "rgba(255,255,255,0.3)",
                color: canRedeem ? "#2634d5" : "rgba(255,255,255,0.7)",
                border: 0,
                borderRadius: 9,
                fontWeight: 800,
                cursor: redeemLoading || !canRedeem ? "not-allowed" : "pointer",
                fontSize: 13,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              {redeemLoading ? (
                <>
                  <Loader2
                    size={14}
                    style={{ animation: "spin 1s linear infinite" }}
                  />
                  Đang đổi...
                </>
              ) : (
                <>
                  <Gift size={15} /> Đổi ngay
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ============ MÓN ĐANG GIẢM GIÁ ============ */}
      {!loading && promotions.length > 0 && (
        <div id="section-promotions" style={{ scrollMarginTop: 130, marginBottom: 24 }}>
          <SectionHeader
            color="#f59e0b"
            title="Món đang giảm giá"
            badge={`${promotions.length} món`}
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 14,
            }}
          >
            {promotions.map((m) => (
              <div
                key={m.id}
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
                    background: "linear-gradient(135deg, #ef4444, #f59e0b)",
                    color: "#fff",
                    padding: "4px 10px",
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 800,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 3,
                    zIndex: 2,
                    boxShadow: "0 4px 10px rgba(239, 68, 68, 0.4)",
                  }}
                >
                  <Percent size={11} /> -{m.discount_percent}%
                </div>

                <img
                  src={m.image}
                  alt={m.name}
                  loading="lazy"
                  style={{
                    width: "100%",
                    height: 130,
                    objectFit: "cover",
                  }}
                />

                <div
                  style={{
                    padding: 12,
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      color: "var(--text-light, #8993a3)",
                      textTransform: "uppercase",
                      letterSpacing: 0.4,
                      marginBottom: 2,
                    }}
                  >
                    {m.category}
                  </span>
                  <b
                    style={{
                      fontSize: 14,
                      color: "var(--text-primary, #172033)",
                      marginBottom: 6,
                      lineHeight: 1.3,
                    }}
                  >
                    {m.name}
                  </b>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: 8,
                      marginBottom: 10,
                    }}
                  >
                    <b style={{ color: "#ef4444", fontSize: 16 }}>
                      {money(m.price)}
                    </b>
                    {m.original_price > m.price && (
                      <span
                        style={{
                          fontSize: 12,
                          color: "var(--text-light, #94a3b8)",
                          textDecoration: "line-through",
                        }}
                      >
                        {money(m.original_price)}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => navigate("/customer/menu")}
                    style={{
                      marginTop: "auto",
                      width: "100%",
                      padding: "9px 12px",
                      background: "#2634d5",
                      color: "#fff",
                      border: 0,
                      borderRadius: 8,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontSize: 12,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 5,
                    }}
                  >
                    <ShoppingBag size={13} /> Đặt ngay
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============ ƯU ĐÃI TOÀN HỆ THỐNG ============ */}
      {!loading && publicVouchers.length > 0 && (
        <div
          id="section-public-vouchers"
          style={{ marginBottom: 24, scrollMarginTop: 130 }}
        >
          <SectionHeader
            color="#ec4899"
            title="Ưu đãi toàn hệ thống"
            badge={`${publicVouchers.length} voucher`}
          />
          <p
            style={{
              margin: "0 0 14px",
              fontSize: 13,
              color: "var(--text-muted, #64748b)",
            }}
          >
            Bấm "Nhận ngay" để lưu vào ví của bạn — dùng khi thanh toán.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 14,
            }}
          >
            {publicVouchers.map((v) => {
              const isClaiming = claimingIds.has(v.id);
              const anyClaiming = claimingIds.size > 0;

              return (
                <div
                  key={v.id}
                  style={{
                    background:
                      "linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)",
                    borderRadius: 14,
                    padding: 2,
                  }}
                >
                  <div
                    style={{
                      background: "var(--card-bg, #fff)",
                      borderRadius: 12,
                      padding: 16,
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        marginBottom: 12,
                      }}
                    >
                      <div
                        style={{
                          width: 50,
                          height: 50,
                          borderRadius: 12,
                          background:
                            "linear-gradient(135deg, #ec4899, #8b5cf6)",
                          color: "#fff",
                          display: "grid",
                          placeItems: "center",
                          fontSize: 24,
                          flexShrink: 0,
                        }}
                      >
                        🎟️
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--text-light, #8993a3)",
                            fontWeight: 600,
                            letterSpacing: 0.5,
                          }}
                        >
                          GIẢM NGAY
                        </div>
                        <div
                          style={{
                            fontSize: 22,
                            fontWeight: 800,
                            color: "#ec4899",
                            lineHeight: 1.1,
                          }}
                        >
                          {money(v.value)}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        fontFamily: "monospace",
                        fontSize: 13,
                        fontWeight: 700,
                        color: "var(--text-muted, #64748b)",
                        padding: "6px 10px",
                        background: "var(--bg-tertiary, #f5f7fb)",
                        borderRadius: 6,
                        marginBottom: 12,
                        textAlign: "center",
                        border: "1px dashed var(--border-color, #cbd5e1)",
                        wordBreak: "break-all",
                      }}
                    >
                      {v.code}
                    </div>

                    <button
                      onClick={() => claimVoucher(v)}
                      disabled={isClaiming || anyClaiming}
                      style={{
                        marginTop: "auto",
                        width: "100%",
                        padding: "11px 16px",
                        background:
                          isClaiming || anyClaiming
                            ? "#94a3b8"
                            : "linear-gradient(135deg, #ec4899, #8b5cf6)",
                        color: "#fff",
                        border: 0,
                        borderRadius: 10,
                        fontWeight: 700,
                        cursor:
                          isClaiming || anyClaiming
                            ? "not-allowed"
                            : "pointer",
                        fontSize: 13,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                      }}
                    >
                      {isClaiming ? (
                        <>
                          <Loader2
                            size={14}
                            style={{ animation: "spin 1s linear infinite" }}
                          />
                          Đang nhận...
                        </>
                      ) : (
                        <>
                          <Plus size={15} /> Nhận ngay
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============ VÍ VOUCHER CỦA TÔI ============ */}
      <div
        id="section-my-vouchers"
        style={{ marginBottom: 24, scrollMarginTop: 130 }}
      >
        <SectionHeader color="#2634d5" title="Ví voucher của tôi" />

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            gap: 6,
            marginBottom: 14,
            background: "var(--card-bg, #fff)",
            border: "1px solid var(--border-color, #e7ebf0)",
            borderRadius: 12,
            padding: 6,
          }}
        >
          {[
            { id: "active", label: "Khả dụng", count: active.length, icon: Sparkles },
            { id: "used", label: "Đã dùng", count: used.length, icon: Clock },
          ].map((t) => {
            const Icon = t.icon;
            const isActive = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  padding: "10px 18px",
                  border: 0,
                  borderRadius: 8,
                  cursor: "pointer",
                  background: isActive ? "#2634d5" : "transparent",
                  color: isActive ? "#fff" : "var(--text-muted, #475569)",
                  fontWeight: isActive ? 700 : 500,
                  fontSize: 13,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Icon size={15} />
                {t.label}
                <span
                  style={{
                    background: isActive
                      ? "#fff"
                      : "var(--bg-tertiary, #f5f7fb)",
                    color: isActive ? "#2634d5" : "var(--text-muted, #64748b)",
                    minWidth: 22,
                    height: 20,
                    padding: "0 7px",
                    borderRadius: 10,
                    fontSize: 11,
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Loading lần đầu */}
        {loading && (
          <div
            style={{
              textAlign: "center",
              padding: 40,
              color: "var(--text-light, #8993a3)",
            }}
          >
            <Loader2
              size={24}
              style={{ animation: "spin 1s linear infinite", marginBottom: 8 }}
            />
            <div style={{ fontSize: 13 }}>Đang tải voucher...</div>
          </div>
        )}

        {/* Empty */}
        {!loading && list.length === 0 && (
          <div
            style={{
              background: "var(--card-bg, #fff)",
              border: "1px solid var(--border-color, #e7ebf0)",
              borderRadius: 14,
              padding: 40,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 50, marginBottom: 12 }}>🎟️</div>
            <h3
              style={{
                margin: "0 0 6px",
                color: "var(--text-primary, #172033)",
                fontSize: 15,
              }}
            >
              {tab === "active"
                ? "Chưa có voucher khả dụng"
                : "Chưa dùng voucher nào"}
            </h3>
            <p
              style={{
                margin: "0 0 16px",
                color: "var(--text-muted, #64748b)",
                fontSize: 13,
              }}
            >
              {tab === "active"
                ? "Nhận ưu đãi ở trên, hoặc đổi điểm tích lũy."
                : "Voucher đã sử dụng sẽ hiển thị ở đây."}
            </p>
            {tab === "active" && (
              <button
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "#2634d5",
                  color: "#fff",
                  padding: "10px 20px",
                  borderRadius: 10,
                  border: 0,
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                <Gift size={15} /> Đổi điểm lấy voucher
              </button>
            )}
          </div>
        )}

        {/* Grid voucher */}
        {!loading && grouped.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 14,
            }}
          >
            {grouped.map((g) => (
              <VoucherGroupCard
                key={makeGroupKey(g)}
                group={g}
                copiedId={copiedId}
                onCopy={copyCode}
                onOpenGroup={setOpenedGroup}
                onUse={() => navigate("/customer/checkout")}
              />
            ))}
          </div>
        )}
      </div>

      {/* ============ MODAL CHỌN VOUCHER ============ */}
      {openedGroup && (
        <GroupModal
          group={openedGroup}
          copiedId={copiedId}
          onCopy={copyCode}
          onClose={() => setOpenedGroup(null)}
          onUse={() => {
            setOpenedGroup(null);
            navigate("/customer/checkout");
          }}
        />
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @media (max-width: 768px) {
          .promo-points-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

function HeroButton({ icon, label, value, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        cursor: disabled ? "not-allowed" : "pointer",
        color: "#fff",
        fontFamily: "inherit",
        background: "rgba(255,255,255,0.18)",
        border: "1px solid rgba(255,255,255,0.3)",
        padding: "10px 16px",
        borderRadius: 10,
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 13,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {icon} <span>{label}: <b>{value}</b></span>
    </button>
  );
}

function SectionHeader({ color, title, badge }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
      <div
        style={{
          width: 4,
          height: 22,
          borderRadius: 4,
          background: color,
        }}
      />
      <h2
        style={{
          margin: 0,
          fontSize: 17,
          color: "var(--text-primary, #172033)",
        }}
      >
        {title}
      </h2>
      {badge && (
        <span
          style={{
            background: color,
            color: "#fff",
            padding: "2px 10px",
            borderRadius: 12,
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          {badge}
        </span>
      )}
    </div>
  );
}

function VoucherGroupCard({ group: g, copiedId, onCopy, onOpenGroup, onUse }) {
  const isUsed = g.available === 0;
  const hasMultiple = g.count > 1;
  const firstVoucher = g.vouchers[0];
  const isCopied = copiedId === firstVoucher?.id;

  return (
    <div
      style={{
        background: isUsed
          ? "var(--bg-tertiary, #f5f7fb)"
          : "var(--card-bg, #fff)",
        border: `1px solid ${
          isUsed ? "var(--border-color, #e5e9ef)" : "#2634d5"
        }`,
        borderRadius: 14,
        overflow: "hidden",
        opacity: isUsed ? 0.7 : 1,
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      {hasMultiple && (
        <div
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            background: isUsed ? "#94a3b8" : "#ef4444",
            color: "#fff",
            padding: "3px 10px",
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 800,
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            zIndex: 3,
          }}
        >
          ×{g.count}
        </div>
      )}

      <div
        style={{
          background: isUsed
            ? "linear-gradient(135deg, #94a3b8, #64748b)"
            : "linear-gradient(135deg, #2634d5, #8b5cf6)",
          color: "#fff",
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10,
              opacity: 0.85,
              letterSpacing: 1,
              fontWeight: 600,
            }}
          >
            {isUsed ? "ĐÃ SỬ DỤNG" : "GIẢM GIÁ"}
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 800,
              lineHeight: 1.1,
              marginTop: 2,
            }}
          >
            {money(g.value)}
          </div>
        </div>
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.2)",
            display: "grid",
            placeItems: "center",
            fontSize: 20,
          }}
        >
          🎟️
        </div>
      </div>

      <div
        style={{
          padding: "12px 16px",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {hasMultiple ? (
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "#2634d5",
                marginBottom: 6,
              }}
            >
              {g.available} voucher khả dụng
              {g.used > 0 && (
                <span style={{ color: "#ef4444", fontWeight: 600 }}>
                  {" "}· {g.used} đã dùng
                </span>
              )}
            </div>
            <div
              style={{
                background: "var(--bg-tertiary, #f5f7fb)",
                border: "1px dashed #2634d5",
                borderRadius: 8,
                padding: "8px 12px",
                fontSize: 11,
                color: "var(--text-muted, #64748b)",
                maxHeight: 60,
                overflowY: "auto",
              }}
            >
              {g.vouchers.slice(0, 3).map((v) => (
                <div
                  key={v.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "2px 0",
                  }}
                >
                  <span style={{ fontFamily: "monospace" }}>{v.code}</span>
                  <span
                    style={{
                      color: v.used ? "#ef4444" : "#18a967",
                      fontWeight: 700,
                      fontSize: 10,
                    }}
                  >
                    {v.used ? "đã dùng" : "khả dụng"}
                  </span>
                </div>
              ))}
              {g.vouchers.length > 3 && (
                <div
                  style={{
                    color: "#94a3b8",
                    fontStyle: "italic",
                    fontSize: 10,
                  }}
                >
                  ... và {g.vouchers.length - 3} voucher khác
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                justifyContent: "space-between",
              }}
            >
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: 14,
                  fontWeight: 800,
                  color: isUsed
                    ? "var(--text-muted, #64748b)"
                    : "#2634d5",
                  letterSpacing: 1,
                  padding: "5px 10px",
                  background: isUsed
                    ? "transparent"
                    : "rgba(38, 52, 213, 0.08)",
                  borderRadius: 6,
                  flex: 1,
                  textAlign: "center",
                  border: isUsed
                    ? "1px dashed var(--border-color, #cbd5e1)"
                    : "1px dashed #2634d5",
                  wordBreak: "break-all",
                }}
              >
                {firstVoucher?.code}
              </div>
              {!isUsed && firstVoucher && (
                <button
                  onClick={() => onCopy(firstVoucher)}
                  title="Sao chép"
                  aria-label="Sao chép mã voucher"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: isCopied
                      ? "#18a967"
                      : "var(--bg-tertiary, #f5f7fb)",
                    color: isCopied
                      ? "#fff"
                      : "var(--text-primary, #475569)",
                    border: isCopied
                      ? 0
                      : "1px solid var(--border-color, #e5e9ef)",
                    cursor: "pointer",
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                  }}
                >
                  {isCopied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              )}
            </div>

            <div
              style={{
                fontSize: 11,
                color: "var(--text-light, #8993a3)",
                lineHeight: 1.5,
              }}
            >
              {firstVoucher?.claimed_from && (
                <div>• Nhận từ ưu đãi toàn hệ thống</div>
              )}
              {firstVoucher?.points_used > 0 && (
                <div>
                  • Đổi từ <b>{firstVoucher.points_used} điểm</b>
                </div>
              )}
              {firstVoucher?.used_at && (
                <div>• Dùng ngày {fmtDate(firstVoucher.used_at)}</div>
              )}
            </div>
          </>
        )}

        {!isUsed ? (
          hasMultiple ? (
            <button
              onClick={() => onOpenGroup(g)}
              style={{
                marginTop: "auto",
                width: "100%",
                padding: "10px 14px",
                background: "#2634d5",
                color: "#fff",
                border: 0,
                borderRadius: 10,
                fontWeight: 700,
                cursor: "pointer",
                fontSize: 12,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
              }}
            >
              Xem {g.available} voucher <ArrowRight size={14} />
            </button>
          ) : (
            <button
              onClick={onUse}
              style={{
                marginTop: "auto",
                width: "100%",
                padding: "10px 14px",
                background: "#2634d5",
                color: "#fff",
                border: 0,
                borderRadius: 10,
                fontWeight: 700,
                cursor: "pointer",
                fontSize: 12,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
              }}
            >
              Dùng ngay <ArrowRight size={14} />
            </button>
          )
        ) : (
          <div
            style={{
              marginTop: "auto",
              padding: "9px 14px",
              textAlign: "center",
              background: "var(--bg-secondary, #e2e8f0)",
              color: "var(--text-muted, #64748b)",
              borderRadius: 10,
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            Voucher không còn hiệu lực
          </div>
        )}
      </div>
    </div>
  );
}

function GroupModal({ group: g, copiedId, onCopy, onClose, onUse }) {
  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Chọn voucher"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "grid",
        placeItems: "center",
        zIndex: MODAL_Z,
        padding: 20,
        overflowY: "auto",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--card-bg, #fff)",
          borderRadius: 14,
          padding: 24,
          width: "100%",
          maxWidth: 480,
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <h3 style={{ margin: 0, color: "var(--text-primary, #172033)" }}>
            Chọn voucher {money(g.value)}
          </h3>
          <button
            onClick={onClose}
            aria-label="Đóng"
            style={{
              background: "transparent",
              border: 0,
              cursor: "pointer",
              color: "var(--text-light, #8993a3)",
              padding: 4,
              display: "grid",
              placeItems: "center",
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div
          style={{
            fontSize: 12,
            color: "var(--text-muted, #64748b)",
            marginBottom: 14,
          }}
        >
          Bạn có <b style={{ color: "#2634d5" }}>{g.available}</b> voucher
          khả dụng với mệnh giá này. Chọn 1 để dùng.
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            maxHeight: 400,
            overflowY: "auto",
          }}
        >
          {g.vouchers.map((v) => {
            const vUsed = v.used;
            const vCopied = copiedId === v.id;

            return (
              <div
                key={v.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: 12,
                  background: vUsed
                    ? "var(--bg-tertiary, #f5f7fb)"
                    : "var(--card-bg, #fff)",
                  border: `1px solid ${
                    vUsed ? "var(--border-color, #e5e9ef)" : "#2634d5"
                  }`,
                  borderRadius: 10,
                  opacity: vUsed ? 0.6 : 1,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: "monospace",
                      fontSize: 13,
                      fontWeight: 800,
                      color: vUsed ? "#94a3b8" : "#2634d5",
                      wordBreak: "break-all",
                    }}
                  >
                    {v.code}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--text-light, #8993a3)",
                      marginTop: 2,
                    }}
                  >
                    {v.used_at
                      ? `Dùng: ${fmtDate(v.used_at)}`
                      : v.created_at
                      ? `Nhận: ${fmtDate(v.created_at)}`
                      : ""}
                  </div>
                </div>

                {!vUsed && (
                  <>
                    <button
                      onClick={() => onCopy(v)}
                      aria-label="Sao chép mã"
                      style={{
                        padding: 8,
                        border: "1px solid var(--border-color, #e5e9ef)",
                        borderRadius: 8,
                        background: vCopied ? "#18a967" : "var(--card-bg, #fff)",
                        color: vCopied ? "#fff" : "var(--text-primary, #475569)",
                        cursor: "pointer",
                        display: "grid",
                        placeItems: "center",
                        flexShrink: 0,
                      }}
                    >
                      {vCopied ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                    <button
                      onClick={onUse}
                      style={{
                        padding: "8px 14px",
                        background: "#2634d5",
                        color: "#fff",
                        border: 0,
                        borderRadius: 8,
                        fontWeight: 700,
                        fontSize: 12,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}
                    >
                      Dùng
                    </button>
                  </>
                )}

                {vUsed && (
                  <span
                    style={{
                      padding: "3px 10px",
                      borderRadius: 10,
                      fontSize: 10,
                      fontWeight: 700,
                      background: "#fee2e2",
                      color: "#ef4444",
                      flexShrink: 0,
                    }}
                  >
                    Đã dùng
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <button
          onClick={onClose}
          style={{
            marginTop: 16,
            width: "100%",
            padding: 12,
            background: "var(--bg-tertiary, #f5f7fb)",
            color: "var(--text-primary, #475569)",
            border: "1px solid var(--border-color, #e5e9ef)",
            borderRadius: 10,
            fontWeight: 700,
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          Đóng
        </button>
      </div>
    </div>
  );
}