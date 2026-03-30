import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generatePredictiveInsights } from '../../../../ai/services/predictive.service';
import prisma from '../../../../utils/db';
import * as aiProvider from '../../../../ai/utils/ai_provider';

vi.mock('../../../../utils/db', () => ({
    default: {
        user: { findUnique: vi.fn() },
        transaction: { findMany: vi.fn() },
        goal: { findMany: vi.fn() }
    }
}));

vi.mock('../../../../ai/utils/ai_provider', () => ({
    generateAiResponse: vi.fn()
}));

describe('Predictive Insights Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('generatePredictiveInsights', () => {
        it('should fetch data and ask AI for insights', async () => {
            (prisma.user.findUnique as any).mockResolvedValue({ baseCurrency: 'USD', monthlyIncome: 5000 });
            (prisma.transaction.findMany as any).mockResolvedValue([
                { amount: 100, type: 'EXPENSE', category: 'Food', date: new Date() }
            ]);
            (prisma.goal.findMany as any).mockResolvedValue([
                { name: 'Car', targetAmount: 20000, savedAmount: 5000, targetDate: new Date() }
            ]);

            const expectedInsight = {
                type: 'predictive_insights',
                savingsForecast: 'You will save more.',
                spendingTrends: 'Food spending is stable.',
                goalProjections: [{ goalName: 'Car', onTrack: true, projectedCompletionDate: '2024-12-01' }],
                recommendations: ['Keep it up.']
            };

            (aiProvider.generateAiResponse as any).mockResolvedValue(JSON.stringify(expectedInsight));

            const result = await generatePredictiveInsights('user1');

            expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'user1' }, select: { baseCurrency: true, monthlyIncome: true } });
            expect(prisma.transaction.findMany).toHaveBeenCalled();
            expect(prisma.goal.findMany).toHaveBeenCalled();
            expect(aiProvider.generateAiResponse).toHaveBeenCalled();

            expect(result.success).toBe(true);
            expect(result.answer).toEqual(expectedInsight);
        });

        it('should handle errors gracefully', async () => {
            (prisma.user.findUnique as any).mockResolvedValue({ baseCurrency: 'USD', monthlyIncome: 5000 });
            (prisma.transaction.findMany as any).mockRejectedValue(new Error("DB Error"));

            const result = await generatePredictiveInsights('user1');

            expect(result.success).toBe(false);
            expect(result.answer.type).toBe('predictive_insights');
            expect(result.answer.savingsForecast).toBe('Error processing request.');
        });
    });
});
