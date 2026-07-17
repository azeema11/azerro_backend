import { toNumberSafe } from "../../utils/utils";
import { formatDateKey } from "../../utils/date";

export function presentTransaction(t: any) {
    return {
        id: t.id,
        date: t.date.toISOString(),
        amount: toNumberSafe(t.amount),
        category: t.category,
        description: t.description || "",
        currency: t.currency,
        type: t.type,
    };
}

export function presentGoal(g: any) {
    return {
        id: g.id,
        name: g.name,
        targetAmount: toNumberSafe(g.targetAmount),
        savedAmount: toNumberSafe(g.savedAmount),
        remaining: toNumberSafe(g.targetAmount) - toNumberSafe(g.savedAmount),
        targetDate: formatDateKey(g.targetDate),
        completed: g.completed,
        currency: g.currency,
    };
}

export function presentPlannedEvent(e: any) {
    return {
        id: e.id,
        name: e.name,
        estimatedCost: toNumberSafe(e.estimatedCost),
        targetDate: formatDateKey(e.targetDate),
        completed: e.completed,
        currency: e.currency,
        category: e.category,
    };
}

export function presentBudget(b: any) {
    return {
        id: b.id,
        category: b.category,
        budgetAmount: toNumberSafe(b.amount),
        period: b.period,
    };
}

export function presentHolding(h: any) {
    return {
        id: h.id,
        ticker: h.ticker,
        name: h.name,
        assetType: h.assetType,
        platform: h.platform,
        quantity: toNumberSafe(h.quantity),
        avgCost: toNumberSafe(h.avgCost),
        lastPrice: toNumberSafe(h.lastPrice),
        convertedValue: toNumberSafe(h.convertedValue),
        currency: h.holdingCurrency,
    };
}

export function presentHoldingHistory(h: any) {
    return {
        id: h.id,
        holdingId: h.holdingId,
        ticker: h.ticker,
        name: h.name,
        assetType: h.assetType,
        platform: h.platform,
        quantity: toNumberSafe(h.quantity),
        avgCost: toNumberSafe(h.avgCost),
        lastPrice: toNumberSafe(h.lastPrice),
        convertedValue: toNumberSafe(h.convertedValue),
        currency: h.holdingCurrency,
        recordedAt: h.recordedAt,
    };
}

export function presentBankAccount(a: any) {
    return {
        id: a.id,
        name: a.name,
        type: a.type,
        balance: toNumberSafe(a.balance),
        currency: a.currency,
    };
}

export function presentUserProfile(profile: any) {
    return {
        name: profile.name,
        baseCurrency: profile.baseCurrency,
        monthlyIncome: toNumberSafe(profile.monthlyIncome || 0),
    };
}
