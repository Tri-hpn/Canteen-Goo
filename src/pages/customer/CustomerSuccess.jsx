// ============================================================
// CUSTOMERSUCCESS.JSX — Trang đặt hàng thành công
// ============================================================
// Nhận `state.order` từ navigate() sau khi đặt hàng ở Checkout.
//
// Fixes (so với bản gốc):
//   - Handle state null (F5 / vào trực tiếp) → empty state thay vì
//     hiển thị "VWA-XXXX" + "0đ" gây confuse
//   - Thêm CTA "Đặt món tiếp" bên cạnh "Theo dõi đơn hàng"
//   - Hướng dẫn tiếp theo (thời gian xử lý)
//   - aria-live để screen reader announce
//   - Fallback code/total an toàn
// ============================================================

import { useLocation, Link } from "react-router-dom";
import {
  CheckCircle2, ShoppingBag, Package, Clock, Home,
} from "lucide-react";
import { money } from "../../components/UI";

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function CustomerSuccess() {
  const { state } = useLocation();
  const order = state?.order;

  // Fallback khi user F5 hoặc vào trực tiếp URL
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
          Không có thông tin đơn hàng
        </h2>
        <p
          style={{
            margin: 0,
            color: "var(--text-muted, #64748b)",
            fontSize: 14,
            maxWidth: 400,
          }}
        >
          Trang này chỉ hiển thị sau khi bạn đặt hàng thành công. Vui lòng kiểm
          tra trong danh sách đơn hàng.
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
            <Package size={15} /> Xem đơn hàng
          </Link>
          <Link to="/customer/menu" style={secondaryBtnStyle}>
            <ShoppingBag size={15} /> Đặt món
          </Link>
        </div>
      </div>
    );
  }

  // ============================================================
  // SUCCESS STATE
  // ============================================================

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
      {/* Icon check xanh */}
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
        Đặt hàng thành công!
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
        Cảm ơn bạn đã đặt món tại Canteen VWA. Đơn hàng của bạn đang được xử lý.
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
        <span style={{ color: "var(--text-muted, #64748b)" }}>Mã đơn:</span>
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
          Tổng tiền
        </span>
        <strong style={{ color: "#2634d5", fontSize: 22, fontWeight: 800 }}>
          {money(order.total || 0)}
        </strong>
      </div>

      {/* Hướng dẫn tiếp theo */}
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
          Đơn sẽ được chuẩn bị trong <b style={{ color: "#18a967" }}>5-10 phút</b>
          {" "}· Vui lòng đến quầy nhận đúng giờ
        </span>
      </div>

      {/* CTA buttons */}
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
          <Package size={15} /> Theo dõi đơn hàng
        </Link>
        <Link to="/customer/menu" style={secondaryBtnStyle}>
          <ShoppingBag size={15} /> Đặt món tiếp
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