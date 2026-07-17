import { FunctionTool, Context } from "@google/adk";
import { Category, TransactionType, Periodicity } from "@prisma/client";
import { handleCreateTransaction } from "../../controllers/transaction.controller";
import { handleCreateGoal, handleUpdateGoal } from "../../controllers/goal.controller";
import { handleCreateBudget } from "../../controllers/budget.controller";
import { handleCreatePlannedEvent, handleUpdatePlannedEvent } from "../../controllers/planned_event.controller";
import {
    createTransactionSchema,
    updateGoalSchema,
    createGoalSchema,
    createBudgetSchema,
    createPlannedEventSchema,
    updatePlannedEventSchema,
} from "../../validations/action_tool.schema";

const CATEGORIES = Object.values(Category) as [string, ...string[]];
const TRANSACTION_TYPES = Object.values(TransactionType) as [string, ...string[]];
const PERIODS = Object.values(Periodicity) as [string, ...string[]];

function getUserId(ctx?: Context): string {
    const userId = ctx?.state.get<string>("userId");
    if (!userId) throw new Error("userId not found in session state");
    return userId;
}

export const createTransactionTool = new FunctionTool({
    name: "create_transaction",
    description:
        `Creates a new transaction for the user. ONLY call this AFTER the user has explicitly confirmed the proposed transaction details. ` +
        `Valid categories: ${CATEGORIES.join(", ")}. Valid types: ${TRANSACTION_TYPES.join(", ")}.`,
    parameters: createTransactionSchema,
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
    parameters: updateGoalSchema,
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
    parameters: createGoalSchema,
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
    parameters: createBudgetSchema,
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
    parameters: createPlannedEventSchema,
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
    parameters: updatePlannedEventSchema,
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
