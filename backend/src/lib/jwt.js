import jwt from "jsonwebtoken";


export const generateToken = (id, expiresIn = "7d") => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn });
};

export const verifyToken = (token) => {
    return jwt.verify(token, process.env.JWT_SECRET);
};
