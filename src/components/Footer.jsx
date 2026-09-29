// ============================================================
// FOOTER.JSX — Footer toàn cục
// ============================================================

import { useEffect, useState, useMemo } from "react";
import {
  Phone, Mail, MapPin, Facebook, Youtube, Instagram,
  Send, Globe,
} from "lucide-react";
import { api } from "../api";
import { useTranslation } from "../i18n";

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
  const { t } = useTranslation();

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
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  const hasHotline = !!contact.hotline;
  const hasEmail = !!contact.email;
  const hasAddress = !!contact.address;

  const mapsUrl = useMemo(() => {
    if (!contact.address) return "";
    return (
      "https://www.google.com/maps/search/?api=1&query=" +
      encodeURIComponent(contact.address)
    );
  }, [contact.address]);

  const mapsEmbedUrl = useMemo(() => {
    if (!contact.address) return "";
    return (
      "https://www.google.com/maps?q=" +
      encodeURIComponent(contact.address) +
      "&output=embed"
    );
  }, [contact.address]);

  const telHref = useMemo(() => {
    if (!contact.hotline) return "";
    const cleaned = contact.hotline.replace(/[^\d+]/g, "");
    return `tel:${cleaned}`;
  }, [contact.hotline]);

  const notConfigured = t("footer.notConfigured");

  return (
    <footer className="app-footer">
      <div className="footer-grid">
        {/* ============ CỘT 1: BRAND ============ */}
        <div className="footer-col">
          <div className="footer-brand">
            <div className="footer-logo">C</div>
            <div>
              <b>CANTEEN VWA</b>
              <small>SMART MANAGEMENT</small>
            </div>
          </div>
          <p className="footer-desc">{t("footer.description")}</p>
        </div>

        {/* ============ CỘT 2: LIÊN HỆ ============ */}
        <div className="footer-col">
          <h4 className="footer-heading">{t("footer.contact")}</h4>

          {/* Hotline */}
          {hasHotline ? (
            <a
              href={telHref}
              className="footer-contact-item"
              title={`${t("footer.call")} ${contact.hotline}`}
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
                  {t("footer.hotline")}
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
                  {t("footer.hotline")}
                </span>
                <b style={{ fontStyle: "italic", fontWeight: 500 }}>
                  {notConfigured}
                </b>
              </div>
            </div>
          )}

          {/* Email */}
          {hasEmail ? (
            <a
              href={`mailto:${contact.email}`}
              className="footer-contact-item"
              title={`${t("footer.sendEmail")} ${contact.email}`}
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
                  {t("footer.email")}
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
                  {t("footer.email")}
                </span>
                <b style={{ fontStyle: "italic", fontWeight: 500 }}>
                  {notConfigured}
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
              title={t("footer.openMaps")}
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
                  {t("footer.address")}
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
                  {t("footer.address")}
                </span>
                <b style={{ fontStyle: "italic", fontWeight: 500 }}>
                  {notConfigured}
                </b>
              </div>
            </div>
          )}
        </div>

        {/* ============ CỘT 3: SOCIAL + MAP ============ */}
        <div className="footer-col footer-col-social-map">
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

          {hasAddress ? (
            <div className="footer-map" style={{ position: "relative" }}>
              <iframe
                title={`${t("footer.mapOf")} ${contact.address}`}
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

              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("footer.openMaps")}
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
              {t("footer.noAddress")}
            </div>
          )}
        </div>
      </div>

      {/* ============ COPYRIGHT ============ */}
      <div className="footer-copyright">
        © {new Date().getFullYear()} Canteen VWA · {t("footer.madeWith")}
      </div>
    </footer>
  );
}