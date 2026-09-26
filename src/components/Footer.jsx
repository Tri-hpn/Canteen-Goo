// ============================================================
// FOOTER.JSX — Footer toàn cục
// ============================================================
// Gồm 3 cột:
//   1. Brand + mô tả
//   2. Liên hệ (hotline, email, địa chỉ) — từ settings admin
//   3. Social icons + Google Maps preview
//
// Fixes (so với bản gốc):
//   - 🔴 Fix class mismatch: .footer-row → .footer-contact-item (match CSS)
//   - 🔴 Lấy hotline/email/address từ api.settings (không hardcode)
//   - 🔴 Bỏ <a> bọc iframe — dùng overlay click mở Maps
//   - 🔴 Thêm copyright (đã có CSS sẵn)
//   - 🟡 Địa chỉ click mở Google Maps
//   - 🟡 Bỏ class không có CSS (.footer-col-brand, .footer-col-contact)
//   - 🟡 Fallback khi settings chưa load
//
// Batch 6C:
//   - ✅ Không hardcode fallback — hiện "Chưa cấu hình" nếu thiếu
//   - ✅ Ẩn map nếu chưa có address
//   - ✅ Thêm mapsEmbedUrl để embed iframe
// ============================================================

import { useEffect, useState, useMemo } from "react";
import {
  Phone, Mail, MapPin, Facebook, Youtube, Instagram,
  Send, Globe,
} from "lucide-react";
import { api } from "../api";

// ============================================================
// CONSTANTS
// ============================================================

const SOCIALS = [
  { Icon: Facebook,  href: "https://facebook.com/",  label: "Facebook", color: "#1877F2" },
  { Icon: Instagram, href: "https://instagram.com/", label: "Instagram", color: "#E4405F" },
  { Icon: Youtube,   href: "https://youtube.com/",   label: "YouTube",  color: "#FF0000" },
  { Icon: Send,      href: "https://t.me/",          label: "Telegram", color: "#0088CC" },
  { Icon: Globe,     href: "https://vwa.vn/",        label: "Website",  color: "#20c779" },
];

