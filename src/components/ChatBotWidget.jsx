// ============================================================
// CHATBOTWIDGET.JSX — Widget chat nổi (góc phải dưới)
// ============================================================

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  Bot, X, Send, ShoppingCart, Store, MessageCircleHeart,
  Loader2, AlertCircle, RefreshCw,
} from "lucide-react";
import { api } from "../api";
import { money } from "./UI";
import { toast } from "./Effects";
import { getBotReply } from "./ChatBot";
import { useTranslation } from "../i18n";
import FoodDetailModal from "./FoodDetailModal";

// ============================================================
// CONSTANTS
// ============================================================

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

function getMaxQty(item) {
  if (typeof item?.stock === "number") return Math.max(1, item.stock);
  return 99;
}

// ============================================================
// MAIN
// ============================================================

export default function ChatBotWidget({ cart, setCart, user }) {
  const { t, lang } = useTranslation();

  const QUICK_REPLIES = useMemo(
    () => [
      t("chat.quick.under30"),
      t("chat.quick.veg"),
      t("chat.quick.drinks"),
      t("chat.quick.spicy"),
      t("chat.quick.bestSeller"),
      t("chat.quick.suggest"),
    ],
    [t, lang]
  );

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("ai");

  const [aiMessages, setAiMessages] = useState([]);
  const [aiText, setAiText] = useState("");
  const [aiTyping, setAiTyping] = useState(false);

  const [staffMessages, setStaffMessages] = useState([]);
  const [staffText, setStaffText] = useState("");
  const [staffSending, setStaffSending] = useState(false);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState("");

  const [menuItems, setMenuItems] = useState([]);
  const [settings, setSettings] = useState(null);
  const [selected, setSelected] = useState(null);
  const [hasNew, setHasNew] = useState(false);

  const staffReqIdRef = useRef(0);
  const aiTimerRef = useRef(null);
  const lastAiCountRef = useRef(0);
  const lastStaffCountRef = useRef(0);
  const aiScrollRef = useRef(null);
  const staffScrollRef = useRef(null);
  const aiBottomRef = useRef(null);
  const staffBottomRef = useRef(null);
  const lastUserIdRef = useRef(user?.id);

  // Load menu + settings
  useEffect(() => {
    let cancelled = false;

    api.menu
      .list("", "Tất cả", "popular")
      .then((d) => {
        if (cancelled) return;
        const list = Array.isArray(d) ? d : [];
        setMenuItems(list.filter((m) => m.active));
      })
      .catch(() => !cancelled && setMenuItems([]));

    api.settings
      .get()
      .then((d) => !cancelled && setSettings(d))
      .catch(() => !cancelled && setSettings(null));

    return () => {
      cancelled = true;
    };
  }, []);

  // Reset khi đổi user
  useEffect(() => {
    if (lastUserIdRef.current !== user?.id) {
      lastUserIdRef.current = user?.id;
      setAiMessages([]);
      setStaffMessages([]);
      setAiText("");
      setStaffText("");
    }
  }, [user?.id]);

  // Welcome AI — dịch theo ngôn ngữ hiện tại
  useEffect(() => {
    if (!open || mode !== "ai") return;
    if (aiMessages.length > 0) return;

    setAiMessages([
      {
        id: "welcome",
        from: "bot",
        content: t("chat.welcomeMessage").replace(
          "{name}",
          user?.name || t("account.you")
        ),
        created_at: new Date().toISOString(),
      },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, user?.name, t, lang]);

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    };
  }, []);

  // Load staff
  const loadStaff = useCallback(
    async (silent = true) => {
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
          setStaffError(e.message || t("chat.loadError"));
        }
      } finally {
        if (myReqId === staffReqIdRef.current) setStaffLoading(false);
      }
    },
    [t]
  );

  useEffect(() => {
    if (!open || mode !== "staff") return;
    loadStaff(false);
    const timer = setInterval(() => loadStaff(true), POLL_MS);
    return () => clearInterval(timer);
  }, [open, mode, loadStaff]);

  // Smart scroll AI
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

  // Smart scroll Staff
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

  // hasNew
  useEffect(() => {
    if (open) {
      setHasNew(false);
      return;
    }
    if (staffMessages.length > 0) {
      const last = staffMessages[staffMessages.length - 1];
      if (last?.from === "staff") setHasNew(true);
    }
  }, [open, staffMessages]);

  // ESC + body lock
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  // Handlers
  const sendAI = (value) => {
    const val = (value || aiText).trim();
    if (!val || aiTyping) return;

    if (val.length > MAX_MESSAGE_LENGTH) {
      toast(t("chat.maxLength").replace("{n}", MAX_MESSAGE_LENGTH), "error");
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

    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);

    aiTimerRef.current = setTimeout(() => {
      aiTimerRef.current = null;
      const reply = getBotReply(val, menuItems, settings, t);
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
      toast(t("chat.maxLength").replace("{n}", MAX_MESSAGE_LENGTH), "error");
      return;
    }

    setStaffSending(true);
    try {
      const msg = await api.chat.send({ content: val });
      setStaffText("");
      setStaffMessages((m) => [...m, msg]);
    } catch (e) {
      toast(e.message || t("chat.sendError"), "error");
    } finally {
      setStaffSending(false);
    }
  };

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
        reason = t("chat.stockLeft").replace("{n}", maxQty);
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

    if (added) {
      toast(t("chat.addedToCart").replace("{name}", m.name), "success");
    } else if (reason) {
      toast(reason, "error");
    }
  };

  const ModeIcon = mode === "ai" ? Bot : Store;

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label={t("chat.openLabel")}
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
            zIndex: 45,
            transition: "transform 0.2s",
          }}
        >
          <MessageCircleHeart size={26} />
          {hasNew && (
            <span
              aria-label={t("chat.hasNew")}
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

      {open && (
        <div
          className="chatbot-panel"
          role="dialog"
          aria-modal="true"
          aria-label={t("chat.title")}
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
                  {mode === "ai" ? t("chat.botTitle") : t("chat.staffTitleTop")}
                </b>
                <span style={{ fontSize: 11, opacity: 0.92 }}>
                  {mode === "ai" ? t("chat.botSubtitle") : t("chat.staffSubtitleTop")}
                </span>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label={t("chat.closeLabel")}
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
                }}
              >
                <Bot size={14} /> {t("chat.tab.ai")}
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
                }}
              >
                <Store size={14} /> {t("chat.tab.staff")}
              </button>
            </div>
          </div>

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
              quickReplies={QUICK_REPLIES}
              t={t}
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
              t={t}
            />
          )}
        </div>
      )}

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
// SUB: AIContent
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
  quickReplies,
  t,
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
                  background: isUser ? "#2634d5" : "var(--card-bg, #fff)",
                  color: isUser ? "#fff" : "var(--text-primary, #172033)",
                  fontSize: 13,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                }}
              >
                <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                  {m.content}
                </div>

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
                            title={t("chat.addToCart")}
                            aria-label={`${t("chat.addToCart")} ${it.name}`}
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
                            title={t("common.view")}
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
                            {t("common.view")}
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
        {quickReplies.map((q) => (
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

      <div style={{ padding: 10, display: "flex", gap: 6 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder={t("chat.aiPlaceholder")}
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
          aria-label={t("chat.send")}
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
// SUB: StaffContent
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
  t,
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
              <RefreshCw size={11} /> {t("common.retry")}
            </button>
          </div>
        )}

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
            <div>{t("common.loading")}</div>
          </div>
        )}

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
              {t("chat.staffTitle")}
            </b>
            <p style={{ margin: 0 }}>{t("chat.staffDesc")}</p>
          </div>
        )}

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
                  {m.from_name || t("chat.staffName")}
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

      <div style={{ padding: 10, display: "flex", gap: 6 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder={t("chat.staffPlaceholder")}
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
          aria-label={t("chat.send")}
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