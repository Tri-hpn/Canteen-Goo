// ============================================================
// REGISTER.JSX — Đăng ký tài khoản khách hàng (style Login V8)
// ============================================================
// FIX v9:
//   - ✅ Áp dụng i18n cho TẤT CẢ text
// ============================================================

import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Mail, LockKeyhole, User, Phone, ArrowRight, Eye, EyeOff, Loader2,
} from "lucide-react";
import { api, setToken } from "../api";
import { toast } from "../components/Effects";
import { useTranslation } from "../i18n";
import CuteCharacters from "../components/LoginIllustration";

export default function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirm: "",
  });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [peeking, setPeeking] = useState(false);

  const update = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (error) setError("");
  };

  const validate = () => {
    if (!form.name.trim()) return t("register.errorNameRequired");
    if (!form.email.trim()) return t("register.errorEmailRequired");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      return t("register.errorEmailInvalid");
    if (form.phone && !/^[0-9]{10,11}$/.test(form.phone.trim()))
      return t("register.errorPhoneInvalid");
    if (form.password.length < 6) return t("register.errorPasswordMin");
    if (form.password !== form.confirm)
      return t("register.errorPasswordMismatch");
    return null;
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    const errMsg = validate();
    if (errMsg) return setError(errMsg);

    setLoading(true);
    try {
      const { token, user } = await api.register({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        password: form.password,
      });

      setToken(token);
      toast(`${t("register.successWelcome")} ${user.name}`, "success");
      navigate("/customer");
    } catch (err) {
      setError(err.message || t("register.errorFailed"));
    } finally {
      setLoading(false);
    }
  };

  // Bubble text — tính 1 lần
  const bubbleText = useMemo(() => {
    return peeking ? t("register.bubblePeek") : t("register.bubbleIdle");
  }, [peeking, t]);

  return (
    <div className="v8-login-page">
      {/* LEFT */}
      <section className="v8-login-left">
        <div className="v8-login-brand">
          <div className="v8-brand-mark">C</div>
          <div className="v8-brand-text">
            <b>{t("login.brandName")}</b>
            <small>{t("login.brandSub")}</small>
          </div>
        </div>

        <div className="v8-illustration-wrap">
          <div className="v8-illustration-inner">
            <div className="v8-speech-bubble">{bubbleText}</div>
            <CuteCharacters peeking={peeking} />
          </div>
        </div>

        <div className="v8-left-caption">
          <b>{t("register.captionTitle")}</b>
          <span>{t("register.captionSub")}</span>
        </div>
      </section>

      {/* RIGHT */}
      <main className="v8-login-right">
        <div className="v8-form-inner">
          {/* Logo + Tabs */}
          <div className="v8-form-top">
            <div className="v8-form-logo">
              <div className="v8-form-logo-mark">C</div>
            </div>

            <nav className="v8-tabs" aria-label="Chuyển trang">
              <Link to="/" className="v8-tab">
                {t("login.tabLogin")}
              </Link>
              <span className="v8-tab active">{t("login.tabRegister")}</span>
            </nav>
          </div>

          {/* Heading */}
          <h1 className="v8-form-title">{t("register.title")}</h1>
          <p className="v8-form-subtitle">{t("register.subtitle")}</p>

          {/* Error */}
          {error && <div className="v8-error-box">{error}</div>}

          <form onSubmit={submit} autoComplete="off" data-form-type="other">
            <label className="v8-label">{t("register.nameLabel")}</label>
            <div className="v8-input-wrap">
              <User size={16} className="v8-input-icon" />
              <input
                type="text"
                value={form.name}
                onChange={update("name")}
                placeholder={t("register.namePlaceholder")}
                disabled={loading}
              />
            </div>

            <label className="v8-label">{t("register.emailLabel")}</label>
            <div className="v8-input-wrap">
              <Mail size={16} className="v8-input-icon" />
              <input
                type="email"
                value={form.email}
                onChange={update("email")}
                placeholder={t("register.emailPlaceholder")}
                disabled={loading}
                autoComplete="off"
              />
            </div>

            <label className="v8-label">{t("register.phoneLabel")}</label>
            <div className="v8-input-wrap">
              <Phone size={16} className="v8-input-icon" />
              <input
                type="tel"
                value={form.phone}
                onChange={update("phone")}
                placeholder={t("register.phonePlaceholder")}
                disabled={loading}
              />
            </div>

            <label className="v8-label">{t("register.passwordLabel")}</label>
            <div className="v8-input-wrap">
              <LockKeyhole size={16} className="v8-input-icon" />
              <input
                type={show ? "text" : "password"}
                value={form.password}
                onChange={update("password")}
                placeholder={t("register.passwordPlaceholder")}
                disabled={loading}
                autoComplete="new-password"
                onFocus={() => setPeeking(true)}
                onBlur={() => setPeeking(false)}
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                aria-label={
                  show ? t("login.hidePassword") : t("login.showPassword")
                }
                tabIndex={-1}
                className="v8-eye-btn"
              >
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <label className="v8-label">{t("register.confirmLabel")}</label>
            <div className="v8-input-wrap">
              <LockKeyhole size={16} className="v8-input-icon" />
              <input
                type={show ? "text" : "password"}
                value={form.confirm}
                onChange={update("confirm")}
                placeholder={t("register.confirmPlaceholder")}
                disabled={loading}
                autoComplete="new-password"
                onFocus={() => setPeeking(true)}
                onBlur={() => setPeeking(false)}
                onKeyDown={(e) => e.key === "Enter" && submit(e)}
              />
            </div>

            <button
              type="submit"
              className="v8-cta"
              disabled={loading}
              style={{ marginTop: 20 }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="spin" />
                  {t("register.submitting")}
                </>
              ) : (
                <>
                  {t("register.submitBtn")}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <p className="v8-bottom-text" style={{ marginTop: 24 }}>
            {t("register.haveAccount")}{" "}
            <Link to="/">{t("register.loginNow")}</Link>
          </p>
        </div>
      </main>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .spin { animation: spin 1s linear infinite; }

        .v8-illustration-inner svg circle,
        .v8-illustration-inner svg path,
        .v8-illustration-inner svg line,
        .v8-illustration-inner svg ellipse {
          transition: all 0.2s ease;
        }
      `}</style>
    </div>
  );
}