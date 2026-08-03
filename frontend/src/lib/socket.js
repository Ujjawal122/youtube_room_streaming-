import { io } from "socket.io-client";

let socket = null;


export const getSocket = () => {
    if (!socket) {
        socket = io(import.meta.env.VITE_API_URL || "/", {
            autoConnect: false,
            withCredentials: true, 
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
