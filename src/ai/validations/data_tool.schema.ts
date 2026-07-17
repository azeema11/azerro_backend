import { z } from "zod";
import { Category, TransactionType, Periodicity, AssetType, AccountType } from "@prisma/client";

const CATEGORIES = Object.values(Category) as [string, ...string[]];
const TRANSACTION_TYPES = Object.values(TransactionType) as [string, ...string[]];
const PERIODS = Object.values(Periodicity) as [string, ...string[]];
const ASSET_TYPES = Object.values(AssetType) as [string, ...string[]];
const ACCOUNT_TYPES = Object.values(AccountType) as [string, ...string[]];

export const getTransactionsSchema = z.object({
    category: z.enum(CATEGORIES).optional().describe("Filter by transaction category"),
    type: z.enum(TRANSACTION_TYPES).optional().describe("Filter by type: INCOME or EXPENSE"),
    startDate: z.string().optional().describe("Start date in ISO format (e.g. 2025-01-01). Only returns transactions on or after this date."),
    endDate: z.string().optional().describe("End date in ISO format (e.g. 2025-01-31). Only returns transactions on or before this date."),
    limit: z.number().optional().describe("Maximum number of transactions to return (default 50)"),
});

export const getGoalsSchema = z.object({
    includeCompleted: z.boolean().optional().describe("If true, include completed goals as well"),
});

export const getBudgetsSchema = z.object({
    category: z.enum(CATEGORIES).optional().describe("Filter by budget category"),
});

export const getPlannedEventsSchema = z.object({
    includeCompleted: z.boolean().optional().describe("If true, include completed events"),
});

export const getUserProfileSchema = z.object({});

export const getReportSchema = z.object({
    reportType: z.enum(["budget_vs_actual", "income_vs_expense", "category_breakdown"]).describe("Type of report to generate"),
    period: z.enum(PERIODS).optional().describe("Budget period (default MONTHLY). Used for budget_vs_actual and income_vs_expense."),
    date: z.string().optional().describe("Reference date in ISO format (default today). The report covers the period containing this date."),
    startDate: z.string().optional().describe("Start date for category_breakdown (ISO format). Defaults to start of current month."),
    endDate: z.string().optional().describe("End date for category_breakdown (ISO format). Defaults to end of current month."),
});

export const getHoldingsSchema = z.object({
    assetType: z.enum(ASSET_TYPES).optional().describe("Filter by asset type (STOCK, CRYPTO, METAL)"),
    onlyWithBalance: z.boolean().optional().describe("If true, only returns holdings with a positive balance (quantity > 0)"),
});

export const getHoldingsHistorySchema = z.object({
    sinceDays: z.number().optional().describe("Only return history snapshot records recorded in the last N days"),
    ticker: z.string().optional().describe("Filter history snapshots by ticker (case-insensitive)"),
    limit: z.number().optional().describe("Maximum number of history snapshot records to return (default 100)"),
});

export const getBankAccountsSchema = z.object({
    type: z.enum(ACCOUNT_TYPES).optional().describe("Filter by account type (SAVINGS, CURRENT, CREDIT_CARD, CASH)"),
});
