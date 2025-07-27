import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../utils/db';

const JWT_SECRET = process.env.JWT_SECRET!;

export const createUser = async (name: string, email: string, password: string) => {
    try {
        if (!name || !email || !password) {
            throw new Error('Name, email and password are required');
        }

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            throw new Error('Email already in use');
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
    } catch (err) {
        console.error('Failed to create user:', err);
        throw err;
    }
};

export const authenticateUser = async (email: string, password: string) => {
    try {
        if (!email || !password) {
            throw new Error('Email and password are required');
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            throw new Error('Invalid credentials');
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
            throw new Error('Invalid credentials');
        }

        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
        return { token, userId: user.id };
    } catch (err) {
        console.error('Failed to authenticate user:', err);
        throw err;
    }
}; 