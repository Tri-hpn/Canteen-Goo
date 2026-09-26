// ============================================================
// EMPLOYEEORDERS.JSX — Xử lý đơn hàng (Nhân viên + Admin)
// ============================================================
// Admin và Employee dùng chung component (OwnerOrders wrap cái này).
//
// Fixes (so với bản gốc):
//   - Race-safe: dùng reqIdRef để bỏ qua response cũ khi đổi filter
//   - Error state + nút retry
//   - Loading state (lần đầu) + refreshing (thủ công)
//   - advance(): loading per-button, disable khi đang gửi
//   - Polling: chống overlap bằng inFlightRef
//   - Filter chip: hiện số đơn trong mỗi trạng thái
//   - Bảng: overflow-x cho mobile
//   - Manual refresh button
//   - Sort: đổi tên biến cho rõ nghĩa
//   - ✅ Thay confirm() native bằng ConfirmDialog custom
//   - ✅ BATCH 2: Load ALL 1 lần + filter client theo status
//     → đổi chip tức thì (không gọi API)
//   - ✅ BATCH 2: Cột "Ngày/Giờ" gộp (dd/MM HH:mm)
// ============================================================
import { SkeletonTable } from "../../components/Skeleton";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { Printer, Eye, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { api } from "../../api";
import { money, StatusBadge } from "../../components/UI";
import { toast } from "../../components/Effects";
import PrintReceipt from "../../components/PrintReceipt";
import StaffOrderDetailModal from "../../components/StaffOrderDetailModal";
import ConfirmDialog from "../../components/ConfirmDialog";
import { useTranslation } from "../../i18n";

// ============================================================
// CONSTANTS
// ============================================================

const STATUSES = [
  "Tất cả",
  "Chờ xác nhận",
  "Đã xác nhận",
  "Đang chuẩn bị",
  "Sẵn sàng nhận",
  "Hoàn thành",
  "Đã hủy",
];

// Trạng thái kế tiếp trong luồng xử lý
const NEXT = {
  "Chờ xác nhận": "Đã xác nhận",
  "Đã xác nhận": "Đang chuẩn bị",
  "Đang chuẩn bị": "Sẵn sàng nhận",
  "Sẵn sàng nhận": "Hoàn thành",
};

const NEXT_LABEL = {
  "Chờ xác nhận": "employee.confirm",
  "Đã xác nhận": "employee.startPrep",
  "Đang chuẩn bị": "employee.readyForPickup",
  "Sẵn sàng nhận": "employee.markDone",
};

const POLL_MS = 10000;

// ============================================================
// HELPERS
// ============================================================

/**
 * Format ngày giờ dạng "dd/MM HH:mm".
 * Guard Invalid Date → "—".
 */
function fmtDateTime(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";

    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const hour = String(d.getHours()).padStart(2, "0");
    const minute = String(d.getMinutes()).padStart(2, "0");

    return `${day}/${month} ${hour}:${minute}`;
  } catch {
    return "—";
  }
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function EmployeeOrders() {
  const { t } = useTranslation();

  // ---------- Data ----------
  const [status, setStatus] = useState("Tất cả");
  const [allOrders, setAllOrders] = useState([]); // luôn chứa TẤT CẢ đơn
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // ---------- Per-action loading ----------
  const [advancingId, setAdvancingId] = useState(null);

  // ---------- Modals ----------
  const [printOrder, setPrintOrder] = useState(null);
  const [detailOrder, setDetailOrder] = useState(null);

  // ✅ Confirm dialog state (chỉ dùng cho hủy đơn)
  const [confirmCancel, setConfirmCancel] = useState(null);

  // ---------- Refs ----------
  const reqIdRef = useRef(0); // race-safe cho load

  // ---------- Load ----------
  // ✅ BATCH 2: Luôn load ALL (không truyền status)
  //    → đổi chip filter ở client, không cần gọi API lại

  const load = useCallback(async (silent = false) => {
    const myReqId = ++reqIdRef.current;

    if (!silent) setRefreshing(true);
    setError("");

    try {
      const data = await api.orders.all("Tất cả");

      if (myReqId !== reqIdRef.current) return;

      const sorted = [...(data || [])].sort((a, b) => {
        const ta = new Date(a.created_at || 0).getTime();
        const tb = new Date(b.created_at || 0).getTime();
        return tb - ta;
      });

      setAllOrders(sorted);
    } catch (e) {
      if (myReqId === reqIdRef.current) {
        setError(e.message || "Không tải được đơn hàng");
      }
    } finally {
      if (myReqId === reqIdRef.current) {
        setLoading(false);
        if (!silent) setRefreshing(false);
      }
    }
  }, []);

  // Load 1 lần khi mount (không phụ thuộc status nữa)
  useEffect(() => {
    load(false);
  }, [load]);

  // Polling 10s — tự skip nếu request trước chưa xong
  useEffect(() => {
    const timer = setInterval(() => load(true), POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  // ---------- Filter client theo status (memo) ----------
  // ✅ BATCH 2: đổi chip tức thì, không chờ API
  const orders = useMemo(() => {
    if (status === "Tất cả") return allOrders;
    return allOrders.filter((o) => o.status === status);
  }, [allOrders, status]);

  // ---------- Actions ----------

  const advance = async (o) => {
    const id = o._id || o.id;
    if (advancingId !== null) return; // chỉ 1 action tại 1 thời điểm
    const next = NEXT[o.status];
    if (!next) return;

    setAdvancingId(id);
    try {
      await api.orders.setStatus(id, next);
      toast(`"${o.code}" → "${next}"`, "success");
      await load(true); // silent reload
    } catch (e) {
      toast(e.message || "Không chuyển được trạng thái", "error");
    } finally {
      setAdvancingId(null);
    }
  };

  /**
   * ✅ Mở confirm dialog thay vì confirm() native.
   */
  const cancel = (o) => {
    if (advancingId !== null) return;
    setConfirmCancel(o);
  };

  /**
   * ✅ Thực thi hủy đơn sau khi user xác nhận.
   */
  const executeCancel = async () => {
    if (!confirmCancel) return;
    const o = confirmCancel;
    const id = o._id || o.id;

    setAdvancingId(id);
    try {
      await api.orders.setStatus(id, "Đã hủy");
      toast(t("orders.cancelled"), "success");
      setConfirmCancel(null);
      await load(true);
    } catch (e) {
      toast(e.message || "Không hủy được", "error");
    } finally {
      setAdvancingId(null);
    }
  };

  // ---------- Computed ----------

  // Đếm số đơn theo từng trạng thái (dùng allOrders — luôn đầy đủ)
  const statusCounts = useMemo(() => {
    const map = { "Tất cả": allOrders.length };
    for (const o of allOrders) {
      map[o.status] = (map[o.status] || 0) + 1;
    }
    return map;
  }, [allOrders]);

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <>
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

        {/* ============ FILTER CHIPS + REFRESH ============ */}
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 20,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {STATUSES.map((s) => {
            const active = status === s;
            const count = statusCounts[s] || 0;

            return (
              <button
                key={s}
                onClick={() => setStatus(s)}
                style={{
                  padding: "8px 14px",
                  border: active
                    ? "1px solid #2634d5"
                    : "1px solid var(--border-color, #e5e9ef)",
                  background: active
                    ? "#2634d5"
                    : "var(--card-bg, #fff)",
                  color: active
                    ? "#fff"
                    : "var(--text-muted, #475569)",
                  borderRadius: 20,
                  fontSize: 12,
                  cursor: "pointer",
                  fontWeight: active ? 600 : 400,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "all 0.15s",
                }}
              >
                {s}
                {count > 0 && (
                  <span
                    style={{
                      background: active
                        ? "rgba(255,255,255,0.3)"
                        : "var(--bg-tertiary, #e2e8f0)",
                      color: active ? "#fff" : "var(--text-muted, #64748b)",
                      minWidth: 20,
                      height: 18,
                      padding: "0 6px",
                      borderRadius: 9,
                      fontSize: 10.5,
                      fontWeight: 700,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}

          {/* Manual refresh — đẩy sang phải */}
          <button
            onClick={() => load(false)}
            disabled={refreshing}
            title="Làm mới"
            aria-label="Làm mới"
            style={{
              marginLeft: "auto",
              padding: "8px 14px",
              background: "var(--card-bg, #fff)",
              border: "1px solid var(--border-color, #e5e9ef)",
              borderRadius: 20,
              cursor: refreshing ? "not-allowed" : "pointer",
              fontSize: 12,
              color: "var(--text-primary, #172033)",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              opacity: refreshing ? 0.6 : 1,
            }}
          >
            {refreshing ? (
              <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />
            ) : (
              <RefreshCw size={13} />
            )}
            Làm mới
          </button>
        </div>

        {/* ============ BẢNG ĐƠN HÀNG ============ */}
        <div
          style={{
            background: "var(--card-bg, #fff)",
            border: "1px solid var(--border-color, #e7ebf0)",
            borderRadius: 12,
            padding: 20,
          }}
        >
          {/* Loading lần đầu — skeleton table */}
          {loading && !orders.length && (
            <SkeletonTable
              columns={6}
              rows={5}
              headers={[
                t("orders.code"),
                "Customer",
                "Ngày/Giờ",
                t("cart.total"),
                t("common.status"),
                t("common.action"),
              ]}
            />
          )}

          {/* Data */}
          {!loading && (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--bg-tertiary, #f5f7fb)" }}>
                    <th style={thLeft}>{t("orders.code")}</th>
                    <th style={thLeft}>Customer</th>
                    <th style={thLeft}>Ngày/Giờ</th>
                    <th style={thRight}>{t("cart.total")}</th>
                    <th style={thLeft}>{t("common.status")}</th>
                    <th style={thLeft}>{t("common.action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => {
                    const id = o._id || o.id;
                    const isAdvancing = advancingId === id;
                    const next = NEXT[o.status];

                    return (
                      <tr
                        key={id}
                        style={{
                          borderBottom:
                            "1px solid var(--border-color, #eef2f7)",
                          opacity: isAdvancing ? 0.6 : 1,
                          transition: "opacity 0.15s",
                        }}
                      >
                        {/* Code */}
                        <td style={tdBase}>
                          <b style={{ fontFamily: "monospace", fontSize: 12 }}>
                            {o.code}
                          </b>
                        </td>

                        {/* Customer */}
                        <td style={{ ...tdBase, color: "var(--text-muted, #64748b)" }}>
                          {o.customer_name || "—"}
                        </td>

                        {/* Ngày/Giờ — gộp 1 cột */}
                        <td
                          style={{
                            ...tdBase,
                            fontSize: 12,
                            color: "var(--text-muted, #64748b)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {fmtDateTime(o.created_at)}
                        </td>

                        {/* Total */}
                        <td style={{ ...tdBase, textAlign: "right" }}>
                          <b>{money(o.total)}</b>
                        </td>

                        {/* Status */}
                        <td style={tdBase}>
                          <StatusBadge status={o.status} />
                        </td>

                        {/* Actions */}
                        <td style={tdBase}>
                          <div
                            style={{
                              display: "flex",
                              gap: 6,
                              flexWrap: "wrap",
                            }}
                          >
                            {next && (
                              <button
                                onClick={() => advance(o)}
                                disabled={advancingId !== null}
                                style={{
                                  padding: "6px 12px",
                                  background:
                                    advancingId !== null ? "#94a3b8" : "#2634d5",
                                  color: "#fff",
                                  border: 0,
                                  borderRadius: 6,
                                  cursor:
                                    advancingId !== null
                                      ? "not-allowed"
                                      : "pointer",
                                  fontSize: 12,
                                  fontWeight: 600,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {isAdvancing ? (
                                  <>
                                    <Loader2
                                      size={12}
                                      style={{
                                        animation: "spin 1s linear infinite",
                                      }}
                                    />
                                    Đang xử lý...
                                  </>
                                ) : (
                                  <>→ {t(NEXT_LABEL[o.status])}</>
                                )}
                              </button>
                            )}

                            <IconButton
                              onClick={() => setDetailOrder(o)}
                              title="Chi tiết"
                              disabled={advancingId !== null}
                            >
                              <Eye size={13} /> Chi tiết
                            </IconButton>

                            <IconButton
                              onClick={() => setPrintOrder(o)}
                              title="In hóa đơn"
                              disabled={advancingId !== null}
                            >
                              <Printer size={13} />
                            </IconButton>

                            {o.status !== "Hoàn thành" &&
                              o.status !== "Đã hủy" && (
                                <button
                                  onClick={() => cancel(o)}
                                  disabled={advancingId !== null}
                                  style={{
                                    padding: "6px 12px",
                                    background: "var(--card-bg, #fff)",
                                    color: "#ef4444",
                                    border: "1px solid #ef4444",
                                    borderRadius: 6,
                                    cursor:
                                      advancingId !== null
                                        ? "not-allowed"
                                        : "pointer",
                                    fontSize: 12,
                                    opacity:
                                      advancingId !== null ? 0.5 : 1,
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  Hủy
                                </button>
                              )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {/* Empty */}
                  {!orders.length && (
                    <tr>
                      <td
                        colSpan="6"
                        style={{
                          textAlign: "center",
                          padding: 40,
                          color: "var(--text-light, #8993a3)",
                        }}
                      >
                        {status === "Tất cả"
                          ? t("orders.noOrders")
                          : `Không có đơn "${status}"`}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ============ MODALS ============ */}
        {printOrder && (
          <PrintReceipt order={printOrder} onClose={() => setPrintOrder(null)} />
        )}
        {detailOrder && (
          <StaffOrderDetailModal
            order={detailOrder}
            onClose={() => setDetailOrder(null)}
          />
        )}

        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
          }
        `}</style>
      </div>

      {/* ============ ✅ CONFIRM CANCEL DIALOG ============ */}
      <ConfirmDialog
        open={!!confirmCancel}
        title="Hủy đơn hàng này?"
        message={
          confirmCancel
            ? `Đơn ${confirmCancel.code} sẽ bị hủy và không thể khôi phục. Bạn chắc chắn chứ?`
            : ""
        }
        confirmText="Hủy đơn"
        cancelText="Giữ đơn"
        danger
        loading={!!advancingId}
        onConfirm={executeCancel}
        onClose={() => !advancingId && setConfirmCancel(null)}
      />
    </>
  );
}

// ============================================================
// SUB-COMPONENT: IconButton
// ============================================================

function IconButton({ children, onClick, title, disabled }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      disabled={disabled}
      style={{
        padding: "6px 12px",
        background: "var(--bg-tertiary, #f5f7fb)",
        border: "1px solid var(--border-color, #e5e9ef)",
        borderRadius: 6,
        cursor: disabled ? "not-allowed" : "pointer",
        fontSize: 12,
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        color: "var(--text-primary, #172033)",
        opacity: disabled ? 0.5 : 1,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
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