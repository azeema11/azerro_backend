import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getHoldings, getHoldingHistory } from '../../../services/holding.service';
import prisma from '../../../utils/db';

vi.mock('../../../utils/db', () => ({
    default: {
        holding: {
            findMany: vi.fn()
        },
        holdingHistory: {
            findMany: vi.fn()
        }
    }
}));

describe('Holding Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should fetch all holdings when onlyWithBalance is false', async () => {
        const mockHoldings = [
            { id: 'h1', userId: 'user-1', ticker: 'AAPL', quantity: 10 },
            { id: 'h2', userId: 'user-1', ticker: 'MSFT', quantity: 0 }
        ];
        (prisma.holding.findMany as any).mockResolvedValue(mockHoldings);

        const result = await getHoldings('user-1', false);

        expect(prisma.holding.findMany).toHaveBeenCalledWith({
            where: { userId: 'user-1' }
        });
        expect(result).toEqual(mockHoldings);
    });

    it('should filter holdings with quantity > 0 when onlyWithBalance is true', async () => {
        const mockHoldings = [
            { id: 'h1', userId: 'user-1', ticker: 'AAPL', quantity: 10 }
        ];
        (prisma.holding.findMany as any).mockResolvedValue(mockHoldings);

        const result = await getHoldings('user-1', true);

        expect(prisma.holding.findMany).toHaveBeenCalledWith({
            where: {
                userId: 'user-1',
                quantity: { gt: 0 }
            }
        });
        expect(result).toEqual(mockHoldings);
    });

    it('should fetch holding history ordered by recordedAt desc when onlyWithBalance is false', async () => {
        const mockHistory = [
            { id: 'hist1', userId: 'user-1', ticker: 'AAPL', quantity: 10, recordedAt: new Date() },
            { id: 'hist2', userId: 'user-1', ticker: 'MSFT', quantity: 0, recordedAt: new Date() }
        ];
        (prisma.holdingHistory.findMany as any).mockResolvedValue(mockHistory);

        const result = await getHoldingHistory('user-1', undefined, false);

        expect(prisma.holdingHistory.findMany).toHaveBeenCalledWith({
            where: { userId: 'user-1' },
            orderBy: { recordedAt: 'desc' }
        });
        expect(result).toEqual(mockHistory);
    });

    it('should fetch holding history filtered by quantity > 0 when onlyWithBalance is true', async () => {
        const mockHistory = [
            { id: 'hist1', userId: 'user-1', ticker: 'AAPL', quantity: 10, recordedAt: new Date() }
        ];
        (prisma.holdingHistory.findMany as any).mockResolvedValue(mockHistory);

        const result = await getHoldingHistory('user-1', undefined, true);

        expect(prisma.holdingHistory.findMany).toHaveBeenCalledWith({
            where: {
                userId: 'user-1',
                quantity: { gt: 0 }
            },
            orderBy: { recordedAt: 'desc' }
        });
        expect(result).toEqual(mockHistory);
    });

    it('should fetch holding history with custom limit when provided', async () => {
        const mockHistory = [
            { id: 'hist1', userId: 'user-1', ticker: 'AAPL', quantity: 10, recordedAt: new Date() }
        ];
        (prisma.holdingHistory.findMany as any).mockResolvedValue(mockHistory);

        const result = await getHoldingHistory('user-1', 50, false);

        expect(prisma.holdingHistory.findMany).toHaveBeenCalledWith({
            where: { userId: 'user-1' },
            orderBy: { recordedAt: 'desc' },
            take: 50
        });
        expect(result).toEqual(mockHistory);
    });
});
