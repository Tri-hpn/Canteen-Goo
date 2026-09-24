// ============================================================
// OWNERSETTINGS.JSX — Cài đặt hệ thống (Admin)
// ============================================================
// Gồm 2 nhóm cài đặt:
//   1. Tài khoản ngân hàng nhận tiền (VietQR)
//   2. Thông tin liên hệ (hotline, email, địa chỉ) → hiện ở footer
//
// Endpoints:
//   - api.settings.get()     → đọc cài đặt
//   - api.settings.update()  → ghi cài đặt
//
// Lưu ý:
//   - QR preview: chỉ gọi VietQR khi có đủ bank + account
//     → tránh URL vỡ khi user mới vào
//   - Unsaved warning: dùng beforeunload → cảnh báo khi user
//     đóng tab có thay đổi chưa lưu
//   - Account number: chỉ cho nhập số
//   - Account name: tự uppercase khi blur
// ============================================================

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  CreditCard, Save, QrCode, Building2, Phone, Mail, MapPin,
  CheckCircle2, Loader2, AlertCircle, RefreshCw, X,
} from "lucide-react";
import { api } from "../../api";
import { toast } from "../../components/Effects";

// ============================================================
// CONSTANTS
// ============================================================

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

const EMPTY_FORM = {
  bank: "VCB",
  account: "",
  accountName: "",
  hotline: "",
  email: "",
  address: "",
  qrCustomImage: "",
};

