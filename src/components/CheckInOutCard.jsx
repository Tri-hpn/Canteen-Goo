// ============================================================
// CHECKINOUTCARD.JSX — Card chấm công (dùng trong EmployeeHome)
// ============================================================
// - Đồng hồ realtime + auto-detect ca theo giờ
// - Countdown đến ca tiếp theo (nếu có)
// - Danh sách 3 ca hôm nay + trạng thái check-in/out
// - Nút Check-in / Check-out cho ca hiện tại
// - Nút "Check-in sớm" ca tiếp theo (nếu đã out ca hiện tại)
//
// Fixes (so với bản gốc):
//   - 🔴 Fix JSX lowercase: <currentShift.icon /> → CurrentIcon component
//   - 🔴 Fix timezone: getLocalDateStr() thay vì toISOString()
//   - 🔴 Dùng CSS variable → dark mode hoạt động
//   - Error state + nút retry (không silent fail)
//   - Race-safe loadData (reqIdRef + inFlightRef)
//   - Guard double-submit (actionLoadingId)
//   - Clock pause khi tab ẩn (visibilitychange)
//   - Loading state ban đầu
//   - fmt() xử lý date-only string + Invalid Date
//   - Memo computed values
//   - ✨ Countdown đến ca tiếp theo
// ============================================================

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import {
  LogIn, LogOut, Clock, Sunrise, Sun, Moon,
  Loader2, AlertCircle, RefreshCw, Timer,
} from "lucide-react";
import { api } from "../api";
import { toast } from "./Effects";

// ============================================================
// CONSTANTS
// ============================================================

const SHIFTS = [
  {
    id: "Ca sáng",
    startHour: 6,
    endHour: 12,
    icon: Sunrise,
    color: "#f59e0b",
    time: "06:00 - 12:00",
  },
  {
    id: "Ca chiều",
    startHour: 12,
    endHour: 18,
    icon: Sun,
    color: "#2634d5",
    time: "12:00 - 18:00",
  },
  {
    id: "Ca tối",
    startHour: 18,
    endHour: 22,
    icon: Moon,
    color: "#8b5cf6",
    time: "18:00 - 22:00",
  },
];

// Ngưỡng cảnh báo: nếu còn dưới X phút đến ca → highlight
const WARN_BEFORE_MIN = 30;

// ============================================================
// HELPERS (timezone-safe)
// ============================================================

/**
 * Lấy "YYYY-MM-DD" theo LOCAL time.
 * KHÔNG dùng toISOString() — sẽ lệch ngày sau 17h VN (UTC+7).
 */
function getLocalDateStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dt = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dt}`;
}

function getCurrentShift(now = new Date()) {
  const h = now.getHours();
  if (h >= 6 && h < 12) return SHIFTS[0];
  if (h >= 12 && h < 18) return SHIFTS[1];
  if (h >= 18 && h < 22) return SHIFTS[2];
  return null;
}

function getNextShift(now = new Date()) {
  const h = now.getHours();
  if (h < 6) return SHIFTS[0];
  if (h < 12) return SHIFTS[1];
  if (h < 18) return SHIFTS[2];
  return null; // sau 18h không còn ca tiếp trong ngày
}

/**
 * Format thời gian từ ISO hoặc Date.
 * Trả về "HH:MM" hoặc "—" nếu rỗng.
 */
function fmt(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function statusColor(s) {
  if (s === "Đúng giờ") return "#18a967";
  if (s === "Đi muộn") return "#f59e0b";
  return "#ef4444";
}

/**
 * Format khoảng thời gian còn lại thành text.
 *  - > 60 phút: "X giờ Y phút"
 *  - <= 60 phút: "X phút"
 */
function fmtCountdown(ms) {
  if (ms <= 0) return "0 phút";
  const totalMin = Math.round(ms / 60000);
  if (totalMin < 60) return `${totalMin} phút`;

  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (m === 0) return `${h} giờ`;
  return `${h} giờ ${m} phút`;
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function CheckInOutCard() {
  // ---------- Data ----------
  const [attendances, setAttendances] = useState([]);
  const [myShifts, setMyShifts] = useState([]);

  // ---------- State ----------
  const [now, setNow] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [tabVisible, setTabVisible] = useState(
    typeof document === "undefined" || !document.hidden
  );

  // ---------- Refs ----------
  const reqIdRef = useRef(0);
  const inFlightRef = useRef(false);

  // ---------- Load data (race-safe) ----------

  const loadData = useCallback(async (silent = false) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    const myReqId = ++reqIdRef.current;
    if (!silent) setRefreshing(true);
    setError("");

    try {
      const [atts, shifts] = await Promise.all([
        api.attendance.me().catch(() => []),
        api.shifts.mine().catch(() => []),
      ]);

      if (myReqId !== reqIdRef.current) return;

      setAttendances(Array.isArray(atts) ? atts : []);
      setMyShifts(Array.isArray(shifts) ? shifts : []);
    } catch (e) {
      if (myReqId === reqIdRef.current) {
        setError(e.message || "Không tải được dữ liệu chấm công");
      }
    } finally {
      if (myReqId === reqIdRef.current) {
        setLoading(false);
        if (!silent) setRefreshing(false);
      }
      inFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  // ---------- Clock (pause khi tab ẩn) ----------

  useEffect(() => {
    if (!tabVisible) return;
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, [tabVisible]);

  useEffect(() => {
    const handler = () => setTabVisible(!document.hidden);
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  // ---------- Derived (memo) ----------

  const todayStr = useMemo(() => getLocalDateStr(now), [now]);

  const todayAtts = useMemo(
    () => attendances.filter((a) => a.date === todayStr),
    [attendances, todayStr]
  );

  const currentShift = useMemo(() => getCurrentShift(now), [now]);
  const nextShift = useMemo(() => getNextShift(now), [now]);

  const currentAtt = useMemo(
    () =>
      currentShift
        ? todayAtts.find((a) => a.shift === currentShift.id)
        : null,
    [currentShift, todayAtts]
  );

  const canCheckIn = !!(currentShift && !currentAtt?.checkIn);
  const canCheckOut = !!(currentAtt?.checkIn && !currentAtt?.checkOut);
  const canCheckInNext = !!(
    currentShift &&
    currentAtt?.checkOut &&
    nextShift &&
    !todayAtts.find((a) => a.shift === nextShift.id)?.checkIn
  );

  // ---------- Countdown đến ca tiếp theo ----------

  const nextShiftInfo = useMemo(() => {
    if (!nextShift) return null;

    // Thời điểm bắt đầu ca tiếp theo (hôm nay)
    const target = new Date(now);
    target.setHours(nextShift.startHour, 0, 0, 0);

    // Nếu giờ bắt đầu đã qua → ca tiếp theo là NGÀY MAI
    if (target.getTime() <= now.getTime()) {
      target.setDate(target.getDate() + 1);
    }

    const diffMs = target.getTime() - now.getTime();
    const diffMin = Math.round(diffMs / 60000);

    return {
      target,
      diffMs,
      diffMin,
      isImminent: diffMin <= WARN_BEFORE_MIN, // sắp đến (< 30 phút)
      isTomorrow: target.getDate() !== now.getDate(),
      label: fmtCountdown(diffMs),
    };
  }, [nextShift, now]);

  // ---------- Actions ----------

  const action = useCallback(
    async (type, shiftId) => {
      if (!shiftId || actionLoadingId) return;

      setActionLoadingId(`${type}-${shiftId}`);
      try {
        const fn =
          type === "in" ? api.attendance.checkIn : api.attendance.checkOut;
        await fn({ shift: shiftId });
        toast(
          type === "in"
            ? `Check-in ${shiftId} thành công!`
            : `Check-out ${shiftId} thành công!`,
          "success"
        );
        await loadData(true);
      } catch (e) {
        toast(e.message || "Lỗi chấm công", "error");
      } finally {
        setActionLoadingId(null);
      }
    },
    [actionLoadingId, loadData]
  );

  // ---------- Render time strings ----------

  const time = now.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const date = now.toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div style={cardStyle}>
      {/* ============ CLOCK ============ */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          paddingBottom: 16,
          borderBottom: "1px solid var(--border-color, #eef2f7)",
        }}
      >
        <Clock size={20} style={{ color: "#2634d5", flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <b
  aria-live="off"
  className="checkin-clock"
  style={{
    fontSize: 22,   // ← fallback, sẽ bị override bởi CSS
    fontVariantNumeric: "tabular-nums",
    display: "block",
    color: "var(--text-primary, #172033)",
  }}
>
  {time}
</b>
          <span
            style={{
              fontSize: 12,
              color: "var(--text-muted, #8993a3)",
              textTransform: "capitalize",
            }}
          >
            {date}
          </span>
        </div>

        <button
          onClick={() => loadData(false)}
          disabled={refreshing}
          title="Làm mới"
          aria-label="Làm mới"
          type="button"
          style={{
            padding: 6,
            background: "transparent",
            border: "1px solid var(--border-color, #e5e9ef)",
            borderRadius: 6,
            cursor: refreshing ? "not-allowed" : "pointer",
            color: "var(--text-muted, #64748b)",
            display: "grid",
            placeItems: "center",
            opacity: refreshing ? 0.5 : 1,
          }}
        >
          {refreshing ? (
            <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
          ) : (
            <RefreshCw size={14} />
          )}
        </button>
      </div>

      {/* ============ ERROR ============ */}
      {error && (
        <div
          style={{
            marginTop: 12,
            background: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            borderRadius: 10,
            padding: "10px 14px",
            color: "#ef4444",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
          }}
        >
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{error}</span>
          <button
            onClick={() => loadData(false)}
            type="button"
            style={{
              padding: "4px 10px",
              background: "#ef4444",
              color: "#fff",
              border: 0,
              borderRadius: 6,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 11,
            }}
          >
            Thử lại
          </button>
        </div>
      )}

      {/* ============ LOADING ============ */}
      {loading && !error && (
        <div
          style={{
            textAlign: "center",
            padding: "24px 0",
            color: "var(--text-muted, #8993a3)",
            fontSize: 13,
          }}
        >
          <Loader2
            size={22}
            style={{ animation: "spin 1s linear infinite", marginBottom: 6 }}
          />
          <div>Đang tải...</div>
        </div>
      )}

      {/* ============ COUNTDOWN CA TIẾP THEO ============ */}
      {!loading && nextShiftInfo && nextShift && (
        <div
          style={{
            marginTop: 14,
            padding: "10px 14px",
            background: nextShiftInfo.isImminent
              ? "linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(239, 68, 68, 0.10))"
              : "var(--bg-tertiary, #f8fafc)",
            border: nextShiftInfo.isImminent
              ? "1px solid rgba(245, 158, 11, 0.5)"
              : "1px solid var(--border-color, #eef2f7)",
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: nextShiftInfo.isImminent
                ? "#f59e0b"
                : nextShift.color + "20",
              color: nextShiftInfo.isImminent ? "#fff" : nextShift.color,
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
              animation: nextShiftInfo.isImminent
                ? "pulse 1.5s ease-in-out infinite"
                : "none",
            }}
          >
            <Timer size={16} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 11,
                color: nextShiftInfo.isImminent
                  ? "#92400e"
                  : "var(--text-muted, #8993a3)",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 2,
              }}
            >
              {nextShiftInfo.isTomorrow
                ? "Ca tiếp theo (ngày mai)"
                : "Ca tiếp theo"}
            </div>
            <div
              style={{
                fontSize: 13,
                color: "var(--text-primary, #172033)",
                fontWeight: 600,
              }}
            >
              {nextShift.id} — còn{" "}
              <span
                style={{
                  color: nextShiftInfo.isImminent
                    ? "#f59e0b"
                    : nextShift.color,
                  fontWeight: 800,
                }}
              >
                {nextShiftInfo.label}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ============ CA HIỆN TẠI ============ */}
      {!loading && currentShift && (
        <div
          style={{
            marginTop: 16,
            padding: 14,
            background: currentShift.color + "12",
            border: `1px solid ${currentShift.color}40`,
            borderRadius: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 6,
            }}
          >
            <CurrentIcon shift={currentShift} />
            <span
              style={{
                fontSize: 11,
                color: currentShift.color,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              Ca hiện tại
            </span>
          </div>
          <b
            style={{
              fontSize: 15,
              color: "var(--text-primary, #172033)",
              display: "block",
              marginBottom: 4,
            }}
          >
            {currentShift.id} — {currentShift.time}
          </b>
          {currentAtt && (
            <div
              style={{
                fontSize: 11,
                color: "var(--text-muted, #64748b)",
                marginTop: 4,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              {currentAtt.checkIn && (
                <span>Check-in: {fmt(currentAtt.checkIn)}</span>
              )}
              {currentAtt.checkOut && (
                <span>· Check-out: {fmt(currentAtt.checkOut)}</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* ============ DANH SÁCH 3 CA HÔM NAY ============ */}
      {!loading && (
        <div style={{ marginTop: 16 }}>
          <div
            style={{
              fontSize: 11,
              color: "var(--text-muted, #8993a3)",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              marginBottom: 8,
            }}
          >
            Chấm công hôm nay
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {SHIFTS.map((s) => {
              const att = todayAtts.find((a) => a.shift === s.id);
              const Icon = s.icon;

              return (
                <div
                  key={s.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    background: "var(--bg-tertiary, #f8fafc)",
                    borderRadius: 10,
                    border: `1px solid ${
                      att
                        ? statusColor(att.status) + "40"
                        : "var(--border-color, #eef2f7)"
                    }`,
                  }}
                >
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      background: s.color + "20",
                      color: s.color,
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={15} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b
                      style={{
                        fontSize: 12.5,
                        color: "var(--text-primary, #172033)",
                        display: "block",
                      }}
                    >
                      {s.id}
                    </b>
                    <span
                      style={{
                        fontSize: 10.5,
                        color: "var(--text-light, #94a3b8)",
                      }}
                    >
                      {s.time}
                    </span>
                  </div>
                  {att ? (
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--text-primary, #172033)",
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {fmt(att.checkIn)}
                        {att.checkOut && " → " + fmt(att.checkOut)}
                      </div>
                      <span
                        style={{
                          fontSize: 9.5,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 10,
                          background: statusColor(att.status) + "20",
                          color: statusColor(att.status),
                          whiteSpace: "nowrap",
                        }}
                      >
                        {att.status}
                      </span>
                    </div>
                  ) : (
                    <span
                      style={{
                        fontSize: 10,
                        color: "var(--text-light, #94a3b8)",
                        flexShrink: 0,
                      }}
                    >
                      Chưa chấm công
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============ NÚT CHECK-IN / CHECK-OUT ============ */}
{!loading && (
  <div
    className="checkin-action-grid"
    style={{ marginTop: 16 }}
  >
          <button
            disabled={!canCheckIn || actionLoadingId !== null}
            onClick={() => action("in", currentShift?.id)}
            type="button"
            style={{
              padding: 12,
              background: canCheckIn ? "#18a967" : "#94a3b8",
              color: "#fff",
              border: 0,
              borderRadius: 10,
              fontWeight: 700,
              cursor:
                !canCheckIn || actionLoadingId ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              fontSize: 13,
              opacity: actionLoadingId ? 0.7 : 1,
            }}
          >
            {actionLoadingId === `in-${currentShift?.id}` ? (
              <>
                <Loader2
                  size={16}
                  style={{ animation: "spin 1s linear infinite" }}
                />
                Đang xử lý...
              </>
            ) : (
              <>
                <LogIn size={16} />{" "}
                {canCheckIn
                  ? "Check-in " + currentShift.id.replace("Ca ", "")
                  : "Đã check-in"}
              </>
            )}
          </button>

          <button
            disabled={!canCheckOut || actionLoadingId !== null}
            onClick={() => action("out", currentShift?.id)}
            type="button"
            style={{
              padding: 12,
              background: canCheckOut ? "#f59e0b" : "#94a3b8",
              color: "#fff",
              border: 0,
              borderRadius: 10,
              fontWeight: 700,
              cursor:
                !canCheckOut || actionLoadingId ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              fontSize: 13,
              opacity: actionLoadingId ? 0.7 : 1,
            }}
          >
            {actionLoadingId === `out-${currentShift?.id}` ? (
              <>
                <Loader2
                  size={16}
                  style={{ animation: "spin 1s linear infinite" }}
                />
                Đang xử lý...
              </>
            ) : (
              <>
                <LogOut size={16} />{" "}
                {canCheckOut ? "Check-out" : "Đã check-out"}
              </>
            )}
          </button>
        </div>
      )}

      {/* ============ CHECK-IN SỚM CA TIẾP ============ */}
      {!loading && canCheckInNext && (
        <button
          onClick={() => action("in", nextShift.id)}
          disabled={actionLoadingId !== null}
          type="button"
          style={{
            width: "100%",
            marginTop: 10,
            padding: 11,
            background:
              actionLoadingId !== null
                ? "#94a3b8"
                : `linear-gradient(135deg, ${nextShift.color}, ${nextShift.color}dd)`,
            color: "#fff",
            border: 0,
            borderRadius: 10,
            fontWeight: 700,
            cursor: actionLoadingId ? "not-allowed" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            fontSize: 13,
          }}
        >
          {actionLoadingId === `in-${nextShift.id}` ? (
            <>
              <Loader2
                size={15}
                style={{ animation: "spin 1s linear infinite" }}
              />
              Đang xử lý...
            </>
          ) : (
            <>
              <LogIn size={15} /> Check-in sớm {nextShift.id} ({nextShift.time})
            </>
          )}
        </button>
      )}

      {/* ============ HINT ============ */}
      <p
        style={{
          fontSize: 11,
          color: "var(--text-light, #8993a3)",
          marginTop: 12,
          marginBottom: 0,
          textAlign: "center",
        }}
      >
        Mỗi ca cần check-in/check-out riêng. Đi muộn sau 15 phút.
      </p>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.08); }
        }
      `}</style>
    </div>
  );
}

// ============================================================
// SUB-COMPONENT: CurrentIcon
// ============================================================
// Tách riêng để tránh bug JSX lowercase.
// ============================================================

function CurrentIcon({ shift }) {
  const Icon = shift.icon;
  if (!Icon) return null;
  return <Icon size={16} style={{ color: shift.color }} />;
}

// ============================================================
// STYLE CONSTANTS
// ============================================================

const cardStyle = {
  background: "var(--card-bg, #fff)",
  border: "1px solid var(--border-color, #e7ebf0)",
  borderRadius: 16,
  padding: 22,
  boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
};