// ============================================================
// CUSTOMERPROFILE.JSX — Hồ sơ khách hàng
// ============================================================
// - View / Edit thông tin cá nhân (tên, email, SĐT, địa chỉ)
// - Upload avatar (base64, max 2MB)
// - Modal đổi mật khẩu
//
// Fixes (so với bản gốc):
//   - Form sync khi user prop đổi (nhưng KHÔNG khi đang edit)
//   - Modal đổi mật khẩu: ESC đóng, z-index chuẩn, role/aria
//   - Double-submit guard cho save() và changePassword()
//   - Disable modal close khi pwdLoading
//   - InfoRow fallback "—" khi value rỗng/undefined
//   - initials/displayName dùng useMemo
//   - Avatar URL escape quotes
//   - FileReader onerror handler
//   - Bỏ fragment thừa
// ============================================================

import { useState, useEffect, useMemo } from "react";
import {
  User, Mail, Phone, MapPin, Save, Shield, Camera,
  Pencil, X, Check, KeyRound, Lock, Eye, EyeOff, Loader2,
} from "lucide-react";
import { api } from "../../api";
import { toast } from "../../components/Effects";

// ============================================================
// CONSTANTS
// ============================================================

const MODAL_Z = 2147483600;
const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

// ============================================================
// HELPERS
// ============================================================

/**
 * Build form data từ user object.
 * Dùng cho cả khởi tạo + reset.
 */
function buildFormFromUser(u) {
  return {
    name: u?.name || "",
    email: u?.email || "",
    phone: u?.phone || "",
    address: u?.address || "",
    avatar: u?.avatar || "",
  };
}

/**
 * Escape dấu " trong URL để tránh vỡ CSS background.
 * URL data:image thường có base64, có thể chứa ký tự đặc biệt.
 */
