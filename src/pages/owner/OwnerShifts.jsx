// ============================================================
// OWNERSHIFTS.JSX — Quản lý ca làm việc (Admin)
// ============================================================
// 4 tabs:
//   1. Hôm nay   — ai đang làm ca nào hôm nay
//   2. Theo tuần — lịch phân ca dạng bảng tuần
//   3. Phân ca   — danh sách ca đã phân, filter, bulk assign
//   4. Lịch sử   — chấm công theo tháng
//
// Lưu ý:
//   - Fix bug timezone: dùng local date thay vì toISOString()
//   - ESC đóng modal, disable khi save
//   - Không dùng alert() — dùng toast
// ============================================================
import { Skeleton, SkeletonStats } from "../../components/Skeleton";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import {
  Calendar, Clock, Users, CheckCircle2, AlertTriangle, UserX,
  Plus, Trash2, Sun, Sunrise, Moon, Save, X, Search,
  ChevronLeft, ChevronRight, CalendarDays, Edit, Loader2,
  AlertCircle, Check,
} from "lucide-react";
import { api } from "../../api";
import { toast } from "../../components/Effects";
import ConfirmDialog from "../../components/ConfirmDialog";

// ============================================================
// HELPERS — Bổ sung Batch 5C
// ============================================================

/**
 * ✅ #11.1: Bỏ dấu tiếng Việt + lowercase để search chính xác.
 * "Trần Văn Trí" → "tran van tri"
 */
function normalize(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .trim();
}

// ============================================================
// CONSTANTS
// ============================================================

const SHIFTS = [
  { id: "Ca sáng",  label: "Ca sáng",  time: "06:00 - 12:00", icon: Sunrise, color: "#f59e0b" },
  { id: "Ca chiều", label: "Ca chiều", time: "12:00 - 18:00", icon: Sun,     color: "#2634d5" },
  { id: "Ca tối",   label: "Ca tối",   time: "18:00 - 22:00", icon: Moon,    color: "#8b5cf6" },
];

const TABS = [
  { id: "today",   label: "Hôm nay" },
  { id: "week",    label: "Theo tuần" },
  { id: "assign",  label: "Phân ca" },
  { id: "history", label: "Lịch sử" },
];

const MODAL_Z = 2147483600;

// ============================================================
// HELPERS
// ============================================================

/**
 * Lấy ngày hôm nay theo LOCAL time (tránh bug UTC của toISOString).
 * Dùng getFullYear/getMonth/getDate → chắc chắn là ngày user thấy.
 */
