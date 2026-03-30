import { z } from 'zod';

export const aiAssistantSchema = z.object({
    body: z.object({
        message: z.string().min(1, "Message is required"),
    }),
});

export const aiTransactionAgentSchema = z.object({
    body: z.object({
        question: z.string().min(1, "Question is required"),
    }),
});

export const aiGoalConflictSchema = z.object({
    body: z.object({
        conflictingGoal: z.object({
            name: z.string(),
            targetAmount: z.number(),
            targetDate: z.string().datetime()
        }),
        userMessage: z.string(),
        history: z.array(z.object({
            role: z.enum(['user', 'ai']),
            content: z.string()
        })).optional()
    }),
});

export const aiBudgetChatSchema = z.object({
    body: z.object({
        message: z.string().min(1, "Message is required"),
        history: z.array(z.object({
            role: z.enum(['user', 'ai']),
            content: z.string()
        })).optional()
    }),
});

export const aiReportSummarizeSchema = z.object({
    body: z.object({
        reportType: z.enum(['budgetVsActual', 'incomeVsExpense', 'categoryBreakdown']),
        options: z.any().optional()
    }),
});
