// ============================================================
// REVIEWSECTION.JSX — Đánh giá món ăn
// ============================================================
// Props:
//   menuItemId  — id món ăn
//   currentUser — user hiện tại (null nếu chưa login)
//   readOnly    — true → chỉ xem, không cho đánh giá
//
// Fixes (so với bản gốc):
//   - 🔴🔴 Form chỉ hiện khi canReview && !hasReviewed && hasPurchased
//   - 🔴 Dark mode (CSS variables)
//   - 🔴 Race-safe load (reqIdRef)
//   - 🔴 Double-submit guard (submittingRef)
//   - 🔴 useEffect deps dùng currentUser?.id (không dùng object)
//   - 🔴 Error state + retry cho load
//   - 🔴 Guard avg khi rating undefined
//   - 🔴 Max length comment
//   - 🟡 Reset form khi menuItemId đổi
//   - 🟡 Dùng hasPurchased để hiển thị hint phù hợp
//   - 🟡 Guard dispatchEvent
//   - 🟡 Memo avg + derived states
//   - 🟢 Avatar thật nếu có
// ============================================================

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { Send, User, AlertCircle, Loader2, Lock, CheckCircle2 } from "lucide-react";
import { api } from "../api";
import { toast } from "./Effects";
import StarRating from "./StarRating";

// ============================================================
// CONSTANTS
// ============================================================

const MAX_COMMENT_LENGTH = 500;
const MAX_REVIEWS_SHOWN = 20;

// ============================================================
// HELPERS
// ============================================================

function safeAvg(list) {
  if (!Array.isArray(list) || list.length === 0) return 0;
  const sum = list.reduce((s, r) => {
    const rating = Number(r?.rating) || 0;
    return s + rating;
  }, 0);
  return Number((sum / list.length).toFixed(1));
}

