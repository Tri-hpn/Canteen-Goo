// ============================================================
// FORGOTPASSWORD.JSX — Khôi phục mật khẩu (style Login V8)
// ============================================================
// Demo — OTP hardcode "123456"
// 3 bước: Email → OTP + mật khẩu mới → Thành công
// ============================================================

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Mail, LockKeyhole, ArrowRight, ShieldCheck, CheckCircle2,
  Eye, EyeOff, Loader2, RefreshCw,
} from "lucide-react";
import { toast } from "../components/Effects";
import CuteCharacters from "../components/LoginIllustration";

const DEMO_OTP = "123456";
const RESEND_COOLDOWN = 60;

export default function ForgotPassword() {
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
    if (!trimmedEmail) return setError("Vui lòng nhập email");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail))
      return setError("Email không hợp lệ");

    setError("");
    setLoading(true);

    try {
      await new Promise((r) => setTimeout(r, 1000));

      toast(
        isResend
          ? "Đã gửi lại mã OTP (demo: " + DEMO_OTP + ")"
          : "Mã OTP đã gửi tới email (demo: " + DEMO_OTP + ")",
        "success"
      );

      setOtp(DEMO_OTP);
      if (!isResend) setStep(2);
      setCountdown(RESEND_COOLDOWN);
    } catch (err) {
      setError(err.message || "Không gửi được OTP");
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

    if (!otp.trim()) return setError("Vui lòng nhập mã OTP");
    if (otp.length !== 6) return setError("Mã OTP phải đủ 6 chữ số");
    if (newPassword.length < 6) return setError("Mật khẩu phải từ 6 ký tự");

    setError("");

    if (otp !== DEMO_OTP) {
      return setError("Mã OTP không đúng. Vui lòng kiểm tra lại.");
    }

    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 1000));
      toast("Đặt lại mật khẩu thành công!", "success");
      setStep(3);
    } catch (err) {
      setError(err.message || "Không đặt lại được mật khẩu");
    } finally {
      setLoading(false);
    }
  };

  const bubbleText =
    step === 3
      ? "🎉 Xong rồi! Bạn đã lấy lại được tài khoản!"
      : peeking
      ? "🙈 Đang nhập mật khẩu — không nhìn đâu!"
      : step === 2
      ? "📱 Nhập mã OTP tụi mình vừa gửi nhé!"
      : "🤔 Quên mật khẩu à? Bình tĩnh, để tụi mình giúp!";

  const caption =
    step === 3
      ? { b: "Hoàn tất!", s: "Bạn có thể đăng nhập bằng mật khẩu mới." }
      : {
          b: "Quên mật khẩu? Đừng lo.",
          s: "Chúng tôi sẽ giúp bạn lấy lại quyền truy cập.",
        };

  return (
    <div className="v8-login-page">
      {/* LEFT */}
      <section className="v8-login-left">
        <div className="v8-login-brand">
          <div className="v8-brand-mark">C</div>
          <div className="v8-brand-text">
            <b>CANTEEN</b>
            <small>VWA</small>
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
          {/* ✅ Logo + Tabs cùng hàng */}
          <div className="v8-form-top">
            <div className="v8-form-logo">
              <div className="v8-form-logo-mark">
                {step === 3 ? <CheckCircle2 size={22} /> : <ShieldCheck size={22} />}
              </div>
            </div>

            <nav className="v8-tabs" aria-label="Chuyển trang">
              <Link to="/" className="v8-tab">← Đăng nhập</Link>
            </nav>
          </div>

          {/* Heading */}
          <h1 className="v8-form-title">
            {step === 1 && "Quên mật khẩu"}
            {step === 2 && "Đặt lại mật khẩu"}
            {step === 3 && "Hoàn tất!"}
          </h1>
          <p className="v8-form-subtitle">
            {step === 1 && "Nhập email để nhận mã OTP khôi phục"}
            {step === 2 && "Nhập OTP và mật khẩu mới"}
            {step === 3 && "Mật khẩu đã được đặt lại thành công"}
          </p>

          {error && <div className="v8-error-box">{error}</div>}

          {/* STEP 1 — Email */}
          {step === 1 && (
            <form onSubmit={sendOTP} autoComplete="off">
              <label className="v8-label">Email</label>
              <div className="v8-input-wrap">
                <Mail size={16} className="v8-input-icon" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    clearError();
                  }}
                  placeholder="admin@vwa.vn"
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
                    Đang gửi OTP...
                  </>
                ) : (
                  <>
                    Gửi mã OTP <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          )}

          {/* STEP 2 — OTP + Password */}
          {step === 2 && (
            <form onSubmit={resetPassword} autoComplete="off">
              <label className="v8-label">Mã OTP (demo: {DEMO_OTP})</label>
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
                <span style={{ color: "#64748b" }}>Không nhận được mã?</span>
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
                  {countdown > 0 ? `Gửi lại sau ${countdown}s` : "Gửi lại OTP"}
                </button>
              </div>

              <label className="v8-label">Mật khẩu mới</label>
              <div className="v8-input-wrap">
                <LockKeyhole size={16} className="v8-input-icon" />
                <input
                  type={showPwd ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    clearError();
                  }}
                  placeholder="Tối thiểu 6 ký tự"
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
                  aria-label={showPwd ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
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
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    Đặt lại mật khẩu <ArrowRight size={16} />
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
                Bạn có thể đăng nhập bằng mật khẩu mới.
              </p>
              <Link
                to="/"
                className="v8-cta"
                style={{ textDecoration: "none", display: "inline-flex" }}
              >
                Về trang đăng nhập <ArrowRight size={16} />
              </Link>
            </div>
          )}

          {step !== 3 && (
            <p className="v8-bottom-text" style={{ marginTop: 24 }}>
              <Link to="/">← Về trang đăng nhập</Link>
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