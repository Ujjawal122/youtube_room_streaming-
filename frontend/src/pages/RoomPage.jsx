import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiArrowLeft, FiUsers, FiMessageCircle,
  FiCopy, FiCheck, FiLogOut, FiWifi, FiWifiOff, FiChevronUp
} from "react-icons/fi";
import { MdOutlineStar } from "react-icons/md";
import { SiYoutube } from "react-icons/si";
import { useRoom } from "../context/RoomContext";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/ui/Toast";
import { getSocket } from "../lib/socket";
import YouTubePlayer from "../components/room/YouTubePlayer";
import VideoControls from "../components/room/VideoControls";
import ParticipantList from "../components/room/ParticipantList";
import ChatPanel from "../components/room/ChatPanel";
import ReactionOverlay from "../components/room/ReactionOverlay";
import Spinner from "../components/ui/Spinner";

const ROLE_BADGE = {
  host:        { color: "#ff2222", bg: "rgba(255,34,34,0.15)",    border: "rgba(255,34,34,0.30)" },
  moderator:   { color: "#9b59f5", bg: "rgba(155,89,245,0.15)",   border: "rgba(155,89,245,0.30)" },
  participant: { color: "#22d3ee", bg: "rgba(34,211,238,0.15)",   border: "rgba(34,211,238,0.30)" },
  viewer:      { color: "#888",    bg: "rgba(255,255,255,0.07)",   border: "rgba(255,255,255,0.12)" },
};

