import { describe, it, expect, vi, beforeEach } from 'vitest';
import { unifiedAssistantQuery } from '../../services/assistant.service';

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

const { mockGenerateAiResponse } = vi.hoisted(() => ({
    mockGenerateAiResponse: vi.fn()
}));
vi.mock('../../utils/ai_provider', () => ({
    generateAiResponse: mockGenerateAiResponse,
    generateAndParse: async (
        prompt: string,
        fallbackFn: (raw: string) => any,
        errorFallback: any,
    ) => {
        try {
            const text = await mockGenerateAiResponse(prompt);
            const parsed = JSON.parse(text);
            return { success: true, answer: parsed };
        } catch {
            return { success: false, answer: errorFallback };
        }
    },
}));

describe('Assistant Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should handle general intent correctly', async () => {
        mockGenerateAiResponse
            .mockResolvedValueOnce(JSON.stringify({
                intent: 'general', confidence: 0.9, extractedParams: {}
            }))
            .mockResolvedValueOnce(JSON.stringify({
                type: 'chat', message: 'Hello, how can I help?', action: null
            }));

        const result = await unifiedAssistantQuery('user1', 'Hello');

        expect(result.success).toBe(true);
        expect(result.answer.type).toBe('chat');
        expect(result.answer.message).toBe('Hello, how can I help?');
    });
});
