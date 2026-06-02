import request from 'supertest';
import express, { Express } from 'express';
import aiRouter from '../../routes/ai.route';
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

vi.mock('../../../utils/db', () => ({
    default: {
        user: {
            findUnique: vi.fn().mockResolvedValue({
                id: 'test-user-id',
                name: 'Test User',
                email: 'test@example.com',
                baseCurrency: 'USD',
                monthlyIncome: 5000
            }),
            upsert: vi.fn(),
            delete: vi.fn(),
        },
        chatMessage: {
            findMany: vi.fn().mockResolvedValue([]),
            createMany: vi.fn().mockResolvedValue({ count: 2 })
        },
        budget: { findMany: vi.fn().mockResolvedValue([]) },
        goal: { findMany: vi.fn().mockResolvedValue([]) },
        plannedEvent: { findMany: vi.fn().mockResolvedValue([]) },
        transaction: { findMany: vi.fn().mockResolvedValue([]) },
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
        _cacheKey?: string,
        _cacheTtl?: number,
    ) => {
        try {
            const text = await mockGenerateAiResponse(prompt);
            try {
                const parsed = JSON.parse(text);
                return { success: true, answer: parsed };
            } catch {
                return { success: true, answer: fallbackFn(text) };
            }
        } catch {
            return { success: false, answer: errorFallback };
        }
    },
}));

let app: Express;

beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use((req: any, _res: any, next: any) => { req.userId = 'test-user-id'; next(); });
    app.use('/ai', aiRouter);
    vi.clearAllMocks();
    mockGenerateAiResponse.mockReset();
});

describe('AI Routes Integration', () => {
    describe('POST /ai/assistant', () => {
        it('should route intent correctly and return JSON', async () => {
            mockGenerateAiResponse
                .mockResolvedValueOnce(JSON.stringify({
                    intent: 'general', confidence: 0.9, extractedParams: {}
                }))
                .mockResolvedValueOnce(JSON.stringify({
                    type: 'chat', message: 'This is a general response.', action: null
                }));

            const response = await request(app)
                .post('/ai/assistant')
                .send({ message: 'Hello AI' });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.answer.type).toBe('chat');
            expect(response.body.answer.message).toBe('This is a general response.');
        });

        it('should validate request body with Zod', async () => {
            const response = await request(app)
                .post('/ai/assistant')
                .send({});

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Validation failed');
        });
    });
});
