// ============================================================
// OWNERVOUCHERS.JSX — Quản lý voucher (Admin)
// ============================================================
// Tính năng:
//   - Danh sách voucher: template (public) + personal (user)
//   - Filter: search / source / status / customer / sort
//   - Thao tác: tạo / sửa / xoá / bulk xoá / toggle used
//   - Xem lượt claim của template
//   - Export CSV (có escape đúng chuẩn)
//
// Endpoints:
//   - api.vouchers.all / create / update / remove
//   - api.vouchers.claims(templateId)
//   - api.users.list("CUSTOMER")
//
// Lưu ý:
//   - Customer lookup dùng Map thay vì find() → O(1)
//   - CSV escape đúng: dấu " được nhân đôi, cell được bọc trong ""
//   - copyCode + exportCSV có cleanup
// ============================================================
import { SkeletonTable } from "../../components/Skeleton";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import {
  Plus, Search, Trash2, Edit, Ticket, Gift, Save, Check, Download,
  Power, Globe, User as UserIcon, Eye, X, Users, Copy,
  Loader2, AlertCircle, Filter as FilterIcon, SortAsc,
} from "lucide-react";
import { api } from "../../api";
import { money } from "../../components/UI";
import { toast } from "../../components/Effects";
import ConfirmDialog from "../../components/ConfirmDialog";
// ============================================================
// CONSTANTS
// ============================================================

const MODAL_Z = 2147483600;
const COPY_FEEDBACK_MS = 1500;

const SOURCE_FILTERS = [
  { id: "all",      label: "Tất cả" },
  { id: "public",   label: "🌐 Public" },
  { id: "personal", label: "👤 Cá nhân" },
];

const STATUS_FILTERS = [
  { id: "all",    label: "Tất cả TT" },
  { id: "unused", label: "Chưa dùng" },
  { id: "used",   label: "Đã dùng" },
];

const SORT_OPTIONS = [
  { id: "newest",     label: "Mới nhất" },
  { id: "oldest",     label: "Cũ nhất" },
  { id: "value-desc", label: "Giá trị ↓" },
  { id: "value-asc",  label: "Giá trị ↑" },
];

const QUICK_VALUES = [10000, 20000, 50000, 100000];

// ============================================================
// HELPERS
// ============================================================

/**
 * Escape 1 cell cho CSV:
 *   - Bọc trong "" nếu có `,` / `"` / `\n`
 *   - Nhân đôi dấu `"` bên trong
 */
