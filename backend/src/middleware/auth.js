import User from "../models/userModel.js";
import { verifyToken } from "../lib/jwt.js";

/**
 * protect middleware
 * Reads JWT from:
 *  1. httpOnly cookie  "watchparty_token"  (browser REST requests)
 *  2. Authorization: Bearer <token>        (Socket.IO handshake fallback)
 */
const protect = async (req, res, next) => {
    try {
        // 1 — cookie (primary, set by login/register)
        let token = req.cookies?.watchparty_token;

        // 2 — Bearer header fallback (useful for direct API testing / Socket.IO)
        if (!token) {
            const authHeader = req.headers.authorization;
            if (authHeader?.startsWith("Bearer ")) {
                token = authHeader.split(" ")[1];
            }
        }

        if (!token) {
            return res.status(401).json({ message: "Not authorized, no token" });
        }

        const decoded = verifyToken(token);

        const user = await User.findById(decoded.id).select("-password");
        if (!user) {
            return res.status(401).json({ message: "User not found" });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ message: "Not authorized, invalid token" });
    }
};

export default protect;
