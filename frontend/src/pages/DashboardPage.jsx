import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import {
  FiPlay, FiPlus, FiLogOut, FiUsers, FiLink,
  FiArrowRight, FiClock, FiVideo, FiZap, FiShield,
  FiMessageCircle, FiGlobe, FiCheck, FiX,
} from "react-icons/fi";
import {
  MdOutlineSyncAlt, MdOutlineEmojiEmotions,
  MdOutlineAdminPanelSettings, MdOutlineVideoLibrary,
} from "react-icons/md";
import { SiYoutube } from "react-icons/si";
import { createRoom, getMyRooms } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/ui/Toast";
import Spinner from "../components/ui/Spinner";
import Modal from "../components/ui/Modal";

// ── Data ──────────────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: <MdOutlineSyncAlt />, color: "#ff2222", bg: "rgba(255,34,34,0.10)", title: "Real-time Sync", desc: "Play, pause, seek — every action broadcasts instantly to all participants via WebSockets." },
  { icon: <SiYoutube />, color: "#ff2222", bg: "rgba(255,34,34,0.10)", title: "YouTube IFrame API", desc: "Powered by the official YouTube IFrame Player API. Paste any YouTube URL and watch together." },
  { icon: <MdOutlineAdminPanelSettings />, color: "#9b59f5", bg: "rgba(155,89,245,0.10)", title: "Role-Based Access", desc: "Host, Moderator, Participant. Only authorised roles can control playback or change the video." },
  { icon: <FiMessageCircle />, color: "#22d3ee", bg: "rgba(34,211,238,0.10)", title: "Live Chat", desc: "Chat with everyone in real time. Messages are persisted and paginated across sessions." },
  { icon: <MdOutlineEmojiEmotions />, color: "#f5a623", bg: "rgba(245,166,35,0.10)", title: "Emoji Reactions", desc: "Send emoji reactions that float across the screen at key moments — no words needed." },
  { icon: <FiZap />, color: "#22c55e", bg: "rgba(34,197,94,0.10)", title: "Redis-Powered Scale", desc: "Socket.IO Redis Adapter enables horizontal scaling across multiple server instances." },
  { icon: <FiShield />, color: "#22d3ee", bg: "rgba(34,211,238,0.10)", title: "Secure Auth", desc: "JWT stored in httpOnly cookies — immune to XSS. Sessions persist across browser refreshes." },
  { icon: <MdOutlineVideoLibrary />, color: "#f5a623", bg: "rgba(245,166,35,0.10)", title: "Persistent Rooms", desc: "Room state is saved in MongoDB and cached in Redis. Rejoin anytime and resume instantly." },
];

const STEPS = [
  { n: "01", title: "Create a Room", desc: "Give it a name and optionally paste a YouTube video to start with.", color: "#ff2222" },
  { n: "02", title: "Share the Code", desc: "Copy the 8-character room code and send it to your friends.", color: "#9b59f5" },
  { n: "03", title: "Watch Together", desc: "Everyone joins and the video stays in perfect sync for all participants.", color: "#22c55e" },
];

const ROLE_MATRIX = [
  { role: "host", color: "#ff2222", bg: "rgba(255,34,34,0.12)", border: "rgba(255,34,34,0.25)", checks: [true, true, true, true, true] },
  { role: "moderator", color: "#9b59f5", bg: "rgba(155,89,245,0.12)", border: "rgba(155,89,245,0.25)", checks: [true, true, true, false, false] },
  { role: "participant", color: "#22d3ee", bg: "rgba(34,211,238,0.12)", border: "rgba(34,211,238,0.25)", checks: [false, false, false, false, false] },
  { role: "viewer", color: "#888", bg: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.10)", checks: [false, false, false, false, false] },
];

const TICKER_ITEMS = [
  "⚡ < 50ms real-time sync",
  "🎬 YouTube IFrame API",
  "👥 50+ users per room",
  "🔒 JWT httpOnly cookie auth",
  "💬 Persistent chat history",
  "😂 Emoji reaction overlay",
  "🔁 Redis-backed scaling",
  "🎭 4 role types",
];

const ROLE_BADGE = {
  host: { color: "#ff2222", bg: "rgba(255,34,34,0.12)", border: "rgba(255,34,34,0.25)" },
  moderator: { color: "#9b59f5", bg: "rgba(155,89,245,0.12)", border: "rgba(155,89,245,0.25)" },
  participant: { color: "#22d3ee", bg: "rgba(34,211,238,0.12)", border: "rgba(34,211,238,0.25)" },
  viewer: { color: "#888", bg: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.10)" },
};

