// ============================================================
// OWNERFINANCE.JSX — Quản lý tài chính (Admin)
// ============================================================
// 7 tabs:
//   1. Account       — Tài khoản ngân hàng nhận tiền + preview VietQR
//   2. Revenue       — Doanh thu theo kỳ (ngày/tuần/tháng/năm)
//   3. Transactions  — Lịch sử giao dịch đơn hàng
//   4. Expenses      — Quản lý chi phí (CRUD)
//   5. Stats         — Doanh thu - Chi phí = Lợi nhuận
//   6. Reconcile     — Đối soát số tiền hệ thống vs thực tế
//   7. Export        — Xuất CSV báo cáo tài chính
//
// Data sources:
//   - api.settings.get/update()       → bank, expenses
//   - api.reports.revenue(period)     → doanh thu
//   - api.orders.all()                → giao dịch
//
// Fixes:
//   - ExpensesTab.remove: dùng ConfirmDialog custom
//     (thay cho confirm() native → đồng bộ UX toàn app)
// ============================================================

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Wallet, CreditCard, TrendingUp, Receipt, DollarSign,
  BarChart3, CheckCircle2, Download, Save, Plus, Pencil, X,
  Loader2, AlertCircle, Trash2,
} from "lucide-react";
import { api } from "../../api";
import { money } from "../../components/UI";
import { toast } from "../../components/Effects";
import ConfirmDialog from "../../components/ConfirmDialog";

// ============================================================
// CONSTANTS
// ============================================================

const TABS = [
  { id: "account",      label: "Tài khoản nhận tiền", icon: CreditCard },
  { id: "revenue",      label: "Doanh thu",           icon: TrendingUp },
  { id: "transactions", label: "Giao dịch",           icon: Receipt },
  { id: "expenses",     label: "Chi phí",             icon: DollarSign },
  { id: "stats",        label: "Thống kê",            icon: BarChart3 },
  { id: "reconcile",    label: "Đối soát",            icon: CheckCircle2 },
  { id: "export",       label: "Xuất báo cáo",        icon: Download },
];

const PERIODS = [
  { id: "day",   label: "Ngày" },
  { id: "week",  label: "Tuần" },
  { id: "month", label: "Tháng" },
  { id: "year",  label: "Năm" },
];

const BANKS = [
  { code: "VCB",  name: "Vietcombank" },
  { code: "TCB",  name: "Techcombank" },
  { code: "VIB",  name: "VIB" },
  { code: "MBB",  name: "MB Bank" },
  { code: "ACB",  name: "ACB" },
  { code: "TPB",  name: "TPBank" },
  { code: "VPB",  name: "VPBank" },
  { code: "STB",  name: "Sacombank" },
  { code: "BIDV", name: "BIDV" },
  { code: "ICB",  name: "Vietinbank" },
  { code: "AGB",  name: "Agribank" },
];

const EXPENSE_CATEGORIES = [
  "Nguyên liệu", "Nhập hàng", "Vận hành", "Lương", "Khác",
];

// Status → màu badge giao dịch
const ORDER_STATUS_COLORS = {
  "Hoàn thành":  { bg: "#e8f9f1", fg: "#18a967" },
  "Đã hủy":      { bg: "#fee2e2", fg: "#ef4444" },
  "Chờ xác nhận":{ bg: "#fff4d8", fg: "#c47d10" },
  "Đã xác nhận": { bg: "#dbeafe", fg: "#1e40af" },
  "Đang chuẩn bị": { bg: "#ede9fe", fg: "#6d28d9" },
  "Sẵn sàng nhận": { bg: "#d1fae5", fg: "#065f46" },
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function OwnerFinance() {
  const [tab, setTab] = useState("account");

  return (
    <div>
      {/* ============================================================
          TAB BAR
          ============================================================ */}
      <div
        style={{
          display: "flex",
          gap: 6,
          marginBottom: 20,
          flexWrap: "wrap",
          background: "var(--card-bg, #fff)",
          border: "1px solid var(--border-color, #e7ebf0)",
          borderRadius: 12,
          padding: 8,
        }}
      >
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: "10px 14px",
                background: active ? "#2634d5" : "transparent",
                color: active ? "#fff" : "var(--text-muted, #475569)",
                border: 0,
                borderRadius: 8,
                cursor: "pointer",
                fontSize: 12,
                fontWeight: active ? 700 : 500,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                transition: "all 0.2s",
              }}
            >
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* ============================================================
          TAB CONTENT
          ============================================================ */}
      {tab === "account" && <AccountTab />}
      {tab === "revenue" && <RevenueTab />}
      {tab === "transactions" && <TransactionsTab />}
      {tab === "expenses" && <ExpensesTab />}
      {tab === "stats" && <StatsTab />}
      {tab === "reconcile" && <ReconcileTab />}
      {tab === "export" && <ExportTab />}
    </div>
  );
}

