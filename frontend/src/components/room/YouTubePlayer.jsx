import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { FiPlay } from "react-icons/fi";
import { SiYoutube } from "react-icons/si";

// ── Singleton IFrame API loader ───────────────────────────────────────────────
// Handles React StrictMode double-invoke and multiple component instances.
let _scriptInjected = false;
let _apiReady = false;
const _pendingCbs = [];

function loadYouTubeAPI(onReady) {
    // Already ready — call immediately
    if (_apiReady) { onReady(); return; }

    // Queue the callback
    _pendingCbs.push(onReady);

    // Only inject the script once
    if (_scriptInjected) return;
    _scriptInjected = true;

    // YouTube calls this global when the API is ready
    // We must NOT reassign it later — use a persistent handler
    window.onYouTubeIframeAPIReady = () => {
        _apiReady = true;
        _pendingCbs.forEach((fn) => fn());
        _pendingCbs.length = 0;        // drain, keep reference
    };

    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    tag.async = true;
    document.head.appendChild(tag);
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * YouTubePlayer
 *
 * Props
 * ─────
 * videoId       string   – 11-char YouTube video ID. Empty → placeholder.
 * playbackState string   – "playing" | "paused"  (drives the player from room state)
 * currentTime   number   – seconds               (remote seek target)
 * onPlay        fn       – fired when LOCAL user presses Play
 * onPause       fn       – fired when LOCAL user presses Pause
 * onSeek        fn(sec)  – fired when LOCAL user scrubs the timeline
 * canControl    bool     – false → block all interaction
 */
export default function YouTubePlayer({
    videoId,
    playbackState,
    currentTime,
    onPlay,
    onPause,
    onSeek,
    canControl,
}) {
    const divRef = useRef(null);    // container YT replaces with <iframe>
    const playerRef = useRef(null);    // YT.Player instance
    const readyRef = useRef(false);   // onReady has fired

    // suppress: true while we drive the player programmatically so we don't
    // echo the event back to the server
    const suppressRef = useRef(false);

    // "last applied" trackers — skip effects when value hasn't changed
    const lastVid = useRef(null);
    const lastState = useRef(null);
    const lastTime = useRef(null);

    const [apiReady, setApiReady] = useState(_apiReady);
    const [playerReady, setPlayerReady] = useState(false);
    const [ytError, setYtError] = useState(null);

    // ── 1. Load the IFrame API ────────────────────────────────────────────────
    useEffect(() => {
        if (_apiReady) { setApiReady(true); return; }
        loadYouTubeAPI(() => setApiReady(true));
    }, []);

    // ── 2. Instantiate YT.Player when API is ready ────────────────────────────
    useEffect(() => {
        if (!apiReady || !divRef.current || playerRef.current) return;

        playerRef.current = new window.YT.Player(divRef.current, {
            height: "100%",
            width: "100%",
            videoId: videoId || "",
            playerVars: {
                autoplay: 0,
                controls: 1,   // always visible; we overlay for non-controllers
                modestbranding: 1,
                rel: 0,
                fs: 1,
                iv_load_policy: 3,
                enablejsapi: 1,
                playsinline: 1,
                // origin MUST match window.location.origin so postMessage works
                origin: window.location.origin,
            },
            events: {
                // ── Player ready ──────────────────────────────────────────────────
                onReady: () => {
                    readyRef.current = true;
                    setPlayerReady(true);
                    console.log("[YT] Player ready ✓");

                    // If a videoId was already set before the player was ready, load it now
                    if (videoId && videoId !== lastVid.current) {
                        suppressRef.current = true;
                        lastVid.current = videoId;
                        playerRef.current.loadVideoById({
                            videoId,
                            startSeconds: currentTime ?? 0,
                        });
                        // Keep paused until room state says play
                        setTimeout(() => {
                            playerRef.current?.pauseVideo?.();
                            suppressRef.current = false;
                        }, 600);
                    }
                },

                // ── State changes ─────────────────────────────────────────────────
                onStateChange: ({ data }) => {
                    if (suppressRef.current) return;

                    const S = window.YT.PlayerState;

                    if (data === S.PLAYING) {
                        lastState.current = "playing";
                        onPlay?.();

                    } else if (data === S.PAUSED) {
                        lastState.current = "paused";
                        const t = playerRef.current?.getCurrentTime?.() ?? 0;
                        onSeek?.(t);   // sync position on pause
                        onPause?.();

                    } else if (data === S.BUFFERING) {
                        // Buffering fires on manual timeline scrub — detect as seek
                        const t = playerRef.current?.getCurrentTime?.() ?? 0;
                        if (Math.abs(t - (lastTime.current ?? 0)) > 1.5) {
                            lastTime.current = t;
                            onSeek?.(t);
                        }
                    }
                },

                // ── Errors ────────────────────────────────────────────────────────
                onError: ({ data }) => {
                    const MESSAGES = {
                        2: "Invalid video ID",
                        5: "HTML5 player error",
                        100: "Video not found or private",
                        101: "Video cannot be embedded",
                        150: "Video cannot be embedded",
                    };
                    const msg = MESSAGES[data] || `YouTube error (code ${data})`;
                    console.warn("[YT] Error:", msg);
                    setYtError(msg);
                },
            },
        });

        // Cleanup when component unmounts
        return () => {
            playerRef.current?.destroy?.();
            playerRef.current = null;
            readyRef.current = false;
            lastVid.current = null;
            lastState.current = null;
            lastTime.current = null;
            setPlayerReady(false);
            setYtError(null);
        };
    }, [apiReady]); // ← run once when API becomes available

    // ── 3. Remote videoId change ──────────────────────────────────────────────
    useEffect(() => {
        if (!readyRef.current || !playerRef.current) return;
        if (!videoId || videoId === lastVid.current) return;

        suppressRef.current = true;
        lastVid.current = videoId;
        lastTime.current = 0;
        lastState.current = "paused";
        setYtError(null);

        playerRef.current.loadVideoById({ videoId, startSeconds: 0 });
        setTimeout(() => {
            playerRef.current?.pauseVideo?.();
            suppressRef.current = false;
        }, 800);
    }, [videoId]);

    // ── 4. Remote play / pause ────────────────────────────────────────────────
    useEffect(() => {
        if (!readyRef.current || !playerRef.current) return;
        if (playbackState === lastState.current) return;

        suppressRef.current = true;
        lastState.current = playbackState;

        if (playbackState === "playing") {
            playerRef.current.playVideo();
        } else {
            playerRef.current.pauseVideo();
        }
        setTimeout(() => { suppressRef.current = false; }, 400);
    }, [playbackState]);

    // ── 5. Remote seek ────────────────────────────────────────────────────────
    useEffect(() => {
        if (!readyRef.current || !playerRef.current) return;
        if (currentTime == null) return;
        if (Math.abs((currentTime) - (lastTime.current ?? 0)) < 0.5) return;

        suppressRef.current = true;
        lastTime.current = currentTime;
        playerRef.current.seekTo(currentTime, true);
        setTimeout(() => { suppressRef.current = false; }, 400);
    }, [currentTime]);

    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div className="w-full h-full bg-[#111] rounded-2xl overflow-hidden relative shadow-2xl" style={{ minHeight: 0 }}>

            {/* ── API / player loading ────────────────────────────────────────── */}
            {(!apiReady || (videoId && !playerReady && !ytError)) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10 bg-[#111] pointer-events-none">
                    <div className="w-10 h-10 rounded-full border-2 border-red-500/30 border-t-red-500 animate-spin" />
                    <p className="text-white/40 text-sm">
                        {!apiReady ? "Loading YouTube API…" : "Loading player…"}
                    </p>
                </div>
            )}

            {/* ── YouTube error ────────────────────────────────────────────────── */}
            {ytError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10 bg-[#111] pointer-events-none">
                    <SiYoutube className="text-red-500/50 text-4xl" />
                    <p className="text-white/50 text-sm font-medium">{ytError}</p>
                    <p className="text-white/30 text-xs">Try a different video ID</p>
                </div>
            )}

            {/* ── No video placeholder ─────────────────────────────────────────── */}
            {!videoId && apiReady && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10 pointer-events-none">
                    <motion.div
                        animate={{ scale: [1, 1.07, 1] }}
                        transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                        className="w-16 h-16 rounded-2xl bg-red-600/15 border border-red-500/25 flex items-center justify-center"
                    >
                        <SiYoutube className="text-red-500 text-3xl" />
                    </motion.div>
                    <div className="text-center px-6">
                        <p className="text-white/60 font-medium">No video loaded</p>
                        <p className="text-white/30 text-sm mt-1">
                            {canControl
                                ? "Paste a YouTube URL in the controls below"
                                : "Waiting for the host to load a video…"}
                        </p>
                    </div>
                    {/* API status badge */}
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-green-400 text-xs font-medium">YouTube API connected</span>
                    </div>
                </div>
            )}

            {/* ── IFrame container (YT replaces this div) ──────────────────────── */}
            <div ref={divRef} className="w-full h-full" />

            {/* ── Participant interaction blocker ──────────────────────────────── */}
            {!canControl && videoId && (
                <div
                    className="absolute inset-0 z-20 cursor-default"
                    style={{ pointerEvents: "all" }}
                    title="Only the host or moderator can control playback"
                />
            )}

            {/* ── Viewer mode badge ────────────────────────────────────────────── */}
            {!canControl && videoId && playerReady && (
                <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute top-3 left-3 z-30 flex items-center gap-1.5 px-2.5 py-1 rounded-lg
                     bg-black/70 backdrop-blur-sm border border-white/10
                     text-white/50 text-xs pointer-events-none select-none"
                >
                    <FiPlay className="text-red-400 text-[10px]" />
                    Viewer mode
                </motion.div>
            )}

            {/* ── API connected badge (host/mod, player ready, video loaded) ───── */}
            {canControl && playerReady && videoId && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute top-3 right-3 z-30 flex items-center gap-1.5 px-2.5 py-1 rounded-lg
                     bg-black/70 backdrop-blur-sm border border-white/10
                     text-white/40 text-xs pointer-events-none select-none"
                >
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Live
                </motion.div>
            )}
        </div>
    );
}
