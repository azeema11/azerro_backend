import { FunctionTool } from "@google/adk";
import { handleGetTransactions } from "../../controllers/transaction.controller";
import { handleGetGoals } from "../../controllers/goal.controller";
import { handleGetBudgets } from "../../controllers/budget.controller";
import { handleGetPlannedEvents } from "../../controllers/planned_event.controller";
import { handleGetUserProfile } from "../../controllers/user.controller";
import { handleGetReport } from "../../controllers/report.controller";
import { handleGetHoldings, handleGetHoldingHistory } from "../../controllers/holding.controller";
import { handleGetBankAccounts } from "../../controllers/bank_account.controller";
import {
    getTransactionsSchema,
    getGoalsSchema,
    getBudgetsSchema,
    getPlannedEventsSchema,
    getUserProfileSchema,
    getReportSchema,
    getHoldingsSchema,
    getHoldingsHistorySchema,
    getBankAccountsSchema,
} from "../../validations/data_tool.schema";
import { getUserId, withToolErrorHandling } from "../../utils/adk_context";

export const getTransactionsTool = new FunctionTool({
    name: "get_transactions",
    description:
        "Fetches the authenticated user's transactions. Optionally filter by category, type, date range, or limit the number of results. Returns an array of transaction objects.",
    parameters: getTransactionsSchema,
    execute: withToolErrorHandling(async (input, ctx) => {
        const userId = getUserId(ctx);
        return await handleGetTransactions(userId, input);
    }, "Failed to fetch transactions"),
});

export const getGoalsTool = new FunctionTool({
    name: "get_goals",
    description:
        "Fetches the user's savings goals. Returns active (not completed) goals by default. Each goal includes name, target amount, saved amount, and target date.",
    parameters: getGoalsSchema,
    execute: withToolErrorHandling(async (input, ctx) => {
        const userId = getUserId(ctx);
        return await handleGetGoals(userId, input.includeCompleted);
    }, "Failed to fetch goals"),
});

export const getBudgetsTool = new FunctionTool({
    name: "get_budgets",
    description:
        "Fetches the user's budgets. Returns each budget's category, budget amount, and period (WEEKLY/MONTHLY/ANNUAL).",
    parameters: getBudgetsSchema,
    execute: withToolErrorHandling(async (input, ctx) => {
        const userId = getUserId(ctx);
        return await handleGetBudgets(userId, input.category);
    }, "Failed to fetch budgets"),
});

export const getPlannedEventsTool = new FunctionTool({
    name: "get_planned_events",
    description:
        "Fetches the user's planned financial events (upcoming expenses or income). Returns event name, estimated cost, target date, and completion status.",
    parameters: getPlannedEventsSchema,
    execute: withToolErrorHandling(async (input, ctx) => {
        const userId = getUserId(ctx);
        return await handleGetPlannedEvents(userId, input.includeCompleted);
    }, "Failed to fetch planned events"),
});

export const getUserProfileTool = new FunctionTool({
    name: "get_user_profile",
    description:
        "Fetches the authenticated user's financial profile including their base currency, monthly income, and name. Use this to understand the user's financial context.",
    parameters: getUserProfileSchema,
    execute: withToolErrorHandling(async (_input, ctx) => {
        const userId = getUserId(ctx);
        return await handleGetUserProfile(userId);
    }, "Failed to fetch user profile"),
});

export const getReportTool = new FunctionTool({
    name: "get_report",
    description:
        `Generates a financial report for the user with proper multi-currency conversion. ` +
        `Available report types: "budget_vs_actual" (compares budgets to actual spending), ` +
        `"income_vs_expense" (income minus expenses for a period), ` +
        `"category_breakdown" (expense breakdown by category). ` +
        `Use this instead of manually computing totals from raw transactions — it handles currency conversion automatically.`,
    parameters: getReportSchema,
    execute: withToolErrorHandling(async (input, ctx) => {
        const userId = getUserId(ctx);
        return await handleGetReport(userId, input);
    }, "Failed to generate report"),
});

export const getHoldingsTool = new FunctionTool({
    name: "get_holdings",
    description:
        "Fetches the user's investment holdings (stocks, crypto, metals). Returns each holding's ticker, name, quantity, average cost, last price, and converted value.",
    parameters: getHoldingsSchema,
    execute: withToolErrorHandling(async (input, ctx) => {
        const userId = getUserId(ctx);
        return await handleGetHoldings(userId, input.assetType, input.onlyWithBalance);
    }, "Failed to fetch holdings"),
});

export const getHoldingsHistoryTool = new FunctionTool({
    name: "get_holdings_history",
    description:
        "Fetches the historical snapshots of the user's investment holdings over time, including sold (zero-balance) assets. Returns a list of historical holding snapshots with recorded dates.",
    parameters: getHoldingsHistorySchema,
    execute: withToolErrorHandling(async (input, ctx) => {
        const userId = getUserId(ctx);
        return await handleGetHoldingHistory(userId, input.limit, input.sinceDays, input.ticker);
    }, "Failed to fetch holdings history"),
});

export const getBankAccountsTool = new FunctionTool({
    name: "get_bank_accounts",
    description:
        "Fetches the user's bank accounts. Returns each account's name, type, balance, and currency.",
    parameters: getBankAccountsSchema,
    execute: withToolErrorHandling(async (input, ctx) => {
        const userId = getUserId(ctx);
        return await handleGetBankAccounts(userId, input.type);
    }, "Failed to fetch bank accounts"),
});

export const dataTools = [
    getTransactionsTool,
    getGoalsTool,
    getBudgetsTool,
    getPlannedEventsTool,
    getUserProfileTool,
    getReportTool,
    getHoldingsTool,
    getHoldingsHistoryTool,
    getBankAccountsTool,
];
