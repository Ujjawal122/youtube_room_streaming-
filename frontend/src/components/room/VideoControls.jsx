import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiPlay, FiPause, FiLink, FiX, FiExternalLink } from "react-icons/fi";
import { SiYoutube } from "react-icons/si";
import { useRoom } from "../../context/RoomContext";

const extractVideoId = (input) => {
  const trimmed = input.trim();
  const match = trimmed.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : trimmed.length === 11 ? trimmed : "";
};

// Ripple hook
function useRipple() {
  const [ripples, setRipples] = useState([]);
  const trigger = useCallback((e) => {
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();
    setRipples((r) => [...r, { id, x, y }]);
    setTimeout(() => setRipples((r) => r.filter((ri) => ri.id !== id)), 600);
  }, []);
  return { ripples, trigger };
}

export default function VideoControls({ canControl }) {
  const { videoState, emitPlay, emitPause, emitChangeVideo } = useRoom();
  const [urlInput, setUrlInput] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [inputError, setInputError] = useState("");
  const inputRef = useRef(null);
  const { ripples, trigger } = useRipple();

  const isPlaying = videoState.playbackState === "playing";

  const handleChangeVideo = (e) => {
    e.preventDefault();
    const vid = extractVideoId(urlInput);
    if (!vid) {
      setInputError("Couldn't find a valid YouTube video ID — paste the full URL or 11-char ID.");
      return;
    }
    emitChangeVideo(vid);
    setUrlInput("");
    setInputError("");
    setShowInput(false);
  };

  const handleInputChange = (e) => {
    setUrlInput(e.target.value);
    if (inputError) setInputError("");
  };

  const handleToggleInput = () => {
    setShowInput((v) => !v);
    setUrlInput("");
    setInputError("");
    // Focus after open
    if (!showInput) setTimeout(() => inputRef.current?.focus(), 120);
  };

  const handlePlayPause = (e) => {
    trigger(e);
    if (isPlaying) emitPause();
    else emitPlay();
  };

  // Preview the extracted video ID from what user typed
  const previewId = urlInput.trim() ? extractVideoId(urlInput) : "";

  return (
    <div className="flex flex-col gap-4">

      {/* ── Row 1: Play/Pause + video info + change button ─────────────────── */}
      <div className="flex items-center gap-4 flex-wrap">

        {/* Circular Play/Pause button */}
        <div className="relative shrink-0">
          <motion.button
            onClick={canControl ? handlePlayPause : undefined}
            disabled={!canControl}
            whileTap={canControl ? { scale: 0.88 } : {}}
            className="relative overflow-hidden flex items-center justify-center rounded-full"
            style={{
              width: 52, height: 52,
              background: canControl
                ? isPlaying ? "rgba(255,255,255,0.10)" : "var(--red)"
                : "rgba(255,255,255,0.04)",
              boxShadow: canControl && !isPlaying ? "0 4px 24px rgba(255,34,34,0.40)" : "none",
              cursor: canControl ? "pointer" : "not-allowed",
              border: canControl ? "none" : "1px solid var(--border-2)",
              transition: "background 0.2s ease, box-shadow 0.2s ease",
            }}
          >
            {/* Click ripples */}
            {ripples.map((r) => (
              <span
                key={r.id}
                style={{
                  position: "absolute",
                  left: r.x, top: r.y,
                  width: 8, height: 8,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.35)",
                  transform: "translate(-50%,-50%)",
                  animation: "ripple 0.55s ease-out forwards",
                  pointerEvents: "none",
                }}
              />
            ))}

            <AnimatePresence mode="wait">
              <motion.span
                key={isPlaying ? "pause" : "play"}
                initial={{ scale: 0.5, opacity: 0, rotate: -30 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                exit={{ scale: 0.5, opacity: 0, rotate: 30 }}
                transition={{ duration: 0.16, type: "spring", stiffness: 320, damping: 22 }}
              >
                {isPlaying
                  ? <FiPause style={{ fontSize: 20, color: canControl ? "var(--text-1)" : "var(--text-4)" }} />
                  : <FiPlay style={{ fontSize: 20, marginLeft: 2, color: canControl ? "#fff" : "var(--text-4)" }} />
                }
              </motion.span>
            </AnimatePresence>
          </motion.button>
        </div>

        {/* Status text */}
        <div className="flex flex-col min-w-0">
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 14,
              fontWeight: 700,
              color: canControl ? "var(--text-1)" : "var(--text-3)",
              lineHeight: 1.2,
            }}
          >
            {isPlaying ? "Now Playing" : "Paused"}
          </span>
          <span style={{ fontSize: 11, color: "var(--text-4)", marginTop: 2, fontFamily: "var(--font-body)" }}>
            {canControl ? "You control playback" : "Host or mod controls playback"}
          </span>
        </div>

        {/* Current video pill */}
        {videoState.videoId && (
          <a
            href={`https://youtube.com/watch?v=${videoState.videoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all group"
            style={{
              background: "rgba(255,34,34,0.07)",
              border: "1px solid rgba(255,34,34,0.18)",
              textDecoration: "none",
              flexShrink: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,34,34,0.14)"; e.currentTarget.style.borderColor = "rgba(255,34,34,0.30)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,34,34,0.07)"; e.currentTarget.style.borderColor = "rgba(255,34,34,0.18)"; }}
          >
            <SiYoutube style={{ color: "var(--red)", fontSize: 13, flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontFamily: "monospace", color: "rgba(255,255,255,0.65)", letterSpacing: "0.05em" }}>
              {videoState.videoId}
            </span>
            <FiExternalLink style={{ fontSize: 10, color: "var(--text-4)", flexShrink: 0 }} />
          </a>
        )}

        {/* Change video button — only for host/mod */}
        {canControl && (
          <motion.button
            onClick={handleToggleInput}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl text-xs transition-all"
            style={{
              background: showInput ? "rgba(155,89,245,0.14)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${showInput ? "rgba(155,89,245,0.35)" : "var(--border-1)"}`,
              color: showInput ? "#b98ff5" : "var(--text-3)",
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            {showInput ? <FiX style={{ fontSize: 13 }} /> : <FiLink style={{ fontSize: 13 }} />}
            {showInput ? "Cancel" : "Change video"}
          </motion.button>
        )}
      </div>

      {/* ── Row 2: URL paste panel (animated slide-down) ───────────────────── */}
      <AnimatePresence>
        {showInput && canControl && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -8 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -8 }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
            style={{ overflow: "hidden" }}
          >
            <div
              className="rounded-2xl p-4 flex flex-col gap-3"
              style={{
                background: "rgba(155,89,245,0.06)",
                border: "1px solid rgba(155,89,245,0.18)",
              }}
            >
              {/* Panel heading */}
              <div className="flex items-center gap-2">
                <SiYoutube style={{ color: "var(--red)", fontSize: 15 }} />
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--text-1)",
                  }}
                >
                  Load a YouTube Video
                </span>
              </div>

              {/* Input + submit */}
              <form onSubmit={handleChangeVideo} className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    ref={inputRef}
                    value={urlInput}
                    onChange={handleInputChange}
                    placeholder="Paste YouTube URL or video ID…"
                    className="input-base w-full rounded-xl px-4 py-2.5 text-sm pr-24"
                    style={{
                      borderColor: inputError ? "rgba(255,100,100,0.45)" : undefined,
                      boxShadow: inputError ? "0 0 0 3px rgba(255,34,34,0.09)" : undefined,
                    }}
                  />
                  {/* Live preview of extracted ID */}
                  {previewId && !inputError && (
                    <span
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono px-2 py-0.5 rounded-lg"
                      style={{
                        background: "rgba(34,197,94,0.12)",
                        border: "1px solid rgba(34,197,94,0.25)",
                        color: "#22c55e",
                        fontFamily: "monospace",
                        letterSpacing: "0.04em",
                        fontSize: 11,
                      }}
                    >
                      {previewId}
                    </span>
                  )}
                </div>
                <motion.button
                  type="submit"
                  disabled={!urlInput.trim()}
                  className="btn-primary px-5 py-2.5 rounded-xl text-sm shrink-0"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 600,
                    borderRadius: 12,
                    opacity: urlInput.trim() ? 1 : 0.45,
                  }}
                  whileHover={urlInput.trim() ? { scale: 1.04, boxShadow: "0 6px 24px rgba(255,34,34,0.35)" } : {}}
                  whileTap={urlInput.trim() ? { scale: 0.96 } : {}}
                >
                  Load
                </motion.button>
              </form>

              {/* Error */}
              <AnimatePresence>
                {inputError && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    style={{ fontSize: 12, color: "#ff7070", fontFamily: "var(--font-body)" }}
                  >
                    ⚠ {inputError}
                  </motion.p>
                )}
              </AnimatePresence>

              {/* Helper chips */}
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "Full URL", example: "youtube.com/watch?v=…" },
                  { label: "Short URL", example: "youtu.be/…" },
                  { label: "Video ID", example: "dQw4w9WgXcQ" },
                ].map((hint) => (
                  <div
                    key={hint.label}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-2)" }}
                  >
                    <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-3)", fontFamily: "var(--font-display)" }}>
                      {hint.label}
                    </span>
                    <span style={{ fontSize: 10, color: "var(--text-4)", fontFamily: "monospace" }}>
                      {hint.example}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Viewer hint */}
      {!canControl && (
        <p
          className="flex items-center gap-2 text-xs"
          style={{ color: "var(--text-4)", fontFamily: "var(--font-body)" }}
        >
          <span
            style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "inline-block", flexShrink: 0 }}
          />
          Only the host or moderator can control playback
        </p>
      )}
    </div>
  );
}
