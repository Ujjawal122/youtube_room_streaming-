import axios from "axios";

// withCredentials: true  →  browser sends the httpOnly cookie on every request
const api = axios.create({
    baseURL: "/api",
    withCredentials: true,   // required for cookies to be sent cross-origin (Vite proxy)
});

// ── Auth ──────────────────────────────────────────────────────────────────────
export const register = (data) => api.post("/auth/register", data);
export const login = (data) => api.post("/auth/login", data);
export const logout = () => api.post("/auth/logout");
export const getMe = () => api.get("/auth/me");

// ── Rooms ─────────────────────────────────────────────────────────────────────
export const createRoom = (data) => api.post("/rooms/create", data);
export const getRoomByCode = (roomCode) => api.get(`/rooms/${roomCode}`);
export const getMyRooms = () => api.get("/rooms/my-rooms");
export const closeRoom = (roomCode) => api.delete(`/rooms/${roomCode}`);

// ── Chat ──────────────────────────────────────────────────────────────────────
export const getChatHistory = (roomCode, params) =>
    api.get(`/chat/${roomCode}`, { params });
