import { io } from "socket.io-client";

let socket = null;

/**
 * Returns the singleton socket instance.
 * No token needed — the browser automatically sends the httpOnly cookie
 * in the Socket.IO upgrade request (same origin via Vite proxy).
 */
export const getSocket = () => {
    if (!socket) {
        socket = io("/", {
            autoConnect: false,
            withCredentials: true,  // send cookies on the WebSocket handshake
        });
    }
    return socket;
};

export const connectSocket = () => {
    const s = getSocket();
    if (!s.connected) s.connect();
    return s;
};

export const disconnectSocket = () => {
    if (socket?.connected) socket.disconnect();
    socket = null;
};
