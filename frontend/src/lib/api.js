import axios from "axios";


const api = axios.create({
    baseURL: `${import.meta.env.VITE_API_URL || ""}/api`,
    withCredentials: true,   
});


export const register = (data) => api.post("/auth/register", data);
export const login = (data) => api.post("/auth/login", data);
export const logout = () => api.post("/auth/logout");
export const getMe = () => api.get("/auth/me");


export const createRoom = (data) => api.post("/rooms/create", data);
export const getRoomByCode = (roomCode) => api.get(`/rooms/${roomCode}`);
export const getMyRooms = () => api.get("/rooms/my-rooms");
export const closeRoom = (roomCode) => api.delete(`/rooms/${roomCode}`);


export const getChatHistory = (roomCode, params) =>
    api.get(`/chat/${roomCode}`, { params });
