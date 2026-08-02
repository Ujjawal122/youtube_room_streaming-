import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowRight } from "react-icons/fi";
import { MdOutlineSyncAlt } from "react-icons/md";
import { SiYoutube } from "react-icons/si";
import { login } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import Spinner from "../components/ui/Spinner";

// Decorative feature pills shown on the left panel
const PILLS = [
  { icon: <SiYoutube />, label: "YouTube sync", color: "#ff2222" },
  { icon: <MdOutlineSyncAlt />, label: "< 50ms latency", color: "#22d3ee" },
  { icon: "🎉", label: "Emoji reactions", color: "#f5a623" },
  { icon: "💬", label: "Live chat", color: "#9b59f5" },
];

// Floating decorative orbs that respond to mouse
function ParallaxOrbs({ containerRef }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onMove = (e) => {
      const rect = el.getBoundingClientRect();
      setPos({
        x: (e.clientX - rect.left) / rect.width - 0.5,
        y: (e.clientY - rect.top) / rect.height - 0.5,
      });
    };
    el.addEventListener("mousemove", onMove);
    return () => el.removeEventListener("mousemove", onMove);
  }, [containerRef]);

  return (
    <>
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 420, height: 420,
          top: "10%", left: "-10%",
          background: "radial-gradient(circle, rgba(255,34,34,0.18) 0%, transparent 70%)",
          filter: "blur(48px)",
          transform: `translate(${pos.x * 30}px, ${pos.y * 30}px)`,
          transition: "transform 0.5s ease-out",
        }}
      />
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 300, height: 300,
          bottom: "5%", right: "-5%",
          background: "radial-gradient(circle, rgba(155,89,245,0.14) 0%, transparent 70%)",
          filter: "blur(40px)",
          transform: `translate(${-pos.x * 20}px, ${-pos.y * 20}px)`,
          transition: "transform 0.6s ease-out",
        }}
      />
    </>
  );
}

const stagger = {
  container: { animate: { transition: { staggerChildren: 0.09 } } },
  item: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 22 } },
  },
};

