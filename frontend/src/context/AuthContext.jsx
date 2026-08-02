import { createContext, useContext, useState, useEffect } from "react";
import { getMe, logout as apiLogout } from "../lib/api";
import { connectSocket, disconnectSocket } from "../lib/socket";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // ── Restore session on mount ─────────────────────────────────────────────
    // The httpOnly cookie is sent automatically — just call /me to check if
    // the session is still valid.
    useEffect(() => {
        getMe()
            .then(({ data }) => {
                setUser(data);
                connectSocket();        // cookie is sent on the WS handshake too
            })
            .catch(() => {
                // No valid cookie / expired — stay logged out, nothing to clear
            })
            .finally(() => setLoading(false));
    }, []);

    // ── Called after successful login / register ──────────────────────────────
    // The backend already set the cookie — we just store user data in state.
    const loginUser = (userData) => {
        setUser(userData);
        connectSocket();
    };

    // ── Logout ────────────────────────────────────────────────────────────────
    // Calls the backend to clear the httpOnly cookie, then resets local state.
    const logoutUser = async () => {
        try {
            await apiLogout();        // POST /api/auth/logout — clears cookie server-side
        } catch (_) {
            // ignore network errors on logout
        }
        setUser(null);
        disconnectSocket();
    };

    return (
        <AuthContext.Provider value={{ user, loading, loginUser, logoutUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
