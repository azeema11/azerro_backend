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