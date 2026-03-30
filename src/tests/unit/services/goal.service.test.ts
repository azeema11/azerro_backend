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
            findUnique: vi.fn().mockResolvedValue({ baseCurrency: 'USD' })
        }
    }
}));

describe('Goal Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should create a goal successfully', async () => {
        const mockInput: CreateGoalInput = {
            name: 'Emergency Fund',
            targetAmount: 10000,
            currency: 'USD',
            // Set date to next year to ensure it's always in the future
            targetDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
        };

        const expectedGoal = {
            id: 'goal-1',
            userId: 'user-1',
            ...mockInput,
            savedAmount: 0,
            completed: false,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        (prisma.goal.create as any).mockResolvedValue(expectedGoal);

        const result = await createGoal('user-1', mockInput);

        expect(prisma.goal.create).toHaveBeenCalledWith({
            data: {
                userId: 'user-1',
                name: mockInput.name,
                description: null,
                targetAmount: mockInput.targetAmount,
                currency: mockInput.currency,
                targetDate: mockInput.targetDate,
                savedAmount: 0
            }
        });
        expect(result).toEqual(expectedGoal);
    });
});
