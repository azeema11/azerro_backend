import { Category, Periodicity, TransactionType, AssetType, AccountType } from '@prisma/client';

// === Input Types for Creating Records ===

export interface CreateGoalInput {
    name: string;
    targetAmount: number;
    targetDate: string;
    description?: string;
    savedAmount?: number;
}

export interface ResolveGoalConflictInput {
    userId: string;
    conflictingGoal: {
        name: string;
        targetAmount: number;
        targetDate: string;
        currency: string;
        savedAmount?: number;
    };
    userMessage: string;
    // History of the chat conversation [ { role: 'user' | 'model', content: string } ]
    history?: { role: string; content: string }[];
}

export interface CreateTransactionInput {
    amount: number;
    currency: string;
    category: Category;
    date: string;
    type?: TransactionType;
    description?: string;
    bankAccountId?: string;
}

export interface CreatePlannedEventInput {
    name: string;
    targetDate: Date;
    estimatedCost: number;
    savedSoFar?: number;
    currency?: string;
    category?: Category;
    recurrence?: Periodicity;
}

export interface CreateBudgetInput {
    category: Category;
    amount: number;
    period: Periodicity;
}

export interface CreateHoldingInput {
    platform: string;
    ticker: string;
    assetType: AssetType;
    quantity: number;
    avgCost: number;
    holdingCurrency: string;
    name: string;
}

export interface CreateBankAccountInput {
    name: string;
    type: AccountType;
    balance?: number;
    currency?: string;
}

// === Update Types ===

// Goal update data - excludes userId, id, createdAt, updatedAt for security
export interface GoalUpdateData {
    name?: string;
    description?: string;
    targetAmount?: number;
    savedAmount?: number;
    currency?: string;
    targetDate?: Date;
    completed?: boolean;
}

// Transaction update data - excludes userId, id for security
export interface TransactionUpdateData {
    amount?: number;
    currency?: string;
    category?: Category;
    type?: TransactionType;
    description?: string;
    date?: Date;
    bankAccountId?: string;
}

// Holding update data - excludes userId, id for security
export interface HoldingUpdateData {
    platform?: string;
    ticker?: string;
    assetType?: AssetType;
    name?: string;
    quantity?: number;
    avgCost?: number;
    holdingCurrency?: string;
    lastPrice?: number;
    convertedValue?: number;
}

// Budget update data - excludes userId, id, createdAt for security
export interface BudgetUpdateData {
    category?: Category;
    amount?: number;
    period?: Periodicity;
}

// Bank Account update data - excludes userId, id, createdAt for security
export interface BankAccountUpdateData {
    name?: string;
    type?: AccountType;
    balance?: number;
    currency?: string;
}

// Planned Event update data - excludes userId, id, createdAt for security
export interface PlannedEventUpdateData {
    name?: string;
    targetDate?: Date;
    estimatedCost?: number;
    savedSoFar?: number;
    currency?: string;
    category?: Category;
    recurrence?: Periodicity;
    completed?: boolean;
    completedTxId?: string;
}
