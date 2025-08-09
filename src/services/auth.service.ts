import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../utils/db';
import { withPrismaErrorHandling, ValidationError } from '../utils/prisma_errors';

const JWT_SECRET = (() => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET environment variable is required but not defined');
    }
    return secret;
})();

export const createUser = async (name: string, email: string, password: string) => {
    // Input validation
    if (!name || !email || !password) {
        throw new ValidationError(
            'Name, email and password are required',
            'User',
            undefined,
            { field: 'input', validationType: 'business' }
        );
    }

    return withPrismaErrorHandling(async () => {
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            throw new ValidationError(
                'Email already in use',
                'User',
                undefined,
                { field: 'email', validationType: 'business' }
            );
        }

        const hash = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                name,
                email,
                passwordHash: hash
            }
        });

        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
        return { token, userId: user.id };
    }, 'User');
};

export const authenticateUser = async (email: string, password: string) => {
    // Input validation
    if (!email || !password) {
        throw new ValidationError(
            'Email and password are required',
            'User',
            undefined,
            { field: 'input', validationType: 'business' }
        );
    }

    return withPrismaErrorHandling(async () => {
        const user = await prisma.user.findUnique({ where: { email } });

        // Use a dummy hash to ensure constant-time comparison even when user doesn't exist
        // This prevents timing attacks that could reveal user existence
        const dummyHash = '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'; // bcrypt hash of 'dummy'
        const hashToCompare = user?.passwordHash || dummyHash;

        const valid = await bcrypt.compare(password, hashToCompare);

        // Only consider authentication successful if both user exists AND password is valid
        if (!user || !valid) {
            throw new ValidationError(
                'Invalid credentials',
                'User',
                undefined,
                { field: 'credentials', validationType: 'business' }
            );
        }

        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
        return { token, userId: user.id };
    }, 'User');
}; 