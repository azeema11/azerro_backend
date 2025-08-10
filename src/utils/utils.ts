import { Prisma } from '@prisma/client';

export function groupBy<T>(array: T[], keyFn: (item: T) => string): Record<string, T[]> {
    return array.reduce((acc, item) => {
        const key = keyFn(item);
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
    }, {} as Record<string, T[]>);
}

/**
 * Convert number or Decimal to Decimal, preserving precision
 */
export function toDecimal(value: number | Prisma.Decimal): Prisma.Decimal {
    return typeof value === 'number' ? new Prisma.Decimal(value) : value;
}

/**
 * Safely convert Decimal to number for presentation boundaries only
 * WARNING: This causes precision loss - use only at presentation layer
 */
export function toNumberSafe(value: number | Prisma.Decimal): number {
    return typeof value === 'number' ? value : value.toNumber();
}

/**
 * Add two decimal or number values, returning Decimal for precision
 */
export function addDecimal(a: number | Prisma.Decimal, b: number | Prisma.Decimal): Prisma.Decimal {
    return toDecimal(a).add(toDecimal(b));
}

/**
 * Subtract two decimal or number values, returning Decimal for precision
 */
export function subtractDecimal(a: number | Prisma.Decimal, b: number | Prisma.Decimal): Prisma.Decimal {
    return toDecimal(a).sub(toDecimal(b));
}

/**
 * Multiply two decimal or number values, returning Decimal for precision
 */
export function multiplyDecimal(a: number | Prisma.Decimal, b: number | Prisma.Decimal): Prisma.Decimal {
    return toDecimal(a).mul(toDecimal(b));
}

/**
 * Divide two decimal or number values, returning Decimal for precision
 */
export function divideDecimal(a: number | Prisma.Decimal, b: number | Prisma.Decimal): Prisma.Decimal {
    return toDecimal(a).div(toDecimal(b));
}

/**
 * Compare two decimal or number values with precision
 * Returns: -1 if a < b, 0 if a === b, 1 if a > b
 */
export function compareDecimal(a: number | Prisma.Decimal, b: number | Prisma.Decimal): number {
    const decimalA = toDecimal(a);
    const decimalB = toDecimal(b);
    return decimalA.cmp(decimalB);
}