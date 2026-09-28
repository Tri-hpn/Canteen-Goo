// ============================================================
// EMPLOYEECHECKINOUT.JSX — Chấm công nhân viên
// ============================================================
// Tính năng:
//   - Đồng hồ realtime + auto-detect ca theo giờ
//   - Check-in / Check-out (validate ca, loading riêng)
//   - ✅ CHỈ cho check-in khi có ca APPROVED hôm nay
//   - Xem ca sắp tới + đăng ký ca tuần sau (modal)
//   - Lịch sử chấm công theo tháng + search
//   - Thông báo nhắc trước ca 30 phút
//
// FIX v3 (triệt để):
//   - 🔴 Cột phải KHÔNG render gì khi chưa có ca approved
//   - 🔴 Không hiện badge "Đi muộn"/"Check-in 06:38" khi chưa có ca
//   - 🔴 Empty state duy nhất ở đầu, khớp với trang Tổng quan
// ============================================================

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import {
  Calendar, Clock, TrendingUp, AlertTriangle, Search,
  LogIn, LogOut, Sunrise, Sun, BellRing, CheckCircle2,
  PlusCircle, ClipboardList, X, Save, CalendarDays, AlertCircle, Loader2,
} from "lucide-react";
import { api } from "../../api";
import { toast } from "../../components/Effects";

// ============================================================
// CONSTANTS
// ============================================================

const SHIFTS = [
  { id: "Ca sáng",  label: "Ca sáng",  time: "06:30 - 12:30", startHour: 6,  startMin: 30, endHour: 12, endMin: 30, icon: Sunrise, color: "#f59e0b" },
  { id: "Ca chiều", label: "Ca chiều", time: "12:30 - 18:30", startHour: 12, startMin: 30, endHour: 18, endMin: 30, icon: Sun,     color: "#2634d5" },
];

const MODAL_Z = 2147483600;
const REFRESH_MS = 30000;

// ============================================================
// HELPERS (timezone-safe)
// ============================================================

function getToday() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dt = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dt}`;
}

function getTomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dt = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dt}`;
}