function escapeForCssUrl(url) {
  if (!url) return "";
  return url.replace(/"/g, '\\"').replace(/\)/g, "\\)");
}

/**
 * Tính initials từ tên: "Nguyễn Văn A" → "NA".
 */
function getInitials(name) {
  const n = (name || "VWA").trim();
  const parts = n.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "VWA";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function CustomerProfile({ user, setUser }) {
  // ---------- Edit state ----------
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(() => buildFormFromUser(user));
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // ---------- Password modal ----------
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [pwdForm, setPwdForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPwd, setShowPwd] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState("");

  // ---------- Sync form khi user prop đổi (chỉ khi không đang edit) ----------

  useEffect(() => {
    if (!editing) {
      setForm(buildFormFromUser(user));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]); // không thêm `editing` vào deps để tránh reset form khi bắt đầu edit

  // ---------- Derived (memo) ----------

  const displayName = editing ? form.name : user?.name || "";
  const avatarSrc = editing ? form.avatar : user?.avatar;

  const initials = useMemo(() => getInitials(displayName), [displayName]);

  const roleLabel = useMemo(() => {
    if (user?.role === "ADMIN") return "Quản trị viên";
    if (user?.role === "EMPLOYEE") return "Nhân viên";
    return "Khách hàng";
  }, [user?.role]);

  const avatarStyle = useMemo(() => {
    if (avatarSrc) {
      return {
        background: `url("${escapeForCssUrl(avatarSrc)}") center/cover`,
      };
    }
    return {
      background: "linear-gradient(135deg, #2634d5, #20c779)",
    };
  }, [avatarSrc]);

  // ---------- Handlers ----------

  const resetForm = () => {
    setForm(buildFormFromUser(user));
    setErrors({});
  };

  const startEdit = () => {
    resetForm();
    setEditing(true);
  };

  const cancelEdit = () => {
    resetForm();
    setEditing(false);
  };

  const update = (k) => (e) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, [k]: value }));
    if (errors[k]) setErrors((er) => ({ ...er, [k]: "" }));
  };

  // ---------- Avatar ----------

  const handleAvatar = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input để có thể chọn lại cùng file
    e.target.value = "";

    if (file.size > MAX_AVATAR_SIZE) {
      toast("Ảnh vượt quá 2MB", "error");
      return;
    }
    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      toast("Chỉ chấp nhận ảnh JPG/PNG/WebP", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setForm((f) => ({ ...f, avatar: reader.result }));
        toast("Đã chọn ảnh mới", "success");
      }
    };
    reader.onerror = () => {
      toast("Không đọc được file", "error");
    };
    reader.readAsDataURL(file);
  };

  // ---------- Validate ----------

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = "Vui lòng nhập họ tên";
    if (!form.email.trim()) {
      errs.email = "Vui lòng nhập email";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errs.email = "Email không hợp lệ";
    }
    if (form.phone && !/^[0-9]{10,11}$/.test(form.phone.trim())) {
      errs.phone = "SĐT phải 10-11 chữ số";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ---------- Save profile ----------

  const save = async () => {
    if (loading) return;

    if (!validate()) {
      toast("Vui lòng kiểm tra lại thông tin", "error");
      return;
    }

    setLoading(true);
    try {
      const updated = await api.updateProfile({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        avatar: form.avatar,
      });

      if (setUser) setUser((u) => ({ ...u, ...updated }));

      try {
        window.dispatchEvent(new CustomEvent("refresh-user"));
        localStorage.setItem("canteen_user", JSON.stringify(updated));
      } catch {}

      toast("Đã lưu thay đổi!", "success");
      setEditing(false);
    } catch (err) {
      toast(err.message || "Không lưu được", "error");
    } finally {
      setLoading(false);
    }
  };

  // ---------- Change password ----------

  const openPwdModal = () => {
    setPwdForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setPwdError("");
    setShowPwd(false);
    setShowPwdModal(true);
  };

  const closePwdModal = () => {
    if (pwdLoading) return;
    setShowPwdModal(false);
  };

  const changePassword = async () => {
    if (pwdLoading) return;

    setPwdError("");

    if (!pwdForm.currentPassword || !pwdForm.newPassword) {
      setPwdError("Vui lòng nhập đầy đủ thông tin");
      return;
    }
    if (pwdForm.newPassword.length < 6) {
      setPwdError("Mật khẩu mới phải từ 6 ký tự");
      return;
    }
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      setPwdError("Xác nhận mật khẩu không khớp");
      return;
    }

    setPwdLoading(true);
    try {
      await api.changePassword({
        currentPassword: pwdForm.currentPassword,
        newPassword: pwdForm.newPassword,
      });
      toast("Đổi mật khẩu thành công!", "success");
      setShowPwdModal(false);
      setPwdForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (e) {
      setPwdError(e.message || "Lỗi đổi mật khẩu");
    } finally {
      setPwdLoading(false);
    }
  };

  // ESC đóng modal đổi mật khẩu
  useEffect(() => {
    if (!showPwdModal) return;
    const handler = (e) => {
      if (e.key === "Escape" && !pwdLoading) closePwdModal();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPwdModal, pwdLoading]);

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <>
      <div
        className="profile-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 2fr",
          gap: 20,
        }}
      >
        {/* ========== CỘT TRÁI: AVATAR + ĐIỂM ========== */}
        <div className="profile-card-left" style={cardStyle}>
          {/* Avatar */}
          <div
            className="profile-avatar-wrap"
            style={{
              position: "relative",
              width: 100,
              height: 100,
              margin: "0 auto 14px",
            }}
          >
            <div
              className="profile-avatar"
              style={{
                width: 100,
                height: 100,
                borderRadius: "50%",
                color: "#fff",
                display: "grid",
                placeItems: "center",
                fontWeight: 800,
                fontSize: 36,
                border: "3px solid var(--border-color, #e5e9ef)",
                overflow: "hidden",
                ...avatarStyle,
              }}
            >
              {!avatarSrc && initials}
            </div>

            {editing && (
              <label
                title="Đổi ảnh đại diện"
                style={{
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  background: "#2634d5",
                  color: "#fff",
                  display: "grid",
                  placeItems: "center",
                  cursor: loading ? "not-allowed" : "pointer",
                  boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
                  border: "2px solid #fff",
                  opacity: loading ? 0.6 : 1,
                }}
              >
                <Camera size={16} />
                <input
                  type="file"
                  accept={ALLOWED_AVATAR_TYPES.join(",")}
                  onChange={handleAvatar}
                  disabled={loading}
                  style={{ display: "none" }}
                />
              </label>
            )}
          </div>

          <h3
            style={{
              margin: "0 0 4px",
              color: "var(--text-primary, #172033)",
              textAlign: "center",
            }}
          >
            {user?.name || "Người dùng"}
          </h3>
          <p
            style={{
              margin: 0,
              color: "var(--text-light, #8993a3)",
              fontSize: 13,
              textAlign: "center",
              wordBreak: "break-word",
            }}
          >
            {user?.email}
          </p>

          <div style={{ display: "flex", justifyContent: "center" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 12px",
                borderRadius: 20,
                marginTop: 12,
                background: "#eef2ff",
                color: "#2634d5",
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              <Shield size={12} /> {roleLabel}
            </div>
          </div>

          {/* Điểm tích lũy */}
          <div
            className="profile-points-card"
            style={{
              marginTop: 20,
              padding: 16,
              background:
                "linear-gradient(135deg, #f59e0b20, #ef444420)",
              borderRadius: 12,
              border: "1px solid #f59e0b40",
            }}
          >
            <span
              style={{ fontSize: 12, color: "var(--text-light, #8993a3)" }}
            >
              Điểm tích lũy của bạn
            </span>
            <div
              style={{
                fontSize: 32,
                fontWeight: 800,
                color: "#f59e0b",
                marginTop: 6,
              }}
            >
              {user?.points || 0}
            </div>
            <span
              style={{ fontSize: 11, color: "var(--text-light, #8993a3)" }}
            >
              1 điểm = 100đ khi đổi voucher
            </span>
          </div>

          {/* Đổi mật khẩu */}
          <button
            onClick={openPwdModal}
            style={{
              width: "100%",
              marginTop: 16,
              padding: 12,
              background: "var(--bg-tertiary, #f5f7fb)",
              color: "var(--text-primary, #172033)",
              border: "1px solid var(--border-color, #e5e9ef)",
              borderRadius: 10,
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
            className="btn-change-pwd"
          >
            <KeyRound size={15} /> Đổi mật khẩu
          </button>
        </div>

        {/* ========== CỘT PHẢI: THÔNG TIN / FORM ========== */}
        <div className="profile-card-right" style={cardStyle}>
          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 20,
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div>
              <h3
                style={{ margin: 0, color: "var(--text-primary, #172033)" }}
              >
                Hồ sơ cá nhân
              </h3>
              <p
                style={{
                  margin: "4px 0 0",
                  color: "var(--text-light, #8993a3)",
                  fontSize: 13,
                }}
              >
                {editing
                  ? "Chỉnh sửa thông tin bên dưới"
                  : "Thông tin tài khoản của bạn"}
              </p>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              {!editing ? (
                <button onClick={startEdit} style={btnEdit}>
                  <Pencil size={14} /> Sửa
                </button>
              ) : (
                <>
                  <button
                    onClick={cancelEdit}
                    disabled={loading}
                    className="btn-cancel"
                    style={{
                      ...btnCancel,
                      opacity: loading ? 0.6 : 1,
                      cursor: loading ? "not-allowed" : "pointer",
                    }}
                  >
                    <X size={14} /> Hủy
                  </button>
                  <button
                    onClick={save}
                    disabled={loading}
                    className="btn-save"
                    style={{
                      ...btnSave,
                      opacity: loading ? 0.6 : 1,
                      cursor: loading ? "not-allowed" : "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    {loading ? (
                      <>
                        <Loader2
                          size={14}
                          style={{ animation: "spin 1s linear infinite" }}
                        />
                        Đang lưu...
                      </>
                    ) : (
                      <>
                        <Save size={14} /> Lưu thay đổi
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* VIEW MODE */}
          {!editing && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <InfoRow
                icon={<User size={16} />}
                label="Họ và tên"
                value={user?.name}
              />
              <InfoRow
                icon={<Mail size={16} />}
                label="Email"
                value={user?.email}
              />
              <InfoRow
                icon={<Phone size={16} />}
                label="Số điện thoại"
                value={user?.phone}
              />
              <InfoRow
                icon={<MapPin size={16} />}
                label="Địa chỉ"
                value={user?.address}
              />
            </div>
          )}

          {/* EDIT MODE */}
          {editing && (
            <div>
              <label style={labelStyle}>Họ và tên *</label>
              <div style={inputWrapStyle(errors.name)}>
                <User size={16} style={iconStyle} />
                <input
                  value={form.name}
                  onChange={update("name")}
                  style={inputInnerStyle}
                  placeholder="Nguyễn Văn A"
                  disabled={loading}
                />
              </div>
              {errors.name && <div style={errStyle}>{errors.name}</div>}

              <label style={labelStyle}>Email *</label>
              <div style={inputWrapStyle(errors.email)}>
                <Mail size={16} style={iconStyle} />
                <input
                  type="email"
                  value={form.email}
                  onChange={update("email")}
                  style={inputInnerStyle}
                  placeholder="email@vwa.vn"
                  disabled={loading}
                />
              </div>
              {errors.email && <div style={errStyle}>{errors.email}</div>}

              <label style={labelStyle}>Số điện thoại</label>
              <div style={inputWrapStyle(errors.phone)}>
                <Phone size={16} style={iconStyle} />
                <input
                  value={form.phone}
                  onChange={update("phone")}
                  style={inputInnerStyle}
                  placeholder="0901234567"
                  inputMode="numeric"
                  disabled={loading}
                />
              </div>
              {errors.phone && <div style={errStyle}>{errors.phone}</div>}

              <label style={labelStyle}>Địa chỉ</label>
              <div style={inputWrapStyle()}>
                <MapPin size={16} style={iconStyle} />
                <input
                  value={form.address}
                  onChange={update("address")}
                  style={inputInnerStyle}
                  placeholder="Ký túc xá VWA, Hà Nội"
                  disabled={loading}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========== MODAL ĐỔI MẬT KHẨU ========== */}
      {showPwdModal && (
        <div
          onClick={closePwdModal}
          role="dialog"
          aria-modal="true"
          aria-label="Đổi mật khẩu"
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
              maxWidth: 440,
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
                marginBottom: 18,
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
                <Lock size={20} /> Đổi mật khẩu
              </h3>
              <button
                onClick={closePwdModal}
                disabled={pwdLoading}
                aria-label="Đóng"
                style={{
                  background: "transparent",
                  border: 0,
                  cursor: pwdLoading ? "not-allowed" : "pointer",
                  color: "var(--text-light, #8993a3)",
                  padding: 4,
                  display: "grid",
                  placeItems: "center",
                  opacity: pwdLoading ? 0.5 : 1,
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Error */}
            {pwdError && (
              <div
                style={{
                  background: "#fde8e8",
                  color: "#ef4444",
                  padding: 10,
                  borderRadius: 8,
                  fontSize: 12,
                  marginBottom: 14,
                }}
              >
                {pwdError}
              </div>
            )}

            {/* Current password */}
            <label style={labelStyle}>Mật khẩu hiện tại</label>
            <div style={inputWrapStyle()}>
              <Lock size={16} style={iconStyle} />
              <input
                type={showPwd ? "text" : "password"}
                value={pwdForm.currentPassword}
                onChange={(e) =>
                  setPwdForm((f) => ({
                    ...f,
                    currentPassword: e.target.value,
                  }))
                }
                style={inputInnerStyle}
                placeholder="Nhập mật khẩu hiện tại"
                autoComplete="current-password"
                disabled={pwdLoading}
                autoFocus
              />
            </div>

            {/* New password */}
            <label style={labelStyle}>Mật khẩu mới</label>
            <div style={inputWrapStyle()}>
              <KeyRound size={16} style={iconStyle} />
              <input
                type={showPwd ? "text" : "password"}
                value={pwdForm.newPassword}
                onChange={(e) =>
                  setPwdForm((f) => ({ ...f, newPassword: e.target.value }))
                }
                style={inputInnerStyle}
                placeholder="Tối thiểu 6 ký tự"
                autoComplete="new-password"
                disabled={pwdLoading}
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                aria-label={showPwd ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                style={{
                  background: "transparent",
                  border: 0,
                  cursor: "pointer",
                  color: "var(--text-light, #8993a3)",
                  padding: 4,
                }}
              >
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Confirm password */}
            <label style={labelStyle}>Xác nhận mật khẩu mới</label>
            <div style={inputWrapStyle()}>
              <Check size={16} style={iconStyle} />
              <input
                type={showPwd ? "text" : "password"}
                value={pwdForm.confirmPassword}
                onChange={(e) =>
                  setPwdForm((f) => ({
                    ...f,
                    confirmPassword: e.target.value,
                  }))
                }
                style={inputInnerStyle}
                placeholder="Nhập lại mật khẩu mới"
                autoComplete="new-password"
                disabled={pwdLoading}
                onKeyDown={(e) => {
                  if (e.key === "Enter") changePassword();
                }}
              />
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button
                type="button"
                onClick={closePwdModal}
                disabled={pwdLoading}
                style={{
                  flex: 1,
                  padding: 12,
                  border: "1px solid var(--border-color, #e5e9ef)",
                  borderRadius: 8,
                  background: "var(--card-bg, #fff)",
                  cursor: pwdLoading ? "not-allowed" : "pointer",
                  color: "var(--text-primary, #172033)",
                  fontWeight: 600,
                  opacity: pwdLoading ? 0.6 : 1,
                }}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={changePassword}
                disabled={pwdLoading}
                style={{
                  flex: 1,
                  padding: 12,
                  background: pwdLoading ? "#94a3b8" : "#2634d5",
                  color: "#fff",
                  border: 0,
                  borderRadius: 8,
                  fontWeight: 700,
                  cursor: pwdLoading ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                {pwdLoading ? (
                  <>
                    <Loader2
                      size={14}
                      style={{ animation: "spin 1s linear infinite" }}
                    />
                    Đang xử lý...
                  </>
                ) : (
                  "Đổi mật khẩu"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}

// ============================================================
// SUB-COMPONENT: InfoRow
// ============================================================

function InfoRow({ icon, label, value }) {
  // Fallback "—" nếu value rỗng/undefined
  const display =
    value === undefined || value === null || value === "" ? "—" : value;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: 14,
        background: "var(--bg-tertiary, #f8fafc)",
        borderRadius: 10,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: "#eef2ff",
          color: "#2634d5",
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 11,
            color: "var(--text-light, #8993a3)",
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginBottom: 2,
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: 14,
            color: "var(--text-primary, #172033)",
            fontWeight: 600,
            wordBreak: "break-word",
          }}
        >
          {display}
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
  padding: 24,
};

const btnEdit = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 16px",
  background: "#2634d5",
  color: "#fff",
  border: 0,
  borderRadius: 8,
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
};

const btnCancel = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 14px",
  background: "var(--card-bg, #fff)",
  color: "var(--text-primary, #475569)",
  border: "1px solid var(--border-color, #e5e9ef)",
  borderRadius: 8,
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
};

const btnSave = {
  padding: "8px 16px",
  background: "#18a967",
  color: "#fff",
  border: 0,
  borderRadius: 8,
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
};

const labelStyle = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  marginBottom: 4,
  color: "var(--text-muted, #475569)",
  marginTop: 14,
};

const iconStyle = { color: "var(--text-light, #8993a3)" };

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
  background: "var(--bg-secondary, #fff)",
});

const errStyle = {
  color: "#ef4444",
  fontSize: 12,
  marginTop: 4,
};