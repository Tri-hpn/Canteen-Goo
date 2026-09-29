// ============================================================
// CUSTOMERSUCCESS.JSX — Trang đặt hàng thành công
// ============================================================

import { useLocation, Link } from "react-router-dom";
import {
  CheckCircle2, ShoppingBag, Package, Clock, Home,
} from "lucide-react";
import { money } from "../../components/UI";
import { useTranslation } from "../../i18n";

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function CustomerSuccess() {
  const { state } = useLocation();
  const order = state?.order;
  const { t } = useTranslation();

  // Fallback
  if (!order) {
    return (
      <div
        className="empty-state"
        role="status"
        style={{
          background: "var(--card-bg, #fff)",
          border: "1px solid var(--border-color, #e7ebf0)",
          borderRadius: 14,
          padding: 60,
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 14,
        }}
      >
        <Package
          size={56}
          style={{ color: "var(--text-light, #8993a3)", opacity: 0.4 }}
        />
        <h2
          style={{
            margin: 0,
            color: "var(--text-primary, #172033)",
            fontSize: 20,
          }}
        >
          {t("success.noOrderTitle")}
        </h2>
        <p
          style={{
            margin: 0,
            color: "var(--text-muted, #64748b)",
            fontSize: 14,
            maxWidth: 400,
          }}
        >
          {t("success.noOrderDesc")}
        </p>
        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            justifyContent: "center",
            marginTop: 8,
          }}
        >
          <Link to="/customer/orders" style={primaryBtnStyle}>
            <Package size={15} /> {t("success.viewOrders")}
          </Link>
          <Link to="/customer/menu" style={secondaryBtnStyle}>
            <ShoppingBag size={15} /> {t("success.orderMore")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="success-state"
      role="status"
      aria-live="polite"
      style={{
        background: "var(--card-bg, #fff)",
        border: "1px solid var(--border-color, #e7ebf0)",
        borderRadius: 14,
        padding: "48px 32px",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 14,
      }}
    >
      <div
        className="success-icon"
        style={{
          width: 100,
          height: 100,
          borderRadius: "50%",
          background:
            "linear-gradient(135deg, rgba(24, 169, 103, 0.15), rgba(24, 169, 103, 0.08))",
          display: "grid",
          placeItems: "center",
          color: "#18a967",
          marginBottom: 8,
        }}
      >
        <CheckCircle2 size={55} />
      </div>

      <h2
        style={{
          margin: 0,
          color: "var(--text-primary, #172033)",
          fontSize: 24,
        }}
      >
        {t("success.title")}
      </h2>

      <p
        style={{
          margin: 0,
          color: "var(--text-muted, #64748b)",
          fontSize: 14,
          maxWidth: 460,
          lineHeight: 1.6,
        }}
      >
        {t("success.desc")}
      </p>

      {/* Mã đơn */}
      <div
        style={{
          background: "var(--bg-tertiary, #f5f7fb)",
          border: "1px dashed var(--border-color, #cbd5e1)",
          borderRadius: 10,
          padding: "12px 20px",
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          fontSize: 14,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <span style={{ color: "var(--text-muted, #64748b)" }}>
          {t("orders.code")}:
        </span>
        <b
          style={{
            color: "#2634d5",
            fontFamily: "monospace",
            fontSize: 16,
            letterSpacing: 0.5,
          }}
        >
          {order.code || "—"}
        </b>
      </div>

      {/* Tổng tiền */}
      <div
        className="success-box"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 40,
          padding: "14px 24px",
          background:
            "linear-gradient(135deg, rgba(38, 52, 213, 0.06), rgba(32, 199, 121, 0.06))",
          borderRadius: 12,
          border: "1px solid rgba(38, 52, 213, 0.15)",
          minWidth: 260,
        }}
      >
        <span style={{ color: "var(--text-muted, #64748b)", fontSize: 13 }}>
          {t("cart.total")}
        </span>
        <strong style={{ color: "#2634d5", fontSize: 22, fontWeight: 800 }}>
          {money(order.total || 0)}
        </strong>
      </div>

      {/* Hướng dẫn */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 13,
          color: "var(--text-muted, #64748b)",
          marginTop: 4,
        }}
      >
        <Clock size={14} />
        <span>
          {t("success.prepareHint")}{" "}
          <b style={{ color: "#18a967" }}>{t("success.prepareTime")}</b>
          {" "}· {t("success.pickupHint")}
        </span>
      </div>

      {/* CTA */}
      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          justifyContent: "center",
          marginTop: 8,
        }}
      >
        <Link to="/customer/orders" style={primaryBtnStyle}>
          <Package size={15} /> {t("success.trackOrder")}
        </Link>
        <Link to="/customer/menu" style={secondaryBtnStyle}>
          <ShoppingBag size={15} /> {t("success.orderMore")}
        </Link>
      </div>
    </div>
  );
}

// ============================================================
// STYLE CONSTANTS
// ============================================================

const primaryBtnStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "11px 20px",
  background: "#2634d5",
  color: "#fff",
  border: 0,
  borderRadius: 10,
  textDecoration: "none",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
};

const secondaryBtnStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "11px 20px",
  background: "var(--card-bg, #fff)",
  color: "var(--text-primary, #172033)",
  border: "1px solid var(--border-color, #e5e9ef)",
  borderRadius: 10,
  textDecoration: "none",
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
};