function getToday() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dt = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dt}`;
}

function fmtTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

function shiftColor(shiftId) {
  const sh = SHIFTS.find((x) => x.id === shiftId);
  return sh ? sh.color : "#64748b";
}

function shiftCode(shiftId) {
  if (shiftId === "Ca sáng") return "S";
  if (shiftId === "Ca chiều") return "C";
  if (shiftId === "Ca tối") return "T";
  return "?";
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function OwnerShifts() {
  const [tab, setTab] = useState("today");

  // ---------- Data ----------
  const [shifts, setShifts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [attendances, setAttendances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ---------- UI state ----------
  const [assignModal, setAssignModal] = useState(null);
  const [weekDate, setWeekDate] = useState(getToday());
  const [historyMonth, setHistoryMonth] = useState(getToday().slice(0, 7));
  const [search, setSearch] = useState("");
  const [historyFilter, setHistoryFilter] = useState("nextWeek");
  // ✅ Confirm dialog
  const [confirm, setConfirm] = useState(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  // Race-safe
  const reqIdRef = useRef(0);

  // ---------- Load all data ----------

  const load = useCallback(async () => {
    const myReqId = ++reqIdRef.current;
    setLoading(true);
    setError("");

    try {
      const [empsRes, attsRes, shiftsRes] = await Promise.all([
        api.users.list("EMPLOYEE").catch(() => []),
        api.attendance.all({ month: historyMonth }).catch(() => []),
        api.shifts.all().catch(() => []),
      ]);

      if (myReqId !== reqIdRef.current) return;

      setEmployees(Array.isArray(empsRes) ? empsRes : []);
      setAttendances(Array.isArray(attsRes) ? attsRes : []);
      setShifts(Array.isArray(shiftsRes) ? shiftsRes : []);
    } catch (e) {
      if (myReqId === reqIdRef.current) {
        setError(e.message || "Không tải được dữ liệu ca làm");
      }
    } finally {
      if (myReqId === reqIdRef.current) setLoading(false);
    }
  }, [historyMonth]);

  useEffect(() => {
    load();
  }, [load]);

  // ---------- Computed ----------

  const stats = useMemo(() => {
    const today = getToday();
    const todayAtts = attendances.filter((a) => a.date === today);
    return {
      total: employees.length,
      working: todayAtts.filter((a) => a.checkIn && !a.checkOut).length,
      late: todayAtts.filter((a) => a.status === "Đi muộn").length,
      absent: Math.max(0, employees.length - todayAtts.length),
    };
  }, [employees, attendances]);

  const todayShifts = useMemo(() => {
    const today = getToday();
    return SHIFTS.map((s) => ({
      ...s,
      employees: shifts.filter((x) => x.date === today && x.shift === s.id),
    }));
  }, [shifts]);

  // Week days (Mon-Sun) của tuần chứa weekDate
  const weekDays = useMemo(() => {
    const start = new Date(weekDate + "T00:00:00");
    const day = start.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + diff);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const dt = String(d.getDate()).padStart(2, "0");
      days.push(`${y}-${m}-${dt}`);
    }
    return days;
  }, [weekDate]);

  const weekLabel = useMemo(() => {
    if (!weekDays.length) return "";
    const s = new Date(weekDays[0] + "T00:00:00");
    const e = new Date(weekDays[6] + "T00:00:00");
    return (
      s.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }) +
      " - " +
      e.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    );
  }, [weekDays]);

  // Nhắc nhở Chủ nhật — update mỗi phút
  const [sundayReminder, setSundayReminder] = useState(null);
  useEffect(() => {
    const check = () => {
      const d = new Date();
      const dayOfWeek = d.getDay();
      const hour = d.getHours();
      if (dayOfWeek !== 0) return setSundayReminder(null);
      if (hour >= 15) return setSundayReminder("urgent");
      if (hour >= 9) return setSundayReminder("warn");
      return setSundayReminder(null);
    };
    check();
    const timer = setInterval(check, 60_000);
    return () => clearInterval(timer);
  }, []);

  // Filter shifts theo tuần (this/next/all) + search
  const filteredShifts = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const day = today.getDay();
    const daysUntilMon = day === 0 ? -6 : 1 - day;
    const thisMon = new Date(today);
    thisMon.setDate(today.getDate() + daysUntilMon);
    const thisSun = new Date(thisMon);
    thisSun.setDate(thisMon.getDate() + 6);
    thisSun.setHours(23, 59, 59, 999);
    const nextMon = new Date(thisMon);
    nextMon.setDate(thisMon.getDate() + 7);
    const nextSun = new Date(nextMon);
    nextSun.setDate(nextMon.getDate() + 6);
    nextSun.setHours(23, 59, 59, 999);

    let list = [...shifts];
    if (historyFilter === "week") {
      list = list.filter((s) => {
        const d = new Date(s.date + "T00:00:00");
        return d >= thisMon && d <= thisSun;
      });
    } else if (historyFilter === "nextWeek") {
      list = list.filter((s) => {
        const d = new Date(s.date + "T00:00:00");
        return d >= nextMon && d <= nextSun;
      });
    }
    if (search.trim()) {
      // ✅ #11.2: Search không dấu — "Tran" match "Trần"
      const q = normalize(search);
      list = list.filter((s) =>
        normalize(s.employee_name).includes(q)
      );
    }
    return list;
  }, [shifts, historyFilter, search]);

  // Group shifts theo ngày
  const groupedShifts = useMemo(() => {
    const map = {};
    for (const s of filteredShifts) {
      if (!map[s.date]) map[s.date] = [];
      map[s.date].push(s);
    }
    return Object.keys(map)
      .sort((a, b) => a.localeCompare(b))
      .map((date) => {
        const list = map[date];
        const shiftTypes = [...new Set(list.map((s) => s.shift))];
        const d = new Date(date + "T00:00:00");
        return {
          date,
          label: d.toLocaleDateString("vi-VN", {
            weekday: "long",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          }),
          weekdayShort: d.toLocaleDateString("vi-VN", { weekday: "short" }),
          dayNum: String(d.getDate()).padStart(2, "0"),
          shifts: list,
          shiftTypes,
        };
      });
  }, [filteredShifts]);

  const uniqueEmployees = useMemo(
    () => new Set(filteredShifts.map((s) => s.employee_id)).size,
    [filteredShifts]
  );

  const filteredEmployees = useMemo(() => {
    if (!search.trim()) return employees;
    // ✅ #11.3: Search không dấu
    const q = normalize(search);
    return employees.filter((e) =>
      normalize(e.name).includes(q)
    );
  }, [employees, search]);

  // ---------- Actions ----------

  const changeWeek = (delta) => {
    const d = new Date(weekDate + "T00:00:00");
    d.setDate(d.getDate() + delta * 7);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dt = String(d.getDate()).padStart(2, "0");
    setWeekDate(`${y}-${m}-${dt}`);
  };

  const goToThisWeek = () => setWeekDate(getToday());

  const saveAssignment = async (formData, isEdit) => {
    try {
      if (isEdit) {
        await api.shifts.update(formData.id, {
          date: formData.date,
          shift: formData.shift,
          note: formData.note,
        });
        toast("Đã cập nhật ca làm việc", "success");
      } else {
        const { employeeId, dateShifts, note } = formData;
        let totalCreated = 0;
        let totalSkipped = 0;

        for (const [date, shiftList] of Object.entries(dateShifts)) {
          if (!shiftList?.length) continue;
          const res = await api.shifts.bulk({
            employee_id: employeeId,
            dates: [date],
            shifts: shiftList,
            note,
          });
          totalCreated += res?.created || 0;
          totalSkipped += res?.skipped || 0;
        }

        toast(
          `Đã phân ${totalCreated} ca` +
            (totalSkipped ? ` (bỏ qua ${totalSkipped} ca trùng)` : ""),
          "success"
        );
      }
      setAssignModal(null);
      load();
    } catch (e) {
      toast(e.message || "Không lưu được", "error");
    }
  };

    /**
   * ✅ Mở confirm dialog thay vì confirm() native.
   */
  const removeAssignment = (id) => {
    setConfirm({
      title: "Xóa phân ca này?",
      message:
        "Ca làm việc sẽ bị xoá khỏi lịch của nhân viên. " +
        "Bạn có thể phân ca lại bất cứ lúc nào.",
      confirmText: "Xóa phân ca",
      cancelText: "Giữ lại",
      danger: true,
      onConfirm: async () => {
        try {
          await api.shifts.remove(id);
          toast("Đã xóa", "success");
          setConfirm(null);
          load();
        } catch (e) {
          toast(e.message || "Không xóa được", "error");
        }
      },
    });
  };

  const closeConfirm = () => {
    if (confirmBusy) return;
    setConfirm(null);
  };

  const runConfirm = async () => {
    if (!confirm || confirmBusy) return;
    setConfirmBusy(true);
    try {
      await confirm.onConfirm();
    } finally {
      setConfirmBusy(false);
    }
  };

  const openEdit = (s) => setAssignModal({ ...s, _isEdit: true });
  const openNew = () =>
    setAssignModal({ _isNew: true, date: getToday(), shift: "Ca sáng" });

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div>
      {/* ============================================================
          NHẮC NHỞ CHỦ NHẬT
          ============================================================ */}
      {sundayReminder && (
        <div
          style={{
            marginBottom: 16,
            padding: "14px 18px",
            background:
              sundayReminder === "urgent"
                ? "linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(245, 158, 11, 0.15))"
                : "linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(38, 52, 213, 0.08))",
            border:
              "2px solid " +
              (sundayReminder === "urgent" ? "#ef4444" : "#f59e0b"),
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            gap: 14,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: sundayReminder === "urgent" ? "#ef4444" : "#f59e0b",
              color: "#fff",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <CalendarDays size={22} />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <b
              style={{
                color:
                  sundayReminder === "urgent" ? "#991b1b" : "#92400e",
                fontSize: 15,
                display: "block",
                marginBottom: 2,
              }}
            >
              {sundayReminder === "urgent"
                ? "⚠️ Hạn chót xếp ca tuần sau: 15:00 hôm nay!"
                : "📅 Nhắc nhở xếp ca tuần sau"}
            </b>
            <span
              style={{
                color:
                  sundayReminder === "urgent" ? "#7f1d1d" : "#78350f",
                fontSize: 13,
              }}
            >
              {sundayReminder === "urgent"
                ? "Vui lòng phân ca cho nhân viên TRƯỚC 15:00 Chủ nhật."
                : "Vui lòng xếp ca cho nhân viên trước 15:00 Chủ nhật hàng tuần."}
            </span>
          </div>
          <button
            onClick={() => setTab("week")}
            style={{
              padding: "10px 16px",
              background: sundayReminder === "urgent" ? "#ef4444" : "#f59e0b",
              color: "#fff",
              border: 0,
              borderRadius: 8,
              fontWeight: 700,
              cursor: "pointer",
              fontSize: 13,
              whiteSpace: "nowrap",
            }}
          >
            Xếp ca ngay
          </button>
        </div>
      )}

      {/* ============================================================
          STATS
          ============================================================ */}
            <div
        className="shifts-stats-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 16,
          marginBottom: 20,
        }}
      >
        <Stat icon={<Users size={18} />} label="Tổng nhân viên" value={stats.total} color="#2634d5" />
        <Stat icon={<CheckCircle2 size={18} />} label="Đang làm việc" value={stats.working} color="#18a967" />
        <Stat icon={<AlertTriangle size={18} />} label="Đi muộn" value={stats.late} color="#f59e0b" />
        <Stat icon={<UserX size={18} />} label="Vắng mặt" value={stats.absent} color="#ef4444" />
      </div>

      {/* ============================================================
          TABS
          ============================================================ */}
            <div
        className="shifts-tabs"
        style={{
          display: "flex",
          gap: 6,
          marginBottom: 20,
          background: "var(--card-bg, #fff)",
          border: "1px solid var(--border-color, #e7ebf0)",
          borderRadius: 12,
          padding: 8,
          flexWrap: "wrap",
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: "10px 18px",
              background: tab === t.id ? "#2634d5" : "transparent",
              color: tab === t.id ? "#fff" : "var(--text-muted, #475569)",
              border: 0,
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: tab === t.id ? 700 : 500,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ============================================================
          LOADING
          ============================================================ */}
        {loading && (
        <>
          {/* Skeleton stats */}
          <div style={{ marginBottom: 20 }}>
            <SkeletonStats
              count={4}
              columns="repeat(auto-fit, minmax(180px, 1fr))"
            />
          </div>

          {/* Skeleton tabs */}
          <div
            aria-hidden="true"
            style={{
              background: "var(--card-bg, #fff)",
              border: "1px solid var(--border-color, #e7ebf0)",
              borderRadius: 12,
              padding: 8,
              marginBottom: 20,
              display: "flex",
              gap: 6,
            }}
          >
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} width={90} height={36} radius={8} />
            ))}
          </div>

          {/* Skeleton content */}
          <div
            aria-hidden="true"
            style={{
              background: "var(--card-bg, #fff)",
              border: "1px solid var(--border-color, #e7ebf0)",
              borderRadius: 12,
              padding: 20,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 16,
            }}
          >
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                style={{
                  background: "var(--bg-tertiary, #f8fafc)",
                  borderRadius: 12,
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <Skeleton width="60%" height={16} />
                <Skeleton width="40%" height={11} />
                <Skeleton width="100%" height={40} radius={10} />
                <Skeleton width="100%" height={40} radius={10} />
              </div>
            ))}
          </div>
        </>
      )}

      {/* ============================================================
          ERROR
          ============================================================ */}
      {!loading && error && (
        <div
          style={{
            padding: 30,
            textAlign: "center",
            background: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            borderRadius: 12,
            color: "#ef4444",
          }}
        >
          <AlertCircle size={26} style={{ marginBottom: 10 }} />
          <div style={{ fontWeight: 600, marginBottom: 4 }}>
            Không tải được dữ liệu
          </div>
          <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 12 }}>
            {error}
          </div>
          <button
            onClick={load}
            style={{
              padding: "8px 16px",
              background: "#ef4444",
              color: "#fff",
              border: 0,
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            Thử lại
          </button>
        </div>
      )}

      {/* ============================================================
          TAB: HÔM NAY
          ============================================================ */}
      {!loading && !error && tab === "today" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          {todayShifts.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.id} style={cardStyle}>
                {/* Header ca */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 14,
                    paddingBottom: 12,
                    borderBottom: "1px solid var(--border-color, #eef2f7)",
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: s.color + "20",
                      color: s.color,
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    <Icon size={20} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <b style={{ color: "var(--text-primary, #172033)", fontSize: 14 }}>
                      {s.label}
                    </b>
                    <div style={{ fontSize: 11, color: "var(--text-light, #8993a3)" }}>
                      {s.time}
                    </div>
                  </div>
                  <span
                    style={{
                      background: s.color + "20",
                      color: s.color,
                      padding: "4px 10px",
                      borderRadius: 20,
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {s.employees.length}
                  </span>
                </div>

                {/* Danh sách nhân viên */}
                {s.employees.length === 0 ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: 30,
                      color: "var(--text-light, #8993a3)",
                      fontSize: 12,
                    }}
                  >
                    Chưa phân ca
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {s.employees.map((emp) => {
                      const today = getToday();
                      const att = attendances.find(
                        (a) =>
                          String(a.employee_id) === String(emp.employee_id) &&
                          a.date === today
                      );
                      return (
                        <div
                          key={`${emp.id}-${emp.shift}-${emp.date}`}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: 10,
                            background: "var(--bg-tertiary, #f8fafc)",
                            borderRadius: 10,
                          }}
                        >
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: "50%",
                              background:
                                "linear-gradient(135deg, #2634d5, #20c779)",
                              color: "#fff",
                              display: "grid",
                              placeItems: "center",
                              fontSize: 11,
                              fontWeight: 700,
                              flexShrink: 0,
                            }}
                          >
                            {(emp.employee_name || "?").slice(0, 2).toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <b
                              style={{
                                fontSize: 13,
                                color: "var(--text-primary, #172033)",
                                display: "block",
                              }}
                            >
                              {emp.employee_name}
                            </b>
                            <span
                              style={{
                                fontSize: 11,
                                color: "var(--text-light, #8993a3)",
                              }}
                            >
                              {att
                                ? "Vào " +
                                  fmtTime(att.checkIn) +
                                  (att.checkOut
                                    ? " · Ra " + fmtTime(att.checkOut)
                                    : "")
                                : "Chưa chấm công"}
                            </span>
                          </div>
                          {att && (
                            <AttendanceBadge status={att.status} />
                          )}
                          <button
                            onClick={() => openEdit(emp)}
                            title="Sửa ca"
                            aria-label="Sửa ca"
                            style={iconBtnSmall}
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => removeAssignment(emp.id)}
                            title="Xóa ca"
                            aria-label="Xóa ca"
                            style={{ ...iconBtnSmall, color: "#ef4444" }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================
          TAB: THEO TUẦN
          ============================================================ */}
      {!loading && !error && tab === "week" && (
        <div style={cardStyle}>
          {/* Toolbar tuần */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div>
              <h3 style={{ margin: "0 0 4px", color: "var(--text-primary, #172033)", fontSize: 15 }}>
                Lịch phân ca tuần
              </h3>
              <span style={{ fontSize: 12, color: "var(--text-muted, #64748b)" }}>
                📅 {weekLabel}
              </span>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <button onClick={() => changeWeek(-1)} title="Tuần trước" aria-label="Tuần trước" style={navBtn}>
                <ChevronLeft size={18} />
              </button>
              <button onClick={goToThisWeek} style={navBtnWide}>
                <CalendarDays size={14} /> Tuần này
              </button>
              <button onClick={() => changeWeek(1)} title="Tuần sau" aria-label="Tuần sau" style={navBtn}>
                <ChevronRight size={18} />
              </button>
              <button
                onClick={openNew}
                style={{
                  padding: "9px 14px",
                  borderRadius: 8,
                  background: "#2634d5",
                  color: "#fff",
                  border: 0,
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: 12,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Plus size={14} /> Phân ca
              </button>
            </div>
          </div>

          {/* Bảng tuần */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
              <thead>
                <tr style={{ background: "var(--bg-tertiary, #f5f7fb)" }}>
                  <th style={{ ...thStyle, minWidth: 150 }}>Nhân viên</th>
                  {weekDays.map((d) => {
                    const dayObj = new Date(d + "T00:00:00");
                    return (
                      <th
                        key={d}
                        style={{
                          ...thStyle,
                          textAlign: "center",
                          fontSize: 11,
                          minWidth: 80,
                          padding: 8,
                        }}
                      >
                        <div style={{ fontWeight: 700 }}>
                          {dayObj.toLocaleDateString("vi-VN", { weekday: "short" })}
                        </div>
                        <div style={{ fontSize: 10, opacity: 0.7 }}>
                          {d.slice(8)}/{d.slice(5, 7)}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr
                    key={emp.id}
                    style={{ borderBottom: "1px solid var(--border-color, #eef2f7)" }}
                  >
                    <td style={tdStyle}>
                      <b>{emp.name}</b>
                    </td>
                    {weekDays.map((d) => {
                      const empShifts = shifts.filter(
                        (s) =>
                          String(s.employee_id) === String(emp.id) &&
                          s.date === d
                      );
                      return (
                        <td key={d} style={{ padding: 6, textAlign: "center" }}>
                          {empShifts.length === 0 ? (
                            <span
                              style={{
                                color: "var(--text-light, #cbd5e1)",
                                fontSize: 12,
                              }}
                            >
                              —
                            </span>
                          ) : (
                            <div
                              style={{
                                display: "flex",
                                gap: 2,
                                justifyContent: "center",
                                flexWrap: "wrap",
                              }}
                            >
                              {empShifts.map((s) => (
                                <button
                                  key={s.id}
                                  onClick={() => openEdit(s)}
                                  title={`${s.shift} — Bấm để sửa`}
                                  aria-label={`Sửa ca ${s.shift}`}
                                  style={{
                                    width: 24,
                                    height: 24,
                                    borderRadius: 6,
                                    border: 0,
                                    background: shiftColor(s.shift),
                                    color: "#fff",
                                    display: "grid",
                                    placeItems: "center",
                                    fontSize: 11,
                                    fontWeight: 700,
                                    cursor: "pointer",
                                  }}
                                >
                                  {shiftCode(s.shift)}
                                </button>
                              ))}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {!employees.length && (
                  <tr>
                    <td
                      colSpan={weekDays.length + 1}
                      style={{ textAlign: "center", padding: 40, color: "var(--text-light, #8993a3)" }}
                    >
                      Chưa có nhân viên nào
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div
            style={{
              marginTop: 14,
              display: "flex",
              gap: 16,
              fontSize: 12,
              flexWrap: "wrap",
            }}
          >
            {SHIFTS.map((s) => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 5,
                    background: s.color,
                    display: "grid",
                    placeItems: "center",
                    color: "#fff",
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  {shiftCode(s.id)}
                </span>
                <span style={{ color: "var(--text-muted, #64748b)" }}>{s.label}</span>
              </div>
            ))}
            <span
              style={{
                marginLeft: "auto",
                color: "var(--text-light, #8993a3)",
                fontStyle: "italic",
              }}
            >
              💡 Bấm vào ô để sửa ca
            </span>
          </div>
        </div>
      )}

      {/* ============================================================
          TAB: PHÂN CA
          ============================================================ */}
      {!loading && !error && tab === "assign" && (
        <div>
          {/* Toolbar */}
          <div
            style={{
              display: "flex",
              gap: 12,
              marginBottom: 16,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "var(--card-bg, #fff)",
                border: "1px solid var(--border-color, #e5e9ef)",
                borderRadius: 8,
                padding: "9px 12px",
                flex: 1,
                minWidth: 200,
                maxWidth: 400,
              }}
            >
              <Search size={16} style={{ color: "var(--text-light, #8993a3)" }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm nhân viên..."
                style={{
                  flex: 1,
                  border: 0,
                  outline: "none",
                  background: "transparent",
                  color: "var(--text-primary, #172033)",
                  fontSize: 13,
                }}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  style={{
                    background: "transparent",
                    border: 0,
                    cursor: "pointer",
                    color: "var(--text-light, #8993a3)",
                    padding: 2,
                  }}
                  aria-label="Xoá tìm kiếm"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filter tuần */}
            <div
              style={{
                display: "flex",
                gap: 4,
                background: "var(--bg-tertiary, #f5f7fb)",
                padding: 4,
                borderRadius: 8,
              }}
            >
              {[
                { id: "week", label: "Tuần này" },
                { id: "nextWeek", label: "Tuần sau" },
                { id: "all", label: "Tất cả" },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setHistoryFilter(f.id)}
                  type="button"
                  style={{
                    padding: "6px 14px",
                    background: historyFilter === f.id ? "#2634d5" : "transparent",
                    color: historyFilter === f.id ? "#fff" : "var(--text-muted, #475569)",
                    border: 0,
                    borderRadius: 6,
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <button
              onClick={openNew}
              type="button"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "#2634d5",
                color: "#fff",
                padding: "10px 16px",
                border: 0,
                borderRadius: 8,
                fontWeight: 700,
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              <Plus size={16} /> Phân ca
            </button>
          </div>

          {/* Summary */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 12,
              marginBottom: 14,
            }}
          >
            <SummaryCard label="Tổng ca" value={filteredShifts.length} color="#2634d5" />
            <SummaryCard label="Số ngày" value={groupedShifts.length} color="#18a967" />
            <SummaryCard label="Nhân viên" value={uniqueEmployees} color="#f59e0b" />
          </div>

          {/* Danh sách ca */}
          {groupedShifts.length === 0 ? (
            <div style={{ ...cardStyle, textAlign: "center", padding: 40 }}>
              <CalendarDays
                size={36}
                style={{ opacity: 0.35, marginBottom: 10, color: "var(--text-light, #8993a3)" }}
              />
              <div style={{ color: "var(--text-light, #8993a3)", fontSize: 13 }}>
                {search || historyFilter !== "all"
                  ? "Không có ca nào khớp bộ lọc"
                  : "Chưa có phân ca nào"}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {groupedShifts.map((group) => (
                <div key={group.date} style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
                  {/* Header ngày */}
                  <div
                    style={{
                      padding: "12px 18px",
                      background: "var(--bg-tertiary, #f5f7fb)",
                      borderBottom: "1px solid var(--border-color, #eef2f7)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 10,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 12,
                          background: "linear-gradient(135deg, #2634d5, #20c779)",
                          color: "#fff",
                          display: "grid",
                          placeItems: "center",
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
                          <span style={{ fontSize: 9, fontWeight: 600, opacity: 0.9 }}>
                            {group.weekdayShort}
                          </span>
                          <span style={{ fontSize: 15, fontWeight: 800 }}>
                            {group.dayNum}
                          </span>
                        </div>
                      </div>
                      <div>
                        <b
                          style={{
                            fontSize: 14,
                            color: "var(--text-primary, #172033)",
                            display: "block",
                          }}
                        >
                          {group.label}
                        </b>
                        <span style={{ fontSize: 11, color: "var(--text-light, #8993a3)" }}>
                          {group.shifts.length} ca
                        </span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {group.shiftTypes.map((s) => (
                        <span
                          key={s}
                          style={{
                            padding: "4px 10px",
                            borderRadius: 20,
                            fontSize: 10,
                            fontWeight: 700,
                            background: shiftColor(s) + "20",
                            color: shiftColor(s),
                          }}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* List ca trong ngày */}
                  <div>
                    {group.shifts.map((s, i) => (
                      <div
                        key={s.id}
                        style={{
                          padding: "10px 18px",
                          borderBottom:
                            i < group.shifts.length - 1
                              ? "1px solid var(--border-color, #f5f7fb)"
                              : "none",
                          display: "grid",
                          gridTemplateColumns: "1fr auto auto",
                          gap: 12,
                          alignItems: "center",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: "50%",
                              background: "linear-gradient(135deg, #2634d5, #20c779)",
                              color: "#fff",
                              display: "grid",
                              placeItems: "center",
                              fontSize: 11,
                              fontWeight: 700,
                              flexShrink: 0,
                            }}
                          >
                            {(s.employee_name || "?").slice(0, 2).toUpperCase()}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <b
                              style={{
                                fontSize: 13,
                                color: "var(--text-primary, #172033)",
                                display: "block",
                              }}
                            >
                              {s.employee_name}
                            </b>
                            {s.note && (
                              <span style={{ fontSize: 11, color: "var(--text-light, #8993a3)" }}>
                                {s.note}
                              </span>
                            )}
                          </div>
                        </div>
                        <span
                          style={{
                            padding: "4px 12px",
                            borderRadius: 20,
                            fontSize: 11,
                            fontWeight: 700,
                            background: shiftColor(s.shift) + "20",
                            color: shiftColor(s.shift),
                            whiteSpace: "nowrap",
                          }}
                        >
                          {s.shift}
                        </span>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button onClick={() => openEdit(s)} title="Sửa" aria-label="Sửa" style={iconBtnSmall}>
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => removeAssignment(s.id)}
                            title="Xóa"
                            aria-label="Xóa"
                            style={{ ...iconBtnSmall, color: "#ef4444" }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          TAB: LỊCH SỬ
          ============================================================ */}
      {!loading && !error && tab === "history" && (
        <div style={cardStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <h3 style={{ margin: 0, color: "var(--text-primary, #172033)", fontSize: 15 }}>
              Lịch sử chấm công
            </h3>
            <input
              type="month"
              value={historyMonth}
              onChange={(e) => setHistoryMonth(e.target.value)}
              style={{
                padding: "8px 12px",
                border: "1px solid var(--border-color, #e5e9ef)",
                borderRadius: 8,
                outline: "none",
                background: "var(--bg-secondary, #fff)",
                color: "var(--text-primary, #172033)",
                fontSize: 13,
              }}
            />
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--bg-tertiary, #f5f7fb)" }}>
                  <th style={thStyle}>Ngày</th>
                  <th style={thStyle}>Nhân viên</th>
                  <th style={thStyle}>Ca</th>
                  <th style={thStyle}>Check-in</th>
                  <th style={thStyle}>Check-out</th>
                  <th style={thStyle}>Giờ làm</th>
                  <th style={thStyle}>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {attendances.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: "center", padding: 40, color: "var(--text-light, #8993a3)" }}>
                      Chưa có dữ liệu chấm công
                    </td>
                  </tr>
                ) : (
                  attendances.map((a) => (
                    <tr key={a.id} style={{ borderBottom: "1px solid var(--border-color, #eef2f7)" }}>
                      <td style={tdStyle}>
                        <b>{fmtDate(a.date)}</b>
                      </td>
                      <td style={tdStyle}>{a.employee_name}</td>
                      <td style={tdStyle}>
                        {a.shift ? (
                          <span
                            style={{
                              padding: "4px 10px",
                              borderRadius: 20,
                              fontSize: 11,
                              fontWeight: 700,
                              background: shiftColor(a.shift) + "20",
                              color: shiftColor(a.shift),
                            }}
                          >
                            {a.shift}
                          </span>
                        ) : (
                          <span style={{ color: "var(--text-light, #8993a3)", fontSize: 12 }}>—</span>
                        )}
                      </td>
                      <td style={tdStyle}>{fmtTime(a.checkIn)}</td>
                      <td style={{ ...tdStyle, color: "var(--text-muted, #64748b)" }}>
                        {fmtTime(a.checkOut)}
                      </td>
                      <td style={tdStyle}>
                        <b>{a.hours ? a.hours + "h" : "—"}</b>
                      </td>
                      <td style={tdStyle}>
                        <AttendanceBadge status={a.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================
          ASSIGN MODAL
          ============================================================ */}
            {assignModal && (
        <AssignModal
          modal={assignModal}
          employees={filteredEmployees}
          weekDays={weekDays}
          shifts={shifts}
          onSave={saveAssignment}
          onClose={() => setAssignModal(null)}
        />
      )}

      {/* ✅ Confirm dialog */}
      {confirm && (
        <ConfirmDialog
          open
          title={confirm.title}
          message={confirm.message}
          confirmText={confirm.confirmText}
          cancelText={confirm.cancelText}
          danger={confirm.danger}
          loading={confirmBusy}
          onConfirm={runConfirm}
          onClose={closeConfirm}
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
// SUB-COMPONENT: AssignModal
// ============================================================

function AssignModal({ modal, employees, weekDays, shifts = [], onSave, onClose }) {
  const isEdit = modal._isEdit === true;

  // Modal tự chứa state form + saving
  const [saving, setSaving] = useState(false);

  // Tính ngày tuần sau — memo 1 lần
  const displayWeekDays = useMemo(() => {
    if (isEdit) return weekDays;
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
  }, [isEdit, weekDays]);

  const [dateShifts, setDateShifts] = useState(() => {
    if (isEdit) return { [modal.date]: [modal.shift] };
    return {};
  });
  const [activeDate, setActiveDate] = useState(isEdit ? modal.date : null);
  const [employeeId, setEmployeeId] = useState(modal.employee_id || "");
  const [note, setNote] = useState(modal.note || "");

  // Ngày đã có ca (để đánh dấu)
  const assignedDays = useMemo(() => {
    if (!employeeId || isEdit) return new Set();
    const empId = String(employeeId);
    return new Set(
      shifts
        .filter(
          (s) =>
            String(s.employee_id) === empId &&
            displayWeekDays.includes(s.date)
        )
        .map((s) => s.date)
    );
  }, [shifts, employeeId, displayWeekDays, isEdit]);

  const currentShifts = activeDate ? dateShifts[activeDate] || [] : [];

  const isDayAssigned = (d) =>
    (dateShifts[d] && dateShifts[d].length > 0) || assignedDays.has(d);

  // ESC đóng modal
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, saving]);

  const toggleShift = (shiftId) => {
    if (isEdit) {
      setDateShifts({ [activeDate]: [shiftId] });
      return;
    }
    if (!activeDate) {
      toast("Vui lòng chọn ngày trước", "error");
      return;
    }
    setDateShifts((prev) => {
      const cur = prev[activeDate] || [];
      const has = cur.includes(shiftId);
      const next = has ? cur.filter((x) => x !== shiftId) : [...cur, shiftId];
      const copy = { ...prev };
      if (next.length === 0) delete copy[activeDate];
      else copy[activeDate] = next;
      return copy;
    });
  };

  const applyToWholeWeek = () => {
    const tpl = currentShifts.length > 0 ? currentShifts : ["Ca sáng"];
    const next = { ...dateShifts };
    displayWeekDays.forEach((d) => {
      next[d] = [...tpl];
    });
    setDateShifts(next);
  };

  const clearAll = () => {
    setDateShifts({});
    setActiveDate(null);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (saving) return;

    if (!employeeId) {
      return toast("Vui lòng chọn nhân viên", "error");
    }
    const dates = Object.keys(dateShifts).filter(
      (d) => dateShifts[d]?.length > 0
    );
    if (!dates.length) {
      return toast("Vui lòng chọn ít nhất 1 ngày và 1 ca", "error");
    }

    setSaving(true);
    try {
      if (isEdit) {
        await onSave(
          {
            id: modal.id,
            date: dates[0],
            shift: dateShifts[dates[0]][0],
            note,
          },
          true
        );
      } else {
        await onSave({ employeeId: Number(employeeId), dateShifts, note }, false);
      }
    } finally {
      setSaving(false);
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
      onClick={() => !saving && onClose()}
      role="dialog"
      aria-modal="true"
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
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <h3 style={{ margin: 0, color: "var(--text-primary, #172033)", fontSize: 16 }}>
            {isEdit ? "Sửa ca làm việc" : "Phân ca làm việc"}
          </h3>
          <button
            onClick={onClose}
            disabled={saving}
            aria-label="Đóng"
            style={{
              background: "transparent",
              border: 0,
              cursor: saving ? "not-allowed" : "pointer",
              color: "var(--text-light, #8993a3)",
              padding: 4,
              display: "grid",
              placeItems: "center",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {!isEdit && (
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
            Đang phân ca cho tuần sau ({weekLabel})
          </div>
        )}

        <form onSubmit={submit} autoComplete="off">
          {/* Nhân viên */}
          <label style={labelStyle}>Nhân viên *</label>
          <select
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            required={!isEdit}
            disabled={isEdit || saving}
            style={inputStyle}
          >
            <option value="">-- Chọn nhân viên --</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>

          {/* Chọn ngày */}
          {!isEdit && (
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
              <label style={{ ...labelStyle, margin: 0 }}>Ngày *</label>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  type="button"
                  onClick={applyToWholeWeek}
                  disabled={saving}
                  style={{
                    padding: "4px 10px",
                    background: "rgba(38, 52, 213, 0.1)",
                    color: "#2634d5",
                    border: "1px solid rgba(38, 52, 213, 0.3)",
                    borderRadius: 6,
                    cursor: saving ? "not-allowed" : "pointer",
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
                    disabled={saving}
                    style={{
                      padding: "4px 10px",
                      background: "rgba(239, 68, 68, 0.1)",
                      color: "#ef4444",
                      border: "1px solid rgba(239, 68, 68, 0.3)",
                      borderRadius: 6,
                      cursor: saving ? "not-allowed" : "pointer",
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    Xóa hết
                  </button>
                )}
              </div>
            </div>
          )}
          {isEdit && <label style={labelStyle}>Ngày *</label>}

          {/* Grid ngày */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 4,
              marginBottom: 16,
            }}
          >
            {displayWeekDays.map((d) => {
              const isActive = activeDate === d;
              const isAssigned = isDayAssigned(d);
              const dayObj = new Date(d + "T00:00:00");
              const dayLabel = dayObj.toLocaleDateString("vi-VN", { weekday: "short" });

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
                  onClick={() => setActiveDate(d)}
                  disabled={saving}
                  title={isAssigned ? "Đã có ca — bấm để chọn thêm ca" : "Bấm để chọn ngày"}
                  style={{
                    padding: "8px 4px",
                    borderRadius: 8,
                    background: bg,
                    color: color,
                    border: border,
                    cursor: saving ? "not-allowed" : "pointer",
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
                  <span style={{ fontSize: 10, fontWeight: 600 }}>{dayLabel}</span>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{d.slice(8)}</span>
                </button>
              );
            })}
          </div>

          {/* Chọn ca */}
          <label style={labelStyle}>
            Ca làm *{" "}
            {!isEdit && activeDate && (
              <span style={{ fontWeight: 400, color: "var(--text-light, #94a3b8)" }}>
                (ngày {activeDate.slice(8)}/{activeDate.slice(5, 7)})
              </span>
            )}
          </label>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 8,
              marginBottom: 16,
            }}
          >
            {SHIFTS.map((s) => {
              const Icon = s.icon;
              const sel = currentShifts.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleShift(s.id)}
                  disabled={saving}
                  style={{
                    padding: "10px 8px",
                    borderRadius: 10,
                    background: sel ? s.color + "20" : "var(--card-bg, #fff)",
                    border: sel
                      ? "2px solid " + s.color
                      : "2px solid var(--border-color, #e5e9ef)",
                    cursor: saving ? "not-allowed" : "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Icon
                    size={18}
                    style={{ color: sel ? s.color : "var(--text-light, #94a3b8)" }}
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
                  <span style={{ fontSize: 9, color: "var(--text-light, #94a3b8)" }}>
                    {s.time}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Ghi chú */}
          <label style={labelStyle}>Ghi chú</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="VD: Bận việc riêng..."
            disabled={saving}
            style={inputStyle}
          />

          {/* Tổng kết */}
          {!isEdit && totalAssignments > 0 && (
            <div
              style={{
                marginTop: 12,
                padding: "10px 14px",
                background: "rgba(24, 169, 103, 0.1)",
                border: "1px solid rgba(24, 169, 103, 0.3)",
                borderRadius: 8,
                fontSize: 12,
                color: "#18a967",
                fontWeight: 600,
              }}
            >
              Đã chọn <b>{totalAssignments}</b> ca trên <b>{totalDays}</b> ngày
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              style={{
                flex: 1,
                padding: 12,
                border: "1px solid var(--border-color, #e5e9ef)",
                borderRadius: 8,
                background: "var(--card-bg, #fff)",
                cursor: saving ? "not-allowed" : "pointer",
                color: "var(--text-primary, #172033)",
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                flex: 1,
                padding: 12,
                background: saving ? "#94a3b8" : "#2634d5",
                color: "#fff",
                border: 0,
                borderRadius: 8,
                fontWeight: 700,
                cursor: saving ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                fontSize: 13,
              }}
            >
              {saving ? (
                <>
                  <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                  Đang lưu...
                </>
              ) : (
                <>
                  <Save size={14} /> {isEdit ? "Lưu thay đổi" : "Phân ca"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// SMALL SUB-COMPONENTS
// ============================================================

function AttendanceBadge({ status }) {
  if (!status) return null;
  const map = {
    "Đúng giờ": { bg: "#d1fae5", fg: "#065f46" },
    "Đi muộn": { bg: "#fef3c7", fg: "#92400e" },
    "Về sớm": { bg: "#dbeafe", fg: "#1e40af" },
  };
  const c = map[status] || { bg: "#e2e8f0", fg: "#475569" };
  return (
    <span
      style={{
        padding: "3px 8px",
        borderRadius: 12,
        fontSize: 10,
        fontWeight: 700,
        background: c.bg,
        color: c.fg,
        whiteSpace: "nowrap",
      }}
    >
      {status}
    </span>
  );
}

function SummaryCard({ label, value, color }) {
  return (
    <div
      style={{
        background: "var(--card-bg, #fff)",
        border: "1px solid var(--border-color, #e7ebf0)",
        borderRadius: 12,
        padding: "14px 16px",
      }}
    >
      <span
        style={{
          fontSize: 11,
          color: "var(--text-light, #8993a3)",
          textTransform: "uppercase",
          letterSpacing: 0.5,
          fontWeight: 600,
        }}
      >
        {label}
      </span>
      <div style={{ fontSize: 22, fontWeight: 800, color, marginTop: 4 }}>
        {value}
      </div>
    </div>
  );
}

function Stat({ icon, label, value, color }) {
  return (
    <div
      style={{
        background: "var(--card-bg, #fff)",
        border: "1px solid var(--border-color, #e7ebf0)",
        borderRadius: 12,
        padding: 18,
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: color + "18",
          color,
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <span style={{ fontSize: 12, color: "var(--text-light, #8993a3)" }}>
          {label}
        </span>
        <div style={{ fontSize: 22, fontWeight: 800, color, marginTop: 2 }}>
          {value}
        </div>
      </div>
    </div>
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

const thStyle = {
  padding: 11,
  textAlign: "left",
  fontSize: 12,
  color: "var(--text-muted, #64748b)",
  fontWeight: 600,
};

const tdStyle = {
  padding: 11,
  fontSize: 13,
  color: "var(--text-primary, #172033)",
};

const labelStyle = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  marginBottom: 4,
  marginTop: 12,
  color: "var(--text-muted, #475569)",
};

const inputStyle = {
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

const iconBtnSmall = {
  padding: 6,
  border: "1px solid var(--border-color, #e5e9ef)",
  borderRadius: 6,
  background: "var(--card-bg, #fff)",
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
  color: "var(--text-primary, #172033)",
  width: 30,
  height: 30,
  flexShrink: 0,
};

const navBtn = {
  width: 36,
  height: 36,
  borderRadius: 8,
  border: "1px solid var(--border-color, #e5e9ef)",
  background: "var(--card-bg, #fff)",
  color: "var(--text-primary, #172033)",
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
};

const navBtnWide = {
  padding: "9px 14px",
  borderRadius: 8,
  border: "1px solid var(--border-color, #e5e9ef)",
  background: "var(--card-bg, #fff)",
  color: "var(--text-primary, #172033)",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 12,
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
};