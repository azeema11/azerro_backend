import { describe, it, expect, vi, beforeEach } from 'vitest';
import { unifiedAssistantQuery } from '../../services/assistant.service';
import * as aiProvider from '../../utils/ai_provider';
import prisma from '../../../utils/db';

vi.mock('../../../utils/db', () => ({
    default: {
        chatMessage: {
            findMany: vi.fn().mockResolvedValue([]),
            createMany: vi.fn().mockResolvedValue({ count: 2 })
        },
        user: {
            findUnique: vi.fn().mockResolvedValue({
                id: 'user1',
                baseCurrency: 'USD',
                monthlyIncome: 5000
            })
        },
        budget: { findMany: vi.fn().mockResolvedValue([]) },
        goal: { findMany: vi.fn().mockResolvedValue([]) },
        transaction: { findMany: vi.fn().mockResolvedValue([]) }
    }
}));

vi.mock('../../utils/ai_provider', () => ({
    generateAiResponse: vi.fn()
}));

describe('Assistant Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should handle general intent correctly', async () => {
        // Mock routing response
        (aiProvider.generateAiResponse as any).mockResolvedValueOnce(JSON.stringify({
            intent: 'general',
            confidence: 0.9,
            extractedParams: {}
        }));

        // Mock chat response
        (aiProvider.generateAiResponse as any).mockResolvedValueOnce(JSON.stringify({
            type: 'chat',
            message: 'Hello, how can I help?',
            action: null
        }));

        const result = await unifiedAssistantQuery('user1', 'Hello');

        expect(result.success).toBe(true);
        expect(result.answer.type).toBe('chat');
        expect(result.answer.message).toBe('Hello, how can I help?');
    });
});
