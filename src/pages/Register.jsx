// ============================================================
// FORGOTPASSWORD.JSX — Khôi phục mật khẩu (style Login V8)
// ============================================================
// Demo — OTP hardcode "123456"
// 3 bước: Email → OTP + mật khẩu mới → Thành công
// ============================================================

import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Mail, LockKeyhole, ArrowRight, ShieldCheck, CheckCircle2,
  Eye, EyeOff, Loader2, RefreshCw,
} from "lucide-react";
import { toast } from "../components/Effects";
import { useI18n } from "../hooks/useI18n";
import CuteCharacters from "../components/LoginIllustration";

const DEMO_OTP = "123456";
const RESEND_COOLDOWN = 60;

export default function ForgotPassword() {
  const { t } = useI18n();

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [peeking, setPeeking] = useState(false);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const clearError = () => error && setError("");

  const sendOTP = async (e, isResend = false) => {
    if (e) e.preventDefault();
    if (loading) return;

    const trimmedEmail = email.trim();
    if (!trimmedEmail) return setError(t("Vui lòng nhập email"));
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail))
      return setError(t("Email không hợp lệ"));

    setError("");
    setLoading(true);

    try {
      await new Promise((r) => setTimeout(r, 1000));

      toast(
        isResend ? t("Đã gửi lại mã OTP") : t("Đã gửi mã OTP đến email"),
        "success"
      );

      setOtp(DEMO_OTP);
      if (!isResend) setStep(2);
      setCountdown(RESEND_COOLDOWN);
    } catch (err) {
      setError(err.message || t("Không gửi được mã OTP"));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    if (countdown > 0 || loading) return;
    sendOTP(null, true);
  };

  const resetPassword = async (e) => {
    if (e) e.preventDefault();
    if (loading) return;

    if (!otp.trim()) return setError(t("Vui lòng nhập mã OTP"));
    if (otp.length !== 6) return setError(t("Mã OTP phải có 6 chữ số"));
    if (newPassword.length < 6) return setError(t("Mật khẩu phải từ 6 ký tự"));

    setError("");

    if (otp !== DEMO_OTP) {
      return setError(t("Mã OTP không đúng"));
    }

    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 1000));
      toast(t("Đổi mật khẩu thành công"), "success");
      setStep(3);
    } catch (err) {
      setError(err.message || t("Đổi mật khẩu thất bại"));
    } finally {
      setLoading(false);
    }
  };

  const bubbleText = useMemo(() => {
    if (step === 3) return t("Xong rồi! 🎉");
    if (peeking) return t("Đừng nhìn mật khẩu nhé! 🙈");
    if (step === 2) return t("Nhập mã OTP và mật khẩu mới 📩");
    return t("Nhập email để nhận mã OTP 📧");
  }, [step, peeking, t]);

  const caption = useMemo(() => {
    if (step === 3) {
      return {
        b: t("Hoàn tất!"),
        s: t("Bạn có thể đăng nhập bằng mật khẩu mới."),
      };
    }
    return {
      b: t("Khôi phục mật khẩu"),
      s: t("Chúng tôi sẽ giúp bạn lấy lại quyền truy cập."),
    };
  }, [step, t]);

  const titleText = useMemo(() => {
    if (step === 1) return t("Quên mật khẩu?");
    if (step === 2) return t("Đặt lại mật khẩu");
    return t("Thành công!");
  }, [step, t]);

  const subtitleText = useMemo(() => {
    if (step === 1) return t("Nhập email để nhận mã xác thực");
    if (step === 2) return t("Nhập mã OTP và mật khẩu mới của bạn");
    return t("Mật khẩu đã được cập nhật");
  }, [step, t]);

  return (
    <div className="v8-login-page">
      {/* LEFT */}
      <section className="v8-login-left">
        <div className="v8-login-brand">
          <div className="v8-brand-mark">C</div>
          <div className="v8-brand-text">
            <b>{t("CANTEEN VWA")}</b>
            <small>{t("HỆ THỐNG QUẢN LÝ")}</small>
          </div>
        </div>

        <div className="v8-illustration-wrap">
          <div className="v8-illustration-inner">
            <div className="v8-speech-bubble">{bubbleText}</div>
            <CuteCharacters peeking={peeking} />
          </div>
        </div>

        <div className="v8-left-caption">
          <b>{caption.b}</b>
          <span>{caption.s}</span>
        </div>
      </section>

      {/* RIGHT */}
      <main className="v8-login-right">
        <div className="v8-form-inner">
          {/* Logo + Tabs */}
          <div className="v8-form-top">
            <div className="v8-form-logo">
              <div className="v8-form-logo-mark">
                {step === 3 ? <CheckCircle2 size={22} /> : <ShieldCheck size={22} />}
              </div>
            </div>

            <nav className="v8-tabs" aria-label={t("Chuyển trang")}>
              <Link to="/" className="v8-tab">
                {t("Đăng nhập")}
              </Link>
            </nav>
          </div>

          {/* Heading */}
          <h1 className="v8-form-title">{titleText}</h1>
          <p className="v8-form-subtitle">{subtitleText}</p>

          {error && <div className="v8-error-box">{error}</div>}

          {/* STEP 1 — Email */}
          {step === 1 && (
            <form onSubmit={sendOTP} autoComplete="off">
              <label className="v8-label">{t("Email")}</label>
              <div className="v8-input-wrap">
                <Mail size={16} className="v8-input-icon" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    clearError();
                  }}
                  placeholder={t("email@vwa.vn")}
                  disabled={loading}
                  autoFocus
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
                    {t("Đang gửi OTP...")}
                  </>
                ) : (
                  <>
                    {t("Gửi mã OTP")} <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          )}

          {/* STEP 2 — OTP + Password */}
          {step === 2 && (
            <form onSubmit={resetPassword} autoComplete="off">
              <label className="v8-label">{t("Mã OTP (demo: 123456)")}</label>
              <div className="v8-input-wrap">
                <input
                  value={otp}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setOtp(val);
                    clearError();
                  }}
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  disabled={loading}
                  autoFocus
                  style={{
                    fontSize: 18,
                    letterSpacing: 6,
                    textAlign: "center",
                    fontWeight: 700,
                    fontFamily: "monospace",
                  }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 8,
                  marginBottom: 4,
                  fontSize: 12,
                }}
              >
                <span style={{ color: "#64748b" }}>
                  {t("Chưa nhận được mã?")}
                </span>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={countdown > 0 || loading}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    background: "transparent",
                    border: 0,
                    cursor: countdown > 0 || loading ? "not-allowed" : "pointer",
                    color: countdown > 0 ? "#94a3b8" : "#2634d5",
                    fontWeight: 600,
                    fontSize: 12,
                    padding: 4,
                  }}
                >
                  <RefreshCw size={12} />
                  {countdown > 0
                    ? `${t("Gửi lại sau")} ${countdown}s`
                    : t("Gửi lại")}
                </button>
              </div>

              <label className="v8-label">{t("Mật khẩu mới")}</label>
              <div className="v8-input-wrap">
                <LockKeyhole size={16} className="v8-input-icon" />
                <input
                  type={showPwd ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    clearError();
                  }}
                  placeholder={t("Tối thiểu 6 ký tự")}
                  disabled={loading}
                  autoComplete="new-password"
                  onFocus={() => setPeeking(true)}
                  onBlur={() => setPeeking(false)}
                  onKeyDown={(e) => e.key === "Enter" && resetPassword(e)}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  tabIndex={-1}
                  className="v8-eye-btn"
                  aria-label={
                    showPwd ? t("Ẩn mật khẩu") : t("Hiện mật khẩu")
                  }
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
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
                    {t("Đang xử lý...")}
                  </>
                ) : (
                  <>
                    {t("Đặt lại mật khẩu")} <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          )}

          {/* STEP 3 — Success */}
          {step === 3 && (
            <div style={{ textAlign: "center", marginTop: 12 }}>
              <p
                style={{
                  color: "#18a967",
                  marginBottom: 24,
                  fontSize: 14,
                  lineHeight: 1.6,
                }}
              >
                {t("Mật khẩu của bạn đã được cập nhật. Vui lòng đăng nhập lại bằng mật khẩu mới.")}
              </p>
              <Link
                to="/"
                className="v8-cta"
                style={{ textDecoration: "none", display: "inline-flex" }}
              >
                {t("Đăng nhập ngay")} <ArrowRight size={16} />
              </Link>
            </div>
          )}

          {step !== 3 && (
            <p className="v8-bottom-text" style={{ marginTop: 24 }}>
              <Link to="/">{t("Quay lại đăng nhập")}</Link>
            </p>
          )}
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