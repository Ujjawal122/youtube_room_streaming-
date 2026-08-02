import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiArrowRight, FiCheck } from "react-icons/fi";
import { SiYoutube } from "react-icons/si";
import { register } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import Spinner from "../components/ui/Spinner";

const stagger = {
  container: { animate: { transition: { staggerChildren: 0.08 } } },
  item: {
    initial: { opacity: 0, x: -16 },
    animate: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 260, damping: 22 } },
  },
};

// Decorative "watch party scene" — pure CSS art
function WatchScene() {
  return (
    <div className="relative flex flex-col items-center gap-5">
      {/* Screen */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 0.4, type: "spring", stiffness: 180 }}
        className="relative rounded-2xl overflow-hidden"
        style={{
          width: 280, height: 160,
          background: "#0a0a0a",
          border: "2px solid rgba(255,255,255,0.10)",
          boxShadow: "0 0 60px rgba(255,34,34,0.15), 0 24px 48px rgba(0,0,0,0.6)",
        }}
      >
        {/* Fake video gradient */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #1a0505 0%, #0d0d0d 100%)" }} />
        {/* Play icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,34,34,0.25)", border: "2px solid rgba(255,34,34,0.4)" }}
          >
            <div style={{ width: 0, height: 0, borderTop: "9px solid transparent", borderBottom: "9px solid transparent", borderLeft: "15px solid #ff2222", marginLeft: 3 }} />
          </motion.div>
        </div>
        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1" style={{ background: "rgba(255,255,255,0.06)" }}>
          <motion.div
            className="h-full"
            style={{ background: "var(--red)" }}
            initial={{ width: "0%" }}
            animate={{ width: "62%" }}
            transition={{ delay: 0.8, duration: 1.2, ease: "easeOut" }}
          />
        </div>
        {/* YT badge */}
        <div
          className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 rounded-lg"
          style={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,34,34,0.3)" }}
        >
          <SiYoutube style={{ color: "#ff2222", fontSize: 11 }} />
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", fontFamily: "var(--font-display)" }}>LIVE SYNC</span>
        </div>
      </motion.div>

      {/* Avatars row */}
      <motion.div
        className="flex items-center gap-2"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.65 }}
      >
        <span style={{ fontSize: 11, color: "var(--text-4)", fontFamily: "var(--font-display)" }}>Watching together</span>
        {["A", "M", "J", "S", "+3"].map((l, i) => (
          <motion.div
            key={l}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 + i * 0.07 }}
            style={{
              width: 28, height: 28,
              borderRadius: "50%",
              background: ["#ff2222", "#9b59f5", "#22d3ee", "#22c55e", "rgba(255,255,255,0.1)"][i],
              border: "2px solid var(--bg-base)",
              marginLeft: i > 0 ? -8 : 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 700, color: "#fff",
              fontFamily: "var(--font-display)",
            }}
          >
            {l}
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

const FIELDS = [
  { label: "Username", name: "username", type: "text", icon: <FiUser />, placeholder: "yourname" },
  { label: "Email address", name: "email", type: "email", icon: <FiMail />, placeholder: "you@example.com" },
  { label: "Password", name: "password", type: "password", icon: <FiLock />, placeholder: "••••••••" },
];

export default function RegisterPage() {
  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(null);
  const [showPw, setShowPw] = useState(false);
  const [touched, setTouched] = useState({});

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleBlur = (name) => {
    setFocused(null);
    setTouched((t) => ({ ...t, [name]: true }));
  };

  const isValid = (name) => {
    if (!touched[name]) return null;
    if (name === "email") return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
    if (name === "password") return form.password.length >= 6;
    if (name === "username") return form.username.trim().length >= 2;
    return false;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await register(form);
      loginUser({ _id: data._id, username: data.username, email: data.email });
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex overflow-hidden" style={{ background: "var(--bg-base)" }}>

      {/* ── LEFT PANEL ─────────────────────────────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[52%] relative flex-col justify-between p-12 overflow-hidden"
        style={{ background: "linear-gradient(145deg, #0c0c0c 0%, #08080f 60%, #0a0810 100%)" }}
      >
        {/* Glow orbs */}
        <div className="absolute pointer-events-none" style={{ width: 400, height: 400, top: "5%", left: "-15%", borderRadius: "50%", background: "radial-gradient(circle, rgba(155,89,245,0.15) 0%, transparent 70%)", filter: "blur(50px)" }} />
        <div className="absolute pointer-events-none" style={{ width: 300, height: 300, bottom: "10%", right: "-5%", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,34,34,0.12) 0%, transparent 70%)", filter: "blur(40px)" }} />

        {/* Brand */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
          className="flex items-center gap-3 relative z-10"
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--red)", boxShadow: "0 4px 20px rgba(255,34,34,0.45)" }}>
            <SiYoutube className="text-white text-xl" />
          </div>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "var(--text-1)" }}>WatchParty</span>
        </motion.div>

        {/* Scene */}
        <div className="relative z-10 flex flex-col items-center gap-8">
          <WatchScene />

          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
          >
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.8rem, 3vw, 2.5rem)", fontWeight: 700, color: "var(--text-1)", lineHeight: 1.15 }}>
              Your friends are <br /><span className="grad-warm">waiting for you</span>
            </h2>
            <p className="mt-3" style={{ fontSize: 14, color: "var(--text-3)", lineHeight: 1.7 }}>
              Join millions watching together in perfectly <br />synced YouTube rooms.
            </p>
          </motion.div>

          {/* Mini feature list */}
          <motion.ul
            className="space-y-2 w-full max-w-xs"
            initial="initial" animate="animate"
            variants={stagger.container}
          >
            {["Free to create, free to join", "No downloads needed", "Works on any device"].map((f) => (
              <motion.li key={f} variants={stagger.item} className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)" }}>
                  <FiCheck style={{ color: "#22c55e", fontSize: 11 }} />
                </span>
                <span style={{ fontSize: 13, color: "var(--text-2)" }}>{f}</span>
              </motion.li>
            ))}
          </motion.ul>
        </div>

        <p className="relative z-10" style={{ fontSize: 12, color: "var(--text-4)" }}>
          Built with React · Node.js · Socket.IO · MongoDB · Redis
        </p>

        {/* Grid decoration */}
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "linear-gradient(var(--border-3) 1px, transparent 1px), linear-gradient(90deg, var(--border-3) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
      </div>

      {/* ── RIGHT PANEL — form ─────────────────────────────────────────────────── */}
      <div
        className="flex-1 flex items-center justify-center p-6 sm:p-10 relative overflow-hidden"
        style={{ background: "var(--bg-surface)" }}
      >
        <div className="absolute pointer-events-none" style={{ width: 300, height: 300, top: -60, right: -60, borderRadius: "50%", background: "radial-gradient(circle, rgba(155,89,245,0.07) 0%, transparent 70%)", filter: "blur(40px)" }} />

        <motion.div
          className="w-full relative z-10"
          style={{ maxWidth: 420 }}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, type: "spring", stiffness: 220, damping: 22 }}
        >
          {/* Mobile brand */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--red)", boxShadow: "var(--shadow-red)" }}>
              <SiYoutube className="text-white text-base" />
            </div>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18 }}>WatchParty</span>
          </div>

          <div className="mb-8">
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 700, color: "var(--text-1)", marginBottom: 6 }}>
              Create account
            </h1>
            <p style={{ fontSize: 14, color: "var(--text-3)" }}>Start watching with friends for free</p>
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-5 px-4 py-3 rounded-xl text-sm flex items-center gap-2"
                style={{ background: "rgba(255,34,34,0.09)", border: "1px solid rgba(255,34,34,0.25)", color: "#ff7070" }}
              >
                <span>⚠</span> {error}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-5">
            {FIELDS.map(({ label, name, type, icon, placeholder }) => {
              const valid = isValid(name);
              const isFocused = focused === name;
              const isPassword = name === "password";

              return (
                <div key={name}>
                  <label
                    className="block mb-2"
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: isFocused ? "var(--red)" : valid === true ? "#22c55e" : "var(--text-3)",
                      fontFamily: "var(--font-display)",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      transition: "color 0.2s",
                    }}
                  >
                    {label}
                  </label>
                  <div className="relative">
                    <span
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-sm pointer-events-none"
                      style={{ color: isFocused ? "var(--red)" : valid === true ? "#22c55e" : "var(--text-4)", transition: "color 0.2s" }}
                    >
                      {icon}
                    </span>
                    <input
                      type={isPassword && showPw ? "text" : type}
                      name={name}
                      value={form[name]}
                      onChange={handleChange}
                      onFocus={() => setFocused(name)}
                      onBlur={() => handleBlur(name)}
                      required
                      placeholder={placeholder}
                      className="input-base w-full rounded-xl pl-11 pr-11 py-3.5 text-sm"
                      style={valid === false ? { borderColor: "rgba(255,100,100,0.4)", boxShadow: "0 0 0 3px rgba(255,34,34,0.08)" } : {}}
                    />
                    {/* Right icon: show/hide for password, check for valid others */}
                    <span className="absolute right-4 top-1/2 -translate-y-1/2">
                      {isPassword ? (
                        <button type="button" onClick={() => setShowPw((v) => !v)} style={{ color: "var(--text-4)" }}>
                          {showPw ? <FiEyeOff className="text-sm" /> : <FiEye className="text-sm" />}
                        </button>
                      ) : valid === true ? (
                        <FiCheck style={{ color: "#22c55e", fontSize: 14 }} />
                      ) : null}
                    </span>
                  </div>
                  {/* Password hint */}
                  {name === "password" && touched.password && valid === false && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-1.5 text-xs"
                      style={{ color: "#ff7070" }}
                    >
                      Password must be at least 6 characters
                    </motion.p>
                  )}
                </div>
              );
            })}

            <motion.button
              type="submit" disabled={loading}
              whileHover={{ scale: 1.02, boxShadow: "0 8px 40px rgba(255,34,34,0.35)" }}
              whileTap={{ scale: 0.97 }}
              className="w-full py-3.5 rounded-xl btn-primary flex items-center justify-center gap-2.5 text-sm mt-2"
              style={{ fontFamily: "var(--font-display)", fontSize: 15, borderRadius: 14 }}
            >
              {loading ? <Spinner size={5} /> : <>Create account <FiArrowRight className="text-base" /></>}
            </motion.button>
          </form>

          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px" style={{ background: "var(--border-2)" }} />
            <span style={{ fontSize: 11, color: "var(--text-4)", fontFamily: "var(--font-display)" }}>OR</span>
            <div className="flex-1 h-px" style={{ background: "var(--border-2)" }} />
          </div>

          <p className="text-center" style={{ fontSize: 14, color: "var(--text-3)" }}>
            Already have an account?{" "}
            <Link to="/login" className="font-semibold transition-colors" style={{ color: "var(--red)", fontFamily: "var(--font-display)" }}>
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
