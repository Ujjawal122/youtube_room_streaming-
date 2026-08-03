import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiSend, FiMessageCircle } from "react-icons/fi";
import { useRoom } from "../../context/RoomContext";
import { useAuth } from "../../context/AuthContext";
import { getChatHistory } from "../../lib/api";
import Spinner from "../ui/Spinner";

const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥", "👏", "🎉"];

const ROLE_COLORS = {
  host:        { ring: "#ff2222", bg: "rgba(255,34,34,0.25)" },
  moderator:   { ring: "#9b59f5", bg: "rgba(155,89,245,0.25)" },
  participant: { ring: "#22d3ee", bg: "rgba(34,211,238,0.20)" },
  viewer:      { ring: "rgba(255,255,255,0.2)", bg: "rgba(255,255,255,0.10)" },
};

function Avatar({ name, role, size = 28 }) {
  const cfg = ROLE_COLORS[role] || ROLE_COLORS.viewer;
  return (
    <div
      style={{
        width: size, height: size,
        borderRadius: "50%",
        background: cfg.bg,
        border: `1.5px solid ${cfg.ring}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.38, fontWeight: 700,
        color: "#fff",
        flexShrink: 0,
        fontFamily: "var(--font-display)",
      }}
    >
      {name?.[0]?.toUpperCase()}
    </div>
  );
}

function ChatMessage({ msg, isMe }) {
  const name = msg.username || msg.sender?.username;
  const role = msg.role || "viewer";
  const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className={`flex gap-2 mb-4 ${isMe ? "flex-row-reverse" : ""}`}>
      <Avatar name={name} role={role} />
      <div className={`max-w-[78%] flex flex-col gap-1 ${isMe ? "items-end" : "items-start"}`}>
        <span style={{ fontSize: 10, color: "var(--text-4)", fontFamily: "var(--font-display)" }}>
          {isMe ? "You" : name}
        </span>
        <div
          style={{
            padding: "8px 13px",
            borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
            fontSize: 13.5,
            lineHeight: 1.5,
            background: isMe ? "rgba(255,34,34,0.18)" : "rgba(255,255,255,0.07)",
            border: isMe ? "1px solid rgba(255,34,34,0.20)" : "1px solid rgba(255,255,255,0.07)",
            color: "var(--text-1)",
            wordBreak: "break-word",
          }}
        >
          {msg.message}
        </div>
        <span style={{ fontSize: 10, color: "var(--text-4)" }}>{time}</span>
      </div>
    </div>
  );
}

export default function ChatPanel() {
  const { room, messages, emitSendChat, emitReaction, prependMessages } = useRoom();
  const { user } = useAuth();
  const [input, setInput] = useState("");
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showReactions, setShowReactions] = useState(false);
  const bottomRef = useRef(null);
  const listRef = useRef(null);
  const textareaRef = useRef(null);
  const firstMsgId = messages[0]?._id;

  useEffect(() => {
    if (!room?.roomCode) return;
    setLoadingHistory(true);
    getChatHistory(room.roomCode, { limit: 40 })
      .then(({ data }) => { if (data.length < 40) setHasMore(false); prependMessages(data); })
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  }, [room?.roomCode]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleScroll = useCallback(() => {
    if (!listRef.current || !hasMore || loadingHistory) return;
    if (listRef.current.scrollTop === 0 && firstMsgId) {
      setLoadingHistory(true);
      getChatHistory(room.roomCode, { limit: 40, before: firstMsgId })
        .then(({ data }) => { if (data.length < 40) setHasMore(false); prependMessages(data); })
        .catch(() => {})
        .finally(() => setLoadingHistory(false));
    }
  }, [hasMore, loadingHistory, firstMsgId, room?.roomCode]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    emitSendChat(input.trim());
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    // Auto-grow textarea
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 90) + "px";
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  return (
    <div className="flex flex-col h-full" style={{ background: "transparent" }}>

      {/* Messages */}
      <div
        ref={listRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 py-3"
      >
        {loadingHistory && (
          <div className="flex justify-center py-3 mb-2">
            <Spinner size={4} />
          </div>
        )}

        {messages.length === 0 && !loadingHistory && (
          <div className="flex flex-col items-center justify-center h-full gap-3" style={{ color: "var(--text-4)" }}>
            <FiMessageCircle style={{ fontSize: 28, opacity: 0.4 }} />
            <p style={{ fontSize: 13, color: "var(--text-4)" }}>No messages yet</p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg._id}
              initial={{ opacity: 0, y: 10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.18, type: "spring", stiffness: 300, damping: 24 }}
            >
              <ChatMessage
                msg={msg}
                isMe={msg.userId === user?._id || msg.sender?.userId === user?._id}
              />
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      <AnimatePresence>
        {showReactions && (
          <motion.div
            initial={{ opacity: 0, y: 8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: 8, height: 0 }}
            className="grid grid-cols-8 gap-1 px-3 pb-2 pt-2"
            style={{ borderTop: "1px solid var(--border-2)" }}
          >
            {REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => { emitReaction(emoji); setShowReactions(false); }}
                className="text-xl flex items-center justify-center rounded-xl py-2 transition-all"
                style={{ background: "transparent" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.transform = "scale(1.25)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.transform = "scale(1)"; }}
              >
                {emoji}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

   
      <form
        onSubmit={handleSend}
        className="flex items-end gap-2 p-3"
        style={{ borderTop: "1px solid var(--border-2)" }}
      >
    
        <button
          type="button"
          onClick={() => setShowReactions((v) => !v)}
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all text-lg"
          style={{
            background: showReactions ? "rgba(245,166,35,0.15)" : "rgba(255,255,255,0.05)",
            border: `1px solid ${showReactions ? "rgba(245,166,35,0.35)" : "var(--border-1)"}`,
            color: showReactions ? "#f5a623" : "var(--text-3)",
          }}
        >
          😊
        </button>

   
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Say something… (Enter to send)"
            maxLength={500}
            rows={1}
            className="input-base w-full rounded-xl px-3 py-2.5 text-sm resize-none overflow-hidden"
            style={{ fontFamily: "var(--font-body)", lineHeight: 1.5, minHeight: 38 }}
          />
          {input.length > 430 && (
            <span
              className="absolute right-2 bottom-1.5 text-xs"
              style={{ color: input.length > 480 ? "#ff4444" : "var(--text-4)", fontFamily: "var(--font-display)" }}
            >
              {500 - input.length}
            </span>
          )}
        </div>

        {/* Send */}
        <motion.button
          type="submit"
          disabled={!input.trim()}
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 btn-primary"
          style={{ borderRadius: 12, opacity: input.trim() ? 1 : 0.35 }}
          whileHover={input.trim() ? { scale: 1.08 } : {}}
          whileTap={input.trim() ? { scale: 0.92 } : {}}
        >
          <FiSend style={{ fontSize: 14 }} />
        </motion.button>
      </form>
    </div>
  );
}
