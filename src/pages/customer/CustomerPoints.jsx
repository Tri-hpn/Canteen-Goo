// ============================================================
// CUSTOMERPOINTS.JSX — Điểm tích lũy + đổi voucher
// ============================================================
// Tính năng:
//   - Hiển thị điểm hiện có
//   - Chọn mệnh giá đổi (100/200/500/1000 điểm)
//   - Đổi điểm → voucher
//   - Lịch sử tích lũy / đổi điểm
//
// Fixes (so với bản gốc):
//   - Loading state ban đầu (không hiển thị "0" khi đang tải)
//   - Error state + retry (không xoá data khi lỗi)
//   - Nút "{p} điểm tích lũy" → "{p} điểm" (bỏ lặp từ)
//   - Handle h.points = 0 và undefined
//   - Spinner trong nút redeem
//   - Refresh button
//   - Bảng overflow-x cho mobile
//   - try/catch cho dispatchEvent
//   - Memo các computed values
// ============================================================

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Gift, History, Loader2, AlertCircle, RefreshCw, CheckCircle2,
} from "lucide-react";
import { api } from "../../api";
import { money } from "../../components/UI";
import { toast } from "../../components/Effects";
import { useTranslation } from "../../i18n";

// ============================================================
// CONSTANTS
// ============================================================

const REDEEM_OPTIONS = [100, 200, 500, 1000];
const MIN_REDEEM = 100;
const POINT_TO_VND = 100; // 1 điểm = 100đ

