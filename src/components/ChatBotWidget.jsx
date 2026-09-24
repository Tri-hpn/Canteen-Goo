// ============================================================
// CHATBOTWIDGET.JSX — Widget chat nổi (góc phải dưới)
// ============================================================
// 2 mode: AI (gợi ý món) + Nhà hàng (chat với nhân viên)
//
// Fixes (so với bản gốc):
//   - Bỏ setTimeout hack trong sendAI + sendStaff
//   - Race-safe loadStaff (reqIdRef)
//   - Smart scroll: chỉ scroll khi ở gần đáy hoặc tin của mình
//   - onKeyDown thay onKeyPress (deprecated)
//   - Badge "1" chỉ hiện khi có tin chưa đọc thực sự
//   - ESC đóng panel + body scroll lock
//   - Error state cho staff chat
//   - Fix quickAdd stock bug (stock=0 không thành 99)
//   - Pass settings vào getBotReply (địa chỉ/hotline từ admin)
//   - Validate max message length
//   - Reset AI messages khi user đổi
//   - role="dialog" + aria-modal cho panel
//   - ✅ FIX: quickAdd dùng flag từ trong setCart updater
//     (trước đó đọc cart[key] là stale prop → toast "Đã thêm"
//     hiện sai khi đã max stock)
// ============================================================

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Bot, X, Send, ShoppingCart, Store, MessageCircleHeart,
  Loader2, AlertCircle, RefreshCw,
} from "lucide-react";
import { api } from "../api";
import { money } from "./UI";
import { toast } from "./Effects";
import { getBotReply } from "./ChatBot";
import FoodDetailModal from "./FoodDetailModal";

// ============================================================
// CONSTANTS
// ============================================================

const QUICK_REPLIES = [
  "Dưới 30k", "Chay", "Nước", "Cay", "Bán chạy", "Gợi ý",
];

const AI_REPLY_DELAY_MS = 600;
const POLL_MS = 3000;
const MAX_MESSAGE_LENGTH = 2000;
const SCROLL_THRESHOLD_PX = 120;

// ============================================================
// HELPERS
// ============================================================

