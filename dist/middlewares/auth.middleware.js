"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET;
const authMiddleware = (req, res, next) => {
    const auth = req.headers.authorization?.split(' ');
    if (!auth || auth[0] !== 'Bearer')
        return res.status(401).json({ error: 'Unauthorized' });
    try {
        const payload = jsonwebtoken_1.default.verify(auth[1], JWT_SECRET);
        req.userId = payload.userId;
        next();
    }
    catch {
        res.status(401).json({ error: 'Unauthorized' });
    }
};
exports.authMiddleware = authMiddleware;