// ============================================================
// TAB 1: TÀI KHOẢN NHẬN TIỀN
// ============================================================

function AccountTab() {
  const [form, setForm] = useState({ bank: "VCB", account: "", accountName: "" });
  const [original, setOriginal] = useState({ bank: "VCB", account: "", accountName: "" });
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ---------- Load settings ----------
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const d = await api.settings.get();
      const init = {
        bank: d.bank || "VCB",
        account: d.account || "",
        accountName: d.accountName || "",
      };
      setForm(init);
      setOriginal(init);
    } catch (e) {
      setError(e.message || "Không tải được cài đặt");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Cleanup: auto-hide "saved" badge sau 3s (có cleanup)
  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), 3000);
    return () => clearTimeout(timer);
  }, [saved]);

  // ---------- Handlers ----------

  const updateField = (key, value) => {
    // Chỉ uppercase khi blur, không uppercase trong onChange (tránh cursor jump)
    setForm((f) => ({ ...f, [key]: value }));
  };

  const normalizeAccountName = () => {
    setForm((f) => ({ ...f, accountName: f.accountName.toUpperCase().trim() }));
  };

  const startEdit = () => {
    setIsEditing(true);
    setSaved(false);
    toast("Bấm Lưu để hoàn tất", "info");
  };

  const cancelEdit = () => {
    setForm(original);
    setIsEditing(false);
    toast("Đã hủy thay đổi", "info");
  };

  const save = async () => {
    // Validate
    if (!form.account.trim()) {
      return toast("Vui lòng nhập số tài khoản", "error");
    }
    if (!/^[0-9]{6,20}$/.test(form.account.trim())) {
      return toast("Số tài khoản phải là 6-20 chữ số", "error");
    }
    if (!form.accountName.trim()) {
      return toast("Vui lòng nhập tên chủ tài khoản", "error");
    }

    setSaving(true);
    try {
      const payload = {
        bank: form.bank,
        account: form.account.trim(),
        accountName: form.accountName.trim().toUpperCase(),
      };
      await api.settings.update(payload);
      setOriginal(payload);
      setForm(payload);
      toast("Đã lưu tài khoản nhận tiền", "success");
      setSaved(true);
      setIsEditing(false);
    } catch (e) {
      toast(e.message || "Không lưu được", "error");
    } finally {
      setSaving(false);
    }
  };

  // VietQR preview — chỉ tạo URL khi có account
  const qrPreview = form.account
    ? `https://img.vietqr.io/image/${form.bank}-${form.account}-compact2.png?amount=35000&accountName=${encodeURIComponent(form.accountName || "CANTEEN VWA")}`
    : null;

  // ---------- Render ----------

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 40, color: "var(--text-light, #8993a3)" }}>
        <Loader2 size={26} style={{ animation: "spin 1s linear infinite", marginBottom: 10 }} />
        <div>Đang tải cài đặt...</div>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorBox message={error} onRetry={load} />
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)",
        gap: 20,
      }}
      className="finance-account-grid"
    >
      {/* ----- Cột trái: Form ----- */}
      <div style={cardStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <h3 style={{ ...h3Style, margin: 0 }}>
            <CreditCard size={18} /> Tài khoản nhận tiền
          </h3>
          {!isEditing && (
            <button onClick={startEdit} style={btnGhostStyle}>
              <Pencil size={14} /> Sửa
            </button>
          )}
        </div>

        {isEditing && (
          <div
            style={{
              padding: "8px 12px",
              background: "rgba(245, 158, 11, 0.1)",
              border: "1px solid rgba(245, 158, 11, 0.3)",
              color: "#92400e",
              borderRadius: 8,
              fontSize: 12,
              marginBottom: 14,
              fontWeight: 600,
            }}
          >
            ✏️ Đang chỉnh sửa — bấm "Lưu" để hoàn tất hoặc "Hủy" để bỏ
          </div>
        )}

        <label style={labelStyle}>Ngân hàng</label>
        <select
          value={form.bank}
          onChange={(e) => updateField("bank", e.target.value)}
          disabled={!isEditing}
          style={{ ...inputStyle, cursor: isEditing ? "pointer" : "not-allowed" }}
        >
          {BANKS.map((b) => (
            <option key={b.code} value={b.code}>
              {b.name} ({b.code})
            </option>
          ))}
        </select>

        <label style={labelStyle}>Số tài khoản</label>
        <input
          value={form.account}
          onChange={(e) =>
            updateField("account", e.target.value.replace(/[^0-9]/g, ""))
          }
          placeholder="1234567890"
          disabled={!isEditing}
          inputMode="numeric"
          style={inputStyle}
        />

        <label style={labelStyle}>Chủ tài khoản</label>
        <input
          value={form.accountName}
          onChange={(e) => updateField("accountName", e.target.value)}
          onBlur={normalizeAccountName}
          placeholder="NGUYEN VAN A"
          disabled={!isEditing}
          style={inputStyle}
        />

        {isEditing ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
            <button
              onClick={cancelEdit}
              disabled={saving}
              style={btnDangerOutlineStyle(saving)}
            >
              <X size={16} /> Hủy
            </button>
            <button
              onClick={save}
              disabled={saving}
              style={btnPrimaryStyle(saving)}
            >
              {saving ? (
                <>
                  <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                  Đang lưu...
                </>
              ) : (
                <>
                  <Save size={16} /> Lưu
                </>
              )}
            </button>
          </div>
        ) : (
          saved && (
            <div
              style={{
                marginTop: 8,
                padding: 14,
                background: "#e8f9f1",
                color: "#18a967",
                borderRadius: 10,
                fontWeight: 700,
                textAlign: "center",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                width: "100%",
              }}
            >
              <CheckCircle2 size={18} /> Đã lưu
            </div>
          )
        )}
      </div>

      {/* ----- Cột phải: QR Preview ----- */}
      <div style={cardStyle}>
        <h3 style={h3Style}>Preview QR</h3>
        <div
          style={{
            textAlign: "center",
            padding: 14,
            background: "var(--bg-tertiary, #f8fafc)",
            borderRadius: 10,
            minHeight: 228,
            display: "grid",
            placeItems: "center",
          }}
        >
          {qrPreview ? (
            <img
              src={qrPreview}
              alt="QR thanh toán"
              style={{ width: 200, height: 200, objectFit: "contain" }}
              onError={(e) => {
                e.target.style.display = "none";
                e.target.nextSibling.style.display = "block";
              }}
            />
          ) : null}
          <div
            style={{
              display: qrPreview ? "none" : "block",
              color: "var(--text-light, #8993a3)",
              fontSize: 13,
            }}
          >
            Nhập số tài khoản để xem trước QR
          </div>
        </div>
        <div
          style={{
            fontSize: 12,
            color: "var(--text-muted, #64748b)",
            marginTop: 12,
            textAlign: "center",
          }}
        >
          QR này được dùng khi khách chọn thanh toán QR
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// ============================================================
// TAB 2: DOANH THU
// ============================================================

