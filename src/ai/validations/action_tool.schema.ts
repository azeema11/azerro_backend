import { z } from "zod";
import { Category, TransactionType, Periodicity } from "@prisma/client";

const CATEGORIES = Object.values(Category) as [string, ...string[]];
const TRANSACTION_TYPES = Object.values(TransactionType) as [string, ...string[]];
const PERIODS = Object.values(Periodicity) as [string, ...string[]];

export const createTransactionSchema = z.object({
    amount: z.number().positive().describe("Transaction amount (must be positive)"),
    category: z.enum(CATEGORIES).describe("Transaction category"),
    type: z.enum(TRANSACTION_TYPES).describe("Transaction type"),
    description: z.string().optional().describe("Optional description for the transaction"),
    currency: z.string().optional().describe("3-letter currency code (defaults to user's base currency)"),
    date: z.string().optional().describe("Transaction date in ISO format (defaults to today)"),
});

export const updateGoalSchema = z.object({
    goalId: z.string().describe("The ID of the goal to update"),
    targetAmount: z.number().positive().optional().describe("New target amount (must be positive)"),
    targetDate: z.string().optional().describe("New target date in YYYY-MM-DD format"),
    savedAmount: z.number().nonnegative().optional().describe("New total saved amount towards this goal (must be non-negative)"),
    completed: z.boolean().optional().describe("Set to true to mark goal as completed, false to reopen"),
    name: z.string().optional().describe("New name for the goal"),
    description: z.string().optional().describe("New description for the goal"),
});

export const createGoalSchema = z.object({
    name: z.string().describe("Name of the savings goal"),
    targetAmount: z.number().positive().describe("Target amount to save (must be positive)"),
    targetDate: z.string().describe("Target date to reach the goal in YYYY-MM-DD format"),
    description: z.string().optional().describe("Optional description for the goal"),
    currency: z.string().optional().describe("3-letter currency code (defaults to user's base currency)"),
});

export const createBudgetSchema = z.object({
    category: z.enum(CATEGORIES).describe("Budget category"),
    amount: z.number().positive().describe("Budget limit amount (must be positive)"),
    period: z.enum(PERIODS).describe("Budget period (e.g. MONTHLY)"),
    currency: z.string().optional().describe("3-letter currency code (defaults to user's base currency)"),
});

export const createPlannedEventSchema = z.object({
    name: z.string().describe("Name of the planned event"),
    estimatedCost: z.number().positive().describe("Estimated cost of the event (must be positive)"),
    targetDate: z.string().describe("Target date for the event in YYYY-MM-DD format"),
    category: z.enum(CATEGORIES).describe("Event expense category"),
    recurrence: z.enum(PERIODS).optional().describe("Recurrence pattern (default ONE_TIME)"),
    currency: z.string().optional().describe("3-letter currency code (defaults to user's base currency)"),
});

export const updatePlannedEventSchema = z.object({
    eventId: z.string().describe("The ID of the planned event to update"),
    name: z.string().optional().describe("New name for the event"),
    estimatedCost: z.number().positive().optional().describe("Revised estimated cost (must be positive)"),
    targetDate: z.string().optional().describe("New target date in YYYY-MM-DD format"),
    savedSoFar: z.number().nonnegative().optional().describe("New total amount saved towards this event (must be non-negative)"),
    completed: z.boolean().optional().describe("Set to true to mark event as completed, false to reopen"),
});