function makeId(prefix) {
  const rand =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now()}-${rand}`;
}

function fmtTime(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

/**
 * Tính max qty cho item — món hết hàng (stock=0) không cho tăng vô hạn.
 */
function getMaxQty(item) {
  if (typeof item?.stock === "number") {
    return Math.max(1, item.stock);
  }
  return 99;
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function ChatBotWidget({ cart, setCart, user }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("ai"); // "ai" | "staff"

  // ---------- AI ----------
  const [aiMessages, setAiMessages] = useState([]);
  const [aiText, setAiText] = useState("");
  const [aiTyping, setAiTyping] = useState(false);

  // ---------- Nhà hàng ----------
  const [staffMessages, setStaffMessages] = useState([]);
  const [staffText, setStaffText] = useState("");
  const [staffSending, setStaffSending] = useState(false);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState("");

  // ---------- Chung ----------
  const [menuItems, setMenuItems] = useState([]);
  const [settings, setSettings] = useState(null);
  const [selected, setSelected] = useState(null);
  const [hasNew, setHasNew] = useState(false);

  // ---------- Refs ----------
  const staffReqIdRef = useRef(0);
  const aiTimerRef = useRef(null);
  const lastAiCountRef = useRef(0);
  const lastStaffCountRef = useRef(0);
  const aiScrollRef = useRef(null);
  const staffScrollRef = useRef(null);
  const aiBottomRef = useRef(null);
  const staffBottomRef = useRef(null);
  const lastUserIdRef = useRef(user?.id);

  // ---------- Load menu + settings ----------

  useEffect(() => {
    api.menu
      .list("", "Tất cả", "popular")
      .then((d) => setMenuItems(Array.isArray(d) ? d : []))
      .catch(() => setMenuItems([]));

    api.settings
      .get()
      .then(setSettings)
      .catch(() => setSettings(null));
  }, []);

  // ---------- Reset AI khi user đổi ----------

  useEffect(() => {
    if (lastUserIdRef.current !== user?.id) {
      lastUserIdRef.current = user?.id;
      setAiMessages([]);
      setStaffMessages([]);
      setAiText("");
      setStaffText("");
    }
  }, [user?.id]);

  // ---------- Welcome AI ----------

  useEffect(() => {
    if (!open || mode !== "ai") return;
    if (aiMessages.length > 0) return;

    setAiMessages([
      {
        id: "welcome",
        from: "bot",
        content:
          `Xin chào ${user?.name || "bạn"}! 👋\n` +
          "Mình là trợ lý Canteen AI.\n\n" +
          "Mình có thể gợi ý món theo giá, loại hoặc sở thích. " +
          'Hoặc chuyển sang tab "Nhà hàng" để chat với nhân viên thật.',
        created_at: new Date().toISOString(),
      },
    ]);
  }, [open, mode, user?.name, aiMessages.length]);

  // Cleanup AI timer
  useEffect(() => {
    return () => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    };
  }, []);

  // ---------- Load staff (race-safe) ----------

  const loadStaff = useCallback(async (silent = true) => {
    const myReqId = ++staffReqIdRef.current;

    if (!silent) {
      setStaffLoading(true);
      setStaffError("");
    }

    try {
      const data = await api.chat.myMessages();

      if (myReqId !== staffReqIdRef.current) return;

      setStaffMessages(Array.isArray(data) ? data : []);
    } catch (e) {
      if (myReqId === staffReqIdRef.current && !silent) {
        setStaffError(e.message || "Không tải được tin nhắn");
      }
    } finally {
      if (myReqId === staffReqIdRef.current) setStaffLoading(false);
    }
  }, []);

  // Polling khi mở tab staff
  useEffect(() => {
    if (!open || mode !== "staff") return;

    loadStaff(false);
    const timer = setInterval(() => loadStaff(true), POLL_MS);
    return () => clearInterval(timer);
  }, [open, mode, loadStaff]);

  // ---------- Smart scroll AI ----------

  useEffect(() => {
    if (!open || mode !== "ai") return;
    const container = aiScrollRef.current;
    if (!container) return;

    const isInitial = lastAiCountRef.current === 0;
    const grew = aiMessages.length > lastAiCountRef.current;
    const last = aiMessages[aiMessages.length - 1];
    const isOwn = last?.from === "user";

    const dist =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    const nearBottom = dist < SCROLL_THRESHOLD_PX;

    if (isInitial || isOwn || (grew && nearBottom) || aiTyping) {
      requestAnimationFrame(() => {
        aiBottomRef.current?.scrollIntoView({
          behavior: isInitial ? "auto" : "smooth",
        });
      });
    }

    lastAiCountRef.current = aiMessages.length;
  }, [open, mode, aiMessages, aiTyping]);

  // ---------- Smart scroll Staff ----------

  useEffect(() => {
    if (!open || mode !== "staff") return;
    const container = staffScrollRef.current;
    if (!container) return;

    const isInitial = lastStaffCountRef.current === 0;
    const grew = staffMessages.length > lastStaffCountRef.current;
    const last = staffMessages[staffMessages.length - 1];
    const isOwn = last?.from === "customer";

    const dist =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    const nearBottom = dist < SCROLL_THRESHOLD_PX;

    if (isInitial || isOwn || (grew && nearBottom)) {
      requestAnimationFrame(() => {
        staffBottomRef.current?.scrollIntoView({
          behavior: isInitial ? "auto" : "smooth",
        });
      });
    }

    lastStaffCountRef.current = staffMessages.length;
  }, [open, mode, staffMessages]);

  // ---------- hasNew: hiện badge khi có tin staff mới ----------

  useEffect(() => {
    if (open) {
      setHasNew(false);
      return;
    }
    // Khi widget đóng mà có tin từ staff chưa xem → hiện badge
    if (staffMessages.length > 0) {
      const last = staffMessages[staffMessages.length - 1];
      if (last?.from === "staff") setHasNew(true);
    }
  }, [open, staffMessages]);

  // ---------- ESC đóng panel + body scroll lock ----------

  useEffect(() => {
    if (!open) return;

    const handler = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);

    // Lock body scroll khi panel mở (mobile)
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  // ============================================================
  // HANDLERS
  // ============================================================

  const sendAI = (value) => {
    const val = (value || aiText).trim();
    if (!val || aiTyping) return;

    if (val.length > MAX_MESSAGE_LENGTH) {
      toast(`Tin nhắn tối đa ${MAX_MESSAGE_LENGTH} ký tự`, "error");
      return;
    }

    setAiText("");
    setAiMessages((m) => [
      ...m,
      {
        id: makeId("u"),
        from: "user",
        content: val,
        created_at: new Date().toISOString(),
      },
    ]);
    setAiTyping(true);

    // Clear timeout cũ nếu có
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);

    aiTimerRef.current = setTimeout(() => {
      aiTimerRef.current = null;
      const reply = getBotReply(val, menuItems, settings);
      setAiTyping(false);
      if (!reply) return;

      setAiMessages((m) => [
        ...m,
        {
          id: makeId("b"),
          from: "bot",
          content: reply.text,
          items: reply.items || [],
          created_at: new Date().toISOString(),
        },
      ]);
    }, AI_REPLY_DELAY_MS);
  };

  const sendStaff = async () => {
    const val = staffText.trim();
    if (!val || staffSending) return;

    if (val.length > MAX_MESSAGE_LENGTH) {
      toast(`Tin nhắn tối đa ${MAX_MESSAGE_LENGTH} ký tự`, "error");
      return;
    }

    setStaffSending(true);
    try {
      const msg = await api.chat.send({ content: val });
      setStaffText("");
      setStaffMessages((m) => [...m, msg]);
      // Poll 3s tới sẽ sync — không cần setTimeout
    } catch (e) {
      toast(e.message || "Không gửi được", "error");
    } finally {
      setStaffSending(false);
    }
  };

  /**
   * ✅ Thêm vào giỏ với flag từ trong updater.
   * Tránh bug: đọc `cart[key]` là stale prop (chưa update từ setCart
   * vừa gọi) → toast "Đã thêm" hiện sai khi đã max stock.
   */
  const quickAdd = (m) => {
    const id = m._id || m.id;
    const key = `${id}-S-`;
    const maxQty = getMaxQty(m);

    let added = false;
    let reason = "";

    setCart((c) => {
      const existing = c[key];
      const currentQty = Number(existing?.qty) || 0;

      if (currentQty >= maxQty) {
        reason = `Chỉ còn ${maxQty} phần trong kho`;
        return c;
      }

      added = true;
      const newQty = Math.min(maxQty, currentQty + 1);

      return {
        ...c,
        [key]: {
          ...m,
          name: m.name,
          price: m.price,
          qty: newQty,
          stock: m.stock ?? 99,
          _originalId: id,
        },
      };
    });

    // React 18: setState sync trước re-render trong event handler
    // → đọc flag `added` ngay sau đó
    if (added) {
      toast(`Đã thêm ${m.name} vào giỏ!`, "success");
    } else {
      toast(reason, "error");
    }
  };

  // ============================================================
  // RENDER
  // ============================================================

  const ModeIcon = mode === "ai" ? Bot : Store;

  return (
    <>
      {/* ============ NÚT FAB ============ */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Mở chat hỗ trợ"
          className="chatbot-fab"
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            width: 60,
            height: 60,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #8b5cf6, #2634d5)",
            color: "#fff",
            border: 0,
            cursor: "pointer",
            boxShadow: "0 8px 24px rgba(139, 92, 246, 0.45)",
            display: "grid",
            placeItems: "center",
            zIndex: 90,
            transition: "transform 0.2s",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.transform = "scale(1.08)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.transform = "scale(1)")
          }
        >
          <MessageCircleHeart size={26} />

          {hasNew && (
            <span
              aria-label="Có tin nhắn mới"
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                minWidth: 20,
                height: 20,
                borderRadius: "50%",
                background: "#ef4444",
                color: "#fff",
                fontSize: 11,
                fontWeight: 700,
                display: "grid",
                placeItems: "center",
                border: "2px solid #fff",
                padding: "0 5px",
                lineHeight: 1,
                transform: "translate(25%, -25%)",
              }}
            >
              1
            </span>
          )}

          <span className="chatbot-pulse" />
        </button>
      )}

      {/* ============ KHUNG CHAT ============ */}
      {open && (
        <div
          className="chatbot-panel"
          role="dialog"
          aria-modal="true"
          aria-label="Chat hỗ trợ"
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            width: 400,
            maxWidth: "calc(100vw - 32px)",
            height: 580,
            maxHeight: "calc(100vh - 100px)",
            background: "var(--card-bg, #fff)",
            borderRadius: 18,
            boxShadow: "0 24px 60px rgba(0,0,0,0.28)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            zIndex: 100,
            border: "1px solid var(--border-color, #e5e9ef)",
          }}
        >
          {/* ---------- Header ---------- */}
          <div
            style={{
              padding: "12px 14px",
              background: "linear-gradient(135deg, #8b5cf6, #2634d5)",
              color: "#fff",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.18)",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                  border: "2px solid rgba(255,255,255,0.35)",
                }}
              >
                <ModeIcon size={20} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <b
                  style={{
                    fontSize: 14,
                    display: "block",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {mode === "ai" ? "Trợ lý Canteen AI" : "Nhà hàng Canteen"}
                </b>
                <span style={{ fontSize: 11, opacity: 0.92 }}>
                  {mode === "ai"
                    ? "Gợi ý món ăn thông minh"
                    : "Nhân viên hỗ trợ trực tuyến"}
                </span>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Đóng chat"
                type="button"
                style={{
                  background: "rgba(255,255,255,0.18)",
                  border: 0,
                  color: "#fff",
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  cursor: "pointer",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Toggle AI / Nhà hàng */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 4,
                background: "rgba(255,255,255,0.15)",
                borderRadius: 10,
                padding: 4,
              }}
              role="tablist"
            >
              <button
                onClick={() => setMode("ai")}
                role="tab"
                aria-selected={mode === "ai"}
                type="button"
                style={{
                  padding: "8px 10px",
                  background: mode === "ai" ? "#fff" : "transparent",
                  color: mode === "ai" ? "#2634d5" : "#fff",
                  border: 0,
                  borderRadius: 8,
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: 12,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 5,
                  transition: "all 0.2s",
                }}
              >
                <Bot size={14} /> Trợ lý AI
              </button>
              <button
                onClick={() => setMode("staff")}
                role="tab"
                aria-selected={mode === "staff"}
                type="button"
                style={{
                  padding: "8px 10px",
                  background: mode === "staff" ? "#fff" : "transparent",
                  color: mode === "staff" ? "#2634d5" : "#fff",
                  border: 0,
                  borderRadius: 8,
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: 12,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 5,
                  transition: "all 0.2s",
                }}
              >
                <Store size={14} /> Nhà hàng
              </button>
            </div>
          </div>

          {/* ---------- NỘI DUNG ---------- */}
          {mode === "ai" ? (
            <AIContent
              messages={aiMessages}
              typing={aiTyping}
              onSend={sendAI}
              text={aiText}
              setText={setAiText}
              onQuickAdd={quickAdd}
              onView={setSelected}
              scrollRef={aiScrollRef}
              bottomRef={aiBottomRef}
            />
          ) : (
            <StaffContent
              messages={staffMessages}
              loading={staffLoading}
              error={staffError}
              onRetry={() => loadStaff(false)}
              sending={staffSending}
              onSend={sendStaff}
              text={staffText}
              setText={setStaffText}
              scrollRef={staffScrollRef}
              bottomRef={staffBottomRef}
            />
          )}
        </div>
      )}

      {/* ============ MODAL MÓN ĂN ============ */}
      {selected && (
        <FoodDetailModal
          item={selected}
          cart={cart}
          setCart={setCart}
          user={user}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}

// ============================================================
// SUB-COMPONENT: AIContent
// ============================================================

function AIContent({
  messages,
  typing,
  onSend,
  text,
  setText,
  onQuickAdd,
  onView,
  scrollRef,
  bottomRef,
}) {
  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <>
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          padding: 14,
          background: "var(--bg-tertiary, #f5f7fb)",
        }}
      >
        {messages.map((m) => {
          const isUser = m.from === "user";
          return (
            <div
              key={m.id}
              style={{
                display: "flex",
                justifyContent: isUser ? "flex-end" : "flex-start",
                gap: 8,
                marginBottom: 12,
              }}
            >
              {!isUser && (
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #8b5cf6, #2634d5)",
                    color: "#fff",
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                    alignSelf: "flex-end",
                  }}
                >
                  <Bot size={16} />
                </div>
              )}

              <div
                style={{
                  maxWidth: "78%",
                  padding: "10px 12px",
                  borderRadius: isUser
                    ? "14px 14px 4px 14px"
                    : "14px 14px 14px 4px",
                  background: isUser
                    ? "#2634d5"
                    : "var(--card-bg, #fff)",
                  color: isUser ? "#fff" : "var(--text-primary, #172033)",
                  fontSize: 13,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                }}
              >
                <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                  {m.content}
                </div>

                {/* Items gợi ý */}
                {!isUser && m.items && m.items.length > 0 && (
                  <div
                    style={{
                      marginTop: 10,
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    {m.items.map((it) => (
                      <div
                        key={it.id || it._id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: 6,
                          background: "var(--bg-tertiary, #f8fafc)",
                          borderRadius: 10,
                          border: "1px solid var(--border-color, #e5e9ef)",
                        }}
                      >
                        <img
                          src={it.image}
                          alt={it.name}
                          loading="lazy"
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 8,
                            objectFit: "cover",
                            flexShrink: 0,
                          }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: "var(--text-primary, #172033)",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {it.name}
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              color: "#18a967",
                              fontWeight: 700,
                            }}
                          >
                            {money(it.price)}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                          <button
                            onClick={() => onQuickAdd(it)}
                            title="Thêm vào giỏ"
                            aria-label={`Thêm ${it.name} vào giỏ`}
                            type="button"
                            style={{
                              background: "#2634d5",
                              color: "#fff",
                              border: 0,
                              width: 30,
                              height: 30,
                              borderRadius: 7,
                              cursor: "pointer",
                              display: "grid",
                              placeItems: "center",
                            }}
                          >
                            <ShoppingCart size={13} />
                          </button>
                          <button
                            onClick={() => onView(it)}
                            title="Xem chi tiết"
                            type="button"
                            style={{
                              background: "#f59e0b",
                              color: "#fff",
                              border: 0,
                              padding: "0 10px",
                              height: 30,
                              borderRadius: 7,
                              cursor: "pointer",
                              fontSize: 11,
                              fontWeight: 700,
                            }}
                          >
                            Xem
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div
                  style={{
                    fontSize: 10,
                    opacity: 0.65,
                    marginTop: 4,
                    textAlign: "right",
                  }}
                >
                  {fmtTime(m.created_at)}
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing */}
        {typing && (
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #8b5cf6, #2634d5)",
                color: "#fff",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
              }}
            >
              <Bot size={16} />
            </div>
            <div
              style={{
                padding: "12px 16px",
                background: "var(--card-bg, #fff)",
                borderRadius: "14px 14px 14px 4px",
                display: "flex",
                gap: 4,
                alignItems: "center",
              }}
            >
              <span className="dot-typing" />
              <span className="dot-typing" style={{ animationDelay: "0.15s" }} />
              <span className="dot-typing" style={{ animationDelay: "0.3s" }} />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Quick replies */}
      <div
        style={{
          padding: "8px 10px 0",
          display: "flex",
          gap: 6,
          overflowX: "auto",
          background: "var(--card-bg, #fff)",
          borderTop: "1px solid var(--border-color, #eef2f7)",
          scrollbarWidth: "none",
        }}
      >
        {QUICK_REPLIES.map((q) => (
          <button
            key={q}
            onClick={() => onSend(q)}
            disabled={typing}
            type="button"
            style={{
              padding: "5px 12px",
              background: "var(--bg-tertiary, #f5f7fb)",
              border: "1px solid var(--border-color, #e5e9ef)",
              borderRadius: 20,
              cursor: typing ? "not-allowed" : "pointer",
              fontSize: 11.5,
              color: "var(--text-muted, #475569)",
              whiteSpace: "nowrap",
              fontWeight: 500,
              opacity: typing ? 0.5 : 1,
              flexShrink: 0,
            }}
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <div style={{ padding: 10, display: "flex", gap: 6 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Bạn cần mình giúp gì?"
          disabled={typing}
          maxLength={MAX_MESSAGE_LENGTH}
          style={{
            flex: 1,
            padding: "10px 14px",
            border: "1px solid var(--border-color, #e5e9ef)",
            borderRadius: 24,
            outline: "none",
            background: "var(--bg-secondary, #f5f7fb)",
            color: "var(--text-primary, #172033)",
            fontSize: 13,
            minWidth: 0,
          }}
        />
        <button
          onClick={() => onSend()}
          disabled={typing || !text.trim()}
          aria-label="Gửi tin nhắn"
          type="button"
          style={{
            width: 42,
            height: 42,
            borderRadius: "50%",
            background: text.trim() ? "#2634d5" : "#94a3b8",
            color: "#fff",
            border: 0,
            cursor: text.trim() && !typing ? "pointer" : "not-allowed",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          <Send size={16} />
        </button>
      </div>
    </>
  );
}

// ============================================================
// SUB-COMPONENT: StaffContent
// ============================================================

function StaffContent({
  messages,
  loading,
  error,
  onRetry,
  sending,
  onSend,
  text,
  setText,
  scrollRef,
  bottomRef,
}) {
  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <>
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          padding: 14,
          background: "var(--bg-tertiary, #f5f7fb)",
        }}
      >
        {/* Error */}
        {error && !loading && (
          <div
            style={{
              background: "rgba(239, 68, 68, 0.08)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              borderRadius: 10,
              padding: "12px 14px",
              marginBottom: 14,
              color: "#ef4444",
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 13,
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span style={{ flex: 1 }}>{error}</span>
            <button
              onClick={onRetry}
              type="button"
              style={{
                padding: "4px 10px",
                background: "#ef4444",
                color: "#fff",
                border: 0,
                borderRadius: 6,
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 11,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <RefreshCw size={11} /> Thử lại
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div
            style={{
              textAlign: "center",
              padding: 20,
              color: "var(--text-light, #8993a3)",
              fontSize: 13,
            }}
          >
            <Loader2
              size={20}
              style={{ animation: "spin 1s linear infinite", marginBottom: 6 }}
            />
            <div>Đang tải...</div>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && messages.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: 40,
              color: "var(--text-light, #8993a3)",
              fontSize: 13,
            }}
          >
            <Store
              size={44}
              style={{ opacity: 0.3, margin: "0 auto 12px", display: "block" }}
            />
            <b
              style={{
                display: "block",
                color: "var(--text-primary, #172033)",
                fontSize: 14,
                marginBottom: 6,
              }}
            >
              Chat với nhà hàng
            </b>
            <p style={{ margin: 0 }}>
              Gửi tin nhắn đầu tiên để nhân viên Canteen hỗ trợ bạn.
            </p>
          </div>
        )}

        {/* Messages */}
        {messages.map((m) => (
          <div
            key={m.id}
            style={{
              display: "flex",
              justifyContent: m.from === "customer" ? "flex-end" : "flex-start",
              marginBottom: 10,
            }}
          >
            <div
              style={{
                maxWidth: "75%",
                padding: "10px 14px",
                borderRadius:
                  m.from === "customer"
                    ? "16px 16px 4px 16px"
                    : "16px 16px 16px 4px",
                background:
                  m.from === "customer"
                    ? "#2634d5"
                    : "var(--card-bg, #fff)",
                color:
                  m.from === "customer"
                    ? "#fff"
                    : "var(--text-primary, #172033)",
                fontSize: 13,
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
              }}
            >
              {m.from === "staff" && (
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#2634d5",
                    marginBottom: 4,
                  }}
                >
                  {m.from_name || "Nhân viên"}
                </div>
              )}
              <div style={{ wordBreak: "break-word", whiteSpace: "pre-wrap" }}>
                {m.content}
              </div>
              <div
                style={{
                  fontSize: 10,
                  opacity: 0.7,
                  marginTop: 4,
                  textAlign: "right",
                }}
              >
                {fmtTime(m.created_at)}
              </div>
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: 10, display: "flex", gap: 6 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Gửi tin cho nhà hàng..."
          disabled={sending}
          maxLength={MAX_MESSAGE_LENGTH}
          style={{
            flex: 1,
            padding: "10px 14px",
            border: "1px solid var(--border-color, #e5e9ef)",
            borderRadius: 24,
            outline: "none",
            background: "var(--bg-secondary, #f5f7fb)",
            color: "var(--text-primary, #172033)",
            fontSize: 13,
            minWidth: 0,
          }}
        />
        <button
          onClick={onSend}
          disabled={sending || !text.trim()}
          aria-label="Gửi tin nhắn"
          type="button"
          style={{
            width: 42,
            height: 42,
            borderRadius: "50%",
            background: text.trim() ? "#2634d5" : "#94a3b8",
            color: "#fff",
            border: 0,
            cursor: text.trim() && !sending ? "pointer" : "not-allowed",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          {sending ? (
            <Loader2
              size={16}
              style={{ animation: "spin 1s linear infinite" }}
            />
          ) : (
            <Send size={16} />
          )}
        </button>
      </div>
    </>
  );
}