import { FunctionTool, Context } from "@google/adk";
import { z } from "zod";
import { Category, TransactionType, Periodicity } from "@prisma/client";
import { handleCreateTransaction } from "../../controllers/transaction.controller";
import { handleCreateGoal, handleUpdateGoal } from "../../controllers/goal.controller";
import { handleCreateBudget } from "../../controllers/budget.controller";
import { handleCreatePlannedEvent, handleUpdatePlannedEvent } from "../../controllers/planned_event.controller";

const CATEGORIES = Object.values(Category) as [string, ...string[]];
const TRANSACTION_TYPES = Object.values(TransactionType) as [string, ...string[]];
const PERIODS = Object.values(Periodicity) as [string, ...string[]];

function getUserId(ctx?: Context): string {
    const userId = ctx?.state.get<string>("temp:userId");
    if (!userId) throw new Error("userId not found in session state");
    return userId;
}

export const createTransactionTool = new FunctionTool({
    name: "create_transaction",
    description:
        `Creates a new transaction for the user. ONLY call this AFTER the user has explicitly confirmed the proposed transaction details. ` +
        `Valid categories: ${CATEGORIES.join(", ")}. Valid types: ${TRANSACTION_TYPES.join(", ")}.`,
    parameters: z.object({
        amount: z.number().describe("Transaction amount (must be positive)"),
        category: z.enum(CATEGORIES).describe("Transaction category"),
        type: z.enum(TRANSACTION_TYPES).describe("Transaction type"),
        description: z.string().optional().describe("Optional description for the transaction"),
        currency: z.string().optional().describe("3-letter currency code (defaults to user's base currency)"),
        date: z.string().optional().describe("Transaction date in ISO format (defaults to today)"),
    }),
    execute: async (input, ctx) => {
        const userId = getUserId(ctx);
        return await handleCreateTransaction(userId, input);
    },
});

export const updateGoalTool = new FunctionTool({
    name: "update_goal",
    description:
        "Updates an existing goal. Supports changing target amount, target date, saved amount (progress), marking as completed, renaming, or updating description. " +
        "ONLY call this AFTER the user has explicitly confirmed the proposed changes. Provide the goal ID and only the fields that need to change.",
    parameters: z.object({
        goalId: z.string().describe("The ID of the goal to update"),
        targetAmount: z.number().optional().describe("New target amount (must be positive)"),
        targetDate: z.string().optional().describe("New target date in YYYY-MM-DD format"),
        savedAmount: z.number().optional().describe("New total saved amount towards this goal (must be non-negative)"),
        completed: z.boolean().optional().describe("Set to true to mark goal as completed, false to reopen"),
        name: z.string().optional().describe("New name for the goal"),
        description: z.string().optional().describe("New description for the goal"),
    }),
    execute: async (input, ctx) => {
        const userId = getUserId(ctx);
        return await handleUpdateGoal(userId, input);
    },
});

export const createGoalTool = new FunctionTool({
    name: "create_goal",
    description:
        "Creates a new savings goal for the user. ONLY call this AFTER the user has explicitly confirmed the proposed goal details. " +
        "Before creating, check existing goals with get_goals to detect potential conflicts (e.g. total goal amounts exceeding feasible savings).",
    parameters: z.object({
        name: z.string().describe("Name of the savings goal"),
        targetAmount: z.number().describe("Target amount to save (must be positive)"),
        targetDate: z.string().describe("Target date to reach the goal in YYYY-MM-DD format"),
        description: z.string().optional().describe("Optional description for the goal"),
        currency: z.string().optional().describe("3-letter currency code (defaults to user's base currency)"),
    }),
    execute: async (input, ctx) => {
        const userId = getUserId(ctx);
        return await handleCreateGoal(userId, input);
    },
});

export const createBudgetTool = new FunctionTool({
    name: "create_budget",
    description:
        `Creates or updates a budget for a specific category and period. ONLY call this AFTER the user has explicitly confirmed. ` +
        `Valid categories: ${CATEGORIES.join(", ")}. Valid periods: ${PERIODS.join(", ")}.`,
    parameters: z.object({
        category: z.enum(CATEGORIES).describe("Budget category"),
        amount: z.number().describe("Budget limit amount (must be positive)"),
        period: z.enum(PERIODS).describe("Budget period (e.g. MONTHLY)"),
        currency: z.string().optional().describe("3-letter currency code (defaults to user's base currency)"),
    }),
    execute: async (input, ctx) => {
        const userId = getUserId(ctx);
        return await handleCreateBudget(userId, input);
    },
});

export const createPlannedEventTool = new FunctionTool({
    name: "create_planned_event",
    description:
        `Creates a new planned financial event (an upcoming expense the user wants to prepare for). ` +
        `ONLY call this AFTER the user has explicitly confirmed the proposed event details. ` +
        `Valid categories: ${CATEGORIES.join(", ")}. Valid recurrence: ${PERIODS.join(", ")}.`,
    parameters: z.object({
        name: z.string().describe("Name of the planned event"),
        estimatedCost: z.number().describe("Estimated cost of the event (must be positive)"),
        targetDate: z.string().describe("Target date for the event in YYYY-MM-DD format"),
        category: z.enum(CATEGORIES).describe("Event expense category"),
        recurrence: z.enum(PERIODS).optional().describe("Recurrence pattern (default ONE_TIME)"),
        currency: z.string().optional().describe("3-letter currency code (defaults to user's base currency)"),
    }),
    execute: async (input, ctx) => {
        const userId = getUserId(ctx);
        return await handleCreatePlannedEvent(userId, input);
    },
});

export const updatePlannedEventTool = new FunctionTool({
    name: "update_planned_event",
    description:
        "Updates an existing planned event. Supports changing the name, estimated cost, target date, saved-so-far progress, or marking as completed. " +
        "ONLY call this AFTER the user has explicitly confirmed the proposed changes. Provide the event ID and only the fields that need to change.",
    parameters: z.object({
        eventId: z.string().describe("The ID of the planned event to update"),
        name: z.string().optional().describe("New name for the event"),
        estimatedCost: z.number().optional().describe("Revised estimated cost (must be positive)"),
        targetDate: z.string().optional().describe("New target date in YYYY-MM-DD format"),
        savedSoFar: z.number().optional().describe("New total amount saved towards this event (must be non-negative)"),
        completed: z.boolean().optional().describe("Set to true to mark event as completed, false to reopen"),
    }),
    execute: async (input, ctx) => {
        const userId = getUserId(ctx);
        return await handleUpdatePlannedEvent(userId, input);
    },
});

export const actionTools = [
    createTransactionTool,
    updateGoalTool,
    createGoalTool,
    createBudgetTool,
    createPlannedEventTool,
    updatePlannedEventTool,
];