const EMPTY_DATA = { points: 0, history: [] };

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function CustomerPoints() {
  const { t } = useTranslation();

  // ---------- Data ----------
  const [data, setData] = useState(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // ---------- Redeem ----------
  const [redeemPoints, setRedeemPoints] = useState(MIN_REDEEM);
  const [redeeming, setRedeeming] = useState(false);

  // ---------- Load ----------

  const load = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    setError("");

    try {
      const res = await api.points.me();
      setData({
        points: Number(res?.points) || 0,
        history: Array.isArray(res?.history) ? res.history : [],
      });
    } catch (e) {
      if (!silent) setError(e.message || "Không tải được điểm tích lũy");
      // KHÔNG reset data — giữ điểm cũ để user thấy
    } finally {
      setLoading(false);
      if (!silent) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  // Mark "đã xem" → xoá badge sidebar
  useEffect(() => {
    try {
      localStorage.setItem("points_last_seen", Date.now().toString());
      window.dispatchEvent(new CustomEvent("points-seen"));
    } catch {}
  }, []);

  // ---------- Derived (memo) ----------

  const points = data.points || 0;

  const voucherValue = useMemo(
    () => redeemPoints * POINT_TO_VND,
    [redeemPoints]
  );

  const canRedeem = points >= redeemPoints && redeemPoints >= MIN_REDEEM;

  // ---------- Handlers ----------

  const redeem = async () => {
    if (redeeming) return;

    if (redeemPoints < MIN_REDEEM) {
      toast(t("points.needMin"), "error");
      return;
    }
    if (redeemPoints > points) {
      toast(t("points.noEnough"), "error");
      return;
    }

    setRedeeming(true);
    try {
      const voucher = await api.points.redeem({ points: redeemPoints });

      toast(
        `${t("points.success")}! ${voucher.code} (${money(voucher.value)})`,
        "success"
      );

      setRedeemPoints(MIN_REDEEM);
      await load(true);

      // Thông báo cho các component khác (sidebar badge, user điểm)
      try {
        window.dispatchEvent(new CustomEvent("refresh-user"));
      } catch {}
    } catch (e) {
      toast(e.message || "Không đổi được voucher", "error");
    } finally {
      setRedeeming(false);
    }
  };

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
            }}
          >
            Thử lại
          </button>
        </div>
      )}

      {/* ============ HERO: ĐIỂM HIỆN CÓ ============ */}
      <div
        style={{
          background: "linear-gradient(135deg, #2634d5, #20c779)",
          color: "#fff",
          borderRadius: 16,
          padding: 30,
          marginBottom: 20,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 20,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div>
          <span style={{ fontSize: 13, opacity: 0.9, color: "#fff" }}>
            {t("points.yourPoints")}
          </span>
          <h1
            style={{
              fontSize: 48,
              margin: "10px 0",
              fontWeight: 800,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            {loading ? (
              <Loader2
                size={36}
                style={{ animation: "spin 1s linear infinite" }}
              />
            ) : (
              points
            )}
          </h1>
          <p style={{ margin: 0, opacity: 0.9, color: "#fff" }}>
            {t("points.rate")}
          </p>
        </div>
        <div style={{ fontSize: 80 }}>🏆</div>
      </div>

      {/* ============ ĐỔI ĐIỂM ============ */}
      <div
        style={{
          background: "var(--card-bg, #fff)",
          border: "1px solid var(--border-color, #e7ebf0)",
          borderRadius: 12,
          padding: 20,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <h3
            style={{
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "var(--text-primary, #172033)",
            }}
          >
            <Gift size={20} /> {t("points.redeem")}
          </h3>

          <button
            onClick={() => load(false)}
            disabled={refreshing}
            title="Làm mới"
            aria-label="Làm mới"
            style={{
              padding: "6px 12px",
              background: "var(--bg-tertiary, #f5f7fb)",
              border: "1px solid var(--border-color, #e5e9ef)",
              borderRadius: 6,
              cursor: refreshing ? "not-allowed" : "pointer",
              fontSize: 12,
              color: "var(--text-primary, #172033)",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              opacity: refreshing ? 0.6 : 1,
            }}
          >
            {refreshing ? (
              <Loader2
                size={12}
                style={{ animation: "spin 1s linear infinite" }}
              />
            ) : (
              <RefreshCw size={12} />
            )}
            Làm mới
          </button>
        </div>

        <p style={{ color: "var(--text-muted, #64748b)", fontSize: 13, marginTop: 4 }}>
          {t("points.needMin")}
        </p>

        {/* Chọn số điểm */}
        <div
          style={{
            display: "flex",
            gap: 10,
            marginBottom: 14,
            flexWrap: "wrap",
          }}
        >
          {REDEEM_OPTIONS.map((p) => {
            const active = redeemPoints === p;
            const disabled = points < p;

            return (
              <button
                key={p}
                onClick={() => setRedeemPoints(p)}
                disabled={disabled}
                style={{
                  padding: "10px 16px",
                  background: active
                    ? "#2634d5"
                    : "var(--card-bg, #fff)",
                  color: active
                    ? "#fff"
                    : "var(--text-primary, #475569)",
                  border: active
                    ? "1px solid #2634d5"
                    : "1px solid var(--border-color, #e5e9ef)",
                  borderRadius: 8,
                  cursor: disabled ? "not-allowed" : "pointer",
                  fontWeight: 600,
                  fontSize: 13,
                  opacity: disabled ? 0.4 : 1,
                  transition: "all 0.15s",
                }}
              >
                {p} điểm
              </button>
            );
          })}
        </div>

        {/* Voucher nhận được */}
        <div
          style={{
            background: "var(--bg-tertiary, #f8fafc)",
            padding: 16,
            borderRadius: 10,
            marginBottom: 14,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ color: "var(--text-muted, #64748b)" }}>
            {t("points.voucherValue")}:
          </span>
          <b style={{ color: "#18a967", fontSize: 20 }}>
            {money(voucherValue)}
          </b>
        </div>

        {/* Nút đổi */}
        <button
          onClick={redeem}
          disabled={redeeming || !canRedeem}
          style={{
            width: "100%",
            padding: 14,
            background: canRedeem ? "#2634d5" : "#94a3b8",
            color: "#fff",
            border: 0,
            borderRadius: 10,
            fontWeight: 600,
            fontSize: 14,
            cursor: redeeming || !canRedeem ? "not-allowed" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            opacity: redeeming ? 0.7 : 1,
          }}
        >
          {redeeming ? (
            <>
              <Loader2
                size={16}
                style={{ animation: "spin 1s linear infinite" }}
              />
              Đang xử lý...
            </>
          ) : (
            <>
              <Gift size={16} /> {t("points.redeemNow")} {redeemPoints} điểm
            </>
          )}
        </button>
      </div>

      {/* ============ LỊCH SỬ ============ */}
      <div
        style={{
          background: "var(--card-bg, #fff)",
          border: "1px solid var(--border-color, #e7ebf0)",
          borderRadius: 12,
          padding: 20,
        }}
      >
        <h3
          style={{
            marginTop: 0,
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: "var(--text-primary, #172033)",
          }}
        >
          <History size={20} /> {t("points.history")}
        </h3>

        {/* Loading */}
        {loading && (
          <div
            style={{
              textAlign: "center",
              padding: 30,
              color: "var(--text-light, #8993a3)",
            }}
          >
            <Loader2
              size={22}
              style={{ animation: "spin 1s linear infinite", marginBottom: 8 }}
            />
            <div style={{ fontSize: 13 }}>Đang tải lịch sử...</div>
          </div>
        )}

        {/* Data */}
        {!loading && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--bg-tertiary, #f5f7fb)" }}>
                  <th style={thLeft}>{t("orders.code")}</th>
                  <th style={thLeft}>{t("common.date")}</th>
                  <th style={thLeft}>{t("cart.total")}</th>
                  <th style={thRight}>{t("points.title")}</th>
                </tr>
              </thead>
              <tbody>
                {(data.history || []).map((h, i) => {
                  const isRedeem = h.type === "redeem";
                  const pointsChange = Number(h.points) || 0;
                  const hasSign = pointsChange !== 0;

                  return (
                    <tr
                      key={h.id || i}
                      style={{
                        borderBottom:
                          "1px solid var(--border-color, #eef2f7)",
                      }}
                    >
                      <td style={tdBase}>
                        <b>{h.code || "—"}</b>
                        {isRedeem && (
                          <span
                            style={{
                              marginLeft: 8,
                              fontSize: 10,
                              padding: "2px 8px",
                              borderRadius: 10,
                              background: "#fef3c7",
                              color: "#92400e",
                              fontWeight: 700,
                            }}
                          >
                            Đổi voucher
                          </span>
                        )}
                      </td>
                      <td
                        style={{
                          ...tdBase,
                          fontSize: 12,
                          color: "var(--text-muted, #64748b)",
                        }}
                      >
                        {h.date
                          ? new Date(h.date).toLocaleDateString("vi-VN")
                          : "—"}
                      </td>
                      <td
                        style={{
                          ...tdBase,
                          color: "var(--text-muted, #64748b)",
                        }}
                      >
                        {isRedeem ? (
                          <span style={{ fontSize: 11, color: "#92400e" }}>
                            Voucher {money(h.total || 0)}
                          </span>
                        ) : (
                          money(h.total || 0)
                        )}
                      </td>
                      <td style={{ ...tdBase, textAlign: "right" }}>
                        <b
                          style={{
                            color: isRedeem ? "#ef4444" : "#18a967",
                            fontWeight: 800,
                          }}
                        >
                          {hasSign && pointsChange > 0 ? "+" : ""}
                          {pointsChange}
                        </b>
                      </td>
                    </tr>
                  );
                })}

                {!data.history?.length && (
                  <tr>
                    <td
                      colSpan="4"
                      style={{
                        textAlign: "center",
                        padding: 40,
                        color: "var(--text-light, #8993a3)",
                      }}
                    >
                      <History
                        size={36}
                        style={{ opacity: 0.3, marginBottom: 8 }}
                      />
                      <div style={{ fontSize: 13 }}>
                        {t("points.noHistory")}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// ============================================================
// STYLE CONSTANTS
// ============================================================

const thBase = {
  padding: 11,
  fontSize: 12,
  color: "var(--text-muted, #64748b)",
  fontWeight: 600,
  whiteSpace: "nowrap",
};
const thLeft = { ...thBase, textAlign: "left" };
const thRight = { ...thBase, textAlign: "right" };

const tdBase = {
  padding: 11,
  fontSize: 13,
  color: "var(--text-primary, #172033)",
};