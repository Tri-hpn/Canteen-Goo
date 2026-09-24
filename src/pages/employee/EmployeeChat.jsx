// ============================================================
// EMPLOYEECHAT.JSX — Chat nhân viên ↔ khách hàng
// ============================================================
// Layout 2 cột:
//   - Cột trái: danh sách conversations (user_id, last msg, unread)
//   - Cột phải: khung chat với tin nhắn + input
//
// Auto-polling:
//   - Conversation list: 3s
//   - Messages (nếu đang mở): 3s
//
// Fixes:
//   - Race-safe: dùng reqId ref để bỏ qua response cũ khi user
//     đổi conversation nhanh
//   - Smart scroll: chỉ tự scroll xuống đáy khi:
//       + User đang ở gần đáy (không đọc tin cũ)
//       + HOẶC vừa gửi tin mới
//   - ✅ FIX CRITICAL: đổi <aside> → <div className="chat-conv-panel">
//     (trước bị CSS base `aside { position: fixed; width: 250px }`
//     đè → che sidebar chính, layout vỡ)
//   - ✅ FIX: <section> → <div className="chat-main-panel">
//   - ✅ Căn lại grid (320px cố định) + height calc cho topbar 72px
// ============================================================

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Send, MessageCircle, RefreshCw, Loader2, AlertCircle,
  Search, X,
} from "lucide-react";
import { api } from "../../api";
import { toast } from "../../components/Effects";

// ============================================================
// CONSTANTS
// ============================================================

const POLL_INTERVAL_MS = 3000;
const SCROLL_THRESHOLD_PX = 120;
const MAX_MESSAGE_LENGTH = 2000;

const AVATAR_GRADIENT =
  "linear-gradient(135deg, var(--sky-400, #38BDF8), var(--sky-600, #0284C7))";

// ============================================================
// HELPERS
// ============================================================