// ── Subcomponents ─────────────────────────────────────────────────────────────

function FeatureCard({ f, i }) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 * i, type: "spring", stiffness: 240, damping: 22 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="p-5 rounded-2xl relative overflow-hidden cursor-default"
      style={{
        background: hovered ? f.bg : "rgba(255,255,255,0.02)",
        border: `1px solid ${hovered ? `${f.color}30` : "var(--border-2)"}`,
        transition: "all 0.25s ease",
      }}
    >
      {/* Icon blob */}
      <div
        className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4 text-lg transition-all"
        style={{
          background: f.bg,
          color: f.color,
          transform: hovered ? "scale(1.12) rotate(-4deg)" : "scale(1)",
          transition: "transform 0.25s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        {f.icon}
      </div>
      <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14, color: "var(--text-1)", marginBottom: 6 }}>
        {f.title}
      </h3>
      <p style={{ fontSize: 12.5, color: "var(--text-3)", lineHeight: 1.65 }}>{f.desc}</p>

      {/* Hover glow */}
      {hovered && (
        <div
          className="absolute inset-0 pointer-events-none rounded-2xl"
          style={{ background: `radial-gradient(circle at top left, ${f.color}08 0%, transparent 60%)` }}
        />
      )}
    </motion.div>
  );
}

function RoomCard({ room, onClick, i }) {
  const badge = ROLE_BADGE[room.role] || ROLE_BADGE.viewer;
  const [hovered, setHovered] = useState(false);

  return (
    <motion.button
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ delay: i * 0.06, type: "spring", stiffness: 280, damping: 22 }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="text-left w-full p-5 rounded-2xl relative overflow-hidden"
      style={{
        background: hovered ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.025)",
        border: `1px solid ${hovered ? "rgba(255,255,255,0.14)" : "var(--border-2)"}`,
        transition: "all 0.2s ease",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center transition-all"
          style={{
            background: hovered ? "rgba(255,34,34,0.18)" : "rgba(255,255,255,0.07)",
            color: hovered ? "#ff2222" : "var(--text-3)",
            transition: "all 0.2s",
          }}
        >
          <FiVideo className="text-lg" />
        </div>
        <span
          className="text-xs px-2.5 py-1 rounded-full font-semibold"
          style={{ color: badge.color, background: badge.bg, border: `1px solid ${badge.border}`, fontFamily: "var(--font-display)" }}
        >
          {room.role}
        </span>
      </div>

      <p style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14, color: "var(--text-1)", marginBottom: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {room.name}
      </p>

      <div className="flex items-center justify-between">
        <span style={{ fontSize: 11, color: "var(--text-4)", fontFamily: "monospace", letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: 5 }}>
          <FiLink style={{ fontSize: 10 }} /> {room.roomCode}
        </span>
        <FiArrowRight
          style={{
            color: hovered ? "var(--text-2)" : "var(--text-4)",
            transform: hovered ? "translateX(3px)" : "translateX(0)",
            transition: "all 0.2s",
            fontSize: 13,
          }}
        />
      </div>
    </motion.button>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const navRef = useRef(null);
  const { scrollY } = useScroll();

  const navBg = useTransform(scrollY, [0, 60], ["rgba(8,8,8,0)", "rgba(8,8,8,0.92)"]);
  const navBorder = useTransform(scrollY, [0, 60], ["rgba(255,255,255,0)", "rgba(255,255,255,0.07)"]);

  const [rooms, setRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", youtubeVideoId: "" });
  const [creating, setCreating] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    getMyRooms()
      .then(({ data }) => setRooms(data))
      .catch(() => toast("Failed to load rooms", "error"))
      .finally(() => setLoadingRooms(false));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createForm.name.trim()) return;
    setCreating(true);
    try {
      const { data } = await createRoom(createForm);
      setCreateOpen(false);
      setCreateForm({ name: "", youtubeVideoId: "" });
      navigate(`/room/${data.roomCode}`);
    } catch (err) {
      toast(err.response?.data?.message || "Failed to create room", "error");
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setJoining(true);
    setTimeout(() => {
      navigate(`/room/${joinCode.trim().toUpperCase()}`);
      setJoining(false);
    }, 300);
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-base)", color: "var(--text-1)" }}>

      {/* ── Ambient glows ─────────────────────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div className="absolute" style={{ width: 700, height: 700, top: "-15%", left: "-15%", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,34,34,0.05) 0%, transparent 65%)", filter: "blur(60px)" }} />
        <div className="absolute" style={{ width: 500, height: 500, top: "40%", right: "-12%", borderRadius: "50%", background: "radial-gradient(circle, rgba(155,89,245,0.04) 0%, transparent 65%)", filter: "blur(60px)" }} />
        <div className="absolute" style={{ width: 400, height: 400, bottom: "0%", left: "30%", borderRadius: "50%", background: "radial-gradient(circle, rgba(34,211,238,0.03) 0%, transparent 65%)", filter: "blur(60px)" }} />
      </div>

      {/* ── Navbar ────────────────────────────────────────────────────────────── */}
      <motion.nav
        ref={navRef}
        className="sticky top-0 z-30"
        style={{ backgroundColor: navBg, borderBottom: "1px solid", borderColor: navBorder, backdropFilter: "blur(20px)" }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <motion.div
            className="flex items-center gap-2.5 cursor-pointer"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "var(--red)", boxShadow: "0 3px 14px rgba(255,34,34,0.45)" }}
            >
              <SiYoutube className="text-white text-sm" />
            </div>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17, letterSpacing: "-0.01em" }}>WatchParty</span>
          </motion.div>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            <motion.button
              onClick={() => setCreateOpen(true)}
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-sm btn-primary"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              style={{ fontFamily: "var(--font-display)", fontWeight: 600, borderRadius: 12 }}
            >
              <FiPlus className="text-sm" /> New Room
            </motion.button>

            {/* User avatar */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl transition-all"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-1)" }}
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: "rgba(255,34,34,0.25)", color: "#ff8080", fontFamily: "var(--font-display)" }}
                >
                  {user?.username?.[0]?.toUpperCase()}
                </div>
                <span className="hidden sm:block text-sm" style={{ color: "var(--text-2)", fontFamily: "var(--font-display)", fontWeight: 500 }}>
                  {user?.username}
                </span>
              </button>

              <AnimatePresence>
                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: -6 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: -6 }}
                      transition={{ type: "spring", stiffness: 380, damping: 26 }}
                      className="absolute right-0 top-12 z-20 w-48 rounded-2xl overflow-hidden py-1.5"
                      style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-1)", boxShadow: "var(--shadow-lg)" }}
                    >
                      <div className="px-4 py-2.5" style={{ borderBottom: "1px solid var(--border-2)" }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-1)", fontFamily: "var(--font-display)" }}>{user?.username}</p>
                        <p style={{ fontSize: 11, color: "var(--text-4)", marginTop: 1 }}>{user?.email}</p>
                      </div>
                      <button
                        onClick={() => { setUserMenuOpen(false); logoutUser(); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-all"
                        style={{ color: "#ff8080" }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,34,34,0.08)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        <FiLogOut className="text-sm" /> Sign out
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 relative" style={{ zIndex: 1 }}>

        {/* ══ HERO ══════════════════════════════════════════════════════════════ */}
        <section className="pt-16 pb-12 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.05, type: "spring", stiffness: 260, damping: 22 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-7"
            style={{ background: "rgba(255,34,34,0.09)", border: "1px solid rgba(255,34,34,0.22)" }}
          >
            <span className="live-dot" />
            <span style={{ fontSize: 12, color: "#ff7070", fontFamily: "var(--font-display)", fontWeight: 600, letterSpacing: "0.04em" }}>
              REAL-TIME YOUTUBE WATCH PARTY
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, type: "spring", stiffness: 220, damping: 20 }}
            className="mb-5"
            style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2.4rem,5.5vw,4rem)", fontWeight: 700, lineHeight: 1.06, color: "var(--text-1)" }}
          >
            Watch YouTube<br />
            <span className="grad-red">together in sync</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-10 mx-auto"
            style={{ fontSize: 16, color: "var(--text-3)", lineHeight: 1.75, maxWidth: 500 }}
          >
            Create a room, invite friends, and enjoy perfectly synced YouTube playback — play, pause, and seek updates everyone instantly.
          </motion.p>

          {/* CTA strip */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <motion.button
              onClick={() => setCreateOpen(true)}
              className="btn-primary flex items-center gap-2.5 px-7 py-3.5 rounded-2xl text-sm w-full sm:w-auto justify-center"
              whileHover={{ scale: 1.03, boxShadow: "0 10px 50px rgba(255,34,34,0.38)" }}
              whileTap={{ scale: 0.97 }}
              style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15, borderRadius: 16 }}
            >
              <FiPlus /> Create Room
            </motion.button>

            <form onSubmit={handleJoin} className="flex items-center gap-2 w-full sm:w-auto">
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="ROOM CODE"
                maxLength={8}
                className="input-base rounded-2xl px-4 py-3.5 text-sm font-mono tracking-widest text-center"
                style={{ width: 130, borderRadius: 16 }}
              />
              <motion.button
                type="submit"
                disabled={!joinCode.trim() || joining}
                className="btn-ghost flex items-center gap-2 px-5 py-3.5 rounded-2xl text-sm"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                style={{ fontFamily: "var(--font-display)", fontWeight: 600, borderRadius: 16 }}
              >
                {joining ? <Spinner size={4} /> : <><FiArrowRight /> Join</>}
              </motion.button>
            </form>
          </motion.div>
        </section>

        {/* ══ TICKER ════════════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mb-16 overflow-hidden py-3 relative"
          style={{ borderTop: "1px solid var(--border-2)", borderBottom: "1px solid var(--border-2)" }}
        >
          <div
            className="absolute left-0 top-0 bottom-0 w-20 pointer-events-none z-10"
            style={{ background: "linear-gradient(90deg, var(--bg-base), transparent)" }}
          />
          <div
            className="absolute right-0 top-0 bottom-0 w-20 pointer-events-none z-10"
            style={{ background: "linear-gradient(-90deg, var(--bg-base), transparent)" }}
          />
          <div className="flex overflow-hidden">
            <div className="marquee-track shrink-0">
              {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
                <span
                  key={i}
                  style={{ fontSize: 12, color: "var(--text-3)", fontFamily: "var(--font-display)", fontWeight: 500, whiteSpace: "nowrap" }}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ══ FEATURES ══════════════════════════════════════════════════════════ */}
        <section className="mb-20">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center mb-12"
          >
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.6rem,3vw,2.2rem)", fontWeight: 700, color: "var(--text-1)", marginBottom: 8 }}>
              Everything you need
            </h2>
            <p style={{ fontSize: 14, color: "var(--text-3)" }}>Built for real-time, built to scale</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((f, i) => <FeatureCard key={f.title} f={f} i={i} />)}
          </div>
        </section>

        {/* ══ HOW IT WORKS ══════════════════════════════════════════════════════ */}
        <section className="mb-20">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.6rem,3vw,2.2rem)", fontWeight: 700, color: "var(--text-1)", marginBottom: 8 }}>
              How it works
            </h2>
            <p style={{ fontSize: 14, color: "var(--text-3)" }}>Up and running in 30 seconds</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 relative">
            {/* Connector */}
            <div className="hidden sm:block absolute" style={{ top: 28, left: "20%", right: "20%", height: 1, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)" }} />

            {STEPS.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + 0.1 * i, type: "spring", stiffness: 240, damping: 22 }}
                className="flex flex-col items-center text-center p-7 rounded-2xl"
                style={{ background: "rgba(255,255,255,0.025)", border: "1px solid var(--border-2)" }}
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 shrink-0"
                  style={{ background: `${s.color}15`, border: `1px solid ${s.color}28` }}
                >
                  <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 18, color: s.color }}>
                    {s.n}
                  </span>
                </div>
                <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, color: "var(--text-1)", marginBottom: 8 }}>
                  {s.title}
                </h3>
                <p style={{ fontSize: 13, color: "var(--text-3)", lineHeight: 1.65 }}>{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ══ ROLE TABLE ════════════════════════════════════════════════════════ */}
        <section className="mb-20">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.6rem,3vw,2.2rem)", fontWeight: 700, color: "var(--text-1)", marginBottom: 8 }}>
              Role-based access
            </h2>
            <p style={{ fontSize: 14, color: "var(--text-3)" }}>The host controls who can do what</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="overflow-x-auto rounded-2xl"
            style={{ border: "1px solid var(--border-1)" }}
          >
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid var(--border-2)" }}>
                  {["Role", "Play / Pause", "Seek", "Change Video", "Assign Roles", "Remove Users"].map((h) => (
                    <th key={h} className="px-4 py-3.5 text-left" style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-display)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROLE_MATRIX.map((row, ri) => (
                  <tr
                    key={row.role}
                    style={{ borderBottom: ri < ROLE_MATRIX.length - 1 ? "1px solid var(--border-2)" : "none" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <td className="px-4 py-3.5">
                      <span
                        className="text-xs px-3 py-1 rounded-full font-semibold"
                        style={{ color: row.color, background: row.bg, border: `1px solid ${row.border}`, fontFamily: "var(--font-display)" }}
                      >
                        {row.role}
                      </span>
                    </td>
                    {row.checks.map((ok, ci) => (
                      <td key={ci} className="px-4 py-3.5 text-center">
                        {ok
                          ? <FiCheck style={{ color: "#22c55e", margin: "0 auto", fontSize: 15 }} />
                          : <span style={{ color: "var(--text-4)" }}>—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        </section>

        {/* ══ MY ROOMS ══════════════════════════════════════════════════════════ */}
        <section className="mb-20">
          <div className="flex items-center justify-between mb-7">
            <div className="flex items-center gap-3">
              <FiClock style={{ color: "var(--text-3)", fontSize: 16 }} />
              <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, color: "var(--text-1)" }}>
                My Rooms
              </h2>
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--text-3)", background: "rgba(255,255,255,0.07)" }}
              >
                {rooms.length}
              </span>
            </div>
            <motion.button
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-1.5 text-sm transition-colors"
              style={{ color: "var(--red)", fontFamily: "var(--font-display)", fontWeight: 600 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FiPlus /> New Room
            </motion.button>
          </div>

          {loadingRooms ? (
            <div className="flex justify-center py-16"><Spinner size={8} /></div>
          ) : rooms.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-16 rounded-2xl gap-4"
              style={{ border: "1px dashed var(--border-1)", color: "var(--text-4)" }}
            >
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.04)" }}>
                <FiVideo className="text-2xl" style={{ color: "var(--text-4)" }} />
              </div>
              <div className="text-center">
                <p style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--text-3)", fontSize: 15, marginBottom: 4 }}>No rooms yet</p>
                <p style={{ fontSize: 13, color: "var(--text-4)" }}>Create one to host your first watch party</p>
              </div>
              <motion.button
                onClick={() => setCreateOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm"
                style={{ background: "rgba(255,34,34,0.12)", border: "1px solid rgba(255,34,34,0.22)", color: "#ff8080", fontFamily: "var(--font-display)", fontWeight: 600 }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
              >
                <FiPlus /> Create Room
              </motion.button>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {rooms.map((room, i) => (
                  <RoomCard key={room._id} room={room} i={i} onClick={() => navigate(`/room/${room.roomCode}`)} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>

        {/* ── Footer ─────────────────────────────────────────────────────────── */}
        <footer className="py-8 text-center mb-4" style={{ borderTop: "1px solid var(--border-2)" }}>
          <div className="flex items-center justify-center gap-2.5 mb-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "var(--red)" }}>
              <SiYoutube className="text-white" style={{ fontSize: 12 }} />
            </div>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, color: "var(--text-3)" }}>WatchParty</span>
          </div>
          <p style={{ fontSize: 12, color: "var(--text-4)" }}>Built with React · Node.js · Socket.IO · MongoDB · Redis</p>
        </footer>
      </main>

      {/* ── Create Room Modal ───────────────────────────────────────────────── */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create a Watch Room">
        <form onSubmit={handleCreate} className="space-y-5">
          <div>
            <label className="block mb-2" style={{ fontSize: 12, fontWeight: 600, color: "var(--text-3)", fontFamily: "var(--font-display)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Room Name
            </label>
            <input
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              placeholder="Movie night 🎬"
              required
              className="input-base w-full rounded-xl px-4 py-3.5 text-sm"
            />
          </div>
          <div>
            <label className="block mb-2" style={{ fontSize: 12, fontWeight: 600, color: "var(--text-3)", fontFamily: "var(--font-display)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              YouTube Video ID <span style={{ fontWeight: 400, color: "var(--text-4)", textTransform: "none" }}>(optional)</span>
            </label>
            <input
              value={createForm.youtubeVideoId}
              onChange={(e) => setCreateForm({ ...createForm, youtubeVideoId: e.target.value })}
              placeholder="dQw4w9WgXcQ"
              className="input-base w-full rounded-xl px-4 py-3.5 text-sm font-mono"
            />
            <p className="mt-2" style={{ fontSize: 12, color: "var(--text-4)" }}>
              Paste the video ID from any YouTube URL
            </p>
          </div>
          <motion.button
            type="submit"
            disabled={creating}
            className="w-full py-3.5 rounded-xl btn-primary flex items-center justify-center gap-2.5 text-sm"
            whileHover={{ scale: 1.02, boxShadow: "0 8px 36px rgba(255,34,34,0.35)" }}
            whileTap={{ scale: 0.97 }}
            style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15, borderRadius: 14 }}
          >
            {creating ? <Spinner size={5} /> : <><FiPlay className="text-sm" /> Create Room</>}
          </motion.button>
        </form>
      </Modal>
    </div>
  );
}
