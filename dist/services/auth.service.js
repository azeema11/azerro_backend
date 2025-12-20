"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateUser = exports.createUser = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = __importDefault(require("../utils/db"));
const prisma_errors_1 = require("../utils/prisma_errors");
const JWT_SECRET = (() => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET environment variable is required but not defined');
    }
    return secret;
})();
const createUser = async (name, email, password) => {
    // Input validation
    if (!name || !email || !password) {
        throw new prisma_errors_1.ValidationError('Name, email and password are required', 'User', undefined, { field: 'input', validationType: 'business' });
    }
    return (0, prisma_errors_1.withPrismaErrorHandling)(async () => {
        const existing = await db_1.default.user.findUnique({ where: { email } });
        if (existing) {
            throw new prisma_errors_1.ValidationError('Email already in use', 'User', undefined, { field: 'email', validationType: 'business' });
        }
        const hash = await bcryptjs_1.default.hash(password, 10);
        const user = await db_1.default.user.create({
            data: {
                name,
                email,
                passwordHash: hash
            }
        });
        const token = jsonwebtoken_1.default.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
        return { token, userId: user.id };
    }, 'User');
};
exports.createUser = createUser;
const authenticateUser = async (email, password) => {
    // Input validation
    if (!email || !password) {
        throw new prisma_errors_1.ValidationError('Email and password are required', 'User', undefined, { field: 'input', validationType: 'business' });
    }
    return (0, prisma_errors_1.withPrismaErrorHandling)(async () => {
        const user = await db_1.default.user.findUnique({ where: { email } });
        // Use a dummy hash to ensure constant-time comparison even when user doesn't exist
        // This prevents timing attacks that could reveal user existence
        const dummyHash = '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'; // bcrypt hash of 'dummy'
        const hashToCompare = user?.passwordHash || dummyHash;
        const valid = await bcryptjs_1.default.compare(password, hashToCompare);
        // Only consider authentication successful if both user exists AND password is valid
        if (!user || !valid) {
            throw new prisma_errors_1.ValidationError('Invalid credentials', 'User', undefined, { field: 'credentials', validationType: 'business' });
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
        return { token, userId: user.id };
    }, 'User');
};
exports.authenticateUser = authenticateUser;
