// ============================================================
// CUSTOMERCHAT.JSX — Chat khách hàng
// ============================================================
// 2 tabs:
//   1. AI  — Trợ lý gợi ý món (local, không cần server)
//   2. Staff — Chat với nhân viên (polling 3s)
//
// Fixes (so với bản gốc):
//   - Race-safe: reqIdRef cho loadStaff
//   - Bỏ setTimeout(500) hack trong sendStaff
//   - AI typing: cleanup timeout khi unmount
//   - Smart scroll: chỉ scroll khi ở gần đáy hoặc tin của mình
//   - BotAvatar: dùng state thay vì DOM manipulation
//   - Error state cho staff chat
//   - onKeyDown thay onKeyPress (deprecated)
//   - Validate max length (2000)
//   - Bỏ import thừa (Sparkles)
//   - AI message id: dùng crypto.randomUUID() để tránh trùng
// ============================================================

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Send, RefreshCw, Bot, Store, ShoppingCart,
  Loader2, AlertCircle,
} from "lucide-react";
import { api } from "../../api";
import { money } from "../../components/UI";
import { toast } from "../../components/Effects";
import { getBotReply } from "../../components/ChatBot";
import FoodDetailModal from "../../components/FoodDetailModal";

// ============================================================
// CONSTANTS
// ============================================================

const BOT_AVATAR = "/bot-avatar.svg";
const QUICK_REPLIES = ["Dưới 30k", "Chay", "Nước", "Cay", "Bán chạy", "Gợi ý"];

const POLL_MS = 3000;
const AI_REPLY_DELAY_MS = 600;
const MAX_MESSAGE_LENGTH = 2000;
const SCROLL_THRESHOLD_PX = 120;

// ============================================================
// HELPERS
// ============================================================

