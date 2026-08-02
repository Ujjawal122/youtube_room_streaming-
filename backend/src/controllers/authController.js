import bcrypt from "bcryptjs";
import User from "../models/userModel.js";
import { generateToken } from "../lib/jwt.js";

// ── Cookie config ─────────────────────────────────────────────────────────────
const COOKIE_NAME = "watchparty_token";

const cookieOptions = {
    httpOnly: true,                               // JS cannot read it — XSS safe
    secure: process.env.NODE_ENV === "production",// HTTPS only in prod
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,             // 7 days in ms
    path: "/",
};

const setTokenCookie = (res, userId) => {
    const token = generateToken(userId);
    res.cookie(COOKIE_NAME, token, cookieOptions);
    return token;
};

// POST /api/auth/register
export const register = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ message: "Email already in use" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await User.create({
            username,
            email: email.toLowerCase(),
            password: hashedPassword,
        });

        setTokenCookie(res, user._id);

        return res.status(201).json({
            _id: user._id,
            username: user.username,
            email: user.email,
        });
    } catch (error) {
        console.error("Register error:", error.message);
        return res.status(500).json({ message: "Server error" });
    }
};

// POST /api/auth/login
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        setTokenCookie(res, user._id);

        return res.status(200).json({
            _id: user._id,
            username: user.username,
            email: user.email,
        });
    } catch (error) {
        console.error("Login error:", error.message);
        return res.status(500).json({ message: "Server error" });
    }
};

// POST /api/auth/logout
export const logout = (_req, res) => {
    res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: 0 });
    return res.status(200).json({ message: "Logged out successfully" });
};

// GET /api/auth/me
export const getMe = async (req, res) => {
    try {
        const user = req.user; // set by protect middleware
        return res.status(200).json({
            _id: user._id,
            username: user.username,
            email: user.email,
        });
    } catch (error) {
        return res.status(500).json({ message: "Server error" });
    }
};