// ✅ Batch 6C: Không hardcode fallback — hiện "Chưa cấu hình" nếu thiếu
const EMPTY_CONTACT = {
  hotline: "",
  email: "",
  address: "",
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function Footer() {
  const [contact, setContact] = useState(EMPTY_CONTACT);

  useEffect(() => {
    let cancelled = false;

    api.settings
      .get()
      .then((s) => {
        if (cancelled || !s) return;
        setContact({
          hotline: s.hotline?.trim() || "",
          email: s.email?.trim() || "",
          address: s.address?.trim() || "",
        });
      })
      .catch(() => {
        /* Giữ EMPTY_CONTACT */
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Check có info để hiện không
  const hasHotline = !!contact.hotline;
  const hasEmail = !!contact.email;
  const hasAddress = !!contact.address;

  // ---------- Computed ----------

  // Link Google Maps từ địa chỉ
  const mapsUrl = useMemo(() => {
    if (!contact.address) return "";
    return (
      "https://www.google.com/maps/search/?api=1&query=" +
      encodeURIComponent(contact.address)
    );
  }, [contact.address]);

  // ✅ Batch 6C: URL embed iframe (khác với mapsUrl — dùng output=embed)
  const mapsEmbedUrl = useMemo(() => {
    if (!contact.address) return "";
    return (
      "https://www.google.com/maps?q=" +
      encodeURIComponent(contact.address) +
      "&output=embed"
    );
  }, [contact.address]);

  // Link tel (chỉ giữ số và dấu +)
  const telHref = useMemo(() => {
    if (!contact.hotline) return "";
    const cleaned = contact.hotline.replace(/[^\d+]/g, "");
    return `tel:${cleaned}`;
  }, [contact.hotline]);

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <footer className="app-footer">
      <div className="footer-grid">
        {/* ============ CỘT 1: BRAND + MÔ TẢ ============ */}
        <div className="footer-col">
          <div className="footer-brand">
            <div className="footer-logo">C</div>
            <div>
              <b>CANTEEN VWA</b>
              <small>SMART MANAGEMENT</small>
            </div>
          </div>
          <p className="footer-desc">
            Đặt món nhanh — Quản lý gọn — Phục vụ tận tâm cho sinh viên & cán
            bộ.
          </p>
        </div>

        {/* ============ CỘT 2: LIÊN HỆ ============ */}
        <div className="footer-col">
          <h4 className="footer-heading">Liên hệ</h4>

          {/* Hotline */}
          {hasHotline ? (
            <a
              href={telHref}
              className="footer-contact-item"
              title={`Gọi ${contact.hotline}`}
            >
              <Phone size={14} />
              <div>
                <span
                  style={{
                    display: "block",
                    fontSize: 11,
                    color: "var(--text-light, #8993a3)",
                    marginBottom: 2,
                  }}
                >
                  Hotline
                </span>
                <b>{contact.hotline}</b>
              </div>
            </a>
          ) : (
            <div className="footer-contact-item" style={{ opacity: 0.6 }}>
              <Phone size={14} />
              <div>
                <span
                  style={{
                    display: "block",
                    fontSize: 11,
                    color: "var(--text-light, #8993a3)",
                    marginBottom: 2,
                  }}
                >
                  Hotline
                </span>
                <b style={{ fontStyle: "italic", fontWeight: 500 }}>
                  Chưa cấu hình
                </b>
              </div>
            </div>
          )}

          {/* Email */}
          {hasEmail ? (
            <a
              href={`mailto:${contact.email}`}
              className="footer-contact-item"
              title={`Gửi email tới ${contact.email}`}
            >
              <Mail size={14} />
              <div>
                <span
                  style={{
                    display: "block",
                    fontSize: 11,
                    color: "var(--text-light, #8993a3)",
                    marginBottom: 2,
                  }}
                >
                  Email
                </span>
                <b>{contact.email}</b>
              </div>
            </a>
          ) : (
            <div className="footer-contact-item" style={{ opacity: 0.6 }}>
              <Mail size={14} />
              <div>
                <span
                  style={{
                    display: "block",
                    fontSize: 11,
                    color: "var(--text-light, #8993a3)",
                    marginBottom: 2,
                  }}
                >
                  Email
                </span>
                <b style={{ fontStyle: "italic", fontWeight: 500 }}>
                  Chưa cấu hình
                </b>
              </div>
            </div>
          )}

          {/* Địa chỉ */}
          {hasAddress ? (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="footer-contact-item"
              title="Mở Google Maps"
            >
              <MapPin size={14} />
              <div>
                <span
                  style={{
                    display: "block",
                    fontSize: 11,
                    color: "var(--text-light, #8993a3)",
                    marginBottom: 2,
                  }}
                >
                  Địa chỉ
                </span>
                <b>{contact.address}</b>
              </div>
            </a>
          ) : (
            <div className="footer-contact-item" style={{ opacity: 0.6 }}>
              <MapPin size={14} />
              <div>
                <span
                  style={{
                    display: "block",
                    fontSize: 11,
                    color: "var(--text-light, #8993a3)",
                    marginBottom: 2,
                  }}
                >
                  Địa chỉ
                </span>
                <b style={{ fontStyle: "italic", fontWeight: 500 }}>
                  Chưa cấu hình
                </b>
              </div>
            </div>
          )}
        </div>

        {/* ============ CỘT 3: SOCIAL + MAP ============ */}
        <div className="footer-col footer-col-social-map">
          {/* Social icons */}
          <div className="footer-socials">
            {SOCIALS.map(({ Icon, href, label, color }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                title={label}
                aria-label={label}
                className="footer-social"
                style={{ "--social-color": color }}
              >
                <Icon size={15} />
              </a>
            ))}
          </div>

          {/* Bản đồ preview — chỉ render khi có address */}
          {hasAddress ? (
            <div
              className="footer-map"
              style={{ position: "relative" }}
            >
              <iframe
                title={`Bản đồ ${contact.address}`}
                src={mapsEmbedUrl}
                width="100%"
                height="100%"
                style={{
                  border: 0,
                  display: "block",
                  pointerEvents: "none",
                }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                tabIndex={-1}
              />

              {/* Overlay link phủ lên iframe — để click mở Maps */}
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Mở Canteen VWA trên Google Maps"
                style={{
                  position: "absolute",
                  inset: 0,
                  cursor: "pointer",
                  textDecoration: "none",
                }}
              />
            </div>
          ) : (
            <div
              className="footer-map"
              style={{
                display: "grid",
                placeItems: "center",
                color: "var(--text-light, #8993a3)",
                fontSize: 12,
                fontStyle: "italic",
              }}
            >
              Chưa có địa chỉ
            </div>
          )}
        </div>
      </div>

      {/* ============ COPYRIGHT ============ */}
      <div className="footer-copyright">
        © {new Date().getFullYear()} Canteen VWA · Made with ❤️ for VWA students
      </div>
    </footer>
  );
}