function RevenueTab() {
  const [period, setPeriod] = useState("day");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    api.reports
      .revenue(period)
      .then((res) => !cancelled && setData(res))
      .catch((e) => !cancelled && setError(e.message || "Không tải được báo cáo"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [period]);

  return (
    <div>
      {/* Period selector */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {PERIODS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            style={chipStyle(period === p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <KPI label="Tổng doanh thu" value={money(data?.totalRevenue || 0)} color="#18a967" />
        <KPI label="Số đơn"         value={data?.totalOrders || 0}       color="#2634d5" />
        <KPI label="Giá trị TB/đơn" value={money(data?.avgOrder || 0)}    color="#f59e0b" />
      </div>

      {/* Table */}
      <div style={cardStyle}>
        <h3 style={h3Style}>
          <TrendingUp size={18} /> Chi tiết doanh thu
        </h3>

        {loading ? (
          <LoadingBox />
        ) : error ? (
          <ErrorBox message={error} />
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr style={theadStyle}>
                <th style={thStyle}>Kỳ</th>
                <th style={thStyle}>Thời gian</th>
                <th style={thStyle}>Số đơn</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Doanh thu</th>
              </tr>
            </thead>
            <tbody>
              {(data?.data || []).map((d, i) => (
                <tr key={i} style={trStyle}>
                  <td style={tdStyle}><b>{d.label}</b></td>
                  <td style={tdStyle}>{d.date}</td>
                  <td style={tdStyle}>{d.orders}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>
                    <b style={{ color: "#18a967" }}>{money(d.revenue)}</b>
                  </td>
                </tr>
              ))}
              {!data?.data?.length && (
                <tr>
                  <td colSpan="4" style={emptyTdStyle}>Chưa có dữ liệu</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ============================================================
// TAB 3: GIAO DỊCH
// ============================================================

function TransactionsTab() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.orders
      .all("Tất cả")
      .then((d) => !cancelled && setOrders(Array.isArray(d) ? d : []))
      .catch((e) => !cancelled && setError(e.message || "Không tải được giao dịch"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (filter === "paid") return orders.filter((o) => o.status === "Hoàn thành");
    if (filter === "cancelled") return orders.filter((o) => o.status === "Đã hủy");
    return orders;
  }, [orders, filter]);

  const FILTERS = [
    { id: "all",       label: "Tất cả" },
    { id: "paid",      label: "Đã thanh toán" },
    { id: "cancelled", label: "Đã hủy" },
  ];

  return (
    <div>
      {/* Filter chips */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            style={chipStyle(filter === f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div style={cardStyle}>
        <h3 style={h3Style}>
          <Receipt size={18} /> Lịch sử giao dịch ({filtered.length})
        </h3>

        {loading ? (
          <LoadingBox />
        ) : error ? (
          <ErrorBox message={error} />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr style={theadStyle}>
                  <th style={thStyle}>Mã đơn</th>
                  <th style={thStyle}>Khách</th>
                  <th style={thStyle}>Ngày</th>
                  <th style={thStyle}>PTTT</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Số tiền</th>
                  <th style={thStyle}>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o._id || o.id} style={trStyle}>
                    <td style={tdStyle}><b>{o.code}</b></td>
                    <td style={tdStyle}>{o.customer_name}</td>
                    <td style={tdStyle}>
                      {o.created_at
                        ? new Date(o.created_at).toLocaleString("vi-VN")
                        : "—"}
                    </td>
                    <td style={tdStyle}>{o.payment || "Tiền mặt"}</td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      <b>{money(o.total)}</b>
                    </td>
                    <td style={tdStyle}>
                      <StatusBadge status={o.status} />
                    </td>
                  </tr>
                ))}
                {!filtered.length && (
                  <tr>
                    <td colSpan="6" style={emptyTdStyle}>Chưa có giao dịch</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// TAB 4: CHI PHÍ
// ============================================================

function ExpensesTab() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    amount: "",
    category: "Nguyên liệu",
    note: "",
  });
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // ✅ Confirm dialog state
  const [confirm, setConfirm] = useState(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  // ---------- Load ----------
  useEffect(() => {
    setLoading(true);
    api.settings
      .get()
      .then((d) => setExpenses(Array.isArray(d.expenses) ? d.expenses : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // ---------- ✅ Confirm helpers ----------
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

  // ---------- Add ----------
  const add = async () => {
    const title = form.title.trim();
    const amount = Number(form.amount);
    if (!title) return toast("Nhập tên khoản chi", "error");
    if (!amount || amount <= 0) return toast("Số tiền phải lớn hơn 0", "error");

    setSaving(true);
    const newItem = {
      id: Date.now(),
      title,
      amount,
      category: form.category,
      note: form.note.trim(),
      date: new Date().toISOString(),
    };
    const newList = [...expenses, newItem];

    try {
      await api.settings.update({ expenses: newList });
      setExpenses(newList);
      setForm({ title: "", amount: "", category: "Nguyên liệu", note: "" });
      setShowForm(false);
      toast("Đã thêm chi phí", "success");
    } catch (e) {
      toast(e.message || "Không lưu được", "error");
    } finally {
      setSaving(false);
    }
  };

  // ---------- ✅ Remove — dùng ConfirmDialog ----------
  const remove = (id) => {
    const target = expenses.find((e) => e.id === id);
    if (!target) return;

    setConfirm({
      title: `Xóa khoản chi "${target.title}"?`,
      message:
        `Khoản chi ${money(target.amount)} sẽ bị xóa vĩnh viễn. ` +
        "Hành động này không thể hoàn tác.",
      confirmText: "Xóa",
      cancelText: "Hủy",
      danger: true,
      onConfirm: async () => {
        const newList = expenses.filter((e) => e.id !== id);
        try {
          await api.settings.update({ expenses: newList });
          setExpenses(newList);
          toast("Đã xóa", "success");
          setConfirm(null);
        } catch (e) {
          toast(e.message || "Không xóa được", "error");
        }
      },
    });
  };

  const totalExpense = useMemo(
    () => expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0),
    [expenses]
  );

  return (
    <>
      <div>
        {/* Header row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 2fr)",
            gap: 16,
            marginBottom: 16,
          }}
        >
          <KPI label="Tổng chi phí" value={money(totalExpense)} color="#ef4444" />
          <div
            style={{
              ...cardStyle,
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
            }}
          >
            <button
              onClick={() => setShowForm(!showForm)}
              style={btnPrimaryStyle(false)}
            >
              <Plus size={16} /> {showForm ? "Đóng" : "Thêm chi phí"}
            </button>
          </div>
        </div>

        {/* Add form */}
        {showForm && (
          <div style={{ ...cardStyle, marginBottom: 16 }}>
            <h3 style={h3Style}>Thêm khoản chi</h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 12,
              }}
            >
              <div>
                <label style={labelStyle}>Tên khoản chi *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="VD: Nhập gạo 50kg"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Số tiền *</label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="500000"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Danh mục</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  style={inputStyle}
                >
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Ghi chú</label>
                <input
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="Ghi chú thêm"
                  style={inputStyle}
                />
              </div>
            </div>
            <button
              onClick={add}
              disabled={saving}
              style={{
                ...btnPrimaryStyle(saving),
                background: saving ? "#94a3b8" : "#18a967",
                marginTop: 12,
                padding: "12px 24px",
                width: "auto",
              }}
            >
              {saving ? "Đang lưu..." : "Lưu chi phí"}
            </button>
          </div>
        )}

        {/* Table */}
        <div style={cardStyle}>
          <h3 style={h3Style}>
            <DollarSign size={18} /> Danh sách chi phí ({expenses.length})
          </h3>

          {loading ? (
            <LoadingBox />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={tableStyle}>
                <thead>
                  <tr style={theadStyle}>
                    <th style={thStyle}>Ngày</th>
                    <th style={thStyle}>Khoản chi</th>
                    <th style={thStyle}>Danh mục</th>
                    <th style={thStyle}>Ghi chú</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Số tiền</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((e) => (
                    <tr key={e.id} style={trStyle}>
                      <td style={tdStyle}>
                        {new Date(e.date).toLocaleDateString("vi-VN")}
                      </td>
                      <td style={tdStyle}><b>{e.title}</b></td>
                      <td style={tdStyle}>{e.category}</td>
                      <td style={tdStyle}>{e.note || "—"}</td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>
                        <b style={{ color: "#ef4444" }}>-{money(e.amount)}</b>
                      </td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>
                        <button
                          onClick={() => remove(e.id)}
                          title="Xóa"
                          aria-label="Xóa chi phí"
                          style={{
                            padding: 6,
                            background: "transparent",
                            color: "#ef4444",
                            border: "1px solid #ef4444",
                            borderRadius: 6,
                            cursor: "pointer",
                            display: "grid",
                            placeItems: "center",
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!expenses.length && (
                    <tr>
                      <td colSpan="6" style={emptyTdStyle}>Chưa có chi phí</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ✅ ConfirmDialog */}
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
    </>
  );
}

// ============================================================
// TAB 5: THỐNG KÊ
// ============================================================

function StatsTab() {
  const [period, setPeriod] = useState("month");
  const [revenue, setRevenue] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api.reports.revenue(period).catch(() => null),
      api.settings.get().catch(() => ({})),
    ])
      .then(([r, s]) => {
        if (cancelled) return;
        setRevenue(r);
        setExpenses(Array.isArray(s.expenses) ? s.expenses : []);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [period]);

  const totalExpense = useMemo(
    () => expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0),
    [expenses]
  );
  const totalRevenue = revenue?.totalRevenue || 0;
  const profit = totalRevenue - totalExpense;

  return (
    <div>
      {/* Period selector */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {PERIODS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            style={chipStyle(period === p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 16,
        }}
      >
        <KPI
          label="Tổng doanh thu"
          value={loading ? "..." : money(totalRevenue)}
          color="#18a967"
        />
        <KPI
          label="Tổng chi phí"
          value={loading ? "..." : money(totalExpense)}
          color="#ef4444"
        />
        <KPI
          label="Lợi nhuận"
          value={loading ? "..." : money(profit)}
          color={profit >= 0 ? "#2634d5" : "#ef4444"}
        />
      </div>
    </div>
  );
}

// ============================================================
// TAB 6: ĐỐI SOÁT
// ============================================================

function ReconcileTab() {
  const [orders, setOrders] = useState([]);
  const [actualInput, setActualInput] = useState("");

  useEffect(() => {
    api.orders
      .all("Tất cả")
      .then((d) => setOrders(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  const systemTotal = useMemo(
    () =>
      orders
        .filter((o) => o.status === "Hoàn thành")
        .reduce((s, o) => s + (o.total || 0), 0),
    [orders]
  );

  const actual = Number(actualInput) || 0;
  const diff = actual - systemTotal;

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <KPI label="Tiền hệ thống" value={money(systemTotal)} color="#2634d5" />
        <KPI label="Tiền thực tế"  value={money(actual)}      color="#f59e0b" />
        <KPI
          label="Chênh lệch"
          value={money(diff)}
          color={diff === 0 ? "#18a967" : "#ef4444"}
        />
      </div>

      <div style={cardStyle}>
        <h3 style={h3Style}>
          <CheckCircle2 size={18} /> Đối soát
        </h3>
        <p
          style={{
            color: "var(--text-muted, #64748b)",
            fontSize: 13,
            marginTop: 0,
          }}
        >
          Nhập số tiền thực tế đã nhận (tiền mặt + chuyển khoản) để so sánh với
          hệ thống.
        </p>

        <label style={labelStyle}>Số tiền thực tế</label>
        <input
          type="number"
          min="0"
          step="1000"
          value={actualInput}
          onChange={(e) => setActualInput(e.target.value)}
          placeholder="VD: 500000"
          style={inputStyle}
        />

        {actualInput && (
          <div
            style={{
              marginTop: 16,
              padding: 16,
              borderRadius: 10,
              background: diff === 0 ? "#e8f9f1" : "#fde8e8",
              color: diff === 0 ? "#18a967" : "#ef4444",
              fontWeight: 700,
              fontSize: 14,
              textAlign: "center",
            }}
          >
            {diff === 0
              ? "✅ Khớp chính xác!"
              : diff > 0
              ? `⚠️ Thừa ${money(diff)}`
              : `⚠️ Thiếu ${money(-diff)}`}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// TAB 7: XUẤT BÁO CÁO
// ============================================================

// Escape cell cho CSV: bọc trong "" và nhân đôi " bên trong
function csvCell(v) {
  const s = String(v ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function ExportTab() {
  const [from, setFrom] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    // Validate khoảng thời gian
    if (new Date(from) > new Date(to)) {
      return toast("Ngày bắt đầu phải trước ngày kết thúc", "error");
    }

    setExporting(true);
    let url = null;
    let a = null;
    try {
      const orders = await api.orders.all("Tất cả");

      const fromDate = new Date(from);
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);

      const filteredOrders = (orders || []).filter((o) => {
        const d = new Date(o.created_at);
        return d >= fromDate && d <= toDate;
      });

      // Build CSV rows (escape từng cell)
      const rows = [
        ["CANTEEN VWA - BAO CAO TAI CHINH"],
        ["Tu ngay", from, "Den ngay", to],
        [],
        ["MA DON", "KHACH HANG", "NGAY", "PTTT", "TRANG THAI", "TONG TIEN"],
        ...filteredOrders.map((o) => [
          o.code,
          o.customer_name || "",
          o.created_at ? new Date(o.created_at).toLocaleString("vi-VN") : "",
          o.payment || "Tien mat",
          o.status,
          o.total || 0,
        ]),
        [],
        [
          "TONG DOANH THU",
          filteredOrders
            .filter((o) => o.status === "Hoàn thành")
            .reduce((s, o) => s + o.total, 0),
        ],
        ["SO DON", filteredOrders.length],
      ];

      const csv = rows.map((r) => r.map(csvCell).join(",")).join("\n");

      // BOM để Excel đọc UTF-8 đúng
      const blob = new Blob(["\uFEFF" + csv], {
        type: "text/csv;charset=utf-8",
      });
      url = URL.createObjectURL(blob);
      a = document.createElement("a");
      a.href = url;
      a.download = `canteen-baocao-${from}-to-${to}.csv`;
      document.body.appendChild(a);
      a.click();

      toast("Đã xuất báo cáo", "success");
    } catch (e) {
      toast(e.message || "Không xuất được", "error");
    } finally {
      // Cleanup kể cả khi throw
      if (a && a.parentNode) a.parentNode.removeChild(a);
      if (url) URL.revokeObjectURL(url);
      setExporting(false);
    }
  };

  return (
    <div style={cardStyle}>
      <h3 style={h3Style}>
        <Download size={18} /> Xuất báo cáo tài chính
      </h3>
      <p
        style={{
          color: "var(--text-muted, #64748b)",
          fontSize: 13,
          marginTop: 0,
        }}
      >
        Xuất file CSV gồm: doanh thu, chi phí, giao dịch trong khoảng thời gian.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 12,
        }}
      >
        <div>
          <label style={labelStyle}>Từ ngày</label>
          <input
            type="date"
            value={from}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Đến ngày</label>
          <input
            type="date"
            value={to}
            min={from}
            onChange={(e) => setTo(e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>

      <button
        onClick={handleExport}
        disabled={exporting}
        style={{
          ...btnPrimaryStyle(exporting),
          marginTop: 14,
          padding: "12px 24px",
          width: "auto",
        }}
      >
        {exporting ? (
          <>
            <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
            Đang xuất...
          </>
        ) : (
          <>
            <Download size={16} /> Tải xuống CSV
          </>
        )}
      </button>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// ============================================================
// SHARED SUB-COMPONENTS
// ============================================================

function KPI({ label, value, color }) {
  return (
    <div style={cardStyle}>
      <span style={{ fontSize: 12, color: "var(--text-light, #8993a3)" }}>
        {label}
      </span>
      <div style={{ fontSize: 22, fontWeight: 800, color, marginTop: 6 }}>
        {value}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const c = ORDER_STATUS_COLORS[status] || { bg: "#e2e8f0", fg: "#475569" };
  return (
    <span
      style={{
        padding: "3px 10px",
        borderRadius: 20,
        fontSize: 11,
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

function LoadingBox() {
  return (
    <div
      style={{
        textAlign: "center",
        padding: 40,
        color: "var(--text-light, #8993a3)",
      }}
    >
      <Loader2
        size={24}
        style={{ animation: "spin 1s linear infinite", marginBottom: 8 }}
      />
      <div style={{ fontSize: 13 }}>Đang tải...</div>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
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
      <AlertCircle size={24} style={{ marginBottom: 10 }} />
      <div style={{ fontWeight: 600, marginBottom: 4 }}>
        Không tải được dữ liệu
      </div>
      <div style={{ fontSize: 13, opacity: 0.85, marginBottom: onRetry ? 12 : 0 }}>
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
  padding: 20,
};

const h3Style = {
  marginTop: 0,
  marginBottom: 16,
  color: "var(--text-primary, #172033)",
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 15,
};

const labelStyle = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  marginBottom: 4,
  color: "var(--text-muted, #475569)",
  marginTop: 4,
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid var(--border-color, #e5e9ef)",
  borderRadius: 8,
  marginBottom: 12,
  outline: "none",
  background: "var(--bg-secondary, #fff)",
  color: "var(--text-primary, #172033)",
  fontSize: 13,
  boxSizing: "border-box",
};

const tableStyle = { width: "100%", borderCollapse: "collapse" };
const theadStyle = { background: "var(--bg-tertiary, #f5f7fb)" };
const thStyle = {
  padding: 11,
  textAlign: "left",
  fontSize: 12,
  color: "var(--text-muted, #64748b)",
  fontWeight: 600,
};
const trStyle = {
  borderBottom: "1px solid var(--border-color, #eef2f7)",
};
const tdStyle = {
  padding: 11,
  fontSize: 13,
  color: "var(--text-primary, #172033)",
};
const emptyTdStyle = {
  textAlign: "center",
  padding: 30,
  color: "var(--text-light, #8993a3)",
};

const btnGhostStyle = {
  padding: "8px 16px",
  background: "var(--bg-tertiary, #f5f7fb)",
  border: "1px solid var(--border-color, #e5e9ef)",
  borderRadius: 8,
  cursor: "pointer",
  color: "var(--text-primary, #172033)",
  fontSize: 13,
  fontWeight: 600,
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
};

const btnDangerOutlineStyle = (disabled) => ({
  padding: 14,
  background: "var(--card-bg, #fff)",
  color: "#ef4444",
  border: "1px solid #ef4444",
  borderRadius: 10,
  fontWeight: 700,
  cursor: disabled ? "not-allowed" : "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
});

const btnPrimaryStyle = (disabled) => ({
  padding: 14,
  background: disabled ? "#94a3b8" : "#2634d5",
  color: "#fff",
  border: 0,
  borderRadius: 10,
  fontWeight: 700,
  cursor: disabled ? "not-allowed" : "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  fontSize: 13,
});

const chipStyle = (active) => ({
  padding: "8px 16px",
  borderRadius: 20,
  background: active ? "#2634d5" : "var(--card-bg, #fff)",
  color: active ? "#fff" : "var(--text-muted, #475569)",
  border: "1px solid " + (active ? "#2634d5" : "var(--border-color, #e5e9ef)"),
  fontSize: 13,
  cursor: "pointer",
  fontWeight: active ? 700 : 500,
});