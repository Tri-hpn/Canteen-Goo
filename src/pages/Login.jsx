// ============================================================
// LOGIN.JSX — Trang đăng nhập (style Login Animation V8)
// ============================================================

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Eye, EyeOff, LockKeyhole, Mail, ArrowRight, Loader2,
} from "lucide-react";
import { useTranslation } from "../i18n";
import CuteCharacters from "../components/LoginIllustration";

const DEMO_ACCOUNTS = [
  { role: "Admin",      email: "admin@vwa.vn",    password: "123456" },
  { role: "Nhân viên",  email: "nhanvien@vwa.vn", password: "123456" },
  { role: "Khách hàng", email: "sinhvien@vwa.vn", password: "123456" },
];

const REMEMBER_KEY = "canteen_remember_email";

export default function Login({ onLogin }) {
  const { t } = useTranslation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(false);
  const [peeking, setPeeking] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_KEY);
      if (saved) {
        setEmail(saved);
        setRemember(true);
      }
    } catch {}
  }, []);

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (error) setError("");
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (error) setError("");
  };

  const fillDemo = (account) => {
    setEmail(account.email);
    setPassword(account.password);
    setError("");
  };

  const submit = async (e) => {
    if (e) e.preventDefault();
    if (loading) return;

    if (!email.trim()) return setError("Vui lòng nhập email");
    if (!password) return setError("Vui lòng nhập mật khẩu");

    setError("");
    setLoading(true);

    try {
      const result = await onLogin(email.trim(), password);

      if (!result) {
        setError("Tài khoản hoặc mật khẩu không đúng.");
        return;
      }

      try {
        if (remember) {
          localStorage.setItem(REMEMBER_KEY, email.trim());
        } else {
          localStorage.removeItem(REMEMBER_KEY);
        }
      } catch {}
    } catch (err) {
      setError(err.message || "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
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
 	   <div className="v8-speech-bubble">
  	    {peeking
  	      ? "🙈 Đang nhập mật khẩu — không nhìn đâu!"
  	      : "🤫 Squad privacy mode: Shhh, no peeking!"}
  	  </div>

  	  <CuteCharacters peeking={peeking} />
 	 </div>
	</div>

        <div className="v8-left-caption">
          <b>Chào mừng đến Canteen VWA</b>
          <span>Đặt món nhanh — Quản lý gọn — Phục vụ tận tâm.</span>
        </div>
      </section>

      {/* RIGHT */}
      <main className="v8-login-right">
        <div className="v8-form-inner">
 	<div className="v8-form-top">
   	<div className="v8-form-logo">
   	   <div className="v8-form-logo-mark">C</div>
   	 </div>

   	 <nav className="v8-tabs" aria-label="Chuyển trang">
   	   <span className="v8-tab active">Đăng nhập</span>
   	   <Link to="/register" className="v8-tab">
   	     Đăng ký
   	   </Link>
   	 </nav>
 	 </div>

          <h1 className="v8-form-title">Chào mừng trở lại</h1>
          <p className="v8-form-subtitle">
            Nhập thông tin tài khoản để truy cập Canteen VWA
          </p>

          {error && <div className="v8-error-box">{error}</div>}

          <form onSubmit={submit} autoComplete="off" data-form-type="other">
            <label className="v8-label">Email hoặc tên đăng nhập</label>
            <div className="v8-input-wrap">
              <Mail size={16} className="v8-input-icon" />
              <input
                type="text"
                value={email}
                onChange={handleEmailChange}
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="off"
                autoComplete="off"
                data-form-type="other"
                placeholder="email@vwa.vn"
                disabled={loading}
              />
            </div>

            <label className="v8-label v8-label-row">
              <span>Mật khẩu</span>
              <Link to="/forgot-password" className="v8-forgot">
                Quên mật khẩu?
              </Link>
            </label>
            <div className="v8-input-wrap">
              <LockKeyhole size={16} className="v8-input-icon" />
              <input
                type={show ? "text" : "password"}
                value={password}
                onChange={handlePasswordChange}
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="off"
                autoComplete="new-password"
                data-form-type="other"
                placeholder="••••••"
                disabled={loading}
                onFocus={() => setPeeking(true)}
                onBlur={() => setPeeking(false)}
                onKeyDown={(e) => e.key === "Enter" && submit(e)}
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                tabIndex={-1}
                className="v8-eye-btn"
              >
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <label className="v8-check">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <span>Ghi nhớ đăng nhập trong 30 ngày</span>
            </label>

            <button type="submit" className="v8-cta" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 size={16} className="spin" />
                  Đang đăng nhập...
                </>
              ) : (
                <>
                  Đăng nhập vào tài khoản
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="v8-divider">
            <span>hoặc tiếp tục với</span>
          </div>

          <div className="v8-socials">
            <button
              type="button"
              className="v8-social"
              onClick={() => fillDemo(DEMO_ACCOUNTS[2])}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google
            </button>
            <button
              type="button"
              className="v8-social"
              onClick={() => fillDemo(DEMO_ACCOUNTS[1])}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#1F2937" aria-hidden="true">
                <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.2 11.38.6.1.82-.26.82-.58v-2.02c-3.34.72-4.04-1.6-4.04-1.6-.55-1.4-1.34-1.77-1.34-1.77-1.1-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.08 1.84 2.82 1.3 3.5.99.1-.78.42-1.3.76-1.6-2.66-.3-5.46-1.33-5.46-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.17 0 0 1-.32 3.3 1.23.96-.27 2-.4 3.02-.4 1.02 0 2.06.13 3.02.4 2.3-1.55 3.3-1.23 3.3-1.23.66 1.65.24 2.87.12 3.17.77.84 1.24 1.91 1.24 3.22 0 4.6-2.8 5.62-5.47 5.92.43.37.81 1.1.81 2.22v3.3c0 .32.22.69.83.58C20.56 22.3 24 17.8 24 12.5 24 5.87 18.63.5 12 .5z" />
              </svg>
              GitHub
            </button>
            <button
              type="button"
              className="v8-social"
              onClick={() => fillDemo(DEMO_ACCOUNTS[0])}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#1877F2" aria-hidden="true">
                <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z" />
              </svg>
              Facebook
            </button>
          </div>

          <p className="v8-bottom-text">
            Chưa có tài khoản?{" "}
            <Link to="/register">Đăng ký miễn phí</Link>
          </p>

          <div className="v8-demo">
            <div className="v8-demo-title">Tài khoản demo</div>
            <div className="v8-demo-list">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => fillDemo(acc)}
                  disabled={loading}
                  className="v8-demo-item"
                >
                  <span className="v8-demo-role">{acc.role}</span>
                  <span className="v8-demo-email">{acc.email}</span>
                </button>
              ))}
            </div>
            <div className="v8-demo-hint">Click để tự động điền</div>
          </div>
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