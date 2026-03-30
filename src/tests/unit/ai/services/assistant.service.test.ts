import { describe, it, expect, vi, beforeEach } from 'vitest';
import { unifiedAssistantQuery } from '../../../../ai/services/assistant.service';
import prisma from '../../../../utils/db';
import * as aiProvider from '../../../../ai/utils/ai_provider';
import * as transactionService from '../../../../ai/services/transaction.service';

vi.mock('../../../../utils/db', () => ({
    default: {
        chatMessage: {
            findMany: vi.fn(),
            createMany: vi.fn(),
        }
    }
}));

vi.mock('../../../../ai/utils/ai_provider', () => ({
    generateAiResponse: vi.fn()
}));

vi.mock('../../../../ai/services/transaction.service', () => ({
    askQuestionToTransactionAgent: vi.fn()
}));

describe('Assistant Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (prisma.chatMessage.findMany as any).mockResolvedValue([
            { role: 'user', content: 'hello', intent: 'general' }
        ]);
        (prisma.chatMessage.createMany as any).mockResolvedValue({ count: 2 });
    });

    describe('unifiedAssistantQuery', () => {
        it('should route to transaction agent when intent is transaction', async () => {
            // Mock intent resolution
            (aiProvider.generateAiResponse as any).mockResolvedValueOnce(JSON.stringify({
                intent: 'transaction',
                confidence: 0.9
            }));

            // Mock transaction service response
            (transactionService.askQuestionToTransactionAgent as any).mockResolvedValueOnce({
                success: true,
                answer: { type: 'chat', message: 'You spent $50 on food.' }
            });

            const result = await unifiedAssistantQuery('user1', 'How much did I spend on food?');

            expect(aiProvider.generateAiResponse).toHaveBeenCalledTimes(1);
            expect(transactionService.askQuestionToTransactionAgent).toHaveBeenCalledWith('user1', 'How much did I spend on food?');
            expect(result).toEqual({
                success: true,
                answer: { type: 'chat', message: 'You spent $50 on food.' }
            });
            expect(prisma.chatMessage.createMany).toHaveBeenCalled();
        });

        it('should fallback to general query if intent is missing', async () => {
            // Mock intent resolution failing (returns invalid JSON or no intent)
            (aiProvider.generateAiResponse as any).mockResolvedValueOnce('I am confused');

            // Mock fallback response
            (aiProvider.generateAiResponse as any).mockResolvedValueOnce(JSON.stringify({
                type: 'chat',
                message: 'I am a general assistant.'
            }));

            const result = await unifiedAssistantQuery('user1', 'What is the meaning of life?');

            expect(aiProvider.generateAiResponse).toHaveBeenCalledTimes(2);
            expect(transactionService.askQuestionToTransactionAgent).not.toHaveBeenCalled();
            expect(result.answer.message).toBe('I am a general assistant.');
        });
    });
});
