import User from "../models/userModel.js";
import { verifyToken } from "../lib/jwt.js";
import { MessageHandler } from "./classes/MessageHandler.js";

const rooms = new Map();


const registerRoomSocket = (io) => {

    // ── Auth middleware ──────────────────────────────────────────────────────────
    io.use(async (socket, next) => {
        try {
           
            let token = null;
            const cookieHeader = socket.handshake.headers?.cookie || "";
            const match = cookieHeader.match(/(?:^|;\s*)watchparty_token=([^;]+)/);
            if (match) token = decodeURIComponent(match[1]);

           
            if (!token) token = socket.handshake.auth?.token;

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

    
    io.on("connection", (socket) => {
        console.log(`[Socket] Connected: ${socket.user.username} (${socket.id})`);
        const handler = new MessageHandler(socket, io, rooms);
        handler.register();
    });
};

export default registerRoomSocket;
