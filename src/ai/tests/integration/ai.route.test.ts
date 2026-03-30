import request from 'supertest';
import express, { Express } from 'express';
import aiRouter from '../../routes/ai.route';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import * as aiProvider from '../../utils/ai_provider';
import prisma from '../../../utils/db';

// Mock auth middleware to bypass JWT check for tests
vi.mock('../../../middlewares/auth.middleware', () => ({
  authMiddleware: (req: any, res: any, next: any) => {
    req.userId = 'test-user-id';
    next();
  }
}));

// Mock the AI provider so we don't make real API calls
vi.mock('../../utils/ai_provider', () => ({
  generateAiResponse: vi.fn()
}));

let app: Express;

beforeAll(async () => {
    // We are running against real db, make sure a test user exists
    await prisma.user.upsert({
        where: { id: 'test-user-id' },
        update: {},
        create: {
            id: 'test-user-id',
            name: 'Test User',
            email: 'test@example.com',
            passwordHash: 'hash',
            baseCurrency: 'USD',
            monthlyIncome: 5000
        }
    });
});

beforeEach(() => {
  app = express();
  app.use(express.json());
  app.use('/ai', authMiddleware, aiRouter);
  vi.clearAllMocks();
});

afterAll(async () => {
    await prisma.user.delete({ where: { id: 'test-user-id' } });
});

describe('AI Routes Integration', () => {
  describe('POST /ai/assistant', () => {
    it('should route intent correctly and return JSON', async () => {
      // Mock the intent routing response
      (aiProvider.generateAiResponse as any).mockResolvedValueOnce(JSON.stringify({
        intent: "general",
        confidence: 0.9,
        extractedParams: {}
      }));

      // Mock the actual handler response
      (aiProvider.generateAiResponse as any).mockResolvedValueOnce(JSON.stringify({
        type: "chat",
        message: "This is a general response.",
        action: null
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
        .send({}); // Missing message

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });
  });
});