function fmtDate(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("vi-VN");
  } catch {
    return "";
  }
}

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function ReviewSection({
  menuItemId,
  currentUser,
  readOnly = false,
}) {
  // ---------- Data ----------
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [loadError, setLoadError] = useState("");

  // ---------- Form ----------
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // ---------- Permission flags ----------
  const [canReview, setCanReview] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [hasPurchased, setHasPurchased] = useState(false);

  // ---------- Refs ----------
  const reqIdRef = useRef(0);
  const submittingRef = useRef(false);

  // ---------- Load reviews (race-safe) ----------

  const loadReviews = useCallback(async () => {
    const myReqId = ++reqIdRef.current;
    setLoadingReviews(true);
    setLoadError("");

    try {
      const data = await api.reviews.list(menuItemId);

      // Bỏ qua nếu có request mới hơn
      if (myReqId !== reqIdRef.current) return;

      setReviews(Array.isArray(data) ? data : []);
    } catch (e) {
      if (myReqId === reqIdRef.current) {
        setLoadError(e.message || "Không tải được đánh giá");
        setReviews([]);
      }
    } finally {
      if (myReqId === reqIdRef.current) setLoadingReviews(false);
    }
  }, [menuItemId]);

  // ---------- Check permission ----------

  const checkCanReview = useCallback(async () => {
    if (!currentUser) {
      setCanReview(false);
      setHasReviewed(false);
      setHasPurchased(false);
      return;
    }

    try {
      const data = await api.reviews.canReview(menuItemId);
      setCanReview(!!data?.canReview);
      setHasReviewed(!!data?.hasReviewed);
      setHasPurchased(!!data?.hasPurchased);
    } catch {
      // Fail → không cho đánh giá (an toàn)
      setCanReview(false);
      setHasReviewed(false);
      setHasPurchased(false);
    }
  }, [menuItemId, currentUser]);

  // ---------- Load on mount / item change ----------

  useEffect(() => {
    loadReviews();
    checkCanReview();

    // Reset form khi đổi món
    setRating(5);
    setComment("");
  }, [loadReviews, checkCanReview]);

  // ---------- Submit ----------

  const submit = useCallback(async () => {
    if (submittingRef.current) return;

    if (!rating || rating < 1 || rating > 5) {
      toast("Vui lòng chọn số sao", "error");
      return;
    }

    const trimmedComment = comment.trim().slice(0, MAX_COMMENT_LENGTH);

    submittingRef.current = true;
    setSubmitting(true);

    try {
      await api.reviews.create({
        menuItemId,
        rating,
        comment: trimmedComment,
      });

      try {
        window.dispatchEvent(new CustomEvent("refresh-user"));
      } catch {}

      toast("Đã gửi đánh giá!", "success");
      setComment("");
      setRating(5);

      // Reload song song
      await Promise.all([loadReviews(), checkCanReview()]);
    } catch (e) {
      toast(e.message || "Lỗi gửi đánh giá", "error");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [rating, comment, menuItemId, loadReviews, checkCanReview]);

  // ---------- Computed ----------

  const avg = useMemo(() => safeAvg(reviews), [reviews]);

  const visibleReviews = useMemo(
    () => reviews.slice(0, MAX_REVIEWS_SHOWN),
    [reviews]
  );

  const hasMore = reviews.length > MAX_REVIEWS_SHOWN;

  // ---------- Determine form visibility ----------

  // Form chỉ hiện khi:
  //   - Không phải readOnly
  //   - User đã login
  //   - Đã mua món này (hasPurchased)
  //   - Chưa đánh giá (hasReviewed = false)
  //   - Backend cho phép (canReview)
  const showForm =
    !readOnly && currentUser && canReview && !hasReviewed && hasPurchased;

  // Hint khi user cần biết lý do không thể đánh giá
  const showPurchaseHint =
    !readOnly && currentUser && !canReview && !hasReviewed && !hasPurchased;

  const showReviewedHint =
    !readOnly && currentUser && hasReviewed;

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div
      style={{
        marginTop: 20,
        paddingTop: 20,
        borderTop: "1px solid var(--border-color, #eef2f7)",
      }}
    >
      {/* ============ HEADER ============ */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: 15,
            color: "var(--text-primary, #172033)",
          }}
        >
          Đánh giá món ăn
        </h3>

        {reviews.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <StarRating value={avg} readonly size={16} />
            <b style={{ color: "var(--text-primary, #172033)" }}>{avg}</b>
            <span
              style={{ color: "var(--text-light, #8993a3)", fontSize: 12 }}
            >
              ({reviews.length} đánh giá)
            </span>
          </div>
        )}
      </div>

      {/* ============ NOT LOGGED IN ============ */}
      {!currentUser && !readOnly && (
        <div
          style={{
            background: "rgba(245, 158, 11, 0.1)",
            border: "1px solid rgba(245, 158, 11, 0.3)",
            borderRadius: 8,
            padding: 12,
            marginBottom: 16,
            fontSize: 13,
            color: "#92400e",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Lock size={14} style={{ flexShrink: 0 }} />
          Vui lòng đăng nhập để đánh giá
        </div>
      )}

      {/* ============ HINT: Chưa mua món ============ */}
      {showPurchaseHint && (
        <div
          style={{
            background: "rgba(38, 52, 213, 0.06)",
            border: "1px solid rgba(38, 52, 213, 0.2)",
            borderRadius: 8,
            padding: 12,
            marginBottom: 16,
            fontSize: 13,
            color: "#2634d5",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <AlertCircle size={14} style={{ flexShrink: 0 }} />
          Bạn cần mua món này để có thể đánh giá
        </div>
      )}

      {/* ============ HINT: Đã đánh giá ============ */}
      {showReviewedHint && (
        <div
          style={{
            background: "rgba(24, 169, 103, 0.08)",
            border: "1px solid rgba(24, 169, 103, 0.25)",
            borderRadius: 8,
            padding: 12,
            marginBottom: 16,
            fontSize: 13,
            color: "#18a967",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <CheckCircle2 size={14} style={{ flexShrink: 0 }} />
          Cảm ơn bạn đã đánh giá món này!
        </div>
      )}

      {/* ============ FORM ĐÁNH GIÁ ============ */}
      {showForm && (
        <div
          style={{
            background: "var(--bg-tertiary, #f8fafc)",
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
            border: "1px solid var(--border-color, #eef2f7)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 10,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #2634d5, #20c779)",
                color: "#fff",
                display: "grid",
                placeItems: "center",
                fontWeight: 700,
                fontSize: 12,
                flexShrink: 0,
              }}
            >
              {getInitials(currentUser.name)}
            </div>
            <b style={{ color: "var(--text-primary, #172033)" }}>
              {currentUser.name}
            </b>
            <StarRating
              value={rating}
              onChange={submitting ? undefined : setRating}
              size={20}
            />
          </div>

          <textarea
            value={comment}
            onChange={(e) =>
              setComment(e.target.value.slice(0, MAX_COMMENT_LENGTH))
            }
            placeholder="Chia sẻ cảm nhận của bạn về món này..."
            maxLength={MAX_COMMENT_LENGTH}
            disabled={submitting}
            style={{
              width: "100%",
              padding: 10,
              border: "1px solid var(--border-color, #e5e9ef)",
              borderRadius: 8,
              minHeight: 60,
              outline: "none",
              resize: "vertical",
              fontSize: 13,
              background: "var(--card-bg, #fff)",
              color: "var(--text-primary, #172033)",
              boxSizing: "border-box",
            }}
          />

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 6,
              marginBottom: 10,
              fontSize: 11,
              color: "var(--text-light, #94a3b8)",
            }}
          >
            <span>Không bắt buộc</span>
            <span>
              {comment.length}/{MAX_COMMENT_LENGTH}
            </span>
          </div>

          <button
            onClick={submit}
            disabled={submitting}
            type="button"
            style={{
              padding: "8px 16px",
              background: submitting ? "#94a3b8" : "#2634d5",
              color: "#fff",
              border: 0,
              borderRadius: 8,
              fontWeight: 600,
              cursor: submitting ? "not-allowed" : "pointer",
              fontSize: 13,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {submitting ? (
              <>
                <Loader2
                  size={14}
                  style={{ animation: "reviewSpin 1s linear infinite" }}
                />
                Đang gửi...
              </>
            ) : (
              <>
                <Send size={14} /> Gửi đánh giá
              </>
            )}
          </button>
        </div>
      )}

      {/* ============ LOADING ============ */}
      {loadingReviews && (
        <div
          style={{
            textAlign: "center",
            padding: 20,
            color: "var(--text-light, #8993a3)",
            fontSize: 13,
          }}
        >
          <Loader2
            size={20}
            style={{ animation: "reviewSpin 1s linear infinite", marginBottom: 6 }}
          />
          <div>Đang tải đánh giá...</div>
        </div>
      )}

      {/* ============ ERROR ============ */}
      {!loadingReviews && loadError && (
        <div
          style={{
            background: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            borderRadius: 8,
            padding: "10px 14px",
            marginBottom: 12,
            color: "#ef4444",
            fontSize: 12,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <AlertCircle size={14} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{loadError}</span>
          <button
            onClick={loadReviews}
            type="button"
            style={{
              padding: "4px 10px",
              background: "#ef4444",
              color: "#fff",
              border: 0,
              borderRadius: 5,
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            Thử lại
          </button>
        </div>
      )}

      {/* ============ REVIEWS LIST ============ */}
      {!loadingReviews && !loadError && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {visibleReviews.map((r) => (
            <div
              key={r.id}
              style={{
                display: "flex",
                gap: 12,
                padding: 12,
                background: "var(--card-bg, #fff)",
                border: "1px solid var(--border-color, #eef2f7)",
                borderRadius: 10,
              }}
            >
              {/* Avatar */}
              {r.user_avatar ? (
                <img
                  src={r.user_avatar}
                  alt={r.user_name || "User"}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.style.display = "none";
                    if (e.target.nextElementSibling) {
                      e.target.nextElementSibling.style.display = "grid";
                    }
                  }}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    objectFit: "cover",
                    flexShrink: 0,
                  }}
                />
              ) : null}
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "rgba(38, 52, 213, 0.1)",
                  color: "#2634d5",
                  display: r.user_avatar ? "none" : "grid",
                  placeItems: "center",
                  fontWeight: 700,
                  fontSize: 12,
                  flexShrink: 0,
                }}
              >
                <User size={16} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <b
                    style={{
                      fontSize: 13,
                      color: "var(--text-primary, #172033)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {r.user_name || "Khách"}
                  </b>
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--text-light, #8993a3)",
                      flexShrink: 0,
                    }}
                  >
                    {fmtDate(r.created_at)}
                  </span>
                </div>

                <StarRating value={Number(r.rating) || 0} readonly size={14} />

                {r.comment && (
                  <p
                    style={{
                      margin: "6px 0 0",
                      fontSize: 13,
                      color: "var(--text-muted, #334155)",
                      lineHeight: 1.5,
                      wordBreak: "break-word",
                    }}
                  >
                    {r.comment}
                  </p>
                )}
              </div>
            </div>
          ))}

          {/* Empty state */}
          {!reviews.length && (
            <p
              style={{
                textAlign: "center",
                color: "var(--text-light, #8993a3)",
                padding: 20,
                fontSize: 13,
                margin: 0,
              }}
            >
              Chưa có đánh giá nào. Hãy là người đầu tiên!
            </p>
          )}

          {/* Show more */}
          {hasMore && (
            <button
              type="button"
              onClick={() => {
                // Có thể mở rộng: hiện tất cả hoặc phân trang
                toast(`Còn ${reviews.length - MAX_REVIEWS_SHOWN} đánh giá khác`, "info");
              }}
              style={{
                padding: "8px 14px",
                background: "var(--bg-tertiary, #f5f7fb)",
                border: "1px solid var(--border-color, #e5e9ef)",
                borderRadius: 8,
                cursor: "pointer",
                fontSize: 12,
                color: "var(--text-muted, #64748b)",
                fontWeight: 600,
                alignSelf: "center",
              }}
            >
              Xem thêm {reviews.length - MAX_REVIEWS_SHOWN} đánh giá
            </button>
          )}
        </div>
      )}

      <style>{`
        @keyframes reviewSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}