function csvCell(v) {
  const s = String(v ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function OwnerVouchers() {
  // ---------- Data ----------
  const [list, setList] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

    // ---------- UI ----------
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formValue, setFormValue] = useState(10000);
  const [q, setQ] = useState("");
  const [filterSource, setFilterSource] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [selected, setSelected] = useState([]);
  const [copiedId, setCopiedId] = useState(null);

  // ---------- Claims modal ----------
  const [claimsModal, setClaimsModal] = useState(null); // template object
  const [claims, setClaims] = useState([]);
  const [loadingClaims, setLoadingClaims] = useState(false);

  // ---------- ✅ Confirm dialog ----------
  const [confirm, setConfirm] = useState(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  // Race-safe
  const reqIdRef = useRef(0);

  // ---------- Load ----------

  const load = useCallback(async () => {
    const myReqId = ++reqIdRef.current;
    setLoading(true);
    setError("");

    try {
      const [vRes, uRes] = await Promise.all([
        api.vouchers.all().catch(() => []),
        api.users.list("CUSTOMER").catch(() => []),
      ]);

      if (myReqId !== reqIdRef.current) return;

      setList(Array.isArray(vRes) ? vRes : []);
      setCustomers(Array.isArray(uRes) ? uRes : []);
    } catch (e) {
      if (myReqId === reqIdRef.current) {
        setError(e.message || "Không tải được danh sách voucher");
      }
    } finally {
      if (myReqId === reqIdRef.current) setLoading(false);
    }
  }, []);

   useEffect(() => {
    load();
  }, [load]);

  // Sync formValue khi mở/đổi modal
  useEffect(() => {
    if (modal) {
      setFormValue(Number(modal.value) || 10000);
    }
  }, [modal]);

  // Cleanup timeout copy feedback khi unmount
  useEffect(() => {
    if (!copiedId) return;
    const t = setTimeout(() => setCopiedId(null), COPY_FEEDBACK_MS);
    return () => clearTimeout(t);
  }, [copiedId]);

  // ESC đóng modals
  useEffect(() => {
    const handler = (e) => {
      if (e.key !== "Escape") return;
      if (claimsModal) setClaimsModal(null);
      else if (modal && !saving) setModal(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [modal, claimsModal, saving]);

  // ---------- Computed ----------

  // Map customer_id → customer để tra cứu O(1)
  const customerMap = useMemo(() => {
    const map = new Map();
    for (const c of customers) map.set(String(c.id), c);
    return map;
  }, [customers]);

  const filtered = useMemo(() => {
    let result = [...list];

    // Search
    if (q.trim()) {
      const s = q.toLowerCase().trim();
      result = result.filter(
        (v) =>
          v.code?.toLowerCase().includes(s) ||
          String(v.user_id || "").includes(s) ||
          String(v.value).includes(s)
      );
    }

    // Status filter
    if (filterStatus === "used") result = result.filter((v) => v.used);
    if (filterStatus === "unused") result = result.filter((v) => !v.used);

    // Source filter
    if (filterSource === "public") {
      result = result.filter((v) => !v.user_id && !v.claimed_from);
    }
    if (filterSource === "personal") {
      result = result.filter((v) => v.user_id);
    }

    // Sort (immutable-safe: đã có `[...list]`)
    switch (sortBy) {
      case "oldest":
        result.sort((a, b) => (a.id || 0) - (b.id || 0));
        break;
      case "value-desc":
        result.sort((a, b) => (b.value || 0) - (a.value || 0));
        break;
      case "value-asc":
        result.sort((a, b) => (a.value || 0) - (b.value || 0));
        break;
      case "newest":
      default:
        result.sort((a, b) => (b.id || 0) - (a.id || 0));
    }

    return result;
  }, [list, q, filterStatus, filterSource, sortBy]);

  const stats = useMemo(() => {
    const publicTemplates = list.filter(
      (v) => !v.user_id && !v.claimed_from
    );
    const personal = list.filter((v) => v.user_id);
    const totalClaims = personal.filter((v) => v.claimed_from).length;
    return {
      total: list.length,
      public: publicTemplates.length,
      personal: personal.length,
      available: personal.filter((v) => !v.used).length,
      used: list.filter((v) => v.used).length,
      totalClaims,
    };
  }, [list]);

  // Đếm claims theo template_id — map 1 lần
  const claimsCountMap = useMemo(() => {
    const map = new Map();
    for (const v of list) {
      if (v.claimed_from) {
        map.set(v.claimed_from, (map.get(v.claimed_from) || 0) + 1);
      }
    }
    return map;
  }, [list]);

  const allSelected =
    filtered.length > 0 && selected.length === filtered.length;

  // ---------- Handlers ----------

  const getSource = (v) => {
    if (v.claimed_from)
      return { label: "Đã nhận từ ƯĐ", color: "#8b5cf6", bg: "#ede9fe" };
    if (!v.user_id)
      return { label: "Toàn hệ thống", color: "#ec4899", bg: "#fce7f3" };
    return { label: "Cá nhân", color: "#2634d5", bg: "#eef2ff" };
  };

  const generateCode = () => {
    const n = Math.max(0, ...list.map((v) => v.id || 0)) + 1;
    return "VOUCHER" + String(n).padStart(4, "0");
  };

  const copyCode = (v) => {
    navigator.clipboard.writeText(v.code);
    setCopiedId(v.id);
    toast("Đã sao chép mã " + v.code, "success");
  };

  // ✅ Confirm helpers
  const closeConfirm = useCallback(() => {
    if (confirmBusy) return;
    setConfirm(null);
  }, [confirmBusy]);

  const runConfirm = useCallback(async () => {
    if (!confirm || confirmBusy) return;
    setConfirmBusy(true);
    try {
      await confirm.onConfirm();
    } finally {
      setConfirmBusy(false);
    }
  }, [confirm, confirmBusy]);

  const toggleSelect = (id) => {
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id]
    );
  };

  const toggleSelectAll = () => {
    if (allSelected) setSelected([]);
    else setSelected(filtered.map((v) => v.id));
  };

  // ---------- CRUD ----------

  const saveVoucher = async (e) => {
    e.preventDefault();
    if (saving) return;

    const f = new FormData(e.currentTarget);
    const code = f.get("code")?.trim().toUpperCase();
    const value = Number(formValue);
    const userId = f.get("user_id") ? Number(f.get("user_id")) : null;
    const pointsUsed = Number(f.get("points_used")) || 0;

    // Validate
    if (!code) return toast("Vui lòng nhập mã voucher", "error");
    if (!value || value <= 0) return toast("Giá trị phải lớn hơn 0", "error");
    if (value > 10_000_000)
      return toast("Giá trị tối đa 10 triệu", "error");
    if (pointsUsed < 0) return toast("Số điểm không được âm", "error");

    setSaving(true);
    try {
      const data = { code, value, user_id: userId, points_used: pointsUsed };
      if (modal?.id) {
        await api.vouchers.update(modal.id, data);
        toast("Đã cập nhật voucher", "success");
      } else {
        await api.vouchers.create(data);
        toast("Đã tạo voucher " + code, "success");
      }
      setModal(null);
      load();
    } catch (e) {
      toast(e.message || "Không lưu được", "error");
    } finally {
      setSaving(false);
    }
  };

   const removeVoucher = (v) => {
    setConfirm({
      title: `Xóa voucher "${v.code}"?`,
      message:
        `Voucher trị giá ${money(v.value)} sẽ bị xoá vĩnh viễn. ` +
        "Hành động này không thể hoàn tác.",
      confirmText: "Xóa voucher",
      cancelText: "Hủy",
      danger: true,
      onConfirm: async () => {
        try {
          await api.vouchers.remove(v.id);
          toast("Đã xóa voucher", "success");
          setSelected((s) => s.filter((x) => x !== v.id));
          setConfirm(null);
          load();
        } catch (e) {
          toast(e.message || "Không xóa được", "error");
        }
      },
    });
  };

   const removeSelected = () => {
    if (!selected.length) return;
    const count = selected.length;

    setConfirm({
      title: `Xóa ${count} voucher đã chọn?`,
      message:
        `${count} voucher sẽ bị xoá vĩnh viễn. ` +
        "Hành động này không thể hoàn tác.",
      confirmText: `Xóa ${count} voucher`,
      cancelText: "Hủy",
      danger: true,
      onConfirm: async () => {
        try {
          await Promise.all(selected.map((id) => api.vouchers.remove(id)));
          toast(`Đã xóa ${count} voucher`, "success");
          setSelected([]);
          setConfirm(null);
          load();
        } catch (e) {
          toast(e.message || "Không xóa được", "error");
        }
      },
    });
  };
    const toggleUsed = (v) => {
    const newUsed = !v.used;
    const action = newUsed ? "đã dùng" : "chưa dùng";

    setConfirm({
      title: `Đánh dấu "${v.code}" là ${action}?`,
      message: newUsed
        ? "Voucher sẽ được đánh dấu là đã sử dụng. Khách hàng sẽ không dùng được nữa."
        : "Voucher sẽ được khôi phục về trạng thái chưa dùng.",
      confirmText: `Đánh dấu ${action}`,
      cancelText: "Hủy",
      danger: newUsed,
      onConfirm: async () => {
        try {
          await api.vouchers.update(v.id, { used: newUsed });
          toast(`Đã đánh dấu ${action}`, "success");
          setConfirm(null);
          load();
        } catch (e) {
          toast(e.message || "Không cập nhật được", "error");
        }
      },
    });
  };

  // ---------- Claims ----------

  const openClaims = async (template) => {
    setClaimsModal(template);
    setLoadingClaims(true);
    setClaims([]);
    try {
      const data = await api.vouchers.claims(template.id).catch(() => []);
      setClaims(Array.isArray(data) ? data : []);
    } catch (e) {
      toast(e.message || "Không tải được danh sách", "error");
    } finally {
      setLoadingClaims(false);
    }
  };

  // ---------- Export CSV ----------

  const exportCSV = () => {
    if (!filtered.length) {
      return toast("Không có voucher nào để xuất", "error");
    }

    let url = null;
    let a = null;
    try {
      const rows = [
        ["Mã", "Giá trị", "Nguồn", "Khách hàng", "Điểm đổi", "Trạng thái", "Ngày tạo"],
        ...filtered.map((v) => {
          const c = customerMap.get(String(v.user_id));
          const src = getSource(v).label;
          const customerName = c
            ? c.name
            : v.user_id
            ? "User #" + v.user_id
            : "Toàn hệ thống";
          return [
            v.code,
            v.value,
            src,
            customerName,
            v.points_used || 0,
            v.used ? "Đã dùng" : "Chưa dùng",
            v.created_at
              ? new Date(v.created_at).toLocaleString("vi-VN")
              : "",
          ];
        }),
      ];

      // Escape từng cell
      const csv = rows.map((r) => r.map(csvCell).join(",")).join("\n");

      // BOM để Excel đọc UTF-8
      const blob = new Blob(["\uFEFF" + csv], {
        type: "text/csv;charset=utf-8",
      });
      url = URL.createObjectURL(blob);
      a = document.createElement("a");
      const stamp = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `vouchers-${stamp}.csv`;
      document.body.appendChild(a);
      a.click();

      toast(`Đã xuất ${filtered.length} voucher`, "success");
    } catch (e) {
      toast(e.message || "Không xuất được", "error");
    } finally {
      if (a && a.parentNode) a.parentNode.removeChild(a);
      if (url) URL.revokeObjectURL(url);
    }
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div>
      {/* ============================================================
          STATS
          ============================================================ */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <Stat label="Tổng voucher" value={stats.total} color="#2634d5" icon={<Ticket size={16} />} />
        <Stat label="Toàn hệ thống" value={stats.public} color="#ec4899" icon={<Globe size={16} />} />
        <Stat label="Cá nhân" value={stats.personal} color="#8b5cf6" icon={<UserIcon size={16} />} />
        <Stat label="Chưa dùng" value={stats.available} color="#18a967" icon={<Gift size={16} />} />
        <Stat label="Đã dùng" value={stats.used} color="#ef4444" icon={<Check size={16} />} />
        <Stat label="Lượt nhận" value={stats.totalClaims} color="#f59e0b" icon={<Users size={16} />} />
      </div>

      {/* ============================================================
          TOOLBAR + FILTERS
          ============================================================ */}
      <div style={cardStyle}>
        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {/* Search */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "var(--bg-tertiary, #f5f7fb)",
              border: "1px solid var(--border-color, #e5e9ef)",
              borderRadius: 8,
              padding: "8px 12px",
              flex: 1,
              minWidth: 200,
            }}
          >
            <Search size={16} style={{ color: "var(--text-light, #8993a3)" }} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm mã, giá trị, khách..."
              style={{
                flex: 1,
                border: 0,
                outline: "none",
                background: "transparent",
                color: "var(--text-primary, #172033)",
                fontSize: 13,
                minWidth: 0,
              }}
            />
            {q && (
              <button
                onClick={() => setQ("")}
                style={clearBtnStyle}
                aria-label="Xoá tìm kiếm"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Source filter */}
          <div style={segmentedStyle}>
            {SOURCE_FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterSource(f.id)}
                style={segmentBtnStyle(filterSource === f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={selectStyle}
          >
            {STATUS_FILTERS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={selectStyle}
          >
            {SORT_OPTIONS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>

          {/* Export */}
          <button onClick={exportCSV} style={toolBtnStyle} disabled={loading}>
            <Download size={14} /> Xuất CSV
          </button>

          {/* Create */}
          <button
            onClick={() => setModal({ code: generateCode() })}
            style={btnPrimaryStyle}
          >
            <Plus size={16} /> Tạo voucher
          </button>
        </div>

        {/* Bulk action bar */}
        {selected.length > 0 && (
          <div
            style={{
              marginTop: 12,
              padding: "10px 14px",
              background: "rgba(239, 68, 68, 0.08)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: 13,
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <span style={{ color: "#ef4444", fontWeight: 600 }}>
              Đã chọn <b>{selected.length}</b> voucher
            </span>
            <button
              onClick={removeSelected}
              style={{
                padding: "6px 14px",
                background: "#ef4444",
                color: "#fff",
                border: 0,
                borderRadius: 6,
                fontWeight: 600,
                cursor: "pointer",
                fontSize: 12,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Trash2 size={13} /> Xóa {selected.length}
            </button>
          </div>
        )}

        {/* Counter */}
        <div
          style={{
            marginTop: 12,
            fontSize: 12,
            color: "var(--text-light, #8993a3)",
          }}
        >
          Hiển thị <b>{filtered.length}</b> / {list.length} voucher
        </div>
      </div>

      {/* ============================================================
          TABLE
          ============================================================ */}
      <div style={{ ...cardStyle, marginTop: 16 }}>
                {/* Loading — skeleton table */}
        {loading && (
          <SkeletonTable
            columns={8}
            rows={5}
            headers={["", "Mã", "Giá trị", "Nguồn", "Khách / Lượt nhận", "Trạng thái", "Ngày", "Thao tác"]}
          />
        )}

        {/* Error */}
        {!loading && error && (
          <ErrorBox message={error} onRetry={load} />
        )}

        {/* Empty */}
        {!loading && !error && filtered.length === 0 && (
          <div style={emptyBoxStyle}>
            <Ticket size={40} style={{ opacity: 0.3, marginBottom: 8 }} />
            <div style={{ fontSize: 13 }}>
              {list.length === 0
                ? "Chưa có voucher nào — bấm \"Tạo voucher\" để bắt đầu"
                : "Không có voucher khớp bộ lọc"}
            </div>
          </div>
        )}

        {/* Data */}
        {!loading && !error && filtered.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--bg-tertiary, #f5f7fb)" }}>
                  <th style={{ ...thStyle, width: 40 }}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      style={{ cursor: "pointer" }}
                      aria-label="Chọn tất cả"
                    />
                  </th>
                  <th style={thStyle}>Mã</th>
                  <th style={thStyle}>Giá trị</th>
                  <th style={thStyle}>Nguồn</th>
                  <th style={thStyle}>Khách / Lượt nhận</th>
                  <th style={thStyle}>Trạng thái</th>
                  <th style={thStyle}>Ngày</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((v) => {
                  const cust = customerMap.get(String(v.user_id));
                  const src = getSource(v);
                  const isTemplate = !v.user_id && !v.claimed_from;
                  const claimCount = isTemplate
                    ? claimsCountMap.get(v.id) || 0
                    : 0;
                  const isSelected = selected.includes(v.id);
                  const isCopied = copiedId === v.id;

                  return (
                    <tr
                      key={v.id}
                      style={{
                        borderBottom: "1px solid var(--border-color, #eef2f7)",
                        background: isSelected
                          ? "rgba(38, 52, 213, 0.04)"
                          : "transparent",
                      }}
                    >
                      <td style={tdStyle}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(v.id)}
                          style={{ cursor: "pointer" }}
                          aria-label={`Chọn ${v.code}`}
                        />
                      </td>

                      {/* Code + copy */}
                      <td style={tdStyle}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <b
                            style={{
                              color: "#2634d5",
                              fontFamily: "monospace",
                              fontSize: 12,
                            }}
                          >
                            {v.code}
                          </b>
                          <button
                            onClick={() => copyCode(v)}
                            title="Sao chép mã"
                            aria-label="Sao chép mã"
                            style={{
                              background: "transparent",
                              border: 0,
                              cursor: "pointer",
                              color: isCopied
                                ? "#18a967"
                                : "var(--text-light, #94a3b8)",
                              padding: 2,
                              display: "grid",
                              placeItems: "center",
                            }}
                          >
                            {isCopied ? <Check size={12} /> : <Copy size={12} />}
                          </button>
                        </div>
                      </td>

                      {/* Value */}
                      <td style={tdStyle}>
                        <b style={{ color: "#18a967" }}>{money(v.value)}</b>
                      </td>

                      {/* Source */}
                      <td style={tdStyle}>
                        <span
                          style={{
                            padding: "3px 9px",
                            borderRadius: 12,
                            fontSize: 10.5,
                            fontWeight: 700,
                            background: src.bg,
                            color: src.color,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 3,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {isTemplate ? (
                            <Globe size={10} />
                          ) : (
                            <UserIcon size={10} />
                          )}
                          {src.label}
                        </span>
                      </td>

                      {/* Customer / claims */}
                      <td style={{ ...tdStyle, fontSize: 12 }}>
                        {isTemplate ? (
                          <button
                            onClick={() => openClaims(v)}
                            style={{
                              background: "transparent",
                              border: 0,
                              cursor: "pointer",
                              color:
                                claimCount > 0
                                  ? "#2634d5"
                                  : "var(--text-light, #94a3b8)",
                              fontWeight: claimCount > 0 ? 700 : 400,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              fontSize: 12,
                              padding: 0,
                            }}
                          >
                            <Users size={12} />
                            {claimCount > 0
                              ? `${claimCount} khách đã nhận`
                              : "Chưa ai nhận"}
                          </button>
                        ) : cust ? (
                          cust.name
                        ) : v.user_id ? (
                          <span style={{ color: "var(--text-muted, #64748b)" }}>
                            User #{v.user_id}
                          </span>
                        ) : (
                          <span style={{ color: "var(--text-light, #94a3b8)" }}>
                            —
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td style={tdStyle}>
                        <span
                          style={{
                            padding: "3px 9px",
                            borderRadius: 12,
                            fontSize: 10.5,
                            fontWeight: 700,
                            background: v.used ? "#fee2e2" : "#e8f9f1",
                            color: v.used ? "#ef4444" : "#18a967",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {v.used ? "Đã dùng" : "Chưa dùng"}
                        </span>
                      </td>

                      {/* Date */}
                      <td
                        style={{
                          ...tdStyle,
                          fontSize: 11,
                          color: "var(--text-muted, #64748b)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {v.created_at
                          ? new Date(v.created_at).toLocaleDateString("vi-VN")
                          : "—"}
                      </td>

                      {/* Actions */}
                      <td style={{ ...tdStyle, textAlign: "right" }}>
                        <div
                          style={{
                            display: "flex",
                            gap: 4,
                            justifyContent: "flex-end",
                          }}
                        >
                          {isTemplate && (
                            <IconButton
                              onClick={() => openClaims(v)}
                              title="Xem lượt nhận"
                              color="#8b5cf6"
                            >
                              <Eye size={14} />
                            </IconButton>
                          )}
                          <IconButton
                            onClick={() => toggleUsed(v)}
                            title={
                              v.used
                                ? "Đánh dấu chưa dùng"
                                : "Đánh dấu đã dùng"
                            }
                            color={v.used ? "#18a967" : "#f59e0b"}
                          >
                            <Power size={14} />
                          </IconButton>
                          <IconButton
                            onClick={() => setModal(v)}
                            title="Sửa"
                          >
                            <Edit size={14} />
                          </IconButton>
                          <IconButton
                            onClick={() => removeVoucher(v)}
                            title="Xóa"
                            color="#ef4444"
                          >
                            <Trash2 size={14} />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============================================================
          CREATE/EDIT MODAL
          ============================================================ */}
      {modal && (
        <Modal
          onClose={() => !saving && setModal(null)}
          maxWidth={500}
        >
          <div style={modalHeaderStyle}>
            <h3 style={modalTitleStyle}>
              <Ticket size={20} />{" "}
              {modal.id ? "Sửa voucher" : "Tạo voucher mới"}
            </h3>
            <button
              onClick={() => !saving && setModal(null)}
              style={modalCloseStyle}
              aria-label="Đóng"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={saveVoucher} autoComplete="off">
            <label style={labelStyle}>Mã voucher *</label>
            <input
              name="code"
              defaultValue={modal.code || generateCode()}
              required
              disabled={saving || !!modal.id}
              style={{
                ...inputStyle,
                fontFamily: "monospace",
                textTransform: "uppercase",
                opacity: modal.id ? 0.7 : 1,
                cursor: modal.id ? "not-allowed" : "text",
              }}
            />

            <label style={labelStyle}>Giá trị (VNĐ) *</label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 6,
                marginBottom: 8,
              }}
            >
                          {QUICK_VALUES.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setFormValue(v)}
                  disabled={saving}
                  style={{
                    padding: "6px 4px",
                    background:
                      formValue === v
                        ? "#2634d5"
                        : "var(--bg-tertiary, #f5f7fb)",
                    color:
                      formValue === v
                        ? "#fff"
                        : "var(--text-primary, #172033)",
                    border: `1px solid ${
                      formValue === v
                        ? "#2634d5"
                        : "var(--border-color, #e5e9ef)"
                    }`,
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: saving ? "not-allowed" : "pointer",
                  }}
                >
                  {v / 1000}K
                </button>
              ))}
            </div>
            <input
              name="value"
              type="number"
              min="1000"
              step="1000"
              value={formValue}
              onChange={(e) => setFormValue(Number(e.target.value) || 0)}
              required
              disabled={saving}
              style={inputStyle}
            />

            {/* Info box: public voucher */}
            <div
              style={{
                marginTop: 12,
                padding: "10px 14px",
                background: "rgba(236, 72, 153, 0.08)",
                border: "1px solid rgba(236, 72, 153, 0.25)",
                borderRadius: 8,
                fontSize: 12,
                color: "#ec4899",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Globe size={14} /> Để trống "Khách hàng" → voucher sẽ hiện ở
              trang "Ưu đãi" cho mọi khách nhận
            </div>

            <label style={labelStyle}>
              Khách hàng (để trống = toàn hệ thống)
            </label>
            <select
              name="user_id"
              defaultValue={modal.user_id || ""}
              disabled={saving}
              style={inputStyle}
            >
              <option value="">— Toàn hệ thống —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.email})
                </option>
              ))}
            </select>

            <label style={labelStyle}>Số điểm đổi (nếu có)</label>
            <input
              name="points_used"
              type="number"
              min="0"
              defaultValue={modal.points_used || 0}
              disabled={saving}
              style={inputStyle}
            />

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button
                type="button"
                onClick={() => setModal(null)}
                disabled={saving}
                style={{ ...btnCancelStyle, flex: 1 }}
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{ ...btnPrimaryStyle, flex: 1, width: "auto" }}
              >
                {saving ? (
                  <>
                    <Loader2
                      size={14}
                      style={{ animation: "spin 1s linear infinite" }}
                    />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <Save size={14} /> Lưu
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ============================================================
          CLAIMS MODAL
          ============================================================ */}
      {claimsModal && (
        <Modal
          onClose={() => setClaimsModal(null)}
          maxWidth={560}
          zIndex={MODAL_Z + 10}
        >
          <div style={modalHeaderStyle}>
            <h3 style={modalTitleStyle}>
              <Users size={20} /> Khách đã nhận voucher
            </h3>
            <button
              onClick={() => setClaimsModal(null)}
              style={modalCloseStyle}
              aria-label="Đóng"
            >
              <X size={20} />
            </button>
          </div>

          <div
            style={{
              background: "var(--bg-tertiary, #f5f7fb)",
              borderRadius: 8,
              padding: "10px 14px",
              marginBottom: 14,
              fontSize: 12,
            }}
          >
            <b style={{ fontFamily: "monospace", color: "#2634d5" }}>
              {claimsModal.code}
            </b>{" "}
            · {money(claimsModal.value)} ·{" "}
            <b>{claims.length}</b> khách đã nhận
          </div>

                   {loadingClaims ? (
            <SkeletonTable
              columns={4}
              rows={3}
              headers={["Khách hàng", "Mã cá nhân", "Ngày nhận", "Trạng thái"]}
            />
          ) : claims.length === 0 ? (
            <div style={emptyBoxStyle}>
              <Users size={36} style={{ opacity: 0.3, marginBottom: 8 }} />
              <div style={{ fontSize: 13 }}>
                Chưa có khách nào nhận voucher này
              </div>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--bg-tertiary, #f5f7fb)" }}>
                    <th style={thStyle}>Khách hàng</th>
                    <th style={thStyle}>Mã cá nhân</th>
                    <th style={thStyle}>Ngày nhận</th>
                    <th style={thStyle}>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {claims.map((c) => (
                    <tr
                      key={c.id}
                      style={{
                        borderBottom:
                          "1px solid var(--border-color, #eef2f7)",
                      }}
                    >
                      <td style={tdStyle}>
                        <b style={{ fontSize: 13 }}>{c.user_name}</b>
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--text-light, #8993a3)",
                          }}
                        >
                          {c.user_email}
                        </div>
                      </td>
                      <td
                        style={{
                          ...tdStyle,
                          fontFamily: "monospace",
                          fontSize: 11,
                        }}
                      >
                        {c.code}
                      </td>
                      <td
                        style={{
                          ...tdStyle,
                          fontSize: 11,
                          color: "var(--text-muted, #64748b)",
                        }}
                      >
                        {c.created_at
                          ? new Date(c.created_at).toLocaleDateString("vi-VN")
                          : "—"}
                      </td>
                      <td style={tdStyle}>
                        <span
                          style={{
                            padding: "3px 9px",
                            borderRadius: 12,
                            fontSize: 10.5,
                            fontWeight: 700,
                            background: c.used ? "#fee2e2" : "#e8f9f1",
                            color: c.used ? "#ef4444" : "#18a967",
                          }}
                        >
                          {c.used ? "Đã dùng" : "Chưa dùng"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <button
            onClick={() => setClaimsModal(null)}
            style={{ ...btnPrimaryStyle, marginTop: 16, width: "100%" }}
          >
            Đóng
          </button>
        </Modal>
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
// SUB-COMPONENTS
// ============================================================

function Stat({ label, value, color, icon }) {
  return (
    <div
      style={{
        background: "var(--card-bg, #fff)",
        border: "1px solid var(--border-color, #e7ebf0)",
        borderRadius: 12,
        padding: 14,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 6,
        }}
      >
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 7,
            background: color + "18",
            color,
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <span
          style={{
            fontSize: 11,
            color: "var(--text-light, #8993a3)",
            fontWeight: 600,
          }}
        >
          {label}
        </span>
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, color }}>{value}</div>
    </div>
  );
}

function IconButton({
  children,
  onClick,
  title,
  color = "var(--text-primary, #172033)",
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      style={{
        padding: 6,
        border: "1px solid var(--border-color, #e5e9ef)",
        borderRadius: 6,
        background: "var(--card-bg, #fff)",
        cursor: "pointer",
        display: "grid",
        placeItems: "center",
        color,
        width: 28,
        height: 28,
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

function Modal({ children, onClose, maxWidth = 500, zIndex = MODAL_Z }) {
  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "grid",
        placeItems: "center",
        zIndex,
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
          maxWidth,
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function ErrorBox({ message, onRetry }) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: 30,
        background: "rgba(239, 68, 68, 0.08)",
        border: "1px solid rgba(239, 68, 68, 0.2)",
        borderRadius: 10,
        color: "#ef4444",
      }}
    >
      <AlertCircle size={26} style={{ marginBottom: 10 }} />
      <div style={{ fontWeight: 600, marginBottom: 4 }}>
        Không tải được dữ liệu
      </div>
      <div
        style={{
          fontSize: 13,
          opacity: 0.85,
          marginBottom: onRetry ? 12 : 0,
        }}
      >
        {message}
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
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
      )}
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
  padding: 16,
};

const thStyle = {
  padding: 10,
  textAlign: "left",
  fontSize: 11.5,
  color: "var(--text-muted, #64748b)",
  fontWeight: 600,
  whiteSpace: "nowrap",
};

const tdStyle = {
  padding: 10,
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

const selectStyle = {
  padding: "9px 12px",
  border: "1px solid var(--border-color, #e5e9ef)",
  borderRadius: 8,
  outline: "none",
  background: "var(--bg-secondary, #fff)",
  color: "var(--text-primary, #172033)",
  fontSize: 12,
  cursor: "pointer",
};

const segmentedStyle = {
  display: "inline-flex",
  gap: 3,
  background: "var(--bg-tertiary, #f5f7fb)",
  padding: 4,
  borderRadius: 10,
};

const segmentBtnStyle = (active) => ({
  padding: "7px 12px",
  background: active ? "#2634d5" : "transparent",
  color: active ? "#fff" : "var(--text-muted, #475569)",
  border: 0,
  borderRadius: 7,
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 600,
  whiteSpace: "nowrap",
});

const toolBtnStyle = {
  padding: "9px 14px",
  background: "var(--bg-tertiary, #f5f7fb)",
  color: "var(--text-primary, #172033)",
  border: "1px solid var(--border-color, #e5e9ef)",
  borderRadius: 8,
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600,
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
};

const btnPrimaryStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  background: "#2634d5",
  color: "#fff",
  padding: "9px 16px",
  border: 0,
  borderRadius: 8,
  fontWeight: 700,
  cursor: "pointer",
  fontSize: 13,
};

const btnCancelStyle = {
  padding: 12,
  border: "1px solid var(--border-color, #e5e9ef)",
  borderRadius: 8,
  background: "var(--card-bg, #fff)",
  cursor: "pointer",
  color: "var(--text-primary, #172033)",
  fontWeight: 600,
  fontSize: 13,
};

const clearBtnStyle = {
  background: "transparent",
  border: 0,
  cursor: "pointer",
  color: "var(--text-light, #8993a3)",
  padding: 2,
};

const modalHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 20,
};

const modalTitleStyle = {
  margin: 0,
  color: "var(--text-primary, #172033)",
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 16,
};

const modalCloseStyle = {
  background: "transparent",
  border: 0,
  cursor: "pointer",
  color: "var(--text-light, #8993a3)",
  padding: 4,
  display: "grid",
  placeItems: "center",
};

const loadingBoxStyle = {
  textAlign: "center",
  padding: 40,
  color: "var(--text-light, #8993a3)",
};

const emptyBoxStyle = {
  textAlign: "center",
  padding: 40,
  color: "var(--text-light, #8993a3)",
};