function formatTime(iso) {
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

function getInitials(name) {
  return (name || "?").slice(0, 2).toUpperCase();
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function EmployeeChat() {
  // ---------- Conversations ----------
  const [conversations, setConversations] = useState([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [convsError, setConvsError] = useState("");

  // ---------- Selected + messages ----------
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  // ---------- Input ----------
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  // ---------- Search ----------
  const [search, setSearch] = useState("");

  // ---------- Refs ----------
  const bottomRef = useRef(null);
  const messagesEndRef = useRef(null);
  const selectedRef = useRef(null);
  const msgsReqIdRef = useRef(0);

  // Sync selectedRef để interval luôn có giá trị mới
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  // ---------- Load conversations ----------

  const loadConvs = useCallback(async (silent = false) => {
    try {
      const data = await api.chat.conversations();
      setConversations(Array.isArray(data) ? data : []);
      if (!silent) setConvsError("");
    } catch (e) {
      if (!silent) setConvsError(e.message || "Không tải được tin nhắn");
    } finally {
      if (!silent) setLoadingConvs(false);
    }
  }, []);

  // ---------- Load messages ----------

  const loadMessages = useCallback(async (userId, silent = false) => {
    if (!userId) return;

    const myReqId = ++msgsReqIdRef.current;
    if (!silent) setLoadingMsgs(true);

    try {
      const data = await api.chat.messagesWith(userId);

      if (myReqId !== msgsReqIdRef.current) return;
      if (String(selectedRef.current?.user_id) !== String(userId)) return;

      setMessages(Array.isArray(data) ? data : []);
    } catch (e) {
      if (!silent && myReqId === msgsReqIdRef.current) {
        toast(e.message || "Không tải được tin nhắn", "error");
      }
    } finally {
      if (myReqId === msgsReqIdRef.current) setLoadingMsgs(false);
    }
  }, []);

  // ---------- Load lần đầu ----------

  useEffect(() => {
    loadConvs(false);
  }, [loadConvs]);

  // ---------- Polling 3s ----------

  useEffect(() => {
    const timer = setInterval(() => {
      loadConvs(true);
      if (selectedRef.current) {
        loadMessages(selectedRef.current.user_id, true);
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [loadConvs, loadMessages]);

  // ---------- Select conversation ----------

  const openConv = useCallback(
    async (c) => {
      setSelected(c);
      setMessages([]);
      await loadMessages(c.user_id, false);

      setConversations((list) =>
        list.map((x) =>
          x.user_id === c.user_id ? { ...x, unread: 0 } : x
        )
      );
    },
    [loadMessages]
  );

  // ---------- Auto scroll (smart) ----------

  const lastMsgCountRef = useRef(0);
  useEffect(() => {
    const container = messagesEndRef.current;
    if (!container) return;

    const isInitial = lastMsgCountRef.current === 0;
    const grew = messages.length > lastMsgCountRef.current;
    const lastMsg = messages[messages.length - 1];
    const isOwnMessage = lastMsg?.from === "staff";

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    const isNearBottom = distanceFromBottom < SCROLL_THRESHOLD_PX;

    if (isInitial || isOwnMessage || (grew && isNearBottom)) {
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({
          behavior: isInitial ? "auto" : "smooth",
        });
      });
    }

    lastMsgCountRef.current = messages.length;
  }, [messages]);

  // ---------- Send ----------

  const send = async () => {
    const val = text.trim();
    if (!val || !selected || sending) return;
    if (val.length > MAX_MESSAGE_LENGTH) {
      return toast(`Tin nhắn tối đa ${MAX_MESSAGE_LENGTH} ký tự`, "error");
    }

    setSending(true);
    const tempId = "tmp-" + Date.now();

    const tempMsg = {
      id: tempId,
      from: "staff",
      from_name: "Bạn",
      content: val,
      created_at: new Date().toISOString(),
      _pending: true,
    };
    setMessages((m) => [...m, tempMsg]);
    setText("");

    try {
      const msg = await api.chat.send({
        content: val,
        toUserId: selected.user_id,
      });

      setMessages((m) =>
        m.map((x) => (x.id === tempId ? msg : x))
      );

      loadMessages(selected.user_id, true);
    } catch (e) {
      setMessages((m) => m.filter((x) => x.id !== tempId));
      toast(e.message || "Không gửi được", "error");
    } finally {
      setSending(false);
    }
  };

  const onKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  // ---------- Computed ----------

  const filteredConversations = search.trim()
    ? conversations.filter((c) =>
        (c.user_name || "")
          .toLowerCase()
          .includes(search.toLowerCase().trim())
      )
    : conversations;

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div
      className="chat-layout"
      style={{
        display: "grid",
        gridTemplateColumns: "320px minmax(0, 1fr)",
        gap: 20,
        height: "calc(100vh - 220px)",
        minHeight: 520,
        maxHeight: "calc(100vh - 180px)",
      }}
    >
      {/* ============================================================
          CỘT TRÁI — DANH SÁCH CONVERSATIONS
          ⚠️ Đổi từ <aside> → <div> để không bị CSS base
             `aside { position: fixed; width: 250px }` đè
          ============================================================ */}
      <div className="chat-conv-panel" style={panelStyle}>
        {/* Header */}
        <div style={panelHeaderStyle}>
          <b style={{ color: "var(--text-primary, #172033)", fontSize: 14 }}>
            Tin nhắn khách hàng
          </b>
          <button
            onClick={() => loadConvs(false)}
            title="Làm mới"
            aria-label="Làm mới danh sách"
            style={iconBtnStyle}
          >
            <RefreshCw
              size={14}
              style={{
                animation: loadingConvs
                  ? "spin 1s linear infinite"
                  : "none",
              }}
            />
          </button>
        </div>

        {/* Search */}
        {conversations.length > 0 && (
          <div
            style={{
              padding: "10px 12px",
              borderBottom: "1px solid var(--border-color, #eef2f7)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "var(--bg-tertiary, #f5f7fb)",
                borderRadius: 8,
                padding: "6px 10px",
              }}
            >
              <Search size={14} style={{ color: "var(--text-light, #8993a3)" }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm khách hàng..."
                style={{
                  flex: 1,
                  border: 0,
                  outline: "none",
                  background: "transparent",
                  color: "var(--text-primary, #172033)",
                  fontSize: 12,
                  minWidth: 0,
                }}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  style={clearBtnStyle}
                  aria-label="Xoá tìm kiếm"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* List */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loadingConvs ? (
            <div style={centeredBoxStyle}>
              <Loader2
                size={22}
                style={{ animation: "spin 1s linear infinite", marginBottom: 8 }}
              />
              <div style={{ fontSize: 12 }}>Đang tải...</div>
            </div>
          ) : convsError ? (
            <div style={centeredBoxStyle}>
              <AlertCircle size={22} style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 12, marginBottom: 10 }}>
                {convsError}
              </div>
              <button
                onClick={() => loadConvs(false)}
                style={smallBtnStyle}
              >
                Thử lại
              </button>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div style={centeredBoxStyle}>
              <MessageCircle size={36} style={{ opacity: 0.3, marginBottom: 8 }} />
              <div style={{ fontSize: 13 }}>
                {search
                  ? `Không tìm thấy "${search}"`
                  : "Chưa có tin nhắn nào"}
              </div>
            </div>
          ) : (
            filteredConversations.map((c) => {
              const isSelected =
                String(selected?.user_id) === String(c.user_id);
              return (
                <button
                  key={c.user_id}
                  onClick={() => openConv(c)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: 14,
                    width: "100%",
                    textAlign: "left",
                    border: 0,
                    borderBottom: "1px solid var(--border-color, #f5f7fb)",
                    background: isSelected
                      ? "var(--bg-tertiary, #eef2ff)"
                      : "transparent",
                    cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                >
                  {/* Avatar */}
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: AVATAR_GRADIENT,
                      color: "#fff",
                      display: "grid",
                      placeItems: "center",
                      fontWeight: 700,
                      fontSize: 12,
                      flexShrink: 0,
                    }}
                  >
                    {getInitials(c.user_name)}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <b
                        style={{
                          fontSize: 13,
                          color: "var(--text-primary, #172033)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          minWidth: 0,
                          flex: 1,
                        }}
                      >
                        {c.user_name || "Khách"}
                      </b>
                      {c.unread > 0 && (
                        <span
                          style={{
                            background: "#ef4444",
                            color: "#fff",
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "2px 7px",
                            borderRadius: 10,
                            flexShrink: 0,
                          }}
                        >
                          {c.unread > 99 ? "99+" : c.unread}
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-light, #8993a3)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        marginTop: 2,
                      }}
                    >
                      {c.last_message || "Chưa có tin nhắn"}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ============================================================
          CỘT PHẢI — KHUNG CHAT
          ⚠️ Đổi từ <section> → <div> để an toàn với CSS base
          ============================================================ */}
      <div className="chat-main-panel" style={panelStyle}>
        {!selected ? (
          <div
            style={{
              flex: 1,
              display: "grid",
              placeItems: "center",
              textAlign: "center",
              color: "var(--text-light, #8993a3)",
              padding: 20,
            }}
          >
            <div>
              <MessageCircle
                size={60}
                style={{ opacity: 0.3, marginBottom: 12 }}
              />
              <p style={{ margin: 0, fontSize: 14 }}>
                Chọn 1 cuộc trò chuyện để bắt đầu
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* ---------- Header ---------- */}
            <div style={panelHeaderStyle}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: AVATAR_GRADIENT,
                    color: "#fff",
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 700,
                    fontSize: 12,
                    flexShrink: 0,
                  }}
                >
                  {getInitials(selected.user_name)}
                </div>
                <div>
                  <b
                    style={{
                      color: "var(--text-primary, #172033)",
                      display: "block",
                      fontSize: 14,
                    }}
                  >
                    {selected.user_name || "Khách"}
                  </b>
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--text-light, #8993a3)",
                    }}
                  >
                    Đang hoạt động
                  </span>
                </div>
              </div>
            </div>

            {/* ---------- Messages ---------- */}
            <div
              ref={messagesEndRef}
              style={{
                flex: 1,
                overflowY: "auto",
                padding: 16,
                background: "var(--bg-tertiary, #f5f7fb)",
              }}
            >
              {loadingMsgs ? (
                <div style={centeredBoxStyle}>
                  <Loader2
                    size={24}
                    style={{
                      animation: "spin 1s linear infinite",
                      marginBottom: 8,
                    }}
                  />
                  <div style={{ fontSize: 12 }}>Đang tải tin nhắn...</div>
                </div>
              ) : messages.length === 0 ? (
                <div style={centeredBoxStyle}>
                  <MessageCircle
                    size={36}
                    style={{ opacity: 0.3, marginBottom: 8 }}
                  />
                  <div style={{ fontSize: 13 }}>
                    Chưa có tin nhắn. Bắt đầu trò chuyện!
                  </div>
                </div>
              ) : (
                messages.map((m) => {
                  const isOwn = m.from === "staff";
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
                            ? "var(--sky-500, #0EA5E9)"
                            : "var(--card-bg, #fff)",
                          color: isOwn
                            ? "#fff"
                            : "var(--text-primary, #172033)",
                          fontSize: 13,
                          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                          opacity: m._pending ? 0.65 : 1,
                        }}
                      >
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
                          {formatTime(m.created_at)}
                          {m._pending && " · Đang gửi..."}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* ---------- Input ---------- */}
            <div
              style={{
                padding: 12,
                borderTop: "1px solid var(--border-color, #eef2f7)",
                display: "flex",
                gap: 8,
                alignItems: "flex-end",
              }}
            >
              <textarea
  value={text}
  onChange={(e) => {
    setText(e.target.value);
    // Auto-grow theo nội dung (max 120px)
    e.target.style.height = "auto";
    e.target.style.height =
      Math.min(e.target.scrollHeight, 120) + "px";
  }}
  onKeyDown={onKey}
  placeholder="Trả lời khách hàng..."
  disabled={sending}
  rows={1}
  style={{
    flex: 1,
    padding: "12px 16px",
    border: "1px solid var(--border-color, #e5e9ef)",
    borderRadius: 22,
    outline: "none",
    background: "var(--bg-secondary, #f5f7fb)",
    color: "var(--text-primary, #172033)",
    fontSize: 13,
    resize: "none",
    minHeight: 44,
    maxHeight: 120,
    lineHeight: 1.5,
    fontFamily: "inherit",
    overflowY: "auto",
    transition: "border-color 0.15s, box-shadow 0.15s",
  }}
/>
              <button
                onClick={send}
                disabled={sending || !text.trim()}
                title="Gửi"
                aria-label="Gửi tin nhắn"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: text.trim()
                    ? "var(--sky-500, #0EA5E9)"
                    : "#94a3b8",
                  color: "#fff",
                  border: 0,
                  cursor: text.trim() && !sending ? "pointer" : "not-allowed",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                  opacity: sending ? 0.7 : 1,
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
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }

        /* Responsive: mobile → 1 cột, conv list giới hạn height */
        @media (max-width: 768px) {
          .chat-layout {
            grid-template-columns: 1fr !important;
            height: auto !important;
            min-height: 500px !important;
            max-height: none !important;
          }
          .chat-layout > .chat-conv-panel {
            max-height: 240px;
          }
        }
      `}</style>
    </div>
  );
}

// ============================================================
// STYLE CONSTANTS
// ============================================================

const panelStyle = {
  background: "var(--card-bg, #fff)",
  border: "1px solid var(--border-color, #e7ebf0)",
  borderRadius: 12,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  minHeight: 0,
};

const panelHeaderStyle = {
  padding: 16,
  borderBottom: "1px solid var(--border-color, #eef2f7)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexShrink: 0,
};

const iconBtnStyle = {
  background: "transparent",
  border: 0,
  cursor: "pointer",
  color: "var(--text-light, #8993a3)",
  display: "grid",
  placeItems: "center",
  padding: 6,
  borderRadius: 6,
};

const clearBtnStyle = {
  background: "transparent",
  border: 0,
  cursor: "pointer",
  color: "var(--text-light, #8993a3)",
  padding: 2,
  display: "grid",
  placeItems: "center",
};

const smallBtnStyle = {
  padding: "6px 12px",
  background: "var(--sky-500, #0EA5E9)",
  color: "#fff",
  border: 0,
  borderRadius: 6,
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 12,
};

const centeredBoxStyle = {
  textAlign: "center",
  padding: 30,
  color: "var(--text-light, #8993a3)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
};