const MAX_QR_SIZE = 2 * 1024 * 1024; // 2MB

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function OwnerSettings() {
  // ---------- State ----------
  const [form, setForm] = useState(EMPTY_FORM);
  const [original, setOriginal] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // ---------- Load ----------

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.settings.get();
      const next = {
        bank: data.bank || EMPTY_FORM.bank,
        account: data.account || "",
        accountName: data.accountName || "",
        hotline: data.hotline || "",
        email: data.email || "",
        address: data.address || "",
        qrCustomImage: data.qrCustomImage || "",
      };
      setForm(next);
      setOriginal(next);
    } catch (e) {
      setError(e.message || "Không tải được cài đặt");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Auto-hide "Đã lưu" sau 3s — có cleanup để không setState sau unmount
  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), 3000);
    return () => clearTimeout(timer);
  }, [saved]);

  // Cảnh báo khi rời trang có thay đổi chưa lưu
  useEffect(() => {
    const isDirty = JSON.stringify(form) !== JSON.stringify(original);
    if (!isDirty) return;

    const handler = (e) => {
      e.preventDefault();
      e.returnValue = "";
      return "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [form, original]);

  // ---------- Computed ----------

  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(original),
    [form, original]
  );

  const selectedBankName = useMemo(
    () => BANKS.find((b) => b.code === form.bank)?.name || form.bank,
    [form.bank]
  );

  // VietQR preview: chỉ tạo URL khi có account
  const vietQR = useMemo(() => {
    if (!form.account.trim()) return null;
    const params = new URLSearchParams({
      amount: "35000",
      addInfo: "CANTEEN TEST",
      accountName: form.accountName || "CANTEEN VWA",
    });
    return `https://img.vietqr.io/image/${form.bank}-${form.account.trim()}-compact2.png?${params}`;
  }, [form.bank, form.account, form.accountName]);

  // ---------- Handlers ----------

  const update = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  };

  const updateText = (key) => (e) => update(key, e.target.value);

  const updateAccount = (e) => {
    // Chỉ cho nhập số
    const v = e.target.value.replace(/[^0-9]/g, "");
    update("account", v);
  };

  const normalizeAccountName = () => {
    // Uppercase khi blur — không làm trong onChange (tránh cursor jump)
    setForm((f) => ({
      ...f,
      accountName: f.accountName.toUpperCase().trim(),
    }));
  };

  // ---------- Validate ----------

  const validate = () => {
    if (!form.account.trim()) {
      return "Vui lòng nhập số tài khoản";
    }
    if (!/^[0-9]{6,20}$/.test(form.account.trim())) {
      return "Số tài khoản phải là 6-20 chữ số";
    }
    if (!form.accountName.trim()) {
      return "Vui lòng nhập tên chủ tài khoản";
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      return "Email không hợp lệ";
    }
    if (form.hotline && !/^[0-9\s\-\+\(\)]{8,20}$/.test(form.hotline.trim())) {
      return "Hotline không hợp lệ";
    }
    return null;
  };

  // ---------- Save ----------

  const save = async () => {
    if (saving) return;

    const errMsg = validate();
    if (errMsg) return toast(errMsg, "error");

    setSaving(true);
    try {
      const payload = {
        ...form,
        account: form.account.trim(),
        accountName: form.accountName.trim().toUpperCase(),
        email: form.email.trim(),
        hotline: form.hotline.trim(),
        address: form.address.trim(),
      };
      await api.settings.update(payload);
      setForm(payload);
      setOriginal(payload);
      setSaved(true);
      toast("Đã lưu cài đặt!", "success");
    } catch (e) {
      toast(e.message || "Không lưu được", "error");
    } finally {
      setSaving(false);
    }
  };

  // ---------- Reset form về giá trị đã lưu ----------

  const resetForm = () => {
    if (!isDirty) return;
    if (!confirm("Hủy các thay đổi chưa lưu?")) return;
    setForm(original);
    toast("Đã hủy thay đổi", "info");
  };

  // ---------- Upload QR ----------

  const handleQRUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      return toast("Chỉ chấp nhận file ảnh", "error");
    }
    if (file.size > MAX_QR_SIZE) {
      return toast("Ảnh vượt quá 2MB", "error");
    }

    const reader = new FileReader();
    reader.onload = () => {
      update("qrCustomImage", reader.result);
      toast("Đã chọn ảnh QR mới", "success");
    };
    reader.readAsDataURL(file);

    // Reset input để có thể chọn lại cùng file
    e.target.value = "";
  };

  const removeCustomQR = () => {
    update("qrCustomImage", "");
    toast("Đã xóa ảnh QR riêng", "info");
  };

  // ============================================================
  // RENDER
  // ============================================================

  // Loading lần đầu
  if (loading) {
    return (
      <div style={loadingFullStyle}>
        <Loader2
          size={28}
          style={{ animation: "spin 1s linear infinite", marginBottom: 10 }}
        />
        <div>Đang tải cài đặt...</div>
        <style>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  // Error lần đầu
  if (error) {
    return (
      <div style={errorFullStyle}>
        <AlertCircle size={28} style={{ marginBottom: 10 }} />
        <div style={{ fontWeight: 600, marginBottom: 4 }}>
          Không tải được cài đặt
        </div>
        <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 12 }}>
          {error}
        </div>
        <button onClick={load} style={btnPrimaryStyle}>
          <RefreshCw size={14} /> Thử lại
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* ============================================================
          UNSAVED INDICATOR
          ============================================================ */}
      {isDirty && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "rgba(245, 158, 11, 0.1)",
            border: "1px solid rgba(245, 158, 11, 0.3)",
            color: "#92400e",
            padding: "10px 14px",
            borderRadius: 10,
            marginBottom: 16,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <AlertCircle size={16} />
          <span style={{ flex: 1 }}>
            Bạn có thay đổi chưa lưu
          </span>
          <button
            onClick={resetForm}
            style={{
              background: "transparent",
              border: 0,
              color: "#92400e",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 700,
              textDecoration: "underline",
            }}
          >
            Hủy thay đổi
          </button>
        </div>
      )}

      <div
        className="settings-layout"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1fr)",
          gap: 20,
        }}
      >
        {/* ============================================================
            LEFT — FORM
            ============================================================ */}
        <div>
          {/* ---------- Bank ---------- */}
          <div style={cardStyle}>
            <h3 style={cardTitleStyle}>
              <CreditCard size={18} /> Tài khoản nhận tiền
            </h3>

            <label style={labelStyle}>Ngân hàng</label>
            <select
              value={form.bank}
              onChange={updateText("bank")}
              disabled={saving}
              style={{ ...inputStyle, cursor: "pointer" }}
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
              onChange={updateAccount}
              placeholder="VD: 1234567890"
              disabled={saving}
              inputMode="numeric"
              style={inputStyle}
            />

            <label style={labelStyle}>Chủ tài khoản</label>
            <input
              value={form.accountName}
              onChange={updateText("accountName")}
              onBlur={normalizeAccountName}
              placeholder="VD: NGUYEN VAN A"
              disabled={saving}
              style={{ ...inputStyle, marginBottom: 0 }}
            />
          </div>

          {/* ---------- Contact ---------- */}
          <div style={{ ...cardStyle, marginTop: 16 }}>
            <h3 style={cardTitleStyle}>
              <Building2 size={18} /> Thông tin liên hệ (footer)
            </h3>

            <label style={labelStyle}>
              <Phone size={12} style={inlineIconStyle} /> Hotline
            </label>
            <input
              value={form.hotline}
              onChange={updateText("hotline")}
              placeholder="VD: 0328 866 959"
              disabled={saving}
              style={inputStyle}
            />

            <label style={labelStyle}>
              <Mail size={12} style={inlineIconStyle} /> Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={updateText("email")}
              placeholder="admin@vwa.vn"
              disabled={saving}
              style={inputStyle}
            />

            <label style={labelStyle}>
              <MapPin size={12} style={inlineIconStyle} /> Địa chỉ
            </label>
            <input
              value={form.address}
              onChange={updateText("address")}
              placeholder="VD: 68 Nguyễn Chí Thanh, Hà Nội"
              disabled={saving}
              style={{ ...inputStyle, marginBottom: 0 }}
            />
          </div>

          {/* ---------- Save button ---------- */}
          <button
            onClick={save}
            disabled={saving || !isDirty}
            style={{
              width: "100%",
              padding: 14,
              marginTop: 16,
              background: saving
                ? "#94a3b8"
                : saved
                ? "#18a967"
                : isDirty
                ? "#2634d5"
                : "#94a3b8",
              color: "#fff",
              border: 0,
              borderRadius: 10,
              fontWeight: 700,
              cursor: saving || !isDirty ? "not-allowed" : "pointer",
              fontSize: 14,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              opacity: saving || (!isDirty && !saved) ? 0.6 : 1,
            }}
          >
            {saving ? (
              <>
                <Loader2
                  size={18}
                  style={{ animation: "spin 1s linear infinite" }}
                />
                Đang lưu...
              </>
            ) : saved ? (
              <>
                <CheckCircle2 size={18} /> Đã lưu
              </>
            ) : (
              <>
                <Save size={18} /> Lưu thay đổi
              </>
            )}
          </button>
        </div>

        {/* ============================================================
            RIGHT — QR PREVIEW
            ============================================================ */}
        <div style={{ position: "sticky", top: 90, height: "fit-content" }}>
          <div style={cardStyle}>
            <h3 style={cardTitleStyle}>
              <QrCode size={18} /> Xem trước QR
            </h3>

            {/* Preview box */}
            <div
              style={{
                background: "var(--bg-tertiary, #f8fafc)",
                padding: 16,
                borderRadius: 10,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 14,
                minHeight: 232,
              }}
            >
              {form.qrCustomImage ? (
                <img
                  src={form.qrCustomImage}
                  alt="Custom QR"
                  style={{
                    width: 200,
                    height: 200,
                    objectFit: "contain",
                    borderRadius: 8,
                  }}
                />
              ) : vietQR ? (
                <QRImage src={vietQR} />
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    color: "var(--text-light, #8993a3)",
                    fontSize: 12,
                  }}
                >
                  <QrCode size={48} style={{ opacity: 0.3, marginBottom: 8 }} />
                  <div>Nhập số tài khoản</div>
                  <div>để xem trước QR</div>
                </div>
              )}
            </div>

            {/* Info summary */}
            <div
              style={{
                fontSize: 12,
                color: "var(--text-muted, #64748b)",
                lineHeight: 1.8,
                marginBottom: 14,
                padding: 12,
                background: "var(--bg-tertiary, #f8fafc)",
                borderRadius: 8,
              }}
            >
              <div>
                <b style={{ color: "var(--text-primary, #172033)" }}>NH:</b>{" "}
                {selectedBankName}
              </div>
              <div>
                <b style={{ color: "var(--text-primary, #172033)" }}>STK:</b>{" "}
                {form.account || "(chưa nhập)"}
              </div>
              <div>
                <b style={{ color: "var(--text-primary, #172033)" }}>
                  Chủ TK:
                </b>{" "}
                {form.accountName || "(chưa nhập)"}
              </div>
            </div>

            {/* Upload custom QR */}
            <label style={labelStyle}>Hoặc tải ảnh QR riêng lên</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleQRUpload}
              disabled={saving}
              style={{
                width: "100%",
                padding: 8,
                background: "var(--bg-tertiary, #f5f7fb)",
                border: "1px dashed var(--border-color, #cbd5e1)",
                borderRadius: 8,
                fontSize: 12,
                cursor: saving ? "not-allowed" : "pointer",
                color: "var(--text-muted, #64748b)",
                boxSizing: "border-box",
              }}
            />

            {form.qrCustomImage && (
              <button
                onClick={removeCustomQR}
                disabled={saving}
                style={{
                  width: "100%",
                  padding: 8,
                  marginTop: 8,
                  background: "var(--card-bg, #fff)",
                  color: "#ef4444",
                  border: "1px solid #ef4444",
                  borderRadius: 8,
                  fontSize: 12,
                  cursor: saving ? "not-allowed" : "pointer",
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <X size={12} /> Xóa ảnh QR — dùng VietQR tự động
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (max-width: 900px) {
          .settings-layout { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

// ============================================================
// SUB-COMPONENT: QR Image có error state
// ============================================================

function QRImage({ src }) {
  const [errored, setErrored] = useState(false);

  if (errored) {
    return (
      <div
        style={{
          textAlign: "center",
          color: "var(--text-light, #8993a3)",
          fontSize: 12,
          padding: 20,
        }}
      >
        <AlertCircle size={36} style={{ opacity: 0.4, marginBottom: 8 }} />
        <div>Không tải được QR</div>
        <div style={{ fontSize: 11, marginTop: 4 }}>
          Kiểm tra STK có đúng không
        </div>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt="VietQR"
      onError={() => setErrored(true)}
      style={{
        width: 200,
        height: 200,
        objectFit: "contain",
        borderRadius: 8,
      }}
    />
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

const cardTitleStyle = {
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
  marginTop: 12,
  color: "var(--text-muted, #475569)",
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid var(--border-color, #e5e9ef)",
  borderRadius: 8,
  marginBottom: 14,
  background: "var(--bg-secondary, #fff)",
  color: "var(--text-primary, #172033)",
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
};

const inlineIconStyle = {
  display: "inline",
  marginRight: 4,
  verticalAlign: -2,
};

const btnPrimaryStyle = {
  padding: "10px 20px",
  background: "#2634d5",
  color: "#fff",
  border: 0,
  borderRadius: 8,
  fontWeight: 600,
  cursor: "pointer",
  fontSize: 13,
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
};

const loadingFullStyle = {
  padding: 60,
  textAlign: "center",
  color: "var(--text-light, #8993a3)",
};

const errorFullStyle = {
  padding: 40,
  textAlign: "center",
  background: "rgba(239, 68, 68, 0.08)",
  border: "1px solid rgba(239, 68, 68, 0.2)",
  borderRadius: 12,
  color: "#ef4444",
};