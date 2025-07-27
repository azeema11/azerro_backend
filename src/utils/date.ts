import { Periodicity } from "@prisma/client";

export function daysBetween(from: Date, to: Date): number {
    // Calculate the time difference in milliseconds
    const timeDifference = to.getTime() - from.getTime();

    // Convert milliseconds to days (1 day = 24 * 60 * 60 * 1000 milliseconds)
    const daysDifference = Math.ceil(timeDifference / (1000 * 60 * 60 * 24));

    return daysDifference;
}

export function monthsBetween(from: Date, to: Date): number {
    // More accurate months calculation considering actual days
    const years = to.getFullYear() - from.getFullYear();
    const months = to.getMonth() - from.getMonth();
    const days = to.getDate() - from.getDate();

    // Calculate total months
    let totalMonths = years * 12 + months;

    // Adjust if the day of the month hasn't been reached yet
    if (days < 0) {
        totalMonths--;
    }

    return totalMonths;
}

export function weeksBetween(from: Date, to: Date): number {
    const days = daysBetween(from, to);
    return Math.ceil(days / 7);
}

/**
 * Calculate the exact difference between two dates in various units
 * @param from - Start date
 * @param to - End date
 * @returns Object with years, months, days difference
 */
export function dateDifference(from: Date, to: Date) {
    const start = new Date(from);
    const end = new Date(to);

    let years = end.getFullYear() - start.getFullYear();
    let months = end.getMonth() - start.getMonth();
    let days = end.getDate() - start.getDate();

    // Adjust for negative days
    if (days < 0) {
        months--;
        const daysInPreviousMonth = new Date(end.getFullYear(), end.getMonth(), 0).getDate();
        days += daysInPreviousMonth;
    }

    // Adjust for negative months
    if (months < 0) {
        years--;
        months += 12;
    }

    return {
        years,
        months,
        days,
        totalDays: daysBetween(from, to),
        totalMonths: years * 12 + months
    };
}

/**
 * Format a date difference in human-readable format
 * @param from - Start date
 * @param to - End date
 * @returns Human-readable string
 */
export function formatDateDifference(from: Date, to: Date): string {
    const diff = dateDifference(from, to);

    if (diff.totalDays < 0) {
        return "Overdue";
    }

    if (diff.totalDays === 0) {
        return "Today";
    }

    if (diff.totalDays === 1) {
        return "Tomorrow";
    }

    if (diff.totalDays < 7) {
        return `${diff.totalDays} days`;
    }

    if (diff.totalDays < 30) {
        const weeks = Math.floor(diff.totalDays / 7);
        const remainingDays = diff.totalDays % 7;
        return weeks === 1
            ? `1 week${remainingDays > 0 ? ` ${remainingDays} days` : ''}`
            : `${weeks} weeks${remainingDays > 0 ? ` ${remainingDays} days` : ''}`;
    }

    if (diff.years > 0) {
        return `${diff.years} year${diff.years > 1 ? 's' : ''} ${diff.months} month${diff.months !== 1 ? 's' : ''}`;
    }

    return `${diff.months} month${diff.months !== 1 ? 's' : ''} ${diff.days} day${diff.days !== 1 ? 's' : ''}`;
}

const frequencyThresholds: Record<Periodicity, number> = {
    WEEKLY: 7,
    MONTHLY: 31,
    QUARTERLY: 93,
    HALF_YEARLY: 186,
    YEARLY: 366,
};

export function detectFrequency(dates: Date[]): Periodicity | null {
    if (dates.length < 3) return null;

    const gaps = [];
    for (let i = 1; i < dates.length; i++) {
        const gap = Math.abs(daysBetween(dates[i], dates[i - 1]));
        gaps.push(gap);
    }
    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;

    if (avgGap <= frequencyThresholds.WEEKLY) return "WEEKLY";
    if (avgGap <= frequencyThresholds.MONTHLY) return "MONTHLY";
    if (avgGap <= frequencyThresholds.QUARTERLY) return "QUARTERLY";
    if (avgGap <= frequencyThresholds.HALF_YEARLY) return "HALF_YEARLY";
    if (avgGap <= frequencyThresholds.YEARLY) return "YEARLY";
    return null;
}

/**
 * Get the start and end dates for a given period
 * @param period - The period type (WEEKLY, MONTHLY, QUARTERLY, HALF_YEARLY, YEARLY)
 * @param referenceDate - Optional reference date, defaults to current date
 * @returns Object with start and end dates for the period
 */
export function getPeriodDates(period: Periodicity, referenceDate: Date = new Date()) {
    const now = new Date(referenceDate);
    let start: Date;
    let end: Date;

    switch (period) {
        case 'WEEKLY':
            // Start of current week (Monday)
            start = new Date(now);
            const dayOfWeek = start.getDay();
            const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 0, Monday = 1
            start.setDate(start.getDate() - daysToMonday);
            start.setHours(0, 0, 0, 0);

            // End of current day
            end = new Date(now);
            end.setHours(23, 59, 59, 999);
            break;

        case 'MONTHLY':
            // Start of current month
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            start.setHours(0, 0, 0, 0);

            // End of current day
            end = new Date(now);
            end.setHours(23, 59, 59, 999);
            break;

        case 'QUARTERLY':
            // Start of current quarter
            const currentQuarter = Math.floor(now.getMonth() / 3);
            start = new Date(now.getFullYear(), currentQuarter * 3, 1);
            start.setHours(0, 0, 0, 0);

            // End of current day
            end = new Date(now);
            end.setHours(23, 59, 59, 999);
            break;

        case 'HALF_YEARLY':
            // Start of current half year (Jan 1 or Jul 1)
            const halfYear = now.getMonth() < 6 ? 0 : 6;
            start = new Date(now.getFullYear(), halfYear, 1);
            start.setHours(0, 0, 0, 0);

            // End of current day
            end = new Date(now);
            end.setHours(23, 59, 59, 999);
            break;

        case 'YEARLY':
            // Start of current year
            start = new Date(now.getFullYear(), 0, 1);
            start.setHours(0, 0, 0, 0);

            // End of current day
            end = new Date(now);
            end.setHours(23, 59, 59, 999);
            break;

        default:
            throw new Error(`Invalid period: ${period}`);
    }

    return {
        start,
        end,
    };
}