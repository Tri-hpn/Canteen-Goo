// ============================================================
// CUSTOMERORDERDETAIL.JSX — Modal chi tiết đơn hàng (Customer)
// ============================================================
// Tính năng:
//   - Progress bar 5 bước
//   - Info: thời gian, trạng thái, thanh toán
//   - Danh sách items + tổng tiền + ghi chú
//   - Action: "Đã nhận món", "Hủy đơn"
//   - Form đánh giá (rating + comment) cho đơn Hoàn thành
//   - Xem lại đánh giá đã gửi
//
// Fixes (so với bản gốc):
//   - Bỏ localStorage.getItem() khỏi JSX (dùng state)
//   - Fix useEffect deps: dùng initialOrder.code thay vì object
//   - Guard double-submit trong submitReview
//   - Tách loading cho received / cancel
//   - ESC đóng modal + role/aria
//   - z-index chuẩn 2147483600
//   - Guard order.created_at undefined
//   - Constant POINTS_PER_REVIEW
//   - Không đóng modal khi click overlay nếu đang gõ form
//   - Error state cho review check
//   - ✅ Thay confirm() native bằng ConfirmDialog custom (2 chỗ)
// ============================================================

import { useState, useEffect, useRef, useCallback } from "react";
import {
  X, Package, Clock, CheckCircle2, ChefHat, Truck, Star,
  Send, Loader2, AlertCircle,
} from "lucide-react";
import { api } from "../api";
import { money } from "./UI";
import { toast } from "./Effects";
import ConfirmDialog from "./ConfirmDialog";

// ============================================================
// CONSTANTS
// ============================================================

const MODAL_Z = 2147483600;
const POINTS_PER_REVIEW = 10;
const MAX_COMMENT_LENGTH = 500;

const STATUS_FLOW = {
  "Chờ xác nhận": { step: 1, label: "Chờ xác nhận", color: "#f59e0b" },
  "Đã xác nhận": { step: 2, label: "Đã xác nhận", color: "#2634d5" },
  "Đang chuẩn bị": { step: 3, label: "Đang chuẩn bị", color: "#8b5cf6" },
  "Sẵn sàng nhận": { step: 4, label: "Sẵn sàng nhận", color: "#18a967" },
  "Hoàn thành": { step: 5, label: "Hoàn thành", color: "#18a967" },
  "Đã hủy": { step: 0, label: "Đã hủy", color: "#ef4444" },
};

const ALL_STEPS = [
  { step: 1, label: "Chờ xác nhận", icon: Clock },
  { step: 2, label: "Đã xác nhận", icon: CheckCircle2 },
  { step: 3, label: "Đang chuẩn bị", icon: ChefHat },
  { step: 4, label: "Sẵn sàng nhận", icon: Truck },
  { step: 5, label: "Hoàn thành", icon: CheckCircle2 },
];

// ============================================================
// HELPERS
// ============================================================

function fmtDateTime(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString("vi-VN");
  } catch {
    return "—";
  }
}

function getOrderId(order) {
  return order?._id || order?.id || null;
}