/** Tạo id duy nhất cho tin nhắn AI (local). */
function makeId(prefix) {
  const rand =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now()}-${rand}`;
}

/** Format giờ:phút từ ISO. */
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

// ============================================================
// SUB-COMPONENT: BotAvatar
// ============================================================

function BotAvatar({ size = 32 }) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #8b5cf6, #2634d5)",
          color: "#fff",
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
          alignSelf: "flex-end",
        }}
      >
        <Bot size={size * 0.5} />
      </div>
    );
  }

  return (
    <img
      src={BOT_AVATAR}
      alt="Bot"
      onError={() => setError(true)}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        objectFit: "cover",
        flexShrink: 0,
        alignSelf: "flex-end",
        border: "2px solid #c7d2fe",
        backgroundColor: "#fff",
      }}
    />
  );
}

// ============================================================
// SUB-COMPONENT: TabButton
// ============================================================

function TabButton({ active, onClick, icon, title, subtitle, color }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: "14px 16px",
        background: active ? "var(--bg-tertiary, #f5f7fb)" : "transparent",
        border: 0,
        borderBottom: active
          ? "3px solid " + color
          : "3px solid transparent",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 10,
        textAlign: "left",
        transition: "all 0.2s",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: active ? color : color + "20",
          color: active ? "#fff" : color,
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
            fontSize: 13,
            fontWeight: 700,
            color: active
              ? "var(--text-primary, #172033)"
              : "var(--text-muted, #475569)",
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 11,
            color: "var(--text-light, #8993a3)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {subtitle}
        </div>
      </div>
    </button>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function CustomerChat({ cart, setCart, user }) {
  // ---------- Tabs ----------
  const [tab, setTab] = useState("ai");

  // ---------- Staff chat ----------
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [staffError, setStaffError] = useState("");

  // ---------- AI chat ----------
  const [aiMessages, setAiMessages] = useState([]);
  const [aiText, setAiText] = useState("");
  const [aiTyping, setAiTyping] = useState(false);

  // ---------- Chung ----------
  const [menuItems, setMenuItems] = useState([]);
  const [selected, setSelected] = useState(null);

  // ---------- Refs ----------
  const aiScrollRef = useRef(null);
  const aiBottomRef = useRef(null);
  const staffScrollRef = useRef(null);
  const staffBottomRef = useRef(null);

  const staffReqIdRef = useRef(0);
  const lastAiCountRef = useRef(0);
  const lastStaffCountRef = useRef(0);
  const aiTimerRef = useRef(null);

  // ---------- Load menu (1 lần) ----------

  useEffect(() => {
    api.menu
      .list("", "Tất cả", "popular")
      .then((d) => setMenuItems(Array.isArray(d) ? d : []))
      .catch(() => setMenuItems([]));
  }, []);

  // Cleanup AI timeout khi unmount
  useEffect(() => {
    return () => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    };
  }, []);

  // ---------- Load staff messages (race-safe) ----------

  const loadStaff = useCallback(async (silent = false) => {
    const myReqId = ++staffReqIdRef.current;

    if (!silent) setLoading(true);
    if (!silent) setStaffError("");

    try {
      const data = await api.chat.myMessages();
      if (myReqId !== staffReqIdRef.current) return;
      setMessages(Array.isArray(data) ? data : []);
    } catch (e) {
      if (myReqId === staffReqIdRef.current && !silent) {
        setStaffError(e.message || "Không tải được tin nhắn");
      }
    } finally {
      if (myReqId === staffReqIdRef.current) setLoading(false);
    }
  }, []);

  // Load khi tab = staff + polling
  useEffect(() => {
    if (tab !== "staff") return;

    loadStaff(false);
    const timer = setInterval(() => loadStaff(true), POLL_MS);
    return () => clearInterval(timer);
  }, [tab, loadStaff]);

  // ---------- Smart scroll: AI ----------

  useEffect(() => {
    if (tab !== "ai") return;
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
  }, [tab, aiMessages, aiTyping]);

  // ---------- Smart scroll: Staff ----------

  useEffect(() => {
    if (tab !== "staff") return;
    const container = staffScrollRef.current;
    if (!container) return;

    const isInitial = lastStaffCountRef.current === 0;
    const grew = messages.length > lastStaffCountRef.current;
    const last = messages[messages.length - 1];
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

    lastStaffCountRef.current = messages.length;
  }, [tab, messages]);

  // ---------- Send staff ----------

  const sendStaff = async () => {
    const val = text.trim();
    if (!val || sending) return;

    if (val.length > MAX_MESSAGE_LENGTH) {
      toast(`Tin nhắn tối đa ${MAX_MESSAGE_LENGTH} ký tự`, "error");
      return;
    }

    setSending(true);
    try {
      const msg = await api.chat.send({ content: val });
      setText("");
      // Append local — poll 3s tới sẽ sync với server
      setMessages((m) => [...m, msg]);
    } catch (e) {
      toast(e.message || "Không gửi được", "error");
    } finally {
      setSending(false);
    }
  };

  // ---------- Send AI (local bot) ----------

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

    // Clear timeout cũ nếu có (tránh stack khi user gửi liên tục)
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);

    aiTimerRef.current = setTimeout(() => {
      aiTimerRef.current = null;
      const reply = getBotReply(val, menuItems);
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

  // ---------- Quick add to cart ----------

  const quickAdd = (m) => {
    const id = m._id || m.id;
    const key = `${id}-S-`;

    setCart((c) => {
      const existing = c[key];
      const maxStock = typeof m.stock === "number" ? Math.max(1, m.stock) : 99;
      const newQty = Math.min(
        maxStock,
        (existing?.qty || 0) + 1
      );

      if (existing && existing.qty >= maxStock) {
        // Không tăng được — toast ngoài (tránh trong updater)
        return c;
      }

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

    // Check max stock ngoài updater
    const existing = cart[key];
    const maxStock = typeof m.stock === "number" ? Math.max(1, m.stock) : 99;
    if (existing && existing.qty >= maxStock) {
      toast(`Chỉ còn ${maxStock} phần trong kho`, "error");
      return;
    }

    toast("Đã thêm " + m.name + " vào giỏ!", "success");
  };

  // ---------- Key handlers ----------

  const onAiKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendAI();
    }
  };

  const onStaffKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendStaff();
    }
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div
      style={{
        background: "var(--card-bg, #fff)",
        border: "1px solid var(--border-color, #e7ebf0)",
        borderRadius: 12,
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 180px)",
        minHeight: 520,
        overflow: "hidden",
      }}
    >
      {/* ============ TABS ============ */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid var(--border-color, #eef2f7)",
          background: "var(--card-bg, #fff)",
        }}
      >
        <TabButton
          active={tab === "ai"}
          onClick={() => setTab("ai")}
          icon={<Bot size={16} />}
          title="Trợ lý AI"
          subtitle="Gợi ý món ăn"
          color="#8b5cf6"
        />
        <TabButton
          active={tab === "staff"}
          onClick={() => setTab("staff")}
          icon={<Store size={16} />}
          title="Nhà hàng"
          subtitle="Nhân viên hỗ trợ"
          color="#2634d5"
        />
      </div>

      {/* ============================================================
          TAB AI
          ============================================================ */}
      {tab === "ai" && (
        <>
          <div
            ref={aiScrollRef}
            style={{
              flex: 1,
              overflowY: "auto",
              overflowX: "hidden",
              padding: 16,
              background: "var(--bg-tertiary, #f5f7fb)",
            }}
          >
            {/* Greeting */}
            {aiMessages.length === 0 && (
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                <BotAvatar />
                <div
                  style={{
                    maxWidth: "80%",
                    padding: "12px 14px",
                    borderRadius: "16px 16px 16px 4px",
                    background: "#eef2ff",
                    color: "#172033",
                    fontSize: 13,
                    border: "1px solid #c7d2fe",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      color: "#2634d5",
                      marginBottom: 6,
                    }}
                  >
                    🤖 Trợ lý Canteen
                  </div>
                  <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                    Xin chào {user?.name || "bạn"}! Mình có thể gợi ý món theo
                    giá, loại hoặc sở thích.
                    {"\n\n"}
                    Bạn thử hỏi: "dưới 30k", "chay", "nước", "cay", "bán chạy".
                  </div>
                </div>
              </div>
            )}

            {/* AI messages */}
            {aiMessages.map((m) => {
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
                  {!isUser && <BotAvatar />}
                  <div
                    style={{
                      maxWidth: "75%",
                      padding: "10px 14px",
                      borderRadius: isUser
                        ? "16px 16px 4px 16px"
                        : "16px 16px 16px 4px",
                      background: isUser ? "#2634d5" : "#eef2ff",
                      color: isUser ? "#fff" : "#172033",
                      fontSize: 13,
                      border: isUser ? "none" : "1px solid #c7d2fe",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                    }}
                  >
                    {!isUser && (
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#2634d5",
                          marginBottom: 4,
                        }}
                      >
                        🤖 Trợ lý
                      </div>
                    )}
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
                              background: "#fff",
                              borderRadius: 10,
                              border: "1px solid #c7d2fe",
                            }}
                          >
                            <img
                              src={it.image}
                              alt={it.name}
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
                                  color: "#172033",
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
                            <div
                              style={{
                                display: "flex",
                                gap: 4,
                                flexShrink: 0,
                              }}
                            >
                              <button
                                onClick={() => quickAdd(it)}
                                aria-label={`Thêm ${it.name} vào giỏ`}
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
                                onClick={() => setSelected(it)}
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
                        opacity: 0.7,
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

            {/* Typing indicator */}
            {aiTyping && (
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <BotAvatar />
                <div
                  style={{
                    padding: "12px 16px",
                    background: "#eef2ff",
                    borderRadius: "16px 16px 16px 4px",
                    display: "flex",
                    gap: 4,
                    alignItems: "center",
                    border: "1px solid #c7d2fe",
                  }}
                >
                  <span className="dot-typing" />
                  <span
                    className="dot-typing"
                    style={{ animationDelay: "0.15s" }}
                  />
                  <span
                    className="dot-typing"
                    style={{ animationDelay: "0.3s" }}
                  />
                </div>
              </div>
            )}

            <div ref={aiBottomRef} />
          </div>

          {/* Quick replies */}
          <div
            style={{
              padding: "10px 12px 0",
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
                onClick={() => sendAI(q)}
                disabled={aiTyping}
                style={{
                  padding: "6px 12px",
                  background: "var(--bg-tertiary, #f5f7fb)",
                  border: "1px solid var(--border-color, #e5e9ef)",
                  borderRadius: 20,
                  cursor: aiTyping ? "not-allowed" : "pointer",
                  fontSize: 12,
                  color: "var(--text-muted, #475569)",
                  whiteSpace: "nowrap",
                  fontWeight: 500,
                  opacity: aiTyping ? 0.5 : 1,
                  flexShrink: 0,
                }}
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input */}
          <div style={{ padding: 12, display: "flex", gap: 8 }}>
            <input
              value={aiText}
              onChange={(e) => setAiText(e.target.value)}
              onKeyDown={onAiKey}
              placeholder="Hỏi trợ lý AI..."
              disabled={aiTyping}
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
              onClick={() => sendAI()}
              disabled={aiTyping || !aiText.trim()}
              aria-label="Gửi tin nhắn"
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: aiText.trim() ? "#8b5cf6" : "#94a3b8",
                color: "#fff",
                border: 0,
                cursor:
                  aiText.trim() && !aiTyping ? "pointer" : "not-allowed",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
              }}
            >
              <Send size={18} />
            </button>
          </div>
        </>
      )}

      {/* ============================================================
          TAB STAFF
          ============================================================ */}
      {tab === "staff" && (
        <>
          <div
            ref={staffScrollRef}
            style={{
              flex: 1,
              overflowY: "auto",
              overflowX: "hidden",
              padding: 16,
              background: "var(--bg-tertiary, #f5f7fb)",
            }}
          >
            {/* Error */}
            {staffError && !loading && (
              <div
                style={{
                  background: "rgba(239, 68, 68, 0.08)",
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                  borderRadius: 10,
                  padding: "12px 16px",
                  marginBottom: 14,
                  color: "#ef4444",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 13,
                }}
              >
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{staffError}</span>
                <button
                  onClick={() => loadStaff(false)}
                  style={{
                    padding: "6px 12px",
                    background: "#ef4444",
                    color: "#fff",
                    border: 0,
                    borderRadius: 6,
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: 12,
                  }}
                >
                  Thử lại
                </button>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div
                style={{
                  textAlign: "center",
                  padding: 30,
                  color: "var(--text-light, #8993a3)",
                  fontSize: 13,
                }}
              >
                <Loader2
                  size={22}
                  style={{
                    animation: "spin 1s linear infinite",
                    marginBottom: 8,
                  }}
                />
                <div>Đang tải tin nhắn...</div>
              </div>
            )}

            {/* Empty */}
            {!loading && !staffError && messages.length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  padding: 60,
                  color: "var(--text-light, #8993a3)",
                  fontSize: 13,
                }}
              >
                <Store
                  size={48}
                  style={{
                    opacity: 0.3,
                    margin: "0 auto 12px",
                    display: "block",
                  }}
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
            {messages.map((m) => {
              const isOwn = m.from === "customer";
              return (
                <div
                  key={m.id}
                  style={{
                    display: "flex",
                    justifyContent: isOwn ? "flex-end" : "flex-start",
                    marginBottom: 10,
                  }}
                >
                  <div
                    style={{
                      maxWidth: "70%",
                      padding: "10px 14px",
                      borderRadius: isOwn
                        ? "16px 16px 4px 16px"
                        : "16px 16px 16px 4px",
                      background: isOwn
                        ? "#2634d5"
                        : "var(--card-bg, #fff)",
                      color: isOwn
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
                    <div
                      style={{
                        wordBreak: "break-word",
                        whiteSpace: "pre-wrap",
                      }}
                    >
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
              );
            })}

            <div ref={staffBottomRef} />
          </div>

          {/* Input */}
          <div
            style={{
              padding: 12,
              borderTop: "1px solid var(--border-color, #eef2f7)",
              display: "flex",
              gap: 8,
            }}
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onStaffKey}
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
              onClick={sendStaff}
              disabled={sending || !text.trim()}
              aria-label="Gửi tin nhắn"
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: text.trim() ? "#2634d5" : "#94a3b8",
                color: "#fff",
                border: 0,
                cursor:
                  text.trim() && !sending ? "pointer" : "not-allowed",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
              }}
            >
              {sending ? (
                <Loader2
                  size={18}
                  style={{ animation: "spin 1s linear infinite" }}
                />
              ) : (
                <Send size={18} />
              )}
            </button>
          </div>
        </>
      )}

      {/* ============ FOOD DETAIL MODAL ============ */}
      {selected && (
        <FoodDetailModal
          item={selected}
          cart={cart}
          setCart={setCart}
          user={user}
          onClose={() => setSelected(null)}
        />
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}