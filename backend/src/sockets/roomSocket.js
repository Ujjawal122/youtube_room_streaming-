import User from "../models/userModel.js";
import { verifyToken } from "../lib/jwt.js";
import { MessageHandler } from "./classes/MessageHandler.js";

/**
 * Shared registry of live RoomManagers.
 * Map<roomId, RoomManager>
 *
 * Shared across all sockets on this server instance.
 * With the Redis adapter, Socket.IO events are forwarded cross-instance,
 * so each server only needs to manage its own in-memory RoomManagers.
 */
const rooms = new Map();

/**
 * Registers Socket.IO auth middleware and wires up per-socket MessageHandler.
 * @param {import("socket.io").Server} io
 */
const registerRoomSocket = (io) => {

    // ── Auth middleware ──────────────────────────────────────────────────────────
    io.use(async (socket, next) => {
        try {
            // 1 — httpOnly cookie (browser connects via Vite proxy)
            let token = null;
            const cookieHeader = socket.handshake.headers?.cookie || "";
            const match = cookieHeader.match(/(?:^|;\s*)watchparty_token=([^;]+)/);
            if (match) token = decodeURIComponent(match[1]);

            // 2 — auth.token payload (kept as fallback for non-browser clients)
            if (!token) token = socket.handshake.auth?.token;

            // 3 — Authorization header fallback
            if (!token) token = socket.handshake.headers?.authorization?.split(" ")[1];

            if (!token) return next(new Error("Authentication error: no token"));

            const decoded = verifyToken(token);
            const user = await User.findById(decoded.id).select("-password");
            if (!user) return next(new Error("Authentication error: user not found"));

            socket.user = user;
            next();
        } catch (err) {
            next(new Error("Authentication error: invalid token"));
        }
    });

    // ── Per-connection handler ───────────────────────────────────────────────────
    io.on("connection", (socket) => {
        console.log(`[Socket] Connected: ${socket.user.username} (${socket.id})`);
        const handler = new MessageHandler(socket, io, rooms);
        handler.register();
    });
};

export default registerRoomSocket;
