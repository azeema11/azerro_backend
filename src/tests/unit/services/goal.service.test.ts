import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createGoal } from '../../../services/goal.service';
import prisma from '../../../utils/db';
import { CreateGoalInput } from '../../../types/service_types';

vi.mock('../../../utils/db', () => ({
    default: {
        goal: {
            create: vi.fn()
        },
        user: {
            findUnique: vi.fn()
        }
    }
}));

describe('Goal Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should create a goal with user baseCurrency', async () => {
        const userBaseCurrency = 'EUR';
        (prisma.user.findUnique as any).mockResolvedValue({ baseCurrency: userBaseCurrency });

        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1);
        const futureDateStr = futureDate.toISOString();

        const mockInput: CreateGoalInput = {
            name: 'Emergency Fund',
            targetAmount: 10000,
            targetDate: futureDateStr
        };

        const expectedGoal = {
            id: 'goal-1',
            userId: 'user-1',
            name: mockInput.name,
            description: null,
            targetAmount: mockInput.targetAmount,
            currency: userBaseCurrency,
            targetDate: new Date(futureDateStr),
            savedAmount: 0,
            completed: false,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        (prisma.goal.create as any).mockResolvedValue(expectedGoal);

        const result = await createGoal('user-1', mockInput);

        expect(prisma.user.findUnique).toHaveBeenCalledWith({
            where: { id: 'user-1' },
            select: { baseCurrency: true }
        });
        expect(prisma.goal.create).toHaveBeenCalledWith({
            data: {
                userId: 'user-1',
                name: mockInput.name,
                description: null,
                targetAmount: mockInput.targetAmount,
                currency: userBaseCurrency,
                targetDate: new Date(futureDateStr),
                savedAmount: 0
            }
        });
        expect(result.currency).toBe(userBaseCurrency);
    });

    it('should default to INR when user has no baseCurrency', async () => {
        (prisma.user.findUnique as any).mockResolvedValue(null);

        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1);
        const futureDateStr = futureDate.toISOString();

        const mockInput: CreateGoalInput = {
            name: 'Savings Goal',
            targetAmount: 5000,
            targetDate: futureDateStr
        };

        const expectedGoal = {
            id: 'goal-2',
            userId: 'user-2',
            name: mockInput.name,
            description: null,
            targetAmount: mockInput.targetAmount,
            currency: 'INR',
            targetDate: new Date(futureDateStr),
            savedAmount: 0,
            completed: false,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        (prisma.goal.create as any).mockResolvedValue(expectedGoal);

        const result = await createGoal('user-2', mockInput);

        expect(prisma.goal.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                currency: 'INR'
            })
        });
        expect(result.currency).toBe('INR');
    });
});
