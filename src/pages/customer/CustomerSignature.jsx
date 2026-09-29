// ============================================================
// CUSTOMERSIGNATURE.JSX — Món Signature / Best sellers
// ============================================================
// Hiển thị 6 món bán chạy nhất (fallback khi backend chưa hỗ trợ
// endpoint "signature" riêng).
//
// Fixes (so với bản gốc):
//   - Guard Array.isArray trước khi .slice()
//   - Error state + retry (không silent fail)
//   - Loading state với spinner
//   - Empty state khi không có món
//   - Image fallback SVG
//   - loading="lazy" cho ảnh
//   - ✅ FIX CRITICAL: Chỉ lấy món đang bán (active=1)
//     Backend giờ trả hết → FE filter.
// ============================================================

import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Star, ArrowRight, Loader2, AlertCircle, RefreshCw, UtensilsCrossed,
} from "lucide-react";
import { api } from "../../api";
import { money } from "../../components/UI";

// ============================================================
// CONSTANTS
// ============================================================

const SIGNATURE_LIMIT = 6;

const FALLBACK_IMG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>
      <rect fill='#f5f7fb' width='100' height='100'/>
      <text x='50' y='58' font-size='40' text-anchor='middle'>🍽️</text>
    </svg>`
  );

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function CustomerSignature() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await api.menu.list("", "Tất cả", "popular");
      const list = Array.isArray(data) ? data : [];
      // ✅ FIX CRITICAL: Chỉ món đang bán
      const activeList = list.filter((m) => m.active);
      setItems(activeList.slice(0, SIGNATURE_LIMIT));
    } catch (e) {
      setError(e.message || "Không tải được danh sách món");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div>
      {/* ============ HEADER ============ */}
      <div
        style={{
          background: "var(--card-bg, #fff)",
          border: "1px solid var(--border-color, #e7ebf0)",
          borderRadius: 12,
          padding: 20,
          marginBottom: 20,
        }}
      >
        <h3
          style={{
            marginTop: 0,
            color: "var(--text-primary, #172033)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Star size={20} fill="#f59e0b" color="#f59e0b" /> Món Signature của
          Canteen
        </h3>
        <p
          style={{
            color: "var(--text-muted, #64748b)",
            fontSize: 13,
            margin: 0,
          }}
        >
          Những món ăn được yêu thích nhất — được chọn lọc từ thực đơn Canteen
          VWA.
        </p>
      </div>

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
            onClick={load}
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

      {/* ============ LOADING ============ */}
      {loading && (
        <div
          style={{
            textAlign: "center",
            padding: 60,
            color: "var(--text-light, #8993a3)",
            background: "var(--card-bg, #fff)",
            border: "1px solid var(--border-color, #e7ebf0)",
            borderRadius: 14,
          }}
        >
          <Loader2
            size={28}
            style={{ animation: "spin 1s linear infinite", marginBottom: 10 }}
          />
          <div style={{ fontSize: 13 }}>Đang tải món signature...</div>
        </div>
      )}

      {/* ============ EMPTY ============ */}
      {!loading && !error && items.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: 60,
            color: "var(--text-light, #8993a3)",
            background: "var(--card-bg, #fff)",
            border: "1px solid var(--border-color, #e7ebf0)",
            borderRadius: 14,
          }}
        >
          <UtensilsCrossed
            size={40}
            style={{ opacity: 0.3, marginBottom: 10 }}
          />
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
            Chưa có món signature nào
          </div>
          <div style={{ fontSize: 12 }}>
            Xem toàn bộ thực đơn để chọn món yêu thích.
          </div>
        </div>
      )}

      {/* ============ GRID ============ */}
      {!loading && !error && items.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 18,
          }}
        >
          {items.map((m) => (
            <Link
              key={m.id || m._id}
              to="/customer/menu"
              className="food-card-clickable"
              style={{
                background: "var(--card-bg, #fff)",
                border: "1px solid var(--border-color, #e5e9ef)",
                borderRadius: 14,
                overflow: "hidden",
                textDecoration: "none",
                color: "inherit",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <img
                src={m.image || FALLBACK_IMG}
                alt={m.name}
                loading="lazy"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = FALLBACK_IMG;
                }}
                style={{
                  width: "100%",
                  height: 160,
                  objectFit: "cover",
                  display: "block",
                }}
              />
              <div style={{ padding: 14 }}>
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--text-light, #8993a3)",
                    textTransform: "uppercase",
                    letterSpacing: 0.4,
                  }}
                >
                  {m.category || "—"}
                </span>
                <h4
                  style={{
                    margin: "6px 0",
                    fontSize: 15,
                    color: "var(--text-primary, #172033)",
                    fontWeight: 700,
                    lineHeight: 1.3,
                  }}
                >
                  {m.name || "Không tên"}
                </h4>
                <b style={{ color: "#18a967", fontSize: 15 }}>
                  {money(m.price)}
                </b>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* ============ CTA ============ */}
      <div style={{ textAlign: "center", marginTop: 24 }}>
        <Link
          to="/customer/menu"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "10px 20px",
            background: "#2634d5",
            color: "#fff",
            borderRadius: 10,
            textDecoration: "none",
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          Xem toàn bộ thực đơn <ArrowRight size={16} />
        </Link>
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