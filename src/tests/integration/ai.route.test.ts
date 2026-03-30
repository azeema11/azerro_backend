import request from 'supertest';
import express, { Express } from 'express';
import aiRouter from '../../ai/routes/ai.route';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as aiProvider from '../../ai/utils/ai_provider';

// Mock auth middleware to bypass JWT check for tests
vi.mock('../../middlewares/auth.middleware', () => ({
  authMiddleware: (req: any, res: any, next: any) => {
    req.userId = 'test-user-id';
    next();
  }
}));

// Mock the AI provider so we don't make real API calls
vi.mock('../../ai/utils/ai_provider', () => ({
  generateAiResponse: vi.fn()
}));

// Mock Prisma
vi.mock('../../utils/db', () => {
    return {
        default: {
            user: { findUnique: vi.fn().mockResolvedValue({ id: 'test-user-id', baseCurrency: 'USD', monthlyIncome: 5000 }) },
            transaction: { findMany: vi.fn().mockResolvedValue([]) },
            budget: { findMany: vi.fn().mockResolvedValue([]) },
            goal: { findMany: vi.fn().mockResolvedValue([]) },
            plannedEvent: { findMany: vi.fn().mockResolvedValue([]) },
            chatMessage: {
                findMany: vi.fn().mockResolvedValue([]),
                createMany: vi.fn().mockResolvedValue({ count: 2 })
            }
        }
    }
});

let app: Express;

beforeEach(() => {
  app = express();
  app.use(express.json());
  app.use('/ai', authMiddleware, aiRouter);
  vi.clearAllMocks();
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

    it('should validate request body with Zod and fail missing message', async () => {
      const response = await request(app)
        .post('/ai/assistant')
        .send({}); // Missing message

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('POST /ai/report/summarize', () => {
    it('should validate reportType parameter', async () => {
      const response = await request(app)
        .post('/ai/report/summarize')
        .send({ reportType: 'invalidType' }); // Invalid enum

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should succeed with valid reportType', async () => {
      (aiProvider.generateAiResponse as any).mockResolvedValueOnce(JSON.stringify({
        type: "report_summary",
        title: "Test",
        summary: "Test summary",
        highlights: [],
        recommendations: []
      }));

      const response = await request(app)
        .post('/ai/report/summarize')
        .send({ reportType: 'budgetVsActual' }); // Valid enum

      expect(response.status).toBe(200);
    });
  });

  describe('Parameter-less endpoints', () => {
     it('GET /ai/planned-event/impact should resolve', async () => {
        (aiProvider.generateAiResponse as any).mockResolvedValueOnce(JSON.stringify({
            type: "event_impact_analysis",
            monthlySavingsRequiredForEvents: 100,
            impactOnGoals: "None",
            impactOnIncome: "Low",
            recommendations: []
        }));

        const response = await request(app).get('/ai/planned-event/impact');
        expect(response.status).toBe(200);
     });

     it('GET /ai/predictive/insights should resolve', async () => {
         (aiProvider.generateAiResponse as any).mockResolvedValueOnce(JSON.stringify({
             type: "predictive_insights",
             savingsForecast: "Good",
             spendingTrends: "Stable",
             goalProjections: [],
             recommendations: []
         }));

         const response = await request(app).get('/ai/predictive/insights');
         expect(response.status).toBe(200);
     });
  });
});
