import request from 'supertest';
import express, { Express } from 'express';
import aiRouter from '../../routes/ai.route';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../utils/db', () => ({
    default: {
        user: { findUnique: vi.fn().mockResolvedValue({ id: 'test-user-id', name: 'Test User', baseCurrency: 'USD', monthlyIncome: 5000 }) },
        chatMessage: { findMany: vi.fn().mockResolvedValue([]), createMany: vi.fn().mockResolvedValue({ count: 2 }) },
        budget: { findMany: vi.fn().mockResolvedValue([]) },
        goal: { findMany: vi.fn().mockResolvedValue([]) },
        plannedEvent: { findMany: vi.fn().mockResolvedValue([]) },
        transaction: { findMany: vi.fn().mockResolvedValue([]) },
    }
}));

const { mockRunAssistant } = vi.hoisted(() => ({
    mockRunAssistant: vi.fn()
}));
vi.mock('../../adk/runner', () => ({
    runAssistant: mockRunAssistant,
    runner: {},
    APP_NAME: 'azerro',
}));

let app: Express;

beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use((req: any, _res: any, next: any) => { req.userId = 'test-user-id'; next(); });
    app.use('/ai', aiRouter);
    vi.clearAllMocks();
    mockRunAssistant.mockReset();
});

describe('Unified Assistant Route - POST /ai/assistant', () => {
    it('should return 400 when message is missing', async () => {
        const response = await request(app)
            .post('/ai/assistant')
            .send({});

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Validation failed');
    });

    it('should return 400 when message is empty string', async () => {
        const response = await request(app)
            .post('/ai/assistant')
            .send({ message: '   ' });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Validation failed');
    });

    it('should return 400 when message is not a string', async () => {
        const response = await request(app)
            .post('/ai/assistant')
            .send({ message: 123 });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Validation failed');
    });

    it('should call runAssistant and return the response', async () => {
        mockRunAssistant.mockResolvedValueOnce({
            success: true,
            message: 'Your top spending category is Food at $450.',
            actions: [],
            events: [
                { author: 'azerro_finance_assistant', text: 'Your top spending category is Food at $450.', isFinal: true }
            ],
        });

        const response = await request(app)
            .post('/ai/assistant')
            .send({ message: 'What are my top spending categories?' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('Food');
        expect(response.body.actions).toEqual([]);
        expect(response.body.events).toHaveLength(1);
        expect(response.body.events[0].isFinal).toBe(true);

        expect(mockRunAssistant).toHaveBeenCalledWith(
            'test-user-id',
            'What are my top spending categories?',
            undefined
        );
    });

    it('should return executed actions when assistant performs writes', async () => {
        mockRunAssistant.mockResolvedValueOnce({
            success: true,
            message: 'Transaction created: EXPENSE of 50 USD in GROCERY.',
            actions: [
                { tool: 'create_transaction', args: { amount: 50, category: 'GROCERY', type: 'EXPENSE' }, result: { status: 'success' } }
            ],
            events: [
                { author: 'azerro_finance_assistant', text: 'Transaction created: EXPENSE of 50 USD in GROCERY.', isFinal: true }
            ],
        });

        const response = await request(app)
            .post('/ai/assistant')
            .send({ message: 'Yes, go ahead and create it.' });

        expect(response.status).toBe(200);
        expect(response.body.actions).toHaveLength(1);
        expect(response.body.actions[0].tool).toBe('create_transaction');
    });

    it('should pass sessionId to runAssistant when provided', async () => {
        mockRunAssistant.mockResolvedValueOnce({
            success: true,
            message: 'Here are more details.',
            actions: [],
            events: [{ author: 'azerro_finance_assistant', text: 'Here are more details.', isFinal: true }],
        });

        const response = await request(app)
            .post('/ai/assistant')
            .send({ message: 'Tell me more', sessionId: 'custom-session-123' });

        expect(response.status).toBe(200);
        expect(mockRunAssistant).toHaveBeenCalledWith(
            'test-user-id',
            'Tell me more',
            'custom-session-123'
        );
    });

    it('should handle runAssistant errors gracefully', async () => {
        mockRunAssistant.mockRejectedValueOnce(new Error('LLM service unavailable'));

        const response = await request(app)
            .post('/ai/assistant')
            .send({ message: 'Hello' });

        expect(response.status).toBe(500);
    });

    it('should trim whitespace from the message', async () => {
        mockRunAssistant.mockResolvedValueOnce({
            success: true,
            message: 'Response here.',
            events: [],
        });

        await request(app)
            .post('/ai/assistant')
            .send({ message: '  How am I doing financially?  ' });

        expect(mockRunAssistant).toHaveBeenCalledWith(
            'test-user-id',
            'How am I doing financially?',
            undefined
        );
    });
});
