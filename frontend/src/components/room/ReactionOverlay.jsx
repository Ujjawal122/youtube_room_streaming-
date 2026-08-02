import { AnimatePresence, motion } from "framer-motion";
import { useRoom } from "../../context/RoomContext";

export default function ReactionOverlay() {
    const { reactions } = useRoom();

    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden z-20">
            <AnimatePresence>
                {reactions.map((r) => {
                    // Random horizontal position per reaction
                    const left = 10 + Math.random() * 80;
                    return (
                        <motion.div
                            key={r.id}
                            initial={{ opacity: 0, y: 0, scale: 0.6 }}
                            animate={{ opacity: 1, y: -180, scale: 1.4 }}
                            exit={{ opacity: 0, scale: 0.5 }}
                            transition={{ duration: 2.8, ease: "easeOut" }}
                            style={{ left: `${left}%`, bottom: "10%", position: "absolute" }}
                            className="flex flex-col items-center gap-1 select-none"
                        >
                            <span className="text-4xl drop-shadow-lg">{r.emoji}</span>
                            <span className="text-[10px] text-white/50 bg-black/40 px-1.5 py-0.5 rounded-full">
                                {r.username}
                            </span>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
}
