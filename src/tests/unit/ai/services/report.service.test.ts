import { describe, it, expect, vi, beforeEach } from 'vitest';
import { summarizeReport } from '../../../../ai/services/report.service';
import prisma from '../../../../utils/db';
import * as reportService from '../../../../services/report.service';
import * as aiProvider from '../../../../ai/utils/ai_provider';

vi.mock('../../../../utils/db', () => ({
    default: {
        user: { findUnique: vi.fn() }
    }
}));

vi.mock('../../../../services/report.service', () => ({
    getBudgetVsActual: vi.fn(),
    getIncomeVsExpense: vi.fn(),
    getCategoryBreakdown: vi.fn()
}));

vi.mock('../../../../ai/utils/ai_provider', () => ({
    generateAiResponse: vi.fn()
}));

describe('Report Summarization Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('summarizeReport', () => {
        it('should summarize category breakdown', async () => {
            (prisma.user.findUnique as any).mockResolvedValue({ baseCurrency: 'USD' });

            const mockReportData = [{ category: 'Food', total: 500 }, { category: 'Transport', total: 100 }];
            (reportService.getCategoryBreakdown as any).mockResolvedValue(mockReportData);

            const expectedSummary = {
                type: 'report_summary',
                title: 'Category Breakdown Summary',
                summary: 'You spent mostly on food.',
                highlights: ['Food: $500'],
                recommendations: ['Eat less out.']
            };

            (aiProvider.generateAiResponse as any).mockResolvedValue(JSON.stringify(expectedSummary));

            const result = await summarizeReport('user1', 'categoryBreakdown');

            expect(reportService.getCategoryBreakdown).toHaveBeenCalled();
            expect(aiProvider.generateAiResponse).toHaveBeenCalled();
            expect(result.success).toBe(true);
            expect(result.answer).toEqual(expectedSummary);
        });

        it('should return error for invalid report type', async () => {
            (prisma.user.findUnique as any).mockResolvedValue({ baseCurrency: 'USD' });

            const result = await summarizeReport('user1', 'invalidType');

            expect(result.success).toBe(false);
            expect(result.answer.error).toBe('Invalid report type requested for summarization.');
            expect(aiProvider.generateAiResponse).not.toHaveBeenCalled();
        });
    });
});