export default function RoomPage() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const { room, myRole, videoState, joinRoom, leaveRoom, emitPlay, emitPause, emitSeek } = useRoom();

  const [sidePanel, setSidePanel] = useState("chat");
  const [copied, setCopied] = useState(false);
  const [connected, setConnected] = useState(false);
  const [joining, setJoining] = useState(true);
  // Mobile bottom sheet expanded state
  const [mobileExpanded, setMobileExpanded] = useState(false);

  const socket = getSocket();
  const canControl = myRole === "host" || myRole === "moderator";
  const badge = ROLE_BADGE[myRole] || ROLE_BADGE.viewer;

  // ── Socket lifecycle ────────────────────────────────────────────────────────
  useEffect(() => {
    setConnected(socket.connected);
    const onConnect = () => { setConnected(true); joinRoom(roomCode); };
    const onDisconnect = () => setConnected(false);
    const onRoomState = () => setJoining(false);
    const onError = ({ message }) => toast(message, "error");
    const onRemoved = () => { toast("You were removed from the room", "error"); navigate("/dashboard"); };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("room_state", onRoomState);
    socket.on("error", onError);
    socket.on("removed_from_room", onRemoved);

    if (socket.connected) joinRoom(roomCode);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("room_state", onRoomState);
      socket.off("error", onError);
      socket.off("removed_from_room", onRemoved);
    };
  }, [roomCode]);

  const handleLeave = () => { leaveRoom(); navigate("/dashboard"); };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (joining) {
    return (
      <div
        className="h-screen flex flex-col items-center justify-center gap-6"
        style={{ background: "var(--bg-base)" }}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 280, damping: 20 }}
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: "var(--red)", boxShadow: "0 0 40px rgba(255,34,34,0.45)" }}
        >
          <SiYoutube className="text-white text-2xl" />
        </motion.div>
        <div className="flex flex-col items-center gap-3">
          <Spinner size={8} />
          <p style={{ fontSize: 14, color: "var(--text-3)", fontFamily: "var(--font-display)" }}>
            Joining <span style={{ color: "var(--text-1)", fontWeight: 700 }}>{roomCode}</span>…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{ background: "var(--bg-base)", color: "var(--text-1)" }}
    >
      {/* ── Topbar ─────────────────────────────────────────────────────────── */}
      <nav
        className="shrink-0 z-20 flex items-center gap-3 px-3 sm:px-4"
        style={{
          height: 56,
          background: "rgba(8,8,8,0.92)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid var(--border-2)",
        }}
      >
        {/* Back */}
        <motion.button
          onClick={handleLeave}
          className="flex items-center justify-center w-9 h-9 rounded-xl transition-all"
          style={{ color: "var(--text-3)", flexShrink: 0 }}
          whileHover={{ scale: 1.08, color: "var(--text-1)", background: "rgba(255,255,255,0.07)" }}
          whileTap={{ scale: 0.93 }}
        >
          <FiArrowLeft className="text-base" />
        </motion.button>

        {/* Brand icon */}
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: "var(--red)", boxShadow: "0 2px 10px rgba(255,34,34,0.40)" }}
        >
          <SiYoutube className="text-white" style={{ fontSize: 12 }} />
        </div>

        {/* Room name + role badge */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <span
            className="truncate font-semibold"
            style={{ fontFamily: "var(--font-display)", fontSize: 15, color: "var(--text-1)" }}
          >
            {room?.name || roomCode}
          </span>
          {myRole && (
            <span
              className="shrink-0 text-xs px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1"
              style={{ color: badge.color, background: badge.bg, border: `1px solid ${badge.border}`, fontFamily: "var(--font-display)" }}
            >
              {myRole === "host" && <MdOutlineStar style={{ fontSize: 10 }} />}
              {myRole}
            </span>
          )}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2 ml-auto shrink-0">
          {/* Connection status */}
          <motion.span
            className="flex items-center gap-1.5 text-xs"
            style={{ color: connected ? "#22c55e" : "#ff4444" }}
            animate={{ opacity: [1, 0.6, 1] }}
            transition={connected ? {} : { repeat: Infinity, duration: 1.5 }}
          >
            {connected ? <FiWifi /> : <FiWifiOff />}
            <span className="hidden sm:inline">{connected ? "Live" : "Reconnecting…"}</span>
          </motion.span>

          {/* Room code copy */}
          <motion.button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono transition-all"
            style={{
              background: copied ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${copied ? "rgba(34,197,94,0.30)" : "var(--border-1)"}`,
              color: copied ? "#22c55e" : "var(--text-3)",
            }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.95 }}
          >
            {copied ? <FiCheck className="text-xs" /> : <FiCopy className="text-xs" />}
            {roomCode}
          </motion.button>

          {/* Leave */}
          <motion.button
            onClick={handleLeave}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all"
            style={{ background: "rgba(255,34,34,0.10)", border: "1px solid rgba(255,34,34,0.22)", color: "#ff8080", fontFamily: "var(--font-display)", fontWeight: 600 }}
            whileHover={{ scale: 1.03, background: "rgba(255,34,34,0.18)" }}
            whileTap={{ scale: 0.95 }}
          >
            <FiLogOut />
            <span className="hidden sm:inline">Leave</span>
          </motion.button>
        </div>
      </nav>

      {/* ── Main layout ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left: video + controls */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0 p-3 sm:p-4 gap-3">
          {/* Player — grows to fill remaining space, maintains 16/9 */}
          <div className="relative flex-1 min-h-0 flex items-center">
            <div className="w-full relative">
              {/* 16:9 aspect-ratio box */}
              <div
                style={{ position: "relative", width: "100%", paddingBottom: "56.25%" }}
              >
                <div style={{ position: "absolute", inset: 0 }}>
                  <YouTubePlayer
                    videoId={videoState.videoId}
                    playbackState={videoState.playbackState}
                    currentTime={videoState.currentTime}
                    onPlay={canControl ? emitPlay : undefined}
                    onPause={canControl ? emitPause : undefined}
                    onSeek={canControl ? emitSeek : undefined}
                    canControl={canControl}
                  />
                </div>
              </div>
            </div>
            <ReactionOverlay />
          </div>

          {/* Controls */}
          <div
            className="shrink-0 rounded-2xl p-4"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-2)" }}
          >
            <VideoControls canControl={canControl} />
          </div>
        </div>

        {/* ── Desktop Sidebar ─────────────────────────────────────────────── */}
        <div
          className="hidden lg:flex shrink-0 flex-col"
          style={{ width: 320, borderLeft: "1px solid var(--border-2)", background: "rgba(12,12,12,0.95)" }}
        >
          {/* Tab switcher */}
          <div
            className="flex shrink-0"
            style={{ borderBottom: "1px solid var(--border-2)" }}
          >
            {[
              { id: "chat", icon: <FiMessageCircle />, label: "Chat" },
              { id: "participants", icon: <FiUsers />, label: "People" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSidePanel(tab.id)}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-semibold transition-all relative"
                style={{
                  fontFamily: "var(--font-display)",
                  color: sidePanel === tab.id ? "var(--text-1)" : "var(--text-4)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {tab.icon} {tab.label}
                {sidePanel === tab.id && (
                  <motion.div
                    layoutId="sidebar-tab"
                    className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full"
                    style={{ background: "var(--red)" }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Panel content */}
          <div className="flex-1 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={sidePanel}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className="h-full"
              >
                {sidePanel === "chat" ? <ChatPanel /> : <ParticipantList />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── Mobile bottom sheet ─────────────────────────────────────────────── */}
      <div className="lg:hidden shrink-0" style={{ borderTop: "1px solid var(--border-2)" }}>
        {/* Tab nav + expand toggle */}
        <div
          className="flex items-center"
          style={{ borderBottom: "1px solid var(--border-2)", background: "rgba(12,12,12,0.95)" }}
        >
          {[
            { id: "chat", icon: <FiMessageCircle />, label: "Chat" },
            { id: "participants", icon: <FiUsers />, label: "People" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSidePanel(tab.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-all"
              style={{
                fontFamily: "var(--font-display)",
                color: sidePanel === tab.id ? "var(--text-1)" : "var(--text-4)",
                border: "none",
                background: "transparent",
                cursor: "pointer",
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}

          {/* Expand toggle */}
          <button
            onClick={() => setMobileExpanded((v) => !v)}
            className="px-4 py-3 transition-all"
            style={{ color: "var(--text-4)", border: "none", background: "transparent", cursor: "pointer" }}
          >
            <motion.div animate={{ rotate: mobileExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <FiChevronUp className="text-base" />
            </motion.div>
          </button>
        </div>

        {/* Panel */}
        <motion.div
          animate={{ height: mobileExpanded ? 320 : 200 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          style={{ overflow: "hidden", background: "rgba(10,10,10,0.98)" }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={sidePanel}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              style={{ height: "100%" }}
            >
              {sidePanel === "chat" ? <ChatPanel /> : <ParticipantList />}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
