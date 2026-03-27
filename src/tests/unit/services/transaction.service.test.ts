import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTransaction } from '../../../services/transaction.service';
import prisma from '../../../utils/db';
import { TransactionType } from '@prisma/client';

vi.mock('../../../utils/db', () => {
    return {
        default: {
            transaction: {
                create: vi.fn(),
            }
        }
    }
});

describe('Transaction Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('createTransaction', () => {
        it('should create an expense transaction successfully', async () => {
            const mockData = {
                amount: 100,
                currency: 'USD',
                category: 'Groceries' as any,
                date: '2023-10-27T10:00:00.000Z',
                type: TransactionType.EXPENSE,
                bankAccountId: 'bank123'
            };

            const expectedResult = {
                id: '1',
                userId: 'user1',
                ...mockData,
                date: new Date(mockData.date),
            };

            (prisma.transaction.create as any).mockResolvedValue(expectedResult);

            const result = await createTransaction('user1', mockData);

            expect(prisma.transaction.create).toHaveBeenCalled();
            expect(result).toEqual(expectedResult);
        });
    });
});