function getReviewedKey(code) {
  return `reviewed_order_${code}`;
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function CustomerOrderDetail({
  order: initialOrder,
  user,
  onClose,
  onUpdate,
}) {
  const [order, setOrder] = useState(initialOrder);
  const [loading, setLoading] = useState(false);

  // ---------- Review state ----------
  const [showReview, setShowReview] = useState(false);
  const [showMyReviews, setShowMyReviews] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [myReviews, setMyReviews] = useState([]);

  // ---------- Check state ----------
  const [checking, setChecking] = useState(true);
  const [checkError, setCheckError] = useState("");

  // ---------- Action loading (tách riêng) ----------
  const [receiving, setReceiving] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // ---------- ✅ Confirm dialog state ----------
  // null | "received" | "cancel"
  const [confirmAction, setConfirmAction] = useState(null);

  // ---------- Refs ----------
  const lastCodeRef = useRef(null);
  const submittingRef = useRef(false);

  // ---------- Sync order khi prop đổi ----------
  useEffect(() => {
    setOrder(initialOrder);
  }, [initialOrder]);

  // ---------- Check đã đánh giá chưa ----------
  useEffect(() => {
    const code = initialOrder?.code;
    if (!code) return;
    if (lastCodeRef.current === code) return;

    lastCodeRef.current = code;
    setChecking(true);
    setCheckError("");

    const localReviewed = (() => {
      try {
        return localStorage.getItem(getReviewedKey(code));
      } catch {
        return null;
      }
    })();

    const itemIds = (initialOrder.items || [])
      .map((it) => it.menu_item_id)
      .filter(Boolean);

    api.reviews
      .me()
      .then((list) => {
        const mine = (list || []).filter((r) =>
          itemIds.includes(r.menu_item_id)
        );
        setMyReviews(mine);

        const apiReviewed =
          itemIds.length > 0 && mine.length >= itemIds.length;

        if (localReviewed || apiReviewed) {
          setReviewed(true);
          setReviewedCount(mine.length || itemIds.length);
        } else {
          setReviewed(false);
          setReviewedCount(0);
        }
      })
      .catch((e) => {
        setMyReviews([]);
        setCheckError(e.message || "");
        if (localReviewed) setReviewed(true);
      })
      .finally(() => setChecking(false));
  }, [initialOrder]);

  // ---------- ESC đóng modal ----------
  useEffect(() => {
    const handler = (e) => {
      if (e.key !== "Escape") return;
      if (submitting || receiving || cancelling) return;
      onClose?.();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, submitting, receiving, cancelling]);

  // ---------- Early return ----------
  if (!order) return null;

  const current = STATUS_FLOW[order.status] || STATUS_FLOW["Chờ xác nhận"];
  const isCancelled = order.status === "Đã hủy";
  const isCompleted = order.status === "Hoàn thành";

  const orderId = getOrderId(order);
  const items = order.items || [];
  const itemsCount = items.length;
  const earnPoints = itemsCount * POINTS_PER_REVIEW;

  // ---------- Handlers ----------

  /**
   * ✅ Mở confirm dialog thay vì gọi confirm() native.
   */
  const handleReceived = () => {
    if (receiving) return;
    setConfirmAction("received");
  };

  const handleCancel = () => {
    if (cancelling) return;
    setConfirmAction("cancel");
  };

  /**
   * ✅ Thực thi hành động sau khi user xác nhận trong dialog.
   */
  const executeConfirm = useCallback(async () => {
    if (!confirmAction) return;

    if (confirmAction === "received") {
      setReceiving(true);
      try {
        await api.orders.received(orderId);
        toast("Đã nhận món! Cảm ơn bạn!", "success");
        setConfirmAction(null);
        onUpdate?.();
        onClose?.();
      } catch (e) {
        toast(e.message || "Không xác nhận được", "error");
      } finally {
        setReceiving(false);
      }
      return;
    }

    if (confirmAction === "cancel") {
      setCancelling(true);
      try {
        await api.orders.cancel(orderId);
        toast("Đã hủy đơn", "success");
        setConfirmAction(null);
        onUpdate?.();
        onClose?.();
      } catch (e) {
        toast(e.message || "Không hủy được", "error");
      } finally {
        setCancelling(false);
      }
      return;
    }
  }, [confirmAction, orderId, onUpdate, onClose]);

  const openReview = () => {
    if (!itemsCount) {
      toast("Đơn hàng không có món để đánh giá", "error");
      return;
    }
    setRating(5);
    setComment("");
    setShowReview(true);
    setShowMyReviews(false);
  };

  const openMyReviews = () => {
    setShowMyReviews(true);
    setShowReview(false);
  };

  const submitReview = async () => {
    if (submittingRef.current) return;
    if (!itemsCount) return;

    submittingRef.current = true;
    setSubmitting(true);

    let success = 0;
    const trimmedComment = comment.trim().slice(0, MAX_COMMENT_LENGTH);

    for (const it of items) {
      if (!it.menu_item_id) continue;
      try {
        await api.reviews.create({
          menuItemId: it.menu_item_id,
          rating,
          comment: trimmedComment,
        });
        success++;
      } catch {
        // Skip món đã đánh giá
      }
    }

    setSubmitting(false);
    submittingRef.current = false;

    if (success > 0) {
      setReviewedCount(success);
      setReviewed(true);
      setShowReview(false);

      try {
        localStorage.setItem(
          getReviewedKey(order.code),
          Date.now().toString()
        );
      } catch {}

      // Reload my reviews
      api.reviews
        .me()
        .then((list) => {
          const itemIds = items.map((it) => it.menu_item_id).filter(Boolean);
          setMyReviews(
            (list || []).filter((r) => itemIds.includes(r.menu_item_id))
          );
        })
        .catch(() => {});

      try {
        window.dispatchEvent(new CustomEvent("refresh-user"));
        window.dispatchEvent(new CustomEvent("order-reviewed"));
      } catch {}

      onUpdate?.();
      toast(`Đã gửi ${success} đánh giá! +${success * POINTS_PER_REVIEW} điểm`, "success");
    } else {
      toast(
        "Không thể gửi đánh giá. Có thể các món đã được đánh giá rồi.",
        "error"
      );
    }
  };

  // ---------- Overlay click ----------
  const handleOverlayClick = () => {
    // Không đóng khi đang gõ form đánh giá
    if (showReview && comment.trim()) return;
    // Không đóng khi đang submit
    if (submitting || receiving || cancelling) return;
    onClose?.();
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <>
      <div
        onClick={handleOverlayClick}
        role="dialog"
        aria-modal="true"
        aria-label={`Chi tiết đơn hàng ${order.code}`}
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
            maxWidth: 560,
            maxHeight: "90vh",
            overflowY: "auto",
          }}
        >
          {/* ============================================================
              VIEW MY REVIEWS
              ============================================================ */}
          {showMyReviews ? (
            <MyReviewsView
              order={order}
              myReviews={myReviews}
              onClose={() => setShowMyReviews(false)}
            />
          ) : (
            <>
              {/* ============ HEADER ============ */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 20,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: "linear-gradient(135deg,#2634d5,#20c779)",
                      color: "#fff",
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Package size={20} />
                  </div>
                  <div>
                    <h3
                      style={{
                        margin: 0,
                        color: "var(--text-primary, #172033)",
                      }}
                    >
                      Đơn hàng
                    </h3>
                    <b style={{ fontSize: 13, color: "#2634d5" }}>
                      {order.code}
                    </b>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  aria-label="Đóng"
                  type="button"
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

              {/* ============ PROGRESS ============ */}
              {!isCancelled && (
                <div
                  style={{
                    background: "var(--bg-tertiary, #f5f7fb)",
                    borderRadius: 12,
                    padding: 20,
                    marginBottom: 20,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      position: "relative",
                    }}
                  >
                    {ALL_STEPS.map((s, i) => {
                      const active = current.step >= s.step;
                      const Icon = s.icon;
                      return (
                        <div
                          key={s.step}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            flex: 1,
                            position: "relative",
                          }}
                        >
                          {i < ALL_STEPS.length - 1 && (
                            <div
                              style={{
                                position: "absolute",
                                top: 18,
                                left: "50%",
                                right: "-50%",
                                height: 2,
                                background:
                                  current.step > s.step
                                    ? "#18a967"
                                    : "var(--border-color, #e5e9ef)",
                                zIndex: 0,
                              }}
                            />
                          )}
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: "50%",
                              background: active
                                ? "#18a967"
                                : "var(--card-bg, #fff)",
                              color: active
                                ? "#fff"
                                : "var(--text-light, #94a3b8)",
                              border:
                                "2px solid " +
                                (active
                                  ? "#18a967"
                                  : "var(--border-color, #e5e9ef)"),
                              display: "grid",
                              placeItems: "center",
                              position: "relative",
                              zIndex: 1,
                            }}
                          >
                            <Icon size={16} />
                          </div>
                          <span
                            style={{
                              fontSize: 10,
                              marginTop: 6,
                              textAlign: "center",
                              color: active
                                ? "var(--text-primary, #172033)"
                                : "var(--text-light, #94a3b8)",
                              fontWeight: active ? 700 : 500,
                            }}
                          >
                            {s.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ============ CANCELLED ============ */}
              {isCancelled && (
                <div
                  style={{
                    background: "#fee2e2",
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 20,
                    textAlign: "center",
                  }}
                >
                  <X
                    size={32}
                    color="#ef4444"
                    style={{ margin: "0 auto 8px" }}
                  />
                  <b style={{ color: "#991b1b", fontSize: 15 }}>
                    Đơn hàng đã bị hủy
                  </b>
                </div>
              )}

              {/* ============ INFO ============ */}
              <div style={{ marginBottom: 16 }}>
                <InfoRow
                  label="Thời gian đặt"
                  value={fmtDateTime(order.created_at)}
                />
                <InfoRow
                  label="Trạng thái"
                  value={
                    <span
                      style={{
                        padding: "3px 10px",
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 700,
                        background: current.color + "20",
                        color: current.color,
                      }}
                    >
                      {current.label}
                    </span>
                  }
                />
                <InfoRow
                  label="Thanh toán"
                  value={order.payment || "Tiền mặt"}
                  last
                />
              </div>

              {/* ============ ITEMS ============ */}
              <h4
                style={{
                  margin: "16px 0 12px",
                  color: "var(--text-primary, #172033)",
                  fontSize: 14,
                }}
              >
                Món đã đặt
              </h4>
              <div
                style={{
                  background: "var(--bg-tertiary, #f8fafc)",
                  borderRadius: 10,
                  padding: 12,
                  marginBottom: 16,
                }}
              >
                {items.map((it, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "8px 0",
                      borderBottom:
                        i < items.length - 1
                          ? "1px solid var(--border-color, #eef2f7)"
                          : "none",
                      fontSize: 13,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
  <div style={{ color: "var(--text-primary, #172033)" }}>
    <b>{it.qty}×</b> {it.name}
  </div>

  {it.size && (
    <div style={{ marginTop: 4, color: "var(--text-muted, #64748b)", fontSize: 12 }}>
      Size: {it.size.name}
      {Number(it.size.extra_price || 0) > 0 && ` (+${money(Number(it.size.extra_price))})`}
    </div>
  )}

  {Array.isArray(it.toppings) && it.toppings.length > 0 && (
    <div style={{ marginTop: 4, color: "var(--text-muted, #64748b)", fontSize: 12 }}>
      <div>Topping:</div>
      {it.toppings.map((topping, toppingIndex) => (
        <div key={topping.id ?? toppingIndex} style={{ paddingLeft: 8 }}>
          • {topping.name}
          {Number(topping.price || 0) > 0 && ` (+${money(Number(topping.price))})`}
        </div>
      ))}
    </div>
  )}
</div>
                    <b style={{ color: "var(--text-muted, #64748b)" }}>
                      {money(Number(it.price || 0) * Number(it.qty || 0))}
                    </b>
                  </div>
                ))}
              </div>

              {/* ============ TOTAL ============ */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "12px 0",
                  borderTop: "2px solid var(--border-color, #eef2f7)",
                }}
              >
                <b style={{ color: "var(--text-primary, #172033)" }}>
                  Tổng cộng
                </b>
                <strong style={{ color: "#2634d5", fontSize: 20 }}>
                  {money(order.total || 0)}
                </strong>
              </div>

              {/* ============ NOTE ============ */}
              {order.note && (
                <div
                  style={{
                    marginTop: 12,
                    padding: 12,
                    background: "var(--bg-tertiary, #f8fafc)",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "var(--text-muted, #64748b)",
                  }}
                >
                  <b style={{ color: "var(--text-primary, #172033)" }}>
                    Ghi chú:
                  </b>{" "}
                  {order.note}
                </div>
              )}

              {/* ============ REVIEW FORM ============ */}
              {showReview && (
                <div
                  style={{
                    marginTop: 16,
                    padding: 16,
                    background: "var(--bg-tertiary, #f8fafc)",
                    borderRadius: 12,
                    border: "1px solid var(--border-color, #e5e9ef)",
                  }}
                >
                  <h4
                    style={{
                      margin: "0 0 12px",
                      color: "var(--text-primary, #172033)",
                      fontSize: 14,
                    }}
                  >
                    ⭐ Đánh giá đơn hàng
                  </h4>

                  <div
                    style={{
                      marginBottom: 14,
                      padding: "10px 12px",
                      background: "rgba(38, 52, 213, 0.08)",
                      border: "1px solid rgba(38, 52, 213, 0.2)",
                      borderRadius: 8,
                      fontSize: 12,
                      color: "#2634d5",
                      fontWeight: 600,
                    }}
                  >
                    💡 Đánh giá sẽ áp dụng cho tất cả <b>{itemsCount} món</b>{" "}
                    trong đơn
                  </div>

                  <label style={labelStyle}>Số sao</label>
                  <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        onClick={() => setRating(s)}
                        type="button"
                        aria-label={`${s} sao`}
                        style={{
                          background: "transparent",
                          border: 0,
                          cursor: "pointer",
                          padding: 2,
                        }}
                      >
                        <Star
                          size={28}
                          fill={s <= rating ? "#f59e0b" : "none"}
                          color={s <= rating ? "#f59e0b" : "#cbd5e1"}
                        />
                      </button>
                    ))}
                  </div>

                  <label style={labelStyle}>
                    Cảm nhận của bạn{" "}
                    <span
                      style={{ fontWeight: 400, color: "var(--text-light, #94a3b8)" }}
                    >
                      (không bắt buộc)
                    </span>
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="VD: Món ngon, giao nhanh... (có thể bỏ trống)"
                    maxLength={MAX_COMMENT_LENGTH}
                    disabled={submitting}
                    style={{
                      width: "100%",
                      padding: 10,
                      border: "1px solid var(--border-color, #e5e9ef)",
                      borderRadius: 8,
                      minHeight: 70,
                      outline: "none",
                      resize: "vertical",
                      background: "var(--card-bg, #fff)",
                      color: "var(--text-primary, #172033)",
                      fontSize: 13,
                      boxSizing: "border-box",
                    }}
                  />

                  <button
                    onClick={submitReview}
                    disabled={submitting}
                    type="button"
                    style={{
                      marginTop: 12,
                      width: "100%",
                      padding: 12,
                      background: submitting ? "#94a3b8" : "#2634d5",
                      color: "#fff",
                      border: 0,
                      borderRadius: 8,
                      fontWeight: 700,
                      cursor: submitting ? "not-allowed" : "pointer",
                      fontSize: 13,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                  >
                    {submitting ? (
                      <>
                        <Loader2
                          size={14}
                          style={{ animation: "spin 1s linear infinite" }}
                        />
                        Đang gửi...
                      </>
                    ) : (
                      <>
                        <Send size={14} /> Gửi đánh giá (+{earnPoints} điểm)
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* ============ ACTIONS ============ */}
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  marginTop: 20,
                  flexDirection: "column",
                }}
              >
                {/* Đã nhận món */}
                {order.status === "Sẵn sàng nhận" && (
                  <button
                    onClick={handleReceived}
                    disabled={receiving || cancelling}
                    type="button"
                    style={{
                      padding: 12,
                      background: "#18a967",
                      color: "#fff",
                      border: 0,
                      borderRadius: 8,
                      fontWeight: 600,
                      cursor: receiving ? "not-allowed" : "pointer",
                      opacity: receiving ? 0.7 : 1,
                    }}
                  >
                    {receiving ? (
                      <>
                        <Loader2
                          size={14}
                          style={{ animation: "spin 1s linear infinite" }}
                        />{" "}
                        Đang xử lý...
                      </>
                    ) : (
                      "✅ Tôi đã nhận món"
                    )}
                  </button>
                )}

                {/* Hủy đơn */}
                {order.status === "Chờ xác nhận" && (
                  <button
                    onClick={handleCancel}
                    disabled={cancelling || receiving}
                    type="button"
                    style={{
                      padding: 12,
                      background: "var(--card-bg, #fff)",
                      color: "#ef4444",
                      border: "1px solid #ef4444",
                      borderRadius: 8,
                      fontWeight: 600,
                      cursor: cancelling ? "not-allowed" : "pointer",
                      opacity: cancelling ? 0.7 : 1,
                    }}
                  >
                    {cancelling ? (
                      <>
                        <Loader2
                          size={14}
                          style={{ animation: "spin 1s linear infinite" }}
                        />{" "}
                        Đang xử lý...
                      </>
                    ) : (
                      "Hủy đơn"
                    )}
                  </button>
                )}

                {/* Đánh giá (chưa đánh giá) */}
                {isCompleted &&
                  !showReview &&
                  !reviewed &&
                  !checking &&
                  !checkError && (
                    <button
                      onClick={openReview}
                      type="button"
                      style={{
                        padding: 12,
                        background: "#f59e0b",
                        color: "#fff",
                        border: 0,
                        borderRadius: 8,
                        fontWeight: 700,
                        cursor: "pointer",
                        fontSize: 13,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                      }}
                    >
                      <Star size={16} fill="#fff" /> Đánh giá đơn hàng (+
                      {earnPoints} điểm)
                    </button>
                  )}

                {/* Xem lại đánh giá */}
                {isCompleted && reviewed && !showMyReviews && (
                  <button
                    onClick={openMyReviews}
                    type="button"
                    style={{
                      padding: 12,
                      background: "rgba(24, 169, 103, 0.15)",
                      color: "#18a967",
                      border: "1px solid #18a967",
                      borderRadius: 8,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontSize: 13,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                  >
                    <CheckCircle2 size={16} /> Đã đánh giá — Xem lại
                  </button>
                )}

                {/* Đóng */}
                <button
                  onClick={onClose}
                  disabled={submitting || receiving || cancelling}
                  type="button"
                  style={{
                    padding: 12,
                    background: "var(--card-bg, #fff)",
                    color: "var(--text-primary, #172033)",
                    border: "1px solid var(--border-color, #e5e9ef)",
                    borderRadius: 8,
                    fontWeight: 600,
                    cursor:
                      submitting || receiving || cancelling
                        ? "not-allowed"
                        : "pointer",
                    opacity: submitting || receiving || cancelling ? 0.6 : 1,
                  }}
                >
                  Đóng
                </button>
              </div>
            </>
          )}
        </div>

        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
          }
        `}</style>
      </div>

      {/* ============ ✅ CONFIRM DIALOGS ============ */}
      {/* Đã nhận món */}
      <ConfirmDialog
        open={confirmAction === "received"}
        title="Xác nhận đã nhận món?"
        message={`Bạn xác nhận đã nhận đủ ${itemsCount} món trong đơn ${order.code}.`}
        confirmText="Đã nhận món"
        cancelText="Chưa nhận"
        loading={receiving}
        onConfirm={executeConfirm}
        onClose={() => !receiving && setConfirmAction(null)}
      />

      {/* Hủy đơn */}
      <ConfirmDialog
        open={confirmAction === "cancel"}
        title="Hủy đơn hàng này?"
        message={`Đơn ${order.code} sẽ bị hủy và không thể khôi phục. Bạn chắc chắn chứ?`}
        confirmText="Hủy đơn"
        cancelText="Giữ đơn"
        danger
        loading={cancelling}
        onConfirm={executeConfirm}
        onClose={() => !cancelling && setConfirmAction(null)}
      />
    </>
  );
}

// ============================================================
// SUB-COMPONENT: InfoRow
// ============================================================

function InfoRow({ label, value, last = false }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "8px 0",
        borderBottom: last
          ? "none"
          : "1px dashed var(--border-color, #eef2f7)",
        fontSize: 13,
        gap: 10,
      }}
    >
      <span style={{ color: "var(--text-muted, #64748b)" }}>{label}</span>
      <b style={{ color: "var(--text-primary, #172033)", textAlign: "right" }}>
        {value}
      </b>
    </div>
  );
}

// ============================================================
// SUB-COMPONENT: MyReviewsView
// ============================================================

function MyReviewsView({ order, myReviews, onClose }) {
  const items = order.items || [];
  const totalPoints = myReviews.length * POINTS_PER_REVIEW;

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "linear-gradient(135deg,#f59e0b,#ef4444)",
              color: "#fff",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <Star size={20} fill="#fff" />
          </div>
          <div>
            <h3
              style={{ margin: 0, color: "var(--text-primary, #172033)" }}
            >
              Đánh giá của bạn
            </h3>
            <b style={{ fontSize: 13, color: "#2634d5" }}>{order.code}</b>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Đóng"
          type="button"
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

      {/* Points summary */}
      <div
        style={{
          padding: 14,
          background:
            "linear-gradient(135deg, rgba(24, 169, 103, 0.1), rgba(38, 52, 213, 0.1))",
          borderRadius: 10,
          marginBottom: 18,
          fontSize: 13,
          color: "#18a967",
          fontWeight: 600,
          textAlign: "center",
        }}
      >
        ✨ Bạn đã được cộng <b>{totalPoints} điểm</b> từ đánh giá này
      </div>

      {/* Reviews */}
      {myReviews.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: 40,
            color: "var(--text-light, #8993a3)",
            fontSize: 13,
          }}
        >
          Chưa có đánh giá nào
        </div>
      ) : (
        myReviews.map((r, i) => {
          const item = items.find(
            (it) => it.menu_item_id === r.menu_item_id
          );
          return (
            <div
              key={r.id || i}
              style={{
                padding: 14,
                background: "var(--bg-tertiary, #f8fafc)",
                borderRadius: 10,
                marginBottom: 12,
                border: "1px solid var(--border-color, #e5e9ef)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                  gap: 10,
                }}
              >
                <b
                  style={{
                    color: "var(--text-primary, #172033)",
                    fontSize: 13,
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item?.name || "Món ăn"}
                </b>
                <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      size={14}
                      fill={s <= r.rating ? "#f59e0b" : "none"}
                      color={s <= r.rating ? "#f59e0b" : "#cbd5e1"}
                    />
                  ))}
                </div>
              </div>
              {r.comment ? (
                <p
                  style={{
                    margin: "6px 0 0",
                    fontSize: 13,
                    color: "var(--text-muted, #64748b)",
                    fontStyle: "italic",
                  }}
                >
                  "{r.comment}"
                </p>
              ) : (
                <p
                  style={{
                    margin: "6px 0 0",
                    fontSize: 12,
                    color: "var(--text-light, #94a3b8)",
                  }}
                >
                  (Không có nhận xét)
                </p>
              )}
              <div
                style={{
                  fontSize: 10,
                  color: "var(--text-light, #94a3b8)",
                  marginTop: 8,
                }}
              >
                {fmtDateTime(r.created_at)}
              </div>
            </div>
          );
        })
      )}

      <button
        onClick={onClose}
        type="button"
        style={{
          width: "100%",
          padding: 12,
          marginTop: 12,
          background: "#2634d5",
          color: "#fff",
          border: 0,
          borderRadius: 8,
          fontWeight: 600,
          cursor: "pointer",
          fontSize: 13,
        }}
      >
        Đóng
      </button>
    </div>
  );
}

// ============================================================
// STYLE CONSTANTS
// ============================================================

const labelStyle = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  marginBottom: 6,
  color: "var(--text-muted, #475569)",
};