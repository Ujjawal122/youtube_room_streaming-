import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiUsers, FiShield, FiUser, FiMoreVertical,
  FiUserMinus, FiRepeat
} from "react-icons/fi";
import { MdOutlineStar } from "react-icons/md";
import { useRoom } from "../../context/RoomContext";
import { useAuth } from "../../context/AuthContext";

const ROLE_CONFIG = {
  host:        { label: "Host",        color: "#ff2222", bg: "rgba(255,34,34,0.15)",   border: "rgba(255,34,34,0.30)",   ring: "#ff2222",  icon: <MdOutlineStar /> },
  moderator:   { label: "Mod",         color: "#9b59f5", bg: "rgba(155,89,245,0.15)", border: "rgba(155,89,245,0.30)", ring: "#9b59f5",  icon: <FiShield /> },
  participant: { label: "Participant", color: "#22d3ee", bg: "rgba(34,211,238,0.12)", border: "rgba(34,211,238,0.25)", ring: "#22d3ee",  icon: <FiUser /> },
  viewer:      { label: "Viewer",      color: "#888",    bg: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.10)", ring: "rgba(255,255,255,0.2)", icon: <FiUser /> },
};

function OnlineDot({ online }) {
  return (
    <span
      className="shrink-0"
      style={{
        width: 8, height: 8,
        borderRadius: "50%",
        background: online ? "#22c55e" : "rgba(255,255,255,0.15)",
        boxShadow: online ? "0 0 0 2px rgba(34,197,94,0.25)" : "none",
        animation: online ? "livePulse 2.5s infinite" : "none",
        display: "inline-block",
      }}
    />
  );
}

function ParticipantRow({ p, isMe, myRole }) {
  const { emitAssignRole, emitRemove, emitTransferHost } = useRoom();
  const [menuOpen, setMenuOpen] = useState(false);
  const cfg = ROLE_CONFIG[p.role] || ROLE_CONFIG.viewer;
  const isHost = myRole === "host";

  const actions = [];
  if (isHost && !p.isMe) {
    if (p.role !== "moderator")
      actions.push({ label: "Make Moderator", icon: <FiShield />, fn: () => emitAssignRole(p.userId, "moderator") });
    if (p.role !== "participant")
      actions.push({ label: "Make Participant", icon: <FiUser />, fn: () => emitAssignRole(p.userId, "participant") });
    actions.push({ label: "Transfer Host", icon: <FiRepeat />, fn: () => emitTransferHost(p.userId) });
    actions.push({ label: "Remove", icon: <FiUserMinus />, danger: true, fn: () => emitRemove(p.userId) });
  }

  return (
    <div
      className="flex items-center gap-3 py-2.5 px-3 rounded-xl group relative"
      style={{ transition: "background 0.15s" }}
      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.035)"}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
    >
      {/* Avatar with role ring */}
      <div className="relative shrink-0">
        <div
          style={{
            width: 34, height: 34,
            borderRadius: "50%",
            background: p.online ? cfg.bg : "rgba(255,255,255,0.04)",
            border: `2px solid ${p.online ? cfg.ring : "rgba(255,255,255,0.08)"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 700, color: p.online ? "#fff" : "rgba(255,255,255,0.3)",
            fontFamily: "var(--font-display)",
            opacity: p.online ? 1 : 0.6,
            transition: "all 0.2s",
          }}
        >
          {p.username?.[0]?.toUpperCase()}
        </div>
        {/* Online indicator */}
        <span
          style={{
            position: "absolute",
            bottom: -1, right: -1,
            width: 9, height: 9,
            borderRadius: "50%",
            background: p.online ? "#22c55e" : "rgba(255,255,255,0.15)",
            border: "1.5px solid var(--bg-elevated)",
            boxShadow: p.online ? "0 0 0 2px rgba(34,197,94,0.25)" : "none",
          }}
        />
      </div>

      {/* Name + role */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span
            className="truncate text-sm font-semibold"
            style={{ fontFamily: "var(--font-display)", color: p.online ? "var(--text-1)" : "var(--text-4)" }}
          >
            {p.username}
          </span>
          {isMe && (
            <span style={{ fontSize: 10, color: "var(--text-4)", fontFamily: "var(--font-display)", flexShrink: 0 }}>(you)</span>
          )}
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <span style={{ color: cfg.color, fontSize: 11 }}>{cfg.icon}</span>
          <span style={{ fontSize: 11, color: cfg.color, fontFamily: "var(--font-display)", fontWeight: 600 }}>{cfg.label}</span>
        </div>
      </div>

      {/* Actions menu */}
      {isHost && !isMe && actions.length > 0 && (
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
            style={{ color: "var(--text-4)", background: "transparent", border: "none", cursor: "pointer" }}
            onMouseEnter={e => { e.currentTarget.style.color = "var(--text-1)"; e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "var(--text-4)"; e.currentTarget.style.background = "transparent"; }}
          >
            <FiMoreVertical style={{ fontSize: 15 }} />
          </button>

          <AnimatePresence>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: -6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -6 }}
                  transition={{ type: "spring", stiffness: 380, damping: 26 }}
                  className="absolute right-0 top-9 z-20 w-48 rounded-2xl overflow-hidden py-1.5"
                  style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-1)", boxShadow: "var(--shadow-lg)" }}
                >
                  {actions.map((a) => (
                    <button
                      key={a.label}
                      onClick={() => { a.fn(); setMenuOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-all text-left"
                      style={{
                        color: a.danger ? "#ff8080" : "var(--text-2)",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        fontFamily: "var(--font-display)",
                        fontWeight: 500,
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = a.danger ? "rgba(255,34,34,0.08)" : "rgba(255,255,255,0.06)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <span style={{ fontSize: 14 }}>{a.icon}</span>
                      {a.label}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

export default function ParticipantList() {
  const { participants, myRole, room } = useRoom();
  const { user } = useAuth();
  const onlineCount = participants.filter((p) => p.online).length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center gap-2.5 px-3 py-3.5"
        style={{ borderBottom: "1px solid var(--border-2)" }}
      >
        <FiUsers style={{ color: "var(--text-4)", fontSize: 15 }} />
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, color: "var(--text-1)" }}>
          Participants
        </span>
        <span
          className="ml-auto text-xs px-2.5 py-1 rounded-full font-semibold"
          style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.25)", fontFamily: "var(--font-display)" }}
        >
          {onlineCount} online
        </span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto py-2 px-1.5">
        {participants.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2" style={{ color: "var(--text-4)" }}>
            <FiUsers style={{ fontSize: 24, opacity: 0.4 }} />
            <p style={{ fontSize: 13, color: "var(--text-4)" }}>No participants yet</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {participants.map((p) => (
              <motion.div
                key={p.userId}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ type: "spring", stiffness: 300, damping: 24 }}
              >
                <ParticipantRow
                  p={p}
                  isMe={p.userId === user?._id}
                  myRole={myRole}
                  room={room}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