export default function LoginPage() {
  const { loginUser } = useAuth();
  const navigate = useNavigate();
  const containerRef = useRef(null);

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [focused, setFocused] = useState(null);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await login(form);
      loginUser({ _id: data._id, username: data.username, email: data.email });
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className="min-h-screen flex overflow-hidden"
      style={{ background: "var(--bg-base)" }}
    >
      {/* ── LEFT PANEL (hidden on small screens) ───────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[52%] relative flex-col justify-between p-12 overflow-hidden"
        style={{ background: "linear-gradient(145deg, #0c0c0c 0%, #100808 60%, #130a0a 100%)" }}
      >
        <ParallaxOrbs containerRef={containerRef} />

        {/* Brand */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
          className="flex items-center gap-3 relative z-10"
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "var(--red)", boxShadow: "0 4px 20px rgba(255,34,34,0.5)" }}
          >
            <SiYoutube className="text-white text-xl" />
          </div>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "var(--text-1)" }}>
            WatchParty
          </span>
        </motion.div>

        {/* Hero statement */}
        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-3 flex items-center gap-2"
          >
            <span className="live-dot" />
            <span style={{ fontSize: 12, color: "var(--text-3)", fontFamily: "var(--font-display)", letterSpacing: "0.1em" }}>
              REAL-TIME WATCH TOGETHER
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28, type: "spring", stiffness: 180, damping: 18 }}
            style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2.6rem, 4vw, 3.6rem)", lineHeight: 1.05, color: "var(--text-1)" }}
          >
            Watch YouTube <br />
            <span className="grad-red">together,</span> <br />
            perfectly in sync.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-6 mb-10"
            style={{ fontSize: 15, color: "var(--text-2)", lineHeight: 1.7, maxWidth: 380 }}
          >
            Create a watch room, share a code, and enjoy perfectly synchronized playback with anyone in the world.
          </motion.p>

          {/* Feature pills */}
          <motion.div
            className="flex flex-wrap gap-3"
            initial="initial"
            animate="animate"
            variants={stagger.container}
          >
            {PILLS.map((p) => (
              <motion.div
                key={p.label}
                variants={stagger.item}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm"
                style={{
                  background: `${p.color}14`,
                  border: `1px solid ${p.color}28`,
                  color: "var(--text-2)",
                  fontFamily: "var(--font-display)",
                  fontWeight: 500,
                }}
              >
                <span style={{ color: p.color }}>{p.icon}</span>
                {p.label}
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Bottom attribution */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="relative z-10"
          style={{ fontSize: 12, color: "var(--text-4)", fontFamily: "var(--font-body)" }}
        >
          Built with React · Node.js · Socket.IO · MongoDB · Redis
        </motion.p>

        {/* Decorative grid lines */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "linear-gradient(var(--border-3) 1px, transparent 1px), linear-gradient(90deg, var(--border-3) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* ── RIGHT PANEL — form ─────────────────────────────────────────────────── */}
      <div
        className="flex-1 flex items-center justify-center p-6 sm:p-10 relative overflow-hidden"
        style={{ background: "var(--bg-surface)" }}
      >
        {/* subtle glow top-right */}
        <div
          className="absolute pointer-events-none"
          style={{
            width: 350, height: 350,
            top: -80, right: -80,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,34,34,0.07) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />

        <motion.div
          className="w-full relative z-10"
          style={{ maxWidth: 420 }}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 220, damping: 22 }}
        >
          {/* Mobile brand */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "var(--red)", boxShadow: "var(--shadow-red)" }}
            >
              <SiYoutube className="text-white text-base" />
            </div>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18 }}>WatchParty</span>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 700, color: "var(--text-1)", marginBottom: 6 }}>
              Welcome back
            </h1>
            <p style={{ fontSize: 14, color: "var(--text-3)" }}>Sign in to your watch room</p>
          </div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 px-4 py-3 rounded-xl text-sm flex items-center gap-2"
              style={{ background: "rgba(255,34,34,0.09)", border: "1px solid rgba(255,34,34,0.25)", color: "#ff7070" }}
            >
              <span>⚠</span> {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label
                className="block mb-2"
                style={{ fontSize: 12, fontWeight: 600, color: focused === "email" ? "var(--red)" : "var(--text-3)", fontFamily: "var(--font-display)", letterSpacing: "0.06em", textTransform: "uppercase", transition: "color 0.2s" }}
              >
                Email address
              </label>
              <div className="relative">
                <FiMail
                  className="absolute left-4 top-1/2 -translate-y-1/2"
                  style={{ color: focused === "email" ? "var(--red)" : "var(--text-4)", transition: "color 0.2s", fontSize: 15 }}
                />
                <input
                  type="email" name="email" value={form.email} onChange={handleChange}
                  onFocus={() => setFocused("email")} onBlur={() => setFocused(null)}
                  required placeholder="you@example.com"
                  className="input-base w-full rounded-xl pl-11 pr-4 py-3.5 text-sm"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                className="block mb-2"
                style={{ fontSize: 12, fontWeight: 600, color: focused === "password" ? "var(--red)" : "var(--text-3)", fontFamily: "var(--font-display)", letterSpacing: "0.06em", textTransform: "uppercase", transition: "color 0.2s" }}
              >
                Password
              </label>
              <div className="relative">
                <FiLock
                  className="absolute left-4 top-1/2 -translate-y-1/2"
                  style={{ color: focused === "password" ? "var(--red)" : "var(--text-4)", transition: "color 0.2s", fontSize: 15 }}
                />
                <input
                  type={showPw ? "text" : "password"} name="password" value={form.password} onChange={handleChange}
                  onFocus={() => setFocused("password")} onBlur={() => setFocused(null)}
                  required placeholder="••••••••"
                  className="input-base w-full rounded-xl pl-11 pr-12 py-3.5 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: "var(--text-4)" }}
                  onMouseEnter={e => e.currentTarget.style.color = "var(--text-2)"}
                  onMouseLeave={e => e.currentTarget.style.color = "var(--text-4)"}
                >
                  {showPw ? <FiEyeOff className="text-sm" /> : <FiEye className="text-sm" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <motion.button
              type="submit" disabled={loading}
              whileHover={{ scale: 1.02, boxShadow: "0 8px 40px rgba(255,34,34,0.35)" }}
              whileTap={{ scale: 0.97 }}
              className="w-full py-3.5 rounded-xl btn-primary flex items-center justify-center gap-2.5 text-sm mt-2"
              style={{ fontFamily: "var(--font-display)", fontSize: 15, borderRadius: 14 }}
            >
              {loading ? <Spinner size={5} /> : (
                <>Sign in <FiArrowRight className="text-base" /></>
              )}
            </motion.button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px" style={{ background: "var(--border-2)" }} />
            <span style={{ fontSize: 11, color: "var(--text-4)", fontFamily: "var(--font-display)" }}>OR</span>
            <div className="flex-1 h-px" style={{ background: "var(--border-2)" }} />
          </div>

          <p className="text-center" style={{ fontSize: 14, color: "var(--text-3)" }}>
            Don&apos;t have an account?{" "}
            <Link
              to="/register"
              className="font-semibold transition-colors"
              style={{ color: "var(--red)", fontFamily: "var(--font-display)" }}
            >
              Create one free
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