function fmt(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function fmtDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

function getNextWeekDays() {
  const d = new Date();
  const day = d.getDay();
  const daysUntilMon = day === 0 ? 1 : 8 - day;
  const nextMon = new Date(d);
  nextMon.setDate(d.getDate() + daysUntilMon);
  nextMon.setHours(0, 0, 0, 0);

  const arr = [];
  for (let i = 0; i < 7; i++) {
    const dd = new Date(nextMon);
    dd.setDate(nextMon.getDate() + i);
    const y = dd.getFullYear();
    const m = String(dd.getMonth() + 1).padStart(2, "0");
    const dt = String(dd.getDate()).padStart(2, "0");
    arr.push(`${y}-${m}-${dt}`);
  }
  return arr;
}

function getAutoShift() {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const hhmm = (h, m) => h * 60 + m;
  if (minutes >= hhmm(6, 30) && minutes < hhmm(12, 30)) return "Ca sáng";
  if (minutes >= hhmm(12, 30) && minutes < hhmm(18, 30)) return "Ca chiều";
  return "Ngoài giờ";
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function EmployeeCheckInOut() {
  // ---------- Data ----------
  const [today, setToday] = useState(null);
  const [list, setList] = useState([]);
  const [myShifts, setMyShifts] = useState([]);
  const [approvedShifts, setApprovedShifts] = useState([]);
  const [approvedLoading, setApprovedLoading] = useState(true);
  const [approvedError, setApprovedError] = useState("");

  // ---------- Filters ----------
  const [month, setMonth] = useState(() => getToday().slice(0, 7));
  const [search, setSearch] = useState("");

  // ---------- Clock / check-in ----------
  const [now, setNow] = useState(new Date());
  const [selectedShift, setSelectedShift] = useState(getAutoShift());
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  // ---------- Modal ----------
  const [showRegister, setShowRegister] = useState(false);

  // Refs
  const notifiedRef = useRef({});
  const lastDayRef = useRef(getToday());

  // ---------- Loaders ----------

  const loadToday = useCallback(async () => {
    try {
      const data = await api.attendance.today();
      setToday(data);
    } catch {
      setToday(null);
    }
  }, []);

  const loadList = useCallback(async () => {
    try {
      const data = await api.attendance.me();
      const sorted = [...(data || [])].sort((a, b) =>
        String(b.date || "").localeCompare(String(a.date || ""))
      );
      setList(sorted);
    } catch {
      setList([]);
    }
  }, []);

  const loadShifts = useCallback(async () => {
    try {
      const data = await api.shifts.mine();
      setMyShifts(Array.isArray(data) ? data : []);
    } catch {
      setMyShifts([]);
    }
  }, []);

  const loadApprovedShifts = useCallback(async () => {
    setApprovedLoading(true);
    setApprovedError("");
    try {
      const data = await api.shifts.approvedToday();
      setApprovedShifts(Array.isArray(data) ? data : []);
    } catch (e) {
      setApprovedError(e.message || "Không tải được ca");
      setApprovedShifts([]);
    } finally {
      setApprovedLoading(false);
    }
  }, []);

  // Initial load + auto-refresh
  useEffect(() => {
    loadToday();
    loadList();
    loadShifts();
    loadApprovedShifts();

    const interval = setInterval(() => {
      loadToday();
      loadShifts();
      loadApprovedShifts();
    }, REFRESH_MS);
    return () => clearInterval(interval);
  }, [loadToday, loadList, loadShifts, loadApprovedShifts]);

  // Real-time clock (1s)
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Auto-select ca approved đầu tiên
  useEffect(() => {
    if (!approvedShifts.length) return;
    const isCurrentApproved = approvedShifts.some(
      (s) => s.shift === selectedShift
    );
    if (!isCurrentApproved) {
      setSelectedShift(approvedShifts[0].shift);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approvedShifts]);

  // ---------- Nhắc ca trước 30 phút ----------
  useEffect(() => {
    if (!approvedShifts.length) return;

    const check = () => {
      const todayStr = getToday();

      if (lastDayRef.current !== todayStr) {
        notifiedRef.current = {};
        lastDayRef.current = todayStr;
      }

      const nowMs = Date.now();
      approvedShifts
        .filter((s) => s.date === todayStr && s.status === "approved")
        .forEach((s) => {
          const shift = SHIFTS.find((x) => x.id === s.shift);
          if (!shift) return;

          const startTime = new Date(todayStr + "T00:00:00");
          startTime.setHours(shift.startHour, shift.startMin ?? 0, 0, 0);
          const diffMin = Math.round((startTime.getTime() - nowMs) / 60000);
          const key = `${s.id}-30min`;

          if (diffMin > 25 && diffMin <= 30 && !notifiedRef.current[key]) {
            notifiedRef.current[key] = true;
            toast(
              `🔔 Sắp đến ${s.shift} (${shift.time}) — còn ${diffMin} phút!`,
              "info"
            );
          }
        });
    };

    check();
    const t = setInterval(check, 60000);
    return () => clearInterval(t);
  }, [approvedShifts]);

  // ---------- Handlers ----------

  const handleCheckIn = async () => {
    if (checkingIn || checkingOut) return;

    if (!approvedShifts.length) {
      toast("Bạn chưa có ca được duyệt hôm nay", "error");
      return;
    }

    if (!selectedShift || selectedShift === "Ngoài giờ") {
      toast("Vui lòng chọn ca làm hợp lệ", "error");
      return;
    }

    const isApproved = approvedShifts.some((s) => s.shift === selectedShift);
    if (!isApproved) {
      toast(`Bạn chưa được duyệt ${selectedShift} hôm nay`, "error");
      return;
    }

    setCheckingIn(true);
    try {
      const res = await api.attendance.checkIn({ shift: selectedShift });
      setToday(res.attendance);
      toast(`Check-in ${selectedShift} thành công!`, "success");
      loadList();
    } catch (e) {
      toast(e.message || "Lỗi check-in", "error");
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    if (checkingIn || checkingOut) return;

    setCheckingOut(true);
    try {
      const res = await api.attendance.checkOut({});
      setToday(res.attendance);
      toast("Check-out thành công!", "success");
      loadList();
    } catch (e) {
      toast(e.message || "Lỗi check-out", "error");
    } finally {
      setCheckingOut(false);
    }
  };

  // ---------- Computed (memo) ----------

  const filtered = useMemo(() => {
    return list.filter((a) => {
      if (!a.date?.startsWith(month)) return false;
      if (search && !a.date?.includes(search)) return false;
      return true;
    });
  }, [list, month, search]);

  const stats = useMemo(() => {
    let total = 0;
    let onTime = 0;
    let late = 0;
    let totalHours = 0;

    for (const a of filtered) {
      total++;
      if (a.status === "Đúng giờ") onTime++;
      if (a.status === "Đi muộn" || a.status === "Đi muộn · Về sớm") late++;
      totalHours += Number(a.hours) || 0;
    }
    return { total, onTime, late, totalHours };
  }, [filtered]);

  const nextShift = useMemo(() => {
    if (!myShifts.length) return null;
    const nowMs = Date.now();

    const upcoming = myShifts
      .filter((s) => s.status === "approved")
      .map((s) => {
        const shift = SHIFTS.find((x) => x.id === s.shift);
        if (!shift) return null;

        const startTime = new Date(s.date + "T00:00:00");
        startTime.setHours(shift.startHour, shift.startMin ?? 0, 0, 0);
        return {
          ...s,
          _startTime: startTime,
          _shift: shift,
          _diffMs: startTime.getTime() - nowMs,
        };
      })
      .filter((x) => x && x._diffMs > -60 * 60 * 1000)
      .sort((a, b) => a._startTime - b._startTime);

    return upcoming[0] || null;
  }, [myShifts, now]);

  const groupedMyShifts = useMemo(() => {
    const map = {};
    for (const s of myShifts) {
      if (!map[s.date]) map[s.date] = [];
      map[s.date].push(s);
    }

    const todayStr = getToday();
    const tomorrowStr = getTomorrow();
    const shiftOrder = { "Ca sáng": 1, "Ca chiều": 2 };

    return Object.keys(map)
      .sort((a, b) => a.localeCompare(b))
      .slice(0, 10)
      .map((date) => {
        const d = new Date(date + "T00:00:00");

        let badge = null;
        let badgeColor = "#2634d5";
        if (date === todayStr) {
          badge = "Hôm nay";
          badgeColor = "#18a967";
        } else if (date === tomorrowStr) {
          badge = "Ngày mai";
          badgeColor = "#f59e0b";
        }

        const shifts = map[date]
          .slice()
          .sort(
            (a, b) =>
              (shiftOrder[a.shift] || 99) - (shiftOrder[b.shift] || 99)
          );

        return {
          date,
          weekdayShort: d.toLocaleDateString("vi-VN", { weekday: "short" }),
          dayNum: String(d.getDate()).padStart(2, "0"),
          monthNum: String(d.getMonth() + 1).padStart(2, "0"),
          badge,
          badgeColor,
          shifts,
        };
      });
  }, [myShifts]);

  const timeStr = now.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const dateStr = now.toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  // ---------- Style helpers ----------

  const statusColor = (s) => {
    if (s === "Đúng giờ") return { bg: "#d1fae5", color: "#065f46" };
    if (s === "Đi muộn") return { bg: "#fef3c7", color: "#92400e" };
    if (s === "Về sớm") return { bg: "#dbeafe", color: "#1e40af" };
    if (s === "Đi muộn · Về sớm") return { bg: "#fee2e2", color: "#991b1b" };
    return { bg: "#fee2e2", color: "#991b1b" };
  };

  const shiftColor = (s) => {
    if (s === "Ca sáng") return { bg: "#fef3c7", color: "#92400e" };
    if (s === "Ca chiều") return { bg: "#dbeafe", color: "#1e40af" };
    return { bg: "#f1f5f9", color: "#475569" };
  };

  // ✅ NEW: flag để ẩn toàn bộ info khi chưa có ca
  const hasApprovedShift = approvedShifts.length > 0;
  const showEmptyState = !approvedLoading && !hasApprovedShift;

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div>
      {/* ============ THÔNG BÁO CA SẮP DIỄN RA ============ */}
      {nextShift &&
        nextShift._diffMs > 0 &&
        nextShift._diffMs <= 30 * 60 * 1000 && (
          <div
            style={{
              marginBottom: 16,
              padding: "14px 18px",
              background:
                "linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(239, 68, 68, 0.15))",
              border: "2px solid #f59e0b",
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "#f59e0b",
                color: "#fff",
                display: "grid",
                placeItems: "center",
                animation: "pulse 1.5s infinite",
              }}
            >
              <BellRing size={22} />
            </div>
            <div style={{ flex: 1 }}>
              <b style={{ color: "#92400e", fontSize: 15, display: "block" }}>
                🔔 Sắp đến {nextShift.shift} ({nextShift._shift.time})
              </b>
              <span style={{ color: "#78350f", fontSize: 13 }}>
                Còn {Math.round(nextShift._diffMs / 60000)} phút nữa — chuẩn bị
                check-in nhé!
              </span>
            </div>
          </div>
        )}

      {/* ============ KHUNG CHÍNH: ĐỒNG HỒ + CHECK-IN/OUT ============ */}
      <div
        className="checkin-grid"
        style={{
          background: "var(--card-bg, #fff)",
          border: "1px solid var(--border-color, #e7ebf0)",
          borderRadius: 16,
          padding: 24,
          marginBottom: 20,
        }}
      >
        {/* ----- Cột trái: đồng hồ ----- */}
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 10,
            }}
          >
            <Clock size={20} style={{ color: "#2634d5" }} />
            <span
              style={{
                fontSize: 12,
                color: "var(--text-muted, #64748b)",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              Giờ hiện tại
            </span>
          </div>

          <div className="checkin-clock">{timeStr}</div>
          <div
            style={{
              fontSize: 13,
              color: "var(--text-muted, #64748b)",
              marginTop: 8,
              textTransform: "capitalize",
            }}
          >
            {dateStr}
          </div>

          {nextShift ? (
            <div
              style={{
                marginTop: 16,
                padding: 14,
                background: nextShift._shift.color + "15",
                border: "1px solid " + nextShift._shift.color + "40",
                borderRadius: 10,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: nextShift._shift.color,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  marginBottom: 4,
                }}
              >
                📅 Ca sắp tới
              </div>
              <b
                style={{
                  fontSize: 15,
                  color: "var(--text-primary, #172033)",
                  display: "block",
                }}
              >
                {nextShift.shift} — {nextShift._shift.time}
              </b>
              <span style={{ fontSize: 12, color: "var(--text-muted, #64748b)" }}>
                {fmtDate(nextShift.date)}
                {nextShift._diffMs > 0 &&
                  " · còn " + Math.round(nextShift._diffMs / 60000) + " phút"}
                {nextShift._diffMs <= 0 &&
                  nextShift._diffMs > -60 * 60 * 1000 &&
                  " · đang trong ca"}
              </span>
            </div>
          ) : (
            <div
              style={{
                marginTop: 16,
                padding: 14,
                background: "var(--bg-tertiary, #f5f7fb)",
                borderRadius: 10,
                fontSize: 12,
                color: "var(--text-muted, #64748b)",
              }}
            >
              💡 Chưa có ca làm nào được phân
            </div>
          )}
        </div>

        {/* ----- Cột phải: check-in/out ----- */}
        <div>
          <div
            style={{
              fontSize: 12,
              color: "var(--text-muted, #64748b)",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 1,
              marginBottom: 12,
            }}
          >
            Hôm nay
          </div>

          {/* ============================================================
              ✅ FIX TRIỆT ĐỂ: Chưa có ca approved → chỉ hiện empty state
              (KHÔNG hiện Check-in/out, KHÔNG hiện badge, KHÔNG hiện "Ca sáng")
              ============================================================ */}
          {showEmptyState ? (
            <div
              style={{
                padding: "28px 20px",
                background: "rgba(245, 158, 11, 0.08)",
                border: "1px dashed rgba(245, 158, 11, 0.5)",
                borderRadius: 12,
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
              }}
            >
              <AlertTriangle
                size={30}
                style={{ color: "#f59e0b", opacity: 0.8 }}
              />
              <b
                style={{
                  fontSize: 14.5,
                  color: "#92400e",
                  display: "block",
                }}
              >
                Chưa có ca được duyệt hôm nay
              </b>
              <span
                style={{
                  fontSize: 12.5,
                  color: "#78350f",
                  lineHeight: 1.55,
                  maxWidth: 300,
                }}
              >
                Vui lòng liên hệ admin để được phân ca trước khi check-in.
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: "#92400e",
                  opacity: 0.85,
                  marginTop: 4,
                  fontStyle: "italic",
                }}
              >
                Chỉ check-in được ca admin đã duyệt. Đi muộn sau 15 phút.
              </span>
            </div>
          ) : (
            <>
              {/* Trạng thái hôm nay */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  marginBottom: 16,
                }}
              >
                <Row label="Check-in" value={fmt(today?.checkIn)} />
                <Row label="Check-out" value={fmt(today?.checkOut)} />
                <Row
                  label="Giờ làm"
                  value={today?.hours ? today.hours + "h" : "—"}
                />
                <Row label="Ca làm" value={today?.shift || "—"} />
                {today?.status && (
                  <div
                    style={{
                      display: "inline-flex",
                      alignSelf: "flex-start",
                      padding: "4px 12px",
                      borderRadius: 20,
                      fontSize: 11,
                      fontWeight: 700,
                      background: statusColor(today.status).bg,
                      color: statusColor(today.status).color,
                      marginTop: 4,
                    }}
                  >
                    {today.status}
                  </div>
                )}
              </div>

              {/* KHU VỰC CHỌN CA — CHỈ HIỆN CA APPROVED */}
              {!today?.checkIn && (
                <div style={{ marginBottom: 12 }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--text-muted, #475569)",
                      marginBottom: 6,
                    }}
                  >
                    Chọn ca làm (đã được duyệt hôm nay)
                  </label>

                  {approvedLoading && (
                    <div
                      style={{
                        padding: 20,
                        textAlign: "center",
                        color: "var(--text-light, #8993a3)",
                        fontSize: 13,
                        background: "var(--bg-tertiary, #f5f7fb)",
                        borderRadius: 10,
                      }}
                    >
                      <Loader2
                        size={20}
                        style={{
                          animation: "spin 1s linear infinite",
                          marginBottom: 6,
                        }}
                      />
                      <div>Đang tải ca...</div>
                    </div>
                  )}

                  {!approvedLoading && approvedError && (
                    <div
                      style={{
                        padding: "10px 14px",
                        background: "rgba(239, 68, 68, 0.08)",
                        border: "1px solid rgba(239, 68, 68, 0.2)",
                        borderRadius: 8,
                        fontSize: 12,
                        color: "#ef4444",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <AlertCircle size={14} style={{ flexShrink: 0 }} />
                      <span style={{ flex: 1 }}>{approvedError}</span>
                      <button
                        onClick={loadApprovedShifts}
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

                  {!approvedLoading &&
                    !approvedError &&
                    approvedShifts.length > 0 && (
                      <div className="checkin-shift-picker">
                        {approvedShifts.map((s) => {
                          const shift = SHIFTS.find((x) => x.id === s.shift);
                          if (!shift) return null;
                          const Icon = shift.icon;
                          const active = selectedShift === s.shift;

                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => setSelectedShift(s.shift)}
                              disabled={checkingIn || checkingOut}
                              style={{
                                padding: "10px 8px",
                                background: active
                                  ? shift.color + "20"
                                  : "var(--card-bg, #fff)",
                                border: active
                                  ? "2px solid " + shift.color
                                  : "2px solid var(--border-color, #e5e9ef)",
                                borderRadius: 10,
                                cursor:
                                  checkingIn || checkingOut
                                    ? "not-allowed"
                                    : "pointer",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              <Icon
                                size={18}
                                style={{
                                  color: active
                                    ? shift.color
                                    : "var(--text-light, #94a3b8)",
                                }}
                              />
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: active
                                    ? shift.color
                                    : "var(--text-muted, #475569)",
                                }}
                              >
                                {shift.label}
                              </span>
                              <span
                                style={{
                                  fontSize: 9,
                                  color: "var(--text-light, #94a3b8)",
                                }}
                              >
                                {shift.time}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                </div>
              )}

              {/* Nút Check-in / Check-out */}
              <div className="checkin-action-grid">
                <button
                  disabled={
                    !!today?.checkIn ||
                    checkingIn ||
                    checkingOut ||
                    approvedShifts.length === 0
                  }
                  onClick={handleCheckIn}
                  style={{
                    padding: 12,
                    background:
                      today?.checkIn || approvedShifts.length === 0
                        ? "#94a3b8"
                        : "#18a967",
                    color: "#fff",
                    border: 0,
                    borderRadius: 10,
                    fontWeight: 700,
                    cursor:
                      today?.checkIn ||
                      checkingIn ||
                      checkingOut ||
                      approvedShifts.length === 0
                        ? "not-allowed"
                        : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    fontSize: 13,
                    opacity: checkingIn ? 0.7 : 1,
                  }}
                >
                  <LogIn size={16} />
                  {today?.checkIn
                    ? "Đã check-in"
                    : checkingIn
                    ? "Đang xử lý..."
                    : approvedShifts.length === 0
                    ? "Chưa có ca"
                    : "Check-in"}
                </button>
                <button
                  disabled={
                    !today?.checkIn ||
                    !!today?.checkOut ||
                    checkingIn ||
                    checkingOut
                  }
                  onClick={handleCheckOut}
                  style={{
                    padding: 12,
                    background:
                      !today?.checkIn || today?.checkOut ? "#94a3b8" : "#f59e0b",
                    color: "#fff",
                    border: 0,
                    borderRadius: 10,
                    fontWeight: 700,
                    cursor:
                      !today?.checkIn ||
                      today?.checkOut ||
                      checkingIn ||
                      checkingOut
                        ? "not-allowed"
                        : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    fontSize: 13,
                    opacity: checkingOut ? 0.7 : 1,
                  }}
                >
                  <LogOut size={16} />
                  {today?.checkOut
                    ? "Đã check-out"
                    : checkingOut
                    ? "Đang xử lý..."
                    : "Check-out"}
                </button>
              </div>

              <p
                style={{
                  fontSize: 11,
                  color: "var(--text-light, #8993a3)",
                  marginTop: 10,
                  marginBottom: 0,
                  textAlign: "center",
                }}
              >
                Ca sáng: 06:30 - 12:30 · Ca chiều: 12:30 - 18:30 · Đi muộn sau 15
                phút.
              </p>
            </>
          )}
        </div>
      </div>

      {/* ============ CA LÀM SẮP TỚI ============ */}
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
            marginBottom: 16,
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h3
              style={{
                margin: 0,
                color: "var(--text-primary, #172033)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Calendar size={18} /> Ca làm sắp tới của tôi
            </h3>
          </div>
          <button
            onClick={() => setShowRegister(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "#2634d5",
              color: "#fff",
              padding: "9px 16px",
              border: 0,
              borderRadius: 8,
              fontWeight: 700,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            <PlusCircle size={15} /> Đăng ký ca
          </button>
        </div>

        {myShifts.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: 40,
              color: "var(--text-light, #8993a3)",
              background: "var(--bg-tertiary, #f8fafc)",
              borderRadius: 10,
            }}
          >
            <CalendarDays size={40} style={{ opacity: 0.3, marginBottom: 8 }} />
            <div style={{ fontSize: 13, marginBottom: 4 }}>
              Chưa có ca làm nào được duyệt
            </div>
            <div style={{ fontSize: 12 }}>
              Bấm "Đăng ký ca" để đăng ký ca cho tuần sau
            </div>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: 12,
            }}
          >
            {groupedMyShifts.map((group) => (
              <div
                key={group.date}
                style={{
                  border: "1px solid var(--border-color, #e5e9ef)",
                  borderRadius: 12,
                  padding: 14,
                  background:
                    group.badge === "Hôm nay"
                      ? "linear-gradient(135deg, rgba(24, 169, 103, 0.05), rgba(38, 52, 213, 0.05))"
                      : "var(--card-bg, #fff)",
                  transition: "all 0.2s",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 10,
                    paddingBottom: 10,
                    borderBottom: "1px dashed var(--border-color, #eef2f7)",
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 11,
                      background: "linear-gradient(135deg, #2634d5, #20c779)",
                      color: "#fff",
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                      lineHeight: 1,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      <span
                        style={{ fontSize: 9, fontWeight: 600, opacity: 0.9 }}
                      >
                        {group.weekdayShort}
                      </span>
                      <span style={{ fontSize: 15, fontWeight: 800 }}>
                        {group.dayNum}
                      </span>
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b
                      style={{
                        fontSize: 13,
                        color: "var(--text-primary, #172033)",
                        display: "block",
                      }}
                    >
                      {group.dayNum}/{group.monthNum}/{group.date.slice(0, 4)}
                    </b>
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--text-light, #8993a3)",
                      }}
                    >
                      {group.shifts.length} ca
                    </span>
                  </div>
                  {group.badge && (
                    <span
                      style={{
                        background: group.badgeColor,
                        color: "#fff",
                        padding: "3px 9px",
                        borderRadius: 10,
                        fontSize: 10,
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {group.badge}
                    </span>
                  )}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {group.shifts.map((s) => {
                    const shift = SHIFTS.find((x) => x.id === s.shift);
                    const Icon = shift?.icon || Clock;
                    const color = shift?.color || "#64748b";

                    return (
                      <div
                        key={s.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "8px 10px",
                          background: "var(--bg-tertiary, #f8fafc)",
                          border: "1px solid transparent",
                          borderRadius: 8,
                        }}
                      >
                        <div
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: 8,
                            background: color + "20",
                            color,
                            display: "grid",
                            placeItems: "center",
                            flexShrink: 0,
                          }}
                        >
                          <Icon size={16} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <b
                            style={{
                              fontSize: 12.5,
                              color: "var(--text-primary, #172033)",
                              display: "block",
                            }}
                          >
                            {s.shift}
                          </b>
                          <span
                            style={{
                              fontSize: 10.5,
                              color: "var(--text-light, #8993a3)",
                            }}
                          >
                            {shift?.time || "—"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ============ STATS ============ */}
      <div className="emp-cio-stats">
        <StatBox
          icon={<Calendar />}
          label="Tổng ngày công"
          value={stats.total}
          color="#2634d5"
        />
        <StatBox
          icon={<TrendingUp />}
          label="Đúng giờ"
          value={stats.onTime}
          color="#18a967"
        />
        <StatBox
          icon={<AlertTriangle />}
          label="Đi muộn"
          value={stats.late}
          color="#f59e0b"
        />
        <StatBox
          icon={<Clock />}
          label="Tổng giờ"
          value={stats.totalHours.toFixed(1) + "h"}
          color="#8b5cf6"
        />
      </div>

      {/* ============ FILTER ============ */}
      <div
        style={{
          background: "var(--card-bg, #fff)",
          border: "1px solid var(--border-color, #e7ebf0)",
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          style={{
            padding: "10px 14px",
            border: "1px solid var(--border-color, #e5e9ef)",
            borderRadius: 8,
            outline: "none",
            fontSize: 13,
            background: "var(--bg-secondary, #fff)",
            color: "var(--text-primary, #172033)",
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "var(--bg-tertiary, #f5f7fb)",
            border: "1px solid var(--border-color, #e5e9ef)",
            borderRadius: 8,
            padding: "10px 14px",
            flex: 1,
            minWidth: 200,
          }}
        >
          <Search size={16} style={{ color: "var(--text-light, #8993a3)" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo ngày (YYYY-MM-DD)..."
            style={{
              border: 0,
              outline: "none",
              background: "transparent",
              color: "var(--text-primary, #172033)",
              fontSize: 13,
              flex: 1,
            }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              aria-label="Xoá tìm kiếm"
              style={{
                background: "transparent",
                border: 0,
                cursor: "pointer",
                color: "var(--text-light, #8993a3)",
                padding: 2,
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ============ BẢNG LỊCH SỬ ============ */}
      <div
        style={{
          background: "var(--card-bg, #fff)",
          border: "1px solid var(--border-color, #e7ebf0)",
          borderRadius: 12,
          padding: 20,
        }}
      >
        <h3 style={{ marginTop: 0, color: "var(--text-primary, #172033)" }}>
          Lịch sử chấm công — {filtered.length} bản ghi
        </h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg-tertiary, #f5f7fb)" }}>
                <th style={th}>Ngày</th>
                <th style={th}>Ca làm</th>
                <th style={th}>Check-in</th>
                <th style={th}>Check-out</th>
                <th style={{ ...th, textAlign: "right" }}>Giờ làm</th>
                <th style={th}>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => {
                const c = statusColor(a.status);
                const sc = shiftColor(a.shift);
                return (
                  <tr
                    key={a.id}
                    style={{
                      borderBottom: "1px solid var(--border-color, #eef2f7)",
                    }}
                  >
                    <td style={td}>
                      <b>{fmtDate(a.date)}</b>
                    </td>
                    <td style={td}>
                      {a.shift ? (
                        <span
                          style={{
                            padding: "4px 10px",
                            borderRadius: 20,
                            fontSize: 11,
                            fontWeight: 700,
                            background: sc.bg,
                            color: sc.color,
                          }}
                        >
                          {a.shift}
                        </span>
                      ) : (
                        <span
                          style={{
                            color: "var(--text-light, #8993a3)",
                            fontSize: 12,
                          }}
                        >
                          —
                        </span>
                      )}
                    </td>
                    <td style={td}>{fmt(a.checkIn)}</td>
                    <td style={{ ...td, color: "var(--text-muted, #64748b)" }}>
                      {fmt(a.checkOut)}
                    </td>
                    <td style={{ ...td, textAlign: "right" }}>
                      <b>{a.hours ? a.hours + "h" : "—"}</b>
                    </td>
                    <td style={td}>
                      <span
                        style={{
                          padding: "4px 12px",
                          borderRadius: 20,
                          fontSize: 11,
                          fontWeight: 700,
                          background: c.bg,
                          color: c.color,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {a.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {!filtered.length && (
                <tr>
                  <td
                    colSpan="6"
                    style={{
                      textAlign: "center",
                      padding: 40,
                      color: "var(--text-light, #8993a3)",
                    }}
                  >
                    Chưa có dữ liệu chấm công
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============ MODAL ĐĂNG KÝ CA ============ */}
      {showRegister && (
        <RegisterModal
          existingShifts={myShifts}
          onSave={async (data) => {
            const res = await api.shifts.register(data);
            toast(
              "Đã đăng ký " +
                res.created +
                " ca" +
                (res.skipped ? " (bỏ qua " + res.skipped + " ca trùng)" : ""),
              "success"
            );
            setShowRegister(false);
            loadShifts();
          }}
          onClose={() => setShowRegister(false)}
        />
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.1); }
        }
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

function Row({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
      <span style={{ color: "var(--text-muted, #64748b)" }}>{label}</span>
      <b style={{ color: "var(--text-primary, #172033)" }}>{value}</b>
    </div>
  );
}

function StatBox({ icon, label, value, color }) {
  return (
    <div
      style={{
        background: "var(--card-bg, #fff)",
        border: "1px solid var(--border-color, #e7ebf0)",
        borderRadius: 12,
        padding: 18,
        display: "flex",
        gap: 12,
        alignItems: "center",
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: color + "20",
          color,
          display: "grid",
          placeItems: "center",
        }}
      >
        {icon}
      </div>
      <div>
        <span style={{ fontSize: 12, color: "var(--text-light, #8993a3)" }}>
          {label}
        </span>
        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "var(--text-primary, #172033)",
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// REGISTER MODAL
// ============================================================

function RegisterModal({ existingShifts = [], onSave, onClose }) {
  const displayWeekDays = useMemo(() => getNextWeekDays(), []);

  const [dateShifts, setDateShifts] = useState({});
  const [activeDate, setActiveDate] = useState(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const existingSet = useMemo(() => {
    const set = new Set();
    for (const s of existingShifts) {
      if (displayWeekDays.includes(s.date)) {
        set.add(s.date + "|" + s.shift);
      }
    }
    return set;
  }, [existingShifts, displayWeekDays]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, submitting]);

  const currentShifts = activeDate ? dateShifts[activeDate] || [] : [];

  const clickDate = (d) => setActiveDate(d);

  const toggleShift = (shiftId) => {
    if (!activeDate) {
      toast("Vui lòng chọn ngày trước", "error");
      return;
    }
    setDateShifts((prev) => {
      const cur = prev[activeDate] || [];
      const has = cur.includes(shiftId);
      const next = has
        ? cur.filter((x) => x !== shiftId)
        : [...cur, shiftId];
      const copy = { ...prev };
      if (next.length === 0) delete copy[activeDate];
      else copy[activeDate] = next;
      return copy;
    });
  };

  const applyToWholeWeek = () => {
    const tpl = currentShifts.length > 0 ? currentShifts : ["Ca sáng"];
    const next = { ...dateShifts };
    for (const d of displayWeekDays) {
      next[d] = [...tpl];
    }
    setDateShifts(next);
  };

  const clearAll = () => {
    setDateShifts({});
    setActiveDate(null);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    const dates = Object.keys(dateShifts).filter(
      (d) => dateShifts[d]?.length > 0
    );
    if (!dates.length) {
      toast("Chọn ít nhất 1 ngày và 1 ca", "error");
      return;
    }

    setSubmitting(true);
    try {
      await onSave({
        dates,
        shifts: Object.values(dateShifts).flat(),
        dateShifts,
        note,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const totalAssignments = Object.values(dateShifts).reduce(
    (s, arr) => s + (arr?.length || 0),
    0
  );
  const totalDays = Object.keys(dateShifts).filter(
    (d) => dateShifts[d]?.length > 0
  ).length;

  const weekLabel = displayWeekDays.length
    ? new Date(displayWeekDays[0] + "T00:00:00").toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
      }) +
      " - " +
      new Date(displayWeekDays[6] + "T00:00:00").toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
      })
    : "";

  return (
    <div
      onClick={() => !submitting && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label="Đăng ký ca làm"
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
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <h3
            style={{
              margin: 0,
              color: "var(--text-primary, #172033)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <ClipboardList size={20} /> Đăng ký ca làm
          </h3>
          <button
            onClick={() => !submitting && onClose()}
            disabled={submitting}
            aria-label="Đóng"
            style={{
              background: "transparent",
              border: 0,
              cursor: submitting ? "not-allowed" : "pointer",
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
            marginBottom: 14,
            padding: "8px 12px",
            background: "rgba(38, 52, 213, 0.08)",
            border: "1px solid rgba(38, 52, 213, 0.25)",
            borderRadius: 8,
            fontSize: 12,
            color: "#2634d5",
            fontWeight: 600,
          }}
        >
          📅 Đăng ký cho tuần sau ({weekLabel}) · Admin sẽ duyệt
        </div>

        <form onSubmit={submit}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 16,
              marginBottom: 8,
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <label style={label}>
              Ngày *{" "}
              <span
                style={{ fontWeight: 400, color: "var(--text-light, #94a3b8)" }}
              >
                (bấm ngày → chọn ca)
              </span>
            </label>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                type="button"
                onClick={applyToWholeWeek}
                disabled={submitting}
                style={{
                  padding: "4px 10px",
                  background: "rgba(38, 52, 213, 0.1)",
                  color: "#2634d5",
                  border: "1px solid rgba(38, 52, 213, 0.3)",
                  borderRadius: 6,
                  cursor: submitting ? "not-allowed" : "pointer",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                Áp dụng cả tuần
              </button>
              {totalAssignments > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  disabled={submitting}
                  style={{
                    padding: "4px 10px",
                    background: "rgba(239, 68, 68, 0.1)",
                    color: "#ef4444",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    borderRadius: 6,
                    cursor: submitting ? "not-allowed" : "pointer",
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  Xoá hết
                </button>
              )}
            </div>
          </div>

          <div className="emp-register-days">
            {displayWeekDays.map((d) => {
              const isActive = activeDate === d;
              const isAssigned = dateShifts[d] && dateShifts[d].length > 0;
              const dayLabel = new Date(d + "T00:00:00").toLocaleDateString(
                "vi-VN",
                { weekday: "short" }
              );

              let bg = "var(--bg-tertiary, #f5f7fb)";
              let color = "var(--text-primary, #172033)";
              let border = "1px solid var(--border-color, #e5e9ef)";

              if (isAssigned && !isActive) {
                bg = "#d1fae5";
                color = "#065f46";
                border = "1px solid #18a967";
              }
              if (isActive) {
                bg = isAssigned ? "#18a967" : "#2634d5";
                color = "#fff";
                border = "2px solid " + (isAssigned ? "#18a967" : "#2634d5");
              }

              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => clickDate(d)}
                  disabled={submitting}
                  title={
                    isAssigned
                      ? "Đã chọn ca — bấm để xem/sửa"
                      : "Bấm để chọn ngày"
                  }
                  style={{
                    padding: "8px 4px",
                    borderRadius: 8,
                    background: bg,
                    color,
                    border,
                    cursor: submitting ? "not-allowed" : "pointer",
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                    position: "relative",
                    transition: "all 0.15s",
                  }}
                >
                  {isAssigned && (
                    <span
                      style={{
                        position: "absolute",
                        top: 2,
                        right: 2,
                        width: 14,
                        height: 14,
                        borderRadius: "50%",
                        background: isActive ? "#fff" : "#18a967",
                        color: isActive ? "#18a967" : "#fff",
                        display: "grid",
                        placeItems: "center",
                        fontSize: 9,
                        fontWeight: 800,
                        lineHeight: 1,
                      }}
                    >
                      ✓
                    </span>
                  )}
                  <span style={{ fontSize: 10, fontWeight: 600 }}>
                    {dayLabel}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>
                    {d.slice(8)}
                  </span>
                </button>
              );
            })}
          </div>

          <label style={label}>
            Ca làm *{" "}
            {activeDate && (
              <span
                style={{ fontWeight: 400, color: "var(--text-light, #94a3b8)" }}
              >
                (ngày {activeDate.slice(8)}/{activeDate.slice(5, 7)})
              </span>
            )}
          </label>
          <div className="emp-register-shifts">
            {SHIFTS.map((s) => {
              const Icon = s.icon;
              const sel = currentShifts.includes(s.id);
              const alreadyAssigned =
                activeDate && existingSet.has(activeDate + "|" + s.id);

              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleShift(s.id)}
                  disabled={submitting}
                  style={{
                    padding: "10px 8px",
                    borderRadius: 10,
                    background: sel
                      ? s.color + "20"
                      : alreadyAssigned
                      ? "#fff7ed"
                      : "var(--card-bg, #fff)",
                    border: sel
                      ? "2px solid " + s.color
                      : alreadyAssigned
                      ? "2px dashed #f59e0b"
                      : "2px solid var(--border-color, #e5e9ef)",
                    cursor: submitting ? "not-allowed" : "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                    position: "relative",
                  }}
                >
                  {alreadyAssigned && !sel && (
                    <span
                      style={{
                        position: "absolute",
                        top: 4,
                        right: 4,
                        fontSize: 9,
                        color: "#f59e0b",
                        fontWeight: 700,
                      }}
                    >
                      đã có
                    </span>
                  )}
                  <Icon
                    size={18}
                    style={{
                      color: sel ? s.color : "var(--text-light, #94a3b8)",
                    }}
                  />
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: sel ? s.color : "var(--text-muted, #475569)",
                    }}
                  >
                    {s.label}
                  </span>
                  <span
                    style={{ fontSize: 9, color: "var(--text-light, #94a3b8)" }}
                  >
                    {s.time}
                  </span>
                </button>
              );
            })}
          </div>

          <label style={label}>Ghi chú</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="VD: Có thể đến trễ 10 phút..."
            disabled={submitting}
            style={input}
          />

          {totalAssignments > 0 && (
            <div
              style={{
                marginTop: 12,
                padding: "10px 14px",
                background: "rgba(38, 52, 213, 0.08)",
                border: "1px solid rgba(38, 52, 213, 0.3)",
                borderRadius: 8,
                fontSize: 12,
                color: "#2634d5",
                fontWeight: 600,
              }}
            >
              📋 Sẽ đăng ký <b>{totalAssignments}</b> ca trên <b>{totalDays}</b>{" "}
              ngày — chờ admin duyệt
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                flex: 1,
                padding: 12,
                border: "1px solid var(--border-color, #e5e9ef)",
                borderRadius: 8,
                background: "var(--card-bg, #fff)",
                cursor: submitting ? "not-allowed" : "pointer",
                color: "var(--text-primary, #172033)",
                fontWeight: 600,
              }}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting || totalAssignments === 0}
              style={{
                flex: 1,
                padding: 12,
                background:
                  submitting || totalAssignments === 0 ? "#94a3b8" : "#2634d5",
                color: "#fff",
                border: 0,
                borderRadius: 8,
                fontWeight: 700,
                cursor:
                  submitting || totalAssignments === 0
                    ? "not-allowed"
                    : "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <Save size={14} /> {submitting ? "Đang gửi..." : "Đăng ký ca"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// STYLE CONSTANTS
// ============================================================

const th = {
  padding: 11,
  textAlign: "left",
  fontSize: 12,
  color: "var(--text-muted, #64748b)",
  fontWeight: 600,
};

const td = {
  padding: 11,
  fontSize: 13,
  color: "var(--text-primary, #172033)",
};

const label = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  marginBottom: 4,
  marginTop: 12,
  color: "var(--text-muted, #475569)",
};

const input = {
  width: "100%",
  padding: 10,
  border: "1px solid var(--border-color, #e5e9ef)",
  borderRadius: 8,
  outline: "none",
  background: "var(--bg-secondary, #fff)",
  color: "var(--text-primary, #172033)",
  fontSize: 13,
  boxSizing: "border-box",
};