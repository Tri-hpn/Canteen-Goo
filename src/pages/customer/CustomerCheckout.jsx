// ============================================================
// CUSTOMERCHECKOUT.JSX — Trang thanh toán
// ============================================================
// Flow:
//   1. Nhập thông tin người đặt (tên, SĐT, giờ nhận, ghi chú)
//   2. Áp voucher (nhập tay / chọn từ ví / đổi điểm ngay)
//   3. Xem tóm tắt → mở PaymentModal → confirmPayment tạo đơn
//   4. Navigate → /customer/success (hiển thị mã đơn + tổng tiền)
//
// Fixes (so với bản gốc):
//   - Bỏ setTimeout hack trong redeemPoints
//   - Race-safe applyVoucher (reqIdRef)
//   - Guard double-submit confirmPayment (submittingRef)
//   - Extract cleanup cart to helper
//   - Memo lines/subtotal/total
//   - Loading state cho init fetch
//   - Validate giờ nhận hàng không ở quá khứ
//   - Loading state khi apply voucher
//   - Voucher buttons disable khi đang apply
//   - ✅ FIX: navigate sang /customer/success (không phải /orders)
//   - Xoá dead ref redeemTimerRef (không còn dùng setTimeout)
// ============================================================

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  User, Phone, Clock, FileText, Tag, CheckCircle2,
  CreditCard, Gift, X, Zap, Loader2,
} from "lucide-react";
import { api } from "../../api";
import { money } from "../../components/UI";
import { toast } from "../../components/Effects";
import PaymentModal from "../../components/PaymentModal";

// ============================================================
// CONSTANTS
// ============================================================

const TIME_SLOTS = [
  "07:00 - 07:30", "07:30 - 08:00", "08:00 - 08:30", "08:30 - 09:00",
  "09:00 - 09:30", "09:30 - 10:00", "10:00 - 10:30", "10:30 - 11:00",
  "11:00 - 11:30", "11:30 - 12:00", "12:00 - 12:30", "12:30 - 13:00",
  "13:00 - 13:30", "13:30 - 14:00", "14:00 - 14:30", "14:30 - 15:00",
  "15:00 - 15:30", "15:30 - 16:00", "16:00 - 16:30", "16:30 - 17:00",
  "17:00 - 17:30", "17:30 - 18:00", "18:00 - 18:30",
];

const SELECTED_CART_KEY = "canteen_cart_selected";
const CART_KEY = "canteen_cart";

const MIN_REDEEM_POINTS = 100;
const REDEEM_VALUE = 10000; // 100 điểm = 10.000đ

// ============================================================
// HELPERS
// ============================================================

/**
 * Loại các item đã đặt khỏi cart và persist lại localStorage.
 * Trả về cart mới (đã loại).
 */
function removeOrderedItems(cart, selectedKeys) {
  const remain = {};
  for (const [k, v] of Object.entries(cart || {})) {
    if (!selectedKeys.includes(k)) remain[k] = v;
  }
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(remain));
  } catch {}
  try {
    localStorage.removeItem(SELECTED_CART_KEY);
  } catch {}
  return remain;
}

