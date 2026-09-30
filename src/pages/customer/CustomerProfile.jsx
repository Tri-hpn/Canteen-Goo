// ============================================================
// CUSTOMERPROFILE.JSX — Hồ sơ khách hàng
// ============================================================

import { useState, useEffect, useMemo } from "react";
import {
  User, Mail, Phone, MapPin, Save, Shield, Camera,
  Pencil, X, Check, KeyRound, Lock, Eye, EyeOff, Loader2,
} from "lucide-react";
import { api } from "../../api";
import { toast } from "../../components/Effects";
import { useTranslation } from "../../i18n";

const MODAL_Z = 2147483600;
const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

function buildFormFromUser(u) {
  return {
    name: u?.name || "",
    email: u?.email || "",
    phone: u?.phone || "",
    address: u?.address || "",
    avatar: u?.avatar || "",
  };
}

function escapeForCssUrl(url) {
  if (!url) return "";
  return url.replace(/"/g, '\\"').replace(/\)/g, "\\)");
}

function getInitials(name) {
  const n = (name || "VWA").trim();
  const parts = n.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "VWA";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function CustomerProfile({ user, setUser }) {
  const { t } = useTranslation();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(() => buildFormFromUser(user));
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const [showPwdModal, setShowPwdModal] = useState(false);
  const [pwdForm, setPwdForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPwd, setShowPwd] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState("");

  useEffect(() => {
    if (!editing) {
      setForm(buildFormFromUser(user));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const displayName = editing ? form.name : user?.name || "";
  const avatarSrc = editing ? form.avatar : user?.avatar;
  const initials = useMemo(() => getInitials(displayName), [displayName]);

  const roleLabel = useMemo(() => {
    if (user?.role === "ADMIN") return t("role.admin");
    if (user?.role === "EMPLOYEE") return t("role.employee");
    return t("role.customer");
  }, [user?.role, t]);

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

  const handleAvatar = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    if (file.size > MAX_AVATAR_SIZE) {
      toast(t("profile.avatarTooLarge"), "error");
      return;
    }
    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      toast(t("profile.avatarInvalidType"), "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setForm((f) => ({ ...f, avatar: reader.result }));
        toast(t("profile.avatarSelected"), "success");
      }
    };
    reader.onerror = () => {
      toast(t("profile.avatarReadError"), "error");
    };
    reader.readAsDataURL(file);
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = t("profile.errNameRequired");
    if (!form.email.trim()) {
      errs.email = t("profile.errEmailRequired");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errs.email = t("profile.errEmailInvalid");
    }
    if (form.phone && !/^[0-9]{10,11}$/.test(form.phone.trim())) {
      errs.phone = t("profile.errPhoneInvalid");
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const save = async () => {
    if (loading) return;
    if (!validate()) {
      toast(t("profile.checkInfo"), "error");
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

      toast(t("profile.updated"), "success");
      setEditing(false);
    } catch (err) {
      toast(err.message || t("profile.saveError"), "error");
    } finally {
      setLoading(false);
    }
  };

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
      setPwdError(t("profile.errPwdRequired"));
      return;
    }
    if (pwdForm.newPassword.length < 6) {
      setPwdError(t("profile.errPwdMin"));
      return;
    }
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      setPwdError(t("profile.errPwdMismatch"));
      return;
    }

    setPwdLoading(true);
    try {
      await api.changePassword({
        currentPassword: pwdForm.currentPassword,
        newPassword: pwdForm.newPassword,
      });
      toast(t("profile.pwdChanged"), "success");
      setShowPwdModal(false);
      setPwdForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (e) {
      setPwdError(e.message || t("profile.pwdChangeError"));
    } finally {
      setPwdLoading(false);
    }
  };

  useEffect(() => {
    if (!showPwdModal) return;
    const handler = (e) => {
      if (e.key === "Escape" && !pwdLoading) closePwdModal();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPwdModal, pwdLoading]);

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
        {/* CỘT TRÁI */}
        <div className="profile-card-left" style={cardStyle}>
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
                title={t("profile.changeAvatar")}
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
            {user?.name || t("account.user")}
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
              background: "linear-gradient(135deg, #f59e0b20, #ef444420)",
              borderRadius: 12,
              border: "1px solid #f59e0b40",
            }}
          >
            <span style={{ fontSize: 12, color: "var(--text-light, #8993a3)" }}>
              {t("profile.pointsLabel")}
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
            <span style={{ fontSize: 11, color: "var(--text-light, #8993a3)" }}>
              {t("profile.pointsRate")}
            </span>
          </div>

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
          >
            <KeyRound size={15} /> {t("profile.changePassword")}
          </button>
        </div>

        {/* CỘT PHẢI */}
        <div className="profile-card-right" style={cardStyle}>
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
              <h3 style={{ margin: 0, color: "var(--text-primary, #172033)" }}>
                {t("profile.title")}
              </h3>
              <p
                style={{
                  margin: "4px 0 0",
                  color: "var(--text-light, #8993a3)",
                  fontSize: 13,
                }}
              >
                {editing ? t("profile.editHint") : t("profile.viewHint")}
              </p>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              {!editing ? (
                <button onClick={startEdit} style={btnEdit}>
                  <Pencil size={14} /> {t("common.edit")}
                </button>
              ) : (
                <>
                  <button
                    onClick={cancelEdit}
                    disabled={loading}
                    style={{
                      ...btnCancel,
                      opacity: loading ? 0.6 : 1,
                      cursor: loading ? "not-allowed" : "pointer",
                    }}
                  >
                    <X size={14} /> {t("common.cancel")}
                  </button>
                  <button
                    onClick={save}
                    disabled={loading}
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
                        {t("common.saving")}
                      </>
                    ) : (
                      <>
                        <Save size={14} /> {t("common.save")}
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
                label={t("profile.name")}
                value={user?.name}
              />
              <InfoRow
                icon={<Mail size={16} />}
                label={t("profile.email")}
                value={user?.email}
              />
              <InfoRow
                icon={<Phone size={16} />}
                label={t("profile.phone")}
                value={user?.phone}
              />
              <InfoRow
                icon={<MapPin size={16} />}
                label={t("profile.address")}
                value={user?.address}
              />
            </div>
          )}

          {/* EDIT MODE */}
          {editing && (
            <div>
              <label style={labelStyle}>{t("profile.name")} *</label>
              <div style={inputWrapStyle(errors.name)}>
                <User size={16} style={iconStyle} />
                <input
                  value={form.name}
                  onChange={update("name")}
                  style={inputInnerStyle}
                  placeholder={t("checkout.namePlaceholder")}
                  disabled={loading}
                />
              </div>
              {errors.name && <div style={errStyle}>{errors.name}</div>}

              <label style={labelStyle}>{t("profile.email")} *</label>
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

              <label style={labelStyle}>{t("profile.phone")}</label>
              <div style={inputWrapStyle(errors.phone)}>
                <Phone size={16} style={iconStyle} />
                <input
                  value={form.phone}
                  onChange={update("phone")}
                  style={inputInnerStyle}
                  placeholder={t("checkout.phonePlaceholder")}
                  inputMode="numeric"
                  disabled={loading}
                />
              </div>
              {errors.phone && <div style={errStyle}>{errors.phone}</div>}

              <label style={labelStyle}>{t("profile.address")}</label>
              <div style={inputWrapStyle()}>
                <MapPin size={16} style={iconStyle} />
                <input
                  value={form.address}
                  onChange={update("address")}
                  style={inputInnerStyle}
                  placeholder={t("profile.addressPlaceholder")}
                  disabled={loading}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL ĐỔI MẬT KHẨU */}
      {showPwdModal && (
        <div
          onClick={closePwdModal}
          role="dialog"
          aria-modal="true"
          aria-label={t("profile.changePassword")}
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
                <Lock size={20} /> {t("profile.changePassword")}
              </h3>
              <button
                onClick={closePwdModal}
                disabled={pwdLoading}
                aria-label={t("common.close")}
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

            <label style={labelStyle}>{t("profile.currentPassword")}</label>
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
                placeholder={t("profile.enterCurrentPwd")}
                autoComplete="current-password"
                disabled={pwdLoading}
                autoFocus
              />
            </div>

            <label style={labelStyle}>{t("profile.newPassword")}</label>
            <div style={inputWrapStyle()}>
              <KeyRound size={16} style={iconStyle} />
              <input
                type={showPwd ? "text" : "password"}
                value={pwdForm.newPassword}
                onChange={(e) =>
                  setPwdForm((f) => ({ ...f, newPassword: e.target.value }))
                }
                style={inputInnerStyle}
                placeholder={t("profile.pwdMin6")}
                autoComplete="new-password"
                disabled={pwdLoading}
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                aria-label={
                  showPwd ? t("login.hidePassword") : t("login.showPassword")
                }
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

            <label style={labelStyle}>{t("profile.confirmPassword")}</label>
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
                placeholder={t("profile.enterNewPwdAgain")}
                autoComplete="new-password"
                disabled={pwdLoading}
                onKeyDown={(e) => {
                  if (e.key === "Enter") changePassword();
                }}
              />
            </div>

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
                {t("common.cancel")}
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
                    {t("common.processing")}
                  </>
                ) : (
                  t("profile.changePassword")
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

function InfoRow({ icon, label, value }) {
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