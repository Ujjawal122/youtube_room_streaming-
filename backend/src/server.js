import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";

import connectDB from "./config/db.js";
import { createRedisClients } from "./config/redis.js";
import authRouter from "./routers/authRouter.js";
import roomRouter from "./routers/roomRouter.js";
import chatRouter from "./routers/chatRouter.js";
import registerRoomSocket from "./sockets/roomSocket.js";

const app = express();
const httpServer = createServer(app);

// ─── Redis clients ────────────────────────────────────────────────────────────
const { pubClient, subClient } = createRedisClients();

// ─── Socket.IO + Redis adapter ────────────────────────────────────────────────
const io = new Server(httpServer, {
    cors: {
        origin: process.env.CLIENT_URL || "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true,
    },
});
io.adapter(createAdapter(pubClient, subClient));

// ─── Express middleware ───────────────────────────────────────────────────────
app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,           // allow cookies cross-origin (dev proxy)
}));
app.use(express.json());
app.use(cookieParser());        // parse req.cookies

// ─── REST routes ─────────────────────────────────────────────────────────────
app.use("/api/auth", authRouter);
app.use("/api/rooms", roomRouter);
app.use("/api/chat", chatRouter);

// Health check
app.get("/", (_req, res) => {
    res.json({ status: "ok", message: "YouTube Watch Party API is running" });
});

// 404
app.use((_req, res) => {
    res.status(404).json({ message: "Route not found" });
});

// Global error handler
app.use((err, _req, res, _next) => {
    console.error("[Error]", err.message);
    res.status(err.status || 500).json({ message: err.message || "Internal server error" });
});

// ─── Socket.IO events ────────────────────────────────────────────────────────
registerRoomSocket(io);

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;

connectDB().then(() => {
    httpServer.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
});
