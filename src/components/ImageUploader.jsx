// ============================================================
// IMAGEUPLOADER.JSX — Upload ảnh với drag & drop
// ============================================================
// Props:
//   value    — string (data URI hoặc URL)
//   onChange — callback(dataUri)
//   label    — string
//
// Fixes (so với bản gốc):
//   - 🔴 Sync preview khi value prop đổi (useEffect)
//   - 🔴 Reset inputRef.value sau mỗi lần chọn (kể cả lỗi)
//   - 🔴 Guard unmount trong reader.onload
//   - 🔴 clear() reset cả error
//   - 🔴 Dropzone keyboard accessible (role, tabIndex, Enter/Space)
//   - 🟡 Reset dragging khi window blur
//   - 🟡 Dùng CSS variables → dark mode
//   - 🟡 Validate extension khi type rỗng
//   - 🟡 Cảnh báo khi drop nhiều file
//   - 🟡 aria-label cho input + nút X
//   - 🟢 Inline @keyframes spin
// ============================================================

import { useEffect, useRef, useState, useCallback } from "react";
import { Image as ImageIcon, X, Loader2 } from "lucide-react";
import { toast } from "./Effects";

// ============================================================
// CONSTANTS
// ============================================================

const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

const FALLBACK_PREVIEW =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>
      <rect fill='#f5f7fb' width='100' height='100'/>
      <text x='50' y='58' font-size='40' text-anchor='middle'>🖼️</text>
    </svg>`
  );

// ============================================================
// HELPERS
// ============================================================

/**
 * Validate file.
 * Trả về { ok: true } hoặc { ok: false, msg: string }
 */
function validateFile(file) {
  if (!file) {
    return { ok: false, msg: "Không có file nào được chọn" };
  }

  // Type có thể rỗng trên một số OS/browser → fallback check extension
  const typeOk = ALLOWED_TYPES.includes(file.type);
  const extOk = ALLOWED_EXTENSIONS.some((ext) =>
    file.name.toLowerCase().endsWith(ext)
  );

  if (!typeOk && !extOk) {
    return {
      ok: false,
      msg: "Chỉ chấp nhận ảnh JPEG, PNG, WebP",
    };
  }

  if (file.size > MAX_SIZE) {
    const mb = (file.size / 1024 / 1024).toFixed(2);
    return {
      ok: false,
      msg: `Ảnh vượt quá 2MB (hiện ${mb}MB)`,
    };
  }

  return { ok: true };
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function ImageUploader({
  value,
  onChange,
  label = "Ảnh món ăn (JPEG/PNG)",
}) {
  const [preview, setPreview] = useState(value || "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);

  const inputRef = useRef(null);
  const mountedRef = useRef(true);

  // ---------- Track unmount ----------
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ---------- Sync preview khi value prop đổi ----------
  useEffect(() => {
    setPreview(value || "");
    // Xoá error khi value đổi từ ngoài vào
    setError("");
  }, [value]);

  // ---------- Reset dragging khi window blur ----------
  // Tránh state kẹt khi user kéo file ra khỏi window
  useEffect(() => {
    const handleBlur = () => setDragging(false);
    window.addEventListener("blur", handleBlur);
    return () => window.removeEventListener("blur", handleBlur);
  }, []);

  // ---------- Handle file ----------

  const handleFile = useCallback(
    (file) => {
      setError("");

      const check = validateFile(file);
      if (!check.ok) {
        setError(check.msg);
        toast(check.msg, "error");
        return;
      }

      setLoading(true);

      const reader = new FileReader();

      reader.onload = () => {
        // Guard: component đã unmount
        if (!mountedRef.current) return;

        const dataUri = reader.result;
        if (typeof dataUri !== "string") {
          setError("Không đọc được dữ liệu ảnh");
          setLoading(false);
          return;
        }

        setPreview(dataUri);
        onChange?.(dataUri);
        setLoading(false);
        toast("Đã tải ảnh lên", "success");
      };

      reader.onerror = () => {
        if (!mountedRef.current) return;
        setError("Không đọc được file");
        setLoading(false);
      };

      reader.readAsDataURL(file);
    },
    [onChange]
  );

  // ---------- Input change ----------

  const onInputChange = (e) => {
    const file = e.target.files?.[0];
    handleFile(file);

    // Reset input value → cho phép chọn lại cùng file
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  // ---------- Drag & drop ----------

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);

    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    if (files.length > 1) {
      toast("Chỉ nhận 1 ảnh — đã dùng ảnh đầu tiên", "info");
    }

    handleFile(files[0]);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    if (!dragging) setDragging(true);
  };

  const onDragLeave = (e) => {
    // Chỉ reset khi rời khỏi dropzone hoàn toàn
    // (không phải khi di chuyển giữa các element con)
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setDragging(false);
  };

  // ---------- Clear ----------

  const clear = () => {
    setPreview("");
    setError("");
    onChange?.("");
    if (inputRef.current) inputRef.current.value = "";
  };

  // ---------- Keyboard open picker ----------

  const openPicker = () => {
    if (loading) return;
    inputRef.current?.click();
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openPicker();
    }
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div style={{ margin: "10px 0 16px" }}>
      <label
        style={{
          display: "block",
          fontSize: 12,
          fontWeight: 600,
          marginBottom: 6,
          color: "var(--text-muted, #475569)",
        }}
      >
        {label}
      </label>

      {/* ============ DROPZONE ============ */}
      <div
        onClick={openPicker}
        onKeyDown={onKeyDown}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        role="button"
        tabIndex={0}
        aria-label={preview ? "Đổi ảnh — nhấn Enter để chọn file" : "Chọn ảnh — nhấn Enter"}
        style={{
          position: "relative",
          border: dragging
            ? "2px dashed #2634d5"
            : "2px dashed var(--border-color, #cbd5e1)",
          borderRadius: 12,
          padding: preview ? 0 : 24,
          textAlign: "center",
          cursor: loading ? "wait" : "pointer",
          background: dragging
            ? "rgba(38, 52, 213, 0.08)"
            : "var(--bg-tertiary, #f8fafc)",
          minHeight: 160,
          display: "grid",
          placeItems: "center",
          transition: "all 0.25s",
          overflow: "hidden",
          outline: "none",
        }}
        onFocus={(e) => {
          e.currentTarget.style.boxShadow =
            "0 0 0 4px rgba(38, 52, 213, 0.15)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        {loading ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
              color: "#2634d5",
            }}
          >
            <Loader2 size={28} className="spin" />
            <span style={{ fontSize: 13 }}>Đang xử lý...</span>
          </div>
        ) : preview ? (
          <>
            <img
              src={preview}
              alt="Xem trước ảnh"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = FALLBACK_PREVIEW;
              }}
              style={{
                width: "100%",
                maxHeight: 260,
                objectFit: "cover",
                borderRadius: 10,
                display: "block",
              }}
            />

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                clear();
              }}
              aria-label="Xoá ảnh"
              title="Xoá ảnh"
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                background: "#ef4444",
                color: "#fff",
                border: 0,
                width: 30,
                height: 30,
                borderRadius: "50%",
                cursor: "pointer",
                display: "grid",
                placeItems: "center",
                boxShadow: "0 2px 8px rgba(239, 68, 68, 0.4)",
                transition: "transform 0.15s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.transform = "scale(1.1)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.transform = "scale(1)")
              }
            >
              <X size={16} />
            </button>
          </>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              alignItems: "center",
              color: "var(--text-muted, #64748b)",
            }}
          >
            <ImageIcon
              size={32}
              style={{ color: dragging ? "#2634d5" : "var(--text-light, #94a3b8)" }}
            />
            <b
              style={{
                color: "var(--text-primary, #172033)",
                fontSize: 14,
              }}
            >
              Kéo ảnh vào đây hoặc nhấn để chọn
            </b>
            <span style={{ fontSize: 12 }}>
              JPEG, PNG, WebP · Tối đa 2MB
            </span>
          </div>
        )}
      </div>

      {/* ============ INPUT FILE ============ */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={onInputChange}
        aria-label="Chọn ảnh"
        tabIndex={-1}
        style={{ display: "none" }}
      />

      {/* ============ ERROR ============ */}
      {error && (
        <div
          style={{
            color: "#ef4444",
            fontSize: 12,
            marginTop: 8,
            padding: "8px 12px",
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <X size={14} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* ============ ANIMATION ============ */}
      <style>{`
        @keyframes imgUploaderSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .spin {
          animation: imgUploaderSpin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}