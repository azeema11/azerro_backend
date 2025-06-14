export function monthsBetween(from: Date, to: Date): number {
    const fromYear = from.getFullYear();
    const fromMonth = from.getMonth();
    const toYear = to.getFullYear();
    const toMonth = to.getMonth();

    return (toYear - fromYear) * 12 + (toMonth - fromMonth);
}