import { FunctionTool, Context } from "@google/adk";
import { z } from "zod";
import { Category, TransactionType, Periodicity, AssetType, AccountType } from "@prisma/client";
import { handleGetTransactions } from "../../controllers/transaction.controller";
import { handleGetGoals } from "../../controllers/goal.controller";
import { handleGetBudgets } from "../../controllers/budget.controller";
import { handleGetPlannedEvents } from "../../controllers/planned_event.controller";
import { handleGetUserProfile } from "../../controllers/user.controller";
import { handleGetReport } from "../../controllers/report.controller";
import { handleGetHoldings, handleGetHoldingHistory } from "../../controllers/holding.controller";
import { handleGetBankAccounts } from "../../controllers/bank_account.controller";

const CATEGORIES = Object.values(Category) as [string, ...string[]];
const TRANSACTION_TYPES = Object.values(TransactionType) as [string, ...string[]];
const PERIODS = Object.values(Periodicity) as [string, ...string[]];
const ASSET_TYPES = Object.values(AssetType) as [string, ...string[]];
const ACCOUNT_TYPES = Object.values(AccountType) as [string, ...string[]];

function getUserId(ctx?: Context): string {
    const userId = ctx?.state.get<string>("userId");
    if (!userId) throw new Error("userId not found in session state");
    return userId;
}

export const getTransactionsTool = new FunctionTool({
    name: "get_transactions",
    description:
        "Fetches the authenticated user's transactions. Optionally filter by category, type, date range, or limit the number of results. Returns an array of transaction objects.",
    parameters: z.object({
        category: z.enum(CATEGORIES).optional().describe("Filter by transaction category"),
        type: z.enum(TRANSACTION_TYPES).optional().describe("Filter by type: INCOME or EXPENSE"),
        startDate: z.string().optional().describe("Start date in ISO format (e.g. 2025-01-01). Only returns transactions on or after this date."),
        endDate: z.string().optional().describe("End date in ISO format (e.g. 2025-01-31). Only returns transactions on or before this date."),
        limit: z.number().optional().describe("Maximum number of transactions to return (default 50)"),
    }),
    execute: async (input, ctx) => {
        const userId = getUserId(ctx);
        return await handleGetTransactions(userId, input);
    },
});

export const getGoalsTool = new FunctionTool({
    name: "get_goals",
    description:
        "Fetches the user's savings goals. Returns active (not completed) goals by default. Each goal includes name, target amount, saved amount, and target date.",
    parameters: z.object({
        includeCompleted: z.boolean().optional().describe("If true, include completed goals as well"),
    }),
    execute: async (input, ctx) => {
        const userId = getUserId(ctx);
        return await handleGetGoals(userId, input.includeCompleted);
    },
});

export const getBudgetsTool = new FunctionTool({
    name: "get_budgets",
    description:
        "Fetches the user's budgets. Returns each budget's category, budget amount, and period (WEEKLY/MONTHLY/ANNUAL).",
    parameters: z.object({
        category: z.enum(CATEGORIES).optional().describe("Filter by budget category"),
    }),
    execute: async (input, ctx) => {
        const userId = getUserId(ctx);
        return await handleGetBudgets(userId, input.category);
    },
});

export const getPlannedEventsTool = new FunctionTool({
    name: "get_planned_events",
    description:
        "Fetches the user's planned financial events (upcoming expenses or income). Returns event name, estimated cost, target date, and completion status.",
    parameters: z.object({
        includeCompleted: z.boolean().optional().describe("If true, include completed events"),
    }),
    execute: async (input, ctx) => {
        const userId = getUserId(ctx);
        return await handleGetPlannedEvents(userId, input.includeCompleted);
    },
});

export const getUserProfileTool = new FunctionTool({
    name: "get_user_profile",
    description:
        "Fetches the authenticated user's financial profile including their base currency, monthly income, and name. Use this to understand the user's financial context.",
    parameters: z.object({}),
    execute: async (_input, ctx) => {
        const userId = getUserId(ctx);
        return await handleGetUserProfile(userId);
    },
});

export const getReportTool = new FunctionTool({
    name: "get_report",
    description:
        `Generates a financial report for the user with proper multi-currency conversion. ` +
        `Available report types: "budget_vs_actual" (compares budgets to actual spending), ` +
        `"income_vs_expense" (income minus expenses for a period), ` +
        `"category_breakdown" (expense breakdown by category). ` +
        `Valid periods: ${PERIODS.join(", ")}. ` +
        `Use this instead of manually computing totals from raw transactions — it handles currency conversion automatically.`,
    parameters: z.object({
        reportType: z.enum(["budget_vs_actual", "income_vs_expense", "category_breakdown"]).describe("Type of report to generate"),
        period: z.enum(PERIODS).optional().describe("Budget period (default MONTHLY). Used for budget_vs_actual and income_vs_expense."),
        date: z.string().optional().describe("Reference date in ISO format (default today). The report covers the period containing this date."),
        startDate: z.string().optional().describe("Start date for category_breakdown (ISO format). Defaults to start of current month."),
        endDate: z.string().optional().describe("End date for category_breakdown (ISO format). Defaults to end of current month."),
    }),
    execute: async (input, ctx) => {
        const userId = getUserId(ctx);
        try {
            return await handleGetReport(userId, input);
        } catch (err: any) {
            return { error: err.message || "Failed to generate report" };
        }
    },
});

export const getHoldingsTool = new FunctionTool({
    name: "get_holdings",
    description:
        `Fetches the user's investment holdings (stocks, crypto, metals). Returns each holding's ticker, name, quantity, average cost, last price, and converted value. ` +
        `Valid asset types: ${ASSET_TYPES.join(", ")}.`,
    parameters: z.object({
        assetType: z.enum(ASSET_TYPES).optional().describe("Filter by asset type (STOCK, CRYPTO, METAL)"),
        onlyWithBalance: z.boolean().optional().describe("If true, only returns holdings with a positive balance (quantity > 0)"),
    }),
    execute: async (input, ctx) => {
        const userId = getUserId(ctx);
        return await handleGetHoldings(userId, input.assetType, input.onlyWithBalance);
    },
});

export const getHoldingsHistoryTool = new FunctionTool({
    name: "get_holdings_history",
    description:
        "Fetches the historical snapshots of the user's investment holdings over time, including sold (zero-balance) assets. Returns a list of historical holding snapshots with recorded dates.",
    parameters: z.object({
        sinceDays: z.number().optional().describe("Only return history snapshot records recorded in the last N days"),
        ticker: z.string().optional().describe("Filter history snapshots by ticker (case-insensitive)"),
        limit: z.number().optional().describe("Maximum number of history snapshot records to return (default 100)"),
    }),
    execute: async (input, ctx) => {
        const userId = getUserId(ctx);
        return await handleGetHoldingHistory(userId, input.limit, input.sinceDays, input.ticker);
    },
});

export const getBankAccountsTool = new FunctionTool({
    name: "get_bank_accounts",
    description:
        `Fetches the user's bank accounts. Returns each account's name, type, balance, and currency. ` +
        `Valid account types: ${ACCOUNT_TYPES.join(", ")}.`,
    parameters: z.object({
        type: z.enum(ACCOUNT_TYPES).optional().describe("Filter by account type (SAVINGS, CURRENT, CREDIT_CARD, CASH)"),
    }),
    execute: async (input, ctx) => {
        const userId = getUserId(ctx);
        return await handleGetBankAccounts(userId, input.type);
    },
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
