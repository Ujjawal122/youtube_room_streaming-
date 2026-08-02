import jwt from "jsonwebtoken";

/**
 * Generate a signed JWT for a given user ID.
 * @param {string|ObjectId} id - The user's _id
 * @param {string} expiresIn - Token expiry (default 7d)
 * @returns {string} signed JWT
 */
export const generateToken = (id, expiresIn = "7d") => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn });
};

/**
 * Verify and decode a JWT.
 * Throws if invalid or expired.
 * @param {string} token
 * @returns {{ id: string }} decoded payload
 */
export const verifyToken = (token) => {
    return jwt.verify(token, process.env.JWT_SECRET);
};
