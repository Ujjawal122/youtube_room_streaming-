import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiCheckCircle, FiAlertCircle, FiInfo, FiX } from "react-icons/fi";

// ── Single Toast ────────────────────────────────────────────────────────────────
const DURATION = 4000;

const CONFIG = {
  success: {
    icon: <FiCheckCircle />,
    bar: "#22c55e",
    border: "rgba(34,197,94,0.25)",
    bg: "rgba(34,197,94,0.08)",
    iconColor: "#22c55e",
    label: "Success",
  },
  error: {
    icon: <FiAlertCircle />,
    bar: "#ff2222",
    border: "rgba(255,34,34,0.30)",
    bg: "rgba(255,34,34,0.08)",
    iconColor: "#ff2222",
    label: "Error",
  },
  info: {
    icon: <FiInfo />,
    bar: "#22d3ee",
    border: "rgba(34,211,238,0.25)",
    bg: "rgba(34,211,238,0.07)",
    iconColor: "#22d3ee",
    label: "Info",
  },
};

function Toast({ message, type = "info", onClose }) {
  const cfg = CONFIG[type] || CONFIG.info;
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / DURATION) * 100);
      setProgress(remaining);
      if (remaining === 0) clearInterval(interval);
    }, 16);
    const timer = setTimeout(onClose, DURATION);
    return () => { clearInterval(interval); clearTimeout(timer); };
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 60, scale: 0.92 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.92 }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      style={{ border: `1px solid ${cfg.border}`, background: cfg.bg }}
      className="relative w-80 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl"
    >
      {/* Content row */}
      <div className="flex items-start gap-3 px-4 pt-4 pb-3">
        {/* Icon blob */}
        <span
          className="flex items-center justify-center w-8 h-8 rounded-xl shrink-0 text-sm"
          style={{ color: cfg.iconColor, background: `${cfg.iconColor}18` }}
        >
          {cfg.icon}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold mb-0.5" style={{ color: cfg.iconColor, fontFamily: "var(--font-display)" }}>
            {cfg.label}
          </p>
          <p className="text-sm text-white/80 leading-snug break-words">{message}</p>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-white/30 hover:text-white/70 transition-colors shrink-0"
        >
          <FiX className="text-base" />
        </button>
      </div>
      {/* Progress bar */}
      <div className="h-0.5 bg-white/5 mx-4 mb-3 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: cfg.bar, width: `${progress}%` }}
          transition={{ ease: "linear" }}
        />
      </div>
    </motion.div>
  );
}

// ── Provider + hook ─────────────────────────────────────────────────────────────
const ToastCtx = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((message, type = "info") => {
    const id = Date.now();
    setToasts((p) => [...p, { id, message, type }]);
  }, []);

  const remove = useCallback((id) => setToasts((p) => p.filter((t) => t.id !== id)), []);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed top-5 right-5 z-[999] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <div key={t.id} className="pointer-events-auto">
              <Toast message={t.message} type={t.type} onClose={() => remove(t.id)} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
};

export const useToast = () => useContext(ToastCtx);
export default Toast;
