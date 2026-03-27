import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createNewBudget } from '../../../services/budget.service';
import prisma from '../../../utils/db';
import { ValidationError } from '../../../utils/prisma_errors';
import { Periodicity } from '@prisma/client';

// Mock Prisma
vi.mock('../../../utils/db', () => {
    return {
        default: {
            budget: {
                create: vi.fn(),
                findMany: vi.fn(),
            },
            $transaction: vi.fn(),
        }
    }
});

describe('Budget Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('createNewBudget', () => {
        it('should create a budget successfully', async () => {
            const mockData = {
                category: 'Food' as any,
                amount: 500,
                period: Periodicity.MONTHLY
            };

            const expectedResult = {
                id: '123',
                userId: 'user1',
                ...mockData,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            (prisma.budget.create as any).mockResolvedValue(expectedResult);

            const result = await createNewBudget('user1', mockData);

            expect(prisma.budget.create).toHaveBeenCalledWith({
                data: {
                    userId: 'user1',
                    category: 'Food',
                    amount: 500,
                    period: Periodicity.MONTHLY
                }
            });
            expect(result).toEqual(expectedResult);
        });

        it('should throw validation error if category is missing', async () => {
            const mockData = {
                amount: 500,
                period: Periodicity.MONTHLY
            } as any;

            await expect(createNewBudget('user1', mockData)).rejects.toThrow(ValidationError);
        });
    });
});
