import { describe, it, expect, vi, beforeEach } from 'vitest';
// Set environment variable before importing the service
process.env.JWT_SECRET = 'test-secret';

import { createUser } from '../../../services/auth.service';
import prisma from '../../../utils/db';
import bcrypt from 'bcryptjs';

vi.mock('../../../utils/db', () => ({
    default: {
        user: {
            findUnique: vi.fn(),
            create: vi.fn()
        }
    }
}));

vi.mock('bcryptjs', () => ({
    default: {
        hash: vi.fn().mockResolvedValue('hashed_password')
    }
}));

describe('Auth Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('createUser', () => {
        it('should throw an error if user already exists', async () => {
            (prisma.user.findUnique as any).mockResolvedValue({ id: 'existing-id' });

            await expect(createUser('Test User', 'test@example.com', 'password123'))
                .rejects.toThrow('Email already in use');
        });

        it('should successfully register a new user', async () => {
            (prisma.user.findUnique as any).mockResolvedValue(null);

            const createdUser = {
                id: 'new-user-id',
                name: 'Test User',
                email: 'test@example.com',
                passwordHash: 'hashed_password',
                baseCurrency: 'INR',
                monthlyIncome: null,
                createdAt: new Date()
            };

            (prisma.user.create as any).mockResolvedValue(createdUser);

            const result = await createUser('Test User', 'test@example.com', 'password123');

            expect(prisma.user.create).toHaveBeenCalledWith({
                data: {
                    name: 'Test User',
                    email: 'test@example.com',
                    passwordHash: 'hashed_password'
                }
            });

            expect(result).toHaveProperty('userId');
            expect(result).toHaveProperty('token');
            expect(result.userId).toBe('new-user-id');
        });
    });
});