/** Đọc selectedKeys đã lưu trong localStorage (an toàn). */
function readSelectedKeys() {
  try {
    const raw = localStorage.getItem(SELECTED_CART_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/**
 * Check giờ nhận hàng không nằm ở quá khứ.
 * Slot format: "HH:MM - HH:MM"
 */
function isSlotInPast(slot) {
  if (!slot) return false;
  const startTime = slot.split(" - ")[0]; // "HH:MM"
  const [h, m] = startTime.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return false;

  const now = new Date();
  const slotDate = new Date();
  slotDate.setHours(h, m, 0, 0);

  return slotDate.getTime() < now.getTime();
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function CustomerCheckout({ cart, setCart }) {
  const navigate = useNavigate();

  // ---------- Form ----------
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState({});

  // ---------- Voucher ----------
  const [voucherCode, setVoucherCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [applyingVoucher, setApplyingVoucher] = useState(false);

  // ---------- Data ----------
  const [myVouchers, setMyVouchers] = useState([]);
  const [points, setPoints] = useState(0);
  const [walletBalance, setWalletBalance] = useState(0);
  const [initLoading, setInitLoading] = useState(true);

  // ---------- Actions ----------
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [paymentOrder, setPaymentOrder] = useState(null);

  // ---------- Refs ----------
  const voucherReqIdRef = useRef(0);
  const submittingRef = useRef(false);

  // ---------- Derived (memo) ----------

 // ✅ FIX: Chỉ lấy các món user đã CHỌN trong Cart page
//    (đọc từ localStorage canteen_cart_selected)
const lines = useMemo(() => {
  const selectedKeys = readSelectedKeys();

  // Nếu không có selectedKeys (VD: user F5 trực tiếp vào /checkout)
  // → fallback: lấy TẤT CẢ (tránh trang trắng)
  if (!selectedKeys.length) {
    return Object.entries(cart).map(([key, item]) => ({ ...item, _key: key }));
  }

  // Chỉ lấy các item có key trong selectedKeys
  const selectedSet = new Set(selectedKeys);
  return Object.entries(cart)
    .filter(([key]) => selectedSet.has(key))
    .map(([key, item]) => ({ ...item, _key: key }));
}, [cart]);
  const subtotal = useMemo(
    () =>
      lines.reduce(
        (s, m) => s + (Number(m.price) || 0) * (Number(m.qty) || 0),
        0
      ),
    [lines]
  );

  const total = useMemo(
    () => Math.max(0, subtotal - discount),
    [subtotal, discount]
  );

  // ---------- Init fetch ----------

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [list, pointsData, wallet] = await Promise.all([
          api.vouchers.me().catch(() => []),
          api.points.me().catch(() => ({ points: 0 })),
          api.wallet.me().catch(() => ({ balance: 0 })),
        ]);
        if (cancelled) return;

        setMyVouchers(
          (Array.isArray(list) ? list : []).filter((v) => !v.used)
        );
        setPoints(pointsData?.points || 0);
        setWalletBalance(wallet?.balance || 0);
      } finally {
        if (!cancelled) setInitLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // ---------- Reload vouchers + points ----------

  const reloadVouchersAndPoints = useCallback(async () => {
    try {
      const [list, pointsData] = await Promise.all([
        api.vouchers.me().catch(() => []),
        api.points.me().catch(() => ({ points: 0 })),
      ]);
      setMyVouchers(
        (Array.isArray(list) ? list : []).filter((v) => !v.used)
      );
      setPoints(pointsData?.points || 0);
    } catch {}
  }, []);

  // ---------- Voucher: apply / clear ----------

  const applyVoucher = useCallback(
    async (code) => {
      const useCode = (code || voucherCode || "").trim().toUpperCase();

      if (!useCode) {
        toast("Vui lòng nhập mã voucher", "error");
        return;
      }

      const myReqId = ++voucherReqIdRef.current;
      setApplyingVoucher(true);

      try {
        const res = await api.vouchers.validate(useCode);

        // Bỏ qua nếu có request mới hơn
        if (myReqId !== voucherReqIdRef.current) return;

        setDiscount(res.value);
        setVoucherCode(res.code);
        setAppliedVoucher({ code: res.code, value: res.value });
        toast(`Áp dụng voucher: -${money(res.value)}`, "success");
      } catch (e) {
        if (myReqId !== voucherReqIdRef.current) return;
        toast(e.message || "Không áp dụng được voucher", "error");
      } finally {
        if (myReqId === voucherReqIdRef.current) setApplyingVoucher(false);
      }
    },
    [voucherCode]
  );

  const clearVoucher = () => {
    // Invalidate mọi request đang chờ
    voucherReqIdRef.current++;
    setApplyingVoucher(false);
    setVoucherCode("");
    setDiscount(0);
    setAppliedVoucher(null);
  };

  const selectVoucher = (v) => {
    if (applyingVoucher) return;
    setVoucherCode(v.code);
    applyVoucher(v.code);
  };

  // ---------- Redeem points ----------

  const redeemPoints = async () => {
    if (points < MIN_REDEEM_POINTS) {
      toast(
        `Cần ít nhất ${MIN_REDEEM_POINTS} điểm để đổi voucher`,
        "error"
      );
      return;
    }
    if (redeemLoading) return;

    setRedeemLoading(true);
    try {
      const voucher = await api.points.redeem({ points: MIN_REDEEM_POINTS });
      toast(
        `Đổi thành công ${voucher.code} — Giảm ${money(voucher.value)}`,
        "success"
      );

      // Reload ví voucher + điểm
      await reloadVouchersAndPoints();

      // Áp dụng luôn voucher vừa đổi
      await applyVoucher(voucher.code);
    } catch (e) {
      toast(e.message || "Không đổi được voucher", "error");
    } finally {
      setRedeemLoading(false);
    }
  };

  // ---------- Validate form ----------

  const validate = () => {
    const errs = {};

    if (!name.trim()) errs.name = "Vui lòng nhập tên người đặt";

    if (!phone.trim()) {
      errs.phone = "Vui lòng nhập số điện thoại";
    } else if (!/^[0-9]{10,11}$/.test(phone.trim())) {
      errs.phone = "Số điện thoại phải 10-11 chữ số";
    }

    if (!pickupTime.trim()) {
      errs.pickupTime = "Vui lòng chọn giờ nhận hàng";
    } else if (isSlotInPast(pickupTime)) {
      errs.pickupTime = "Giờ nhận hàng không được ở quá khứ";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ---------- Open payment ----------

  const openPayment = () => {
    if (!lines.length) {
      toast("Giỏ hàng đang trống", "error");
      return;
    }
    if (!validate()) {
      toast("Vui lòng kiểm tra lại thông tin", "error");
      return;
    }

    setPaymentOrder({
      code: "TMP-" + Date.now().toString().slice(-6),
      total,
      name,
      phone,
      pickupTime,
      note,
      discount,
      voucherCode: appliedVoucher?.code || "",
    });
  };

  // ---------- Confirm payment (tạo đơn) ----------

  const confirmPayment = async (paymentMethod) => {
    // Guard double-submit
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmittingOrder(true);

    try {
      const items = lines.map((m) => ({
        menuItem: m._originalId || m._id || m.id,
        qty: m.qty,
      }));

      const noteParts = [];
      if (note.trim()) noteParts.push(note.trim());
      if (pickupTime) noteParts.push(`Nhận lúc ${pickupTime}`);

      const order = await api.orders.create({
        items,
        payment: paymentMethod,
        note: noteParts.join(" · "),
        discount,
        voucherCode: appliedVoucher?.code || "",
      });

      // Loại các món đã đặt khỏi cart (dùng cùng selectedKeys đã filter ở `lines`)
	const selectedKeys = lines.map((m) => m._key);
	const remainCart = removeOrderedItems(cart, selectedKeys);
	setCart(remainCart);
      toast(`Đặt hàng thành công! Mã: ${order.code}`, "success");
      setPaymentOrder(null);

      // ✅ FIX: Điều hướng sang /customer/success để hiển thị
      //    trang xác nhận có mã đơn + tổng tiền. User bấm
      //    "Theo dõi đơn hàng" từ đó mới sang /customer/orders.
      navigate("/customer/success", { state: { order } });
    } catch (e) {
      toast(e.message || "Không đặt được hàng", "error");
    } finally {
      submittingRef.current = false;
      setSubmittingOrder(false);
    }
  };

  // ---------- Early return: giỏ rỗng ----------

  if (!lines.length) {
    return (
      <div
        style={{
          background: "var(--card-bg, #fff)",
          borderRadius: 14,
          padding: 60,
          textAlign: "center",
        }}
      >
        <h3 style={{ color: "var(--text-primary, #172033)" }}>
          Giỏ hàng đang trống
        </h3>
        <Link
          to="/customer/menu"
          style={{ color: "#2634d5", fontWeight: 600 }}
        >
          Khám phá thực đơn
        </Link>
      </div>
    );
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="checkout-2col">
      {/* ============ CỘT TRÁI: FORM ============ */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* ===== Người đặt ===== */}
        <div style={cardStyle}>
          <h3 style={h3Style}>Người đặt</h3>

          <FormField
            label="Tên người đặt *"
            icon={<User size={16} />}
            error={errors.name}
          >
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((p) => ({ ...p, name: "" }));
              }}
              placeholder="Nguyễn Văn A"
              style={inputInnerStyle}
            />
          </FormField>

          <FormField
            label="Số điện thoại *"
            icon={<Phone size={16} />}
            error={errors.phone}
          >
            <input
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value.replace(/[^0-9]/g, ""));
                if (errors.phone) setErrors((p) => ({ ...p, phone: "" }));
              }}
              placeholder="0901234567"
              inputMode="numeric"
              maxLength={11}
              style={inputInnerStyle}
            />
          </FormField>

          <FormField
            label="Giờ nhận hàng *"
            icon={<Clock size={16} />}
            error={errors.pickupTime}
          >
            <select
              value={pickupTime}
              onChange={(e) => {
                setPickupTime(e.target.value);
                if (errors.pickupTime)
                  setErrors((p) => ({ ...p, pickupTime: "" }));
              }}
              style={{
                ...inputInnerStyle,
                cursor: "pointer",
                color: pickupTime
                  ? "var(--text-primary, #172033)"
                  : "var(--text-light, #8993a3)",
              }}
            >
              <option value="">-- Chọn khung giờ --</option>
              {TIME_SLOTS.map((slot) => {
                const past = isSlotInPast(slot);
                return (
                  <option key={slot} value={slot} disabled={past}>
                    {slot}
                    {past ? " (đã qua)" : ""}
                  </option>
                );
              })}
            </select>
          </FormField>

          <label style={labelStyle}>Ghi chú</label>
          <div style={inputWrapStyle()}>
            <FileText size={16} style={{ ...iconStyle, marginTop: 4 }} />
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ví dụ: ít cay, không hành..."
              maxLength={500}
              style={{
                ...inputInnerStyle,
                minHeight: 60,
                resize: "vertical",
                fontFamily: "inherit",
              }}
            />
          </div>
        </div>

        {/* ===== Voucher ===== */}
        <div style={cardStyle}>
          <h3
            style={{
              ...h3Style,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Tag size={18} /> Mã voucher
          </h3>

          {/* Ô nhập + nút áp dụng */}
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={voucherCode}
              onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
              placeholder="Nhập mã voucher..."
              disabled={!!appliedVoucher || applyingVoucher}
              onKeyDown={(e) =>
                e.key === "Enter" && !appliedVoucher && applyVoucher()
              }
              style={{
                flex: 1,
                padding: "10px 12px",
                border: "1px solid var(--border-color, #e5e9ef)",
                borderRadius: 8,
                outline: "none",
                background: appliedVoucher
                  ? "var(--bg-tertiary, #f5f7fb)"
                  : "var(--bg-secondary, #fff)",
                color: "var(--text-primary, #172033)",
                fontSize: 13,
                textTransform: "uppercase",
                minWidth: 0,
              }}
            />

            {appliedVoucher ? (
              <button
                onClick={clearVoucher}
                style={{
                  padding: "10px 20px",
                  background: "var(--card-bg, #fff)",
                  color: "#ef4444",
                  border: "1px solid #ef4444",
                  borderRadius: 8,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: 13,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  whiteSpace: "nowrap",
                }}
              >
                <X size={14} /> Hủy
              </button>
            ) : (
              <button
                onClick={() => applyVoucher()}
                disabled={applyingVoucher}
                style={{
                  padding: "10px 20px",
                  background: applyingVoucher ? "#94a3b8" : "#2634d5",
                  color: "#fff",
                  border: 0,
                  borderRadius: 8,
                  fontWeight: 600,
                  cursor: applyingVoucher ? "not-allowed" : "pointer",
                  fontSize: 13,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  whiteSpace: "nowrap",
                }}
              >
                {applyingVoucher ? (
                  <>
                    <Loader2
                      size={14}
                      style={{ animation: "spin 1s linear infinite" }}
                    />
                    Đang kiểm tra...
                  </>
                ) : (
                  "Áp dụng"
                )}
              </button>
            )}
          </div>

          {/* Đã áp dụng */}
          {appliedVoucher && (
            <div
              style={{
                marginTop: 10,
                padding: "10px 14px",
                background: "#e8f9f1",
                borderRadius: 8,
                fontSize: 13,
                color: "#18a967",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <CheckCircle2 size={14} /> Đã áp dụng {appliedVoucher.code} —
              Giảm {money(appliedVoucher.value)}
            </div>
          )}

          {/* Ví voucher */}
          {!appliedVoucher && myVouchers.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--text-muted, #475569)",
                  marginBottom: 8,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Gift size={14} /> Voucher của bạn ({myVouchers.length})
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fill, minmax(200px, 1fr))",
                  gap: 8,
                }}
              >
                {myVouchers.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => selectVoucher(v)}
                    disabled={applyingVoucher}
                    style={{
                      padding: "12px 14px",
                      background: "var(--bg-tertiary, #f5f7fb)",
                      border: "1px dashed #2634d5",
                      borderRadius: 10,
                      cursor: applyingVoucher ? "not-allowed" : "pointer",
                      textAlign: "left",
                      opacity: applyingVoucher ? 0.6 : 1,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 4,
                      }}
                    >
                      <b style={{ color: "#2634d5", fontSize: 12 }}>
                        {v.code}
                      </b>
                      <span
                        style={{
                          fontSize: 11,
                          color: "#18a967",
                          fontWeight: 800,
                        }}
                      >
                        -{money(v.value)}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: "var(--text-light, #8993a3)",
                      }}
                    >
                      {v.points_used > 0
                        ? `Dùng ${v.points_used} điểm`
                        : "Admin tặng"}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Không có voucher + đủ điểm → nút đổi ngay */}
          {!appliedVoucher &&
            myVouchers.length === 0 &&
            points >= MIN_REDEEM_POINTS && (
              <div
                style={{
                  marginTop: 16,
                  padding: 14,
                  background:
                    "linear-gradient(135deg, rgba(38,52,213,0.05), rgba(32,199,121,0.05))",
                  border: "1px dashed #2634d5",
                  borderRadius: 10,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 10,
                  }}
                >
                  <Zap size={16} style={{ color: "#2634d5" }} />
                  <b
                    style={{
                      fontSize: 13,
                      color: "var(--text-primary, #172033)",
                    }}
                  >
                    Bạn có {points} điểm — Đổi ngay 1 voucher{" "}
                    {money(REDEEM_VALUE)}
                  </b>
                </div>
                <button
                  onClick={redeemPoints}
                  disabled={redeemLoading}
                  style={{
                    width: "100%",
                    padding: "10px 16px",
                    background: redeemLoading ? "#94a3b8" : "#18a967",
                    color: "#fff",
                    border: 0,
                    borderRadius: 8,
                    fontWeight: 700,
                    cursor: redeemLoading ? "not-allowed" : "pointer",
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
                      <Gift size={14} /> Đổi {MIN_REDEEM_POINTS} điểm →
                      Voucher {money(REDEEM_VALUE)}
                    </>
                  )}
                </button>
              </div>
            )}

          {/* Không voucher + không đủ điểm */}
          {!appliedVoucher &&
            myVouchers.length === 0 &&
            points < MIN_REDEEM_POINTS && (
              <div
                style={{
                  marginTop: 12,
                  padding: "12px 14px",
                  background: "var(--bg-tertiary, #f5f7fb)",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "var(--text-muted, #64748b)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Gift size={14} />
                <span>
                  Không có voucher khả dụng. Bạn có <b>{points}</b> điểm — cần
                  thêm <b>{MIN_REDEEM_POINTS - points}</b> điểm để đổi voucher.{" "}
                  <Link
                    to="/customer/promotions"
                    style={{ color: "#2634d5", fontWeight: 600 }}
                  >
                    Xem điểm →
                  </Link>
                </span>
              </div>
            )}

          {/* Loading state cho init */}
          {initLoading && (
            <div
              style={{
                marginTop: 12,
                fontSize: 12,
                color: "var(--text-light, #8993a3)",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Loader2
                size={12}
                style={{ animation: "spin 1s linear infinite" }}
              />
              Đang tải thông tin...
            </div>
          )}
        </div>
      </div>

      {/* ============ CỘT PHẢI: TÓM TẮT ============ */}
      <div
        style={{
          ...cardStyle,
          height: "fit-content",
          position: "sticky",
          top: 90,
        }}
      >
        <h3 style={h3Style}>Tóm tắt đơn</h3>

        <div
          style={{
            maxHeight: 240,
            overflowY: "auto",
            marginBottom: 14,
          }}
        >
          {lines.map((m) => (
            <div
              key={m._key}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "8px 0",
                borderBottom: "1px solid var(--border-color, #eef2f7)",
                fontSize: 13,
                gap: 10,
              }}
            >
              <span
                style={{
                  color: "var(--text-primary, #172033)",
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                <b>{m.qty}×</b> {m.name}
              </span>
              <b
                style={{
                  color: "var(--text-muted, #64748b)",
                  whiteSpace: "nowrap",
                }}
              >
                {money(m.price * m.qty)}
              </b>
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "8px 0",
            fontSize: 13,
            color: "var(--text-muted, #64748b)",
          }}
        >
          <span>Tạm tính</span>
          <b>{money(subtotal)}</b>
        </div>

        {discount > 0 && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "8px 0",
              fontSize: 13,
              color: "#18a967",
            }}
          >
            <span>Giảm giá</span>
            <b>-{money(discount)}</b>
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "14px 0",
            borderTop: "2px solid var(--border-color, #eef2f7)",
            marginTop: 8,
          }}
        >
          <span
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "var(--text-primary, #172033)",
            }}
          >
            Tổng cộng
          </span>
          <strong style={{ color: "#2634d5", fontSize: 22 }}>
            {money(total)}
          </strong>
        </div>

        <button
          onClick={openPayment}
          disabled={submittingOrder}
          style={{
            width: "100%",
            padding: 14,
            background: submittingOrder ? "#94a3b8" : "#2634d5",
            color: "#fff",
            border: 0,
            borderRadius: 10,
            fontWeight: 700,
            cursor: submittingOrder ? "not-allowed" : "pointer",
            marginTop: 14,
            fontSize: 14,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <CreditCard size={18} /> Đặt hàng
        </button>
      </div>

      {/* ============ PAYMENT MODAL ============ */}
      {paymentOrder && (
        <PaymentModal
          order={paymentOrder}
          onClose={() => !submittingOrder && setPaymentOrder(null)}
          onConfirm={confirmPayment}
          walletBalance={walletBalance}
        />
      )}

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
// SUB-COMPONENTS
// ============================================================

function FormField({ label, icon, error, children }) {
  return (
    <>
      <label style={labelStyle}>{label}</label>
      <div style={inputWrapStyle(error)}>
        <span style={iconStyle}>{icon}</span>
        {children}
      </div>
      {error && <div style={errStyle}>{error}</div>}
    </>
  );
}

// ============================================================
// STYLE CONSTANTS
// ============================================================

const cardStyle = {
  background: "var(--card-bg, #fff)",
  border: "1px solid var(--border-color, #e7ebf0)",
  borderRadius: 12,
  padding: 20,
};

const h3Style = {
  marginTop: 0,
  color: "var(--text-primary, #172033)",
};

const labelStyle = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  marginBottom: 4,
  color: "var(--text-muted, #475569)",
  marginTop: 12,
};

const iconStyle = { color: "var(--text-light, #8993a3)", flexShrink: 0 };

const inputInnerStyle = {
  flex: 1,
  border: 0,
  outline: "none",
  background: "transparent",
  color: "var(--text-primary, #172033)",
  fontSize: 13,
  minWidth: 0,
};

const inputWrapStyle = (err) => ({
  display: "flex",
  alignItems: "center",
  gap: 10,
  border: err
    ? "2px solid #ef4444"
    : "1px solid var(--border-color, #e5e9ef)",
  borderRadius: 8,
  padding: "8px 12px",
  marginBottom: err ? 4 : 14,
  background: "var(--bg-secondary, #fff)",
});

const errStyle = {
  color: "#ef4444",
  fontSize: 12,
  marginBottom: 14,
};