// ============================================================
// REGISTER.JSX — Đăng ký tài khoản khách hàng (style Login V8)
// ============================================================

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Mail, LockKeyhole, User, Phone, ArrowRight, Eye, EyeOff, Loader2,
} from "lucide-react";
import { api, setToken } from "../api";
import { toast } from "../components/Effects";
import CuteCharacters from "../components/LoginIllustration";

export default function Register() {
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
  const navigate = useNavigate();

  const update = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (error) setError("");
  };

  const validate = () => {
    if (!form.name.trim()) return "Vui lòng nhập họ tên";
    if (!form.email.trim()) return "Vui lòng nhập email";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      return "Email không hợp lệ";
    if (form.phone && !/^[0-9]{10,11}$/.test(form.phone.trim()))
      return "SĐT phải 10-11 số";
    if (form.password.length < 6) return "Mật khẩu phải từ 6 ký tự";
    if (form.password !== form.confirm)
      return "Mật khẩu xác nhận không khớp";
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
      toast("Đăng ký thành công! Chào mừng " + user.name, "success");
      navigate("/customer");
    } catch (err) {
      setError(err.message || "Đăng ký thất bại");
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
                : "👋 Chào bạn mới! Đăng ký nhanh thôi nào!"}
            </div>
            <CuteCharacters peeking={peeking} />
          </div>
        </div>

        <div className="v8-left-caption">
          <b>Tạo tài khoản chỉ trong 30 giây</b>
          <span>Đặt món nhanh — Ưu đãi sinh viên — Tích điểm đổi quà.</span>
        </div>
      </section>

      {/* RIGHT */}
      <main className="v8-login-right">
        <div className="v8-form-inner">
          {/* ✅ Logo + Tabs cùng hàng */}
          <div className="v8-form-top">
            <div className="v8-form-logo">
              <div className="v8-form-logo-mark">C</div>
            </div>

            <nav className="v8-tabs" aria-label="Chuyển trang">
              <Link to="/" className="v8-tab">Đăng nhập</Link>
              <span className="v8-tab active">Đăng ký</span>
            </nav>
          </div>

          {/* Heading */}
          <h1 className="v8-form-title">Tạo tài khoản</h1>
          <p className="v8-form-subtitle">
            Đăng ký để đặt món, theo dõi đơn và nhận ưu đãi sinh viên
          </p>

          {/* Error */}
          {error && <div className="v8-error-box">{error}</div>}

          <form onSubmit={submit} autoComplete="off" data-form-type="other">
            <label className="v8-label">Họ và tên *</label>
            <div className="v8-input-wrap">
              <User size={16} className="v8-input-icon" />
              <input
                type="text"
                value={form.name}
                onChange={update("name")}
                placeholder="Nguyễn Văn A"
                disabled={loading}
              />
            </div>

            <label className="v8-label">Email *</label>
            <div className="v8-input-wrap">
              <Mail size={16} className="v8-input-icon" />
              <input
                type="email"
                value={form.email}
                onChange={update("email")}
                placeholder="email@vwa.vn"
                disabled={loading}
                autoComplete="off"
              />
            </div>

            <label className="v8-label">Số điện thoại</label>
            <div className="v8-input-wrap">
              <Phone size={16} className="v8-input-icon" />
              <input
                type="tel"
                value={form.phone}
                onChange={update("phone")}
                placeholder="0901234567"
                disabled={loading}
              />
            </div>

            <label className="v8-label">Mật khẩu *</label>
            <div className="v8-input-wrap">
              <LockKeyhole size={16} className="v8-input-icon" />
              <input
                type={show ? "text" : "password"}
                value={form.password}
                onChange={update("password")}
                placeholder="Tối thiểu 6 ký tự"
                disabled={loading}
                autoComplete="new-password"
                onFocus={() => setPeeking(true)}
                onBlur={() => setPeeking(false)}
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

            <label className="v8-label">Xác nhận mật khẩu *</label>
            <div className="v8-input-wrap">
              <LockKeyhole size={16} className="v8-input-icon" />
              <input
                type={show ? "text" : "password"}
                value={form.confirm}
                onChange={update("confirm")}
                placeholder="Nhập lại mật khẩu"
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
                  Đang đăng ký...
                </>
              ) : (
                <>
                  Tạo tài khoản
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <p className="v8-bottom-text" style={{ marginTop: 24 }}>
            Đã có tài khoản?{" "}
            <Link to="/">Đăng nhập</Link>
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