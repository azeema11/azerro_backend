"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.groupBy = groupBy;
exports.toDecimal = toDecimal;
exports.toNumberSafe = toNumberSafe;
exports.addDecimal = addDecimal;
exports.subtractDecimal = subtractDecimal;
exports.multiplyDecimal = multiplyDecimal;
exports.divideDecimal = divideDecimal;
exports.compareDecimal = compareDecimal;
const client_1 = require("@prisma/client");
function groupBy(array, keyFn) {
    return array.reduce((acc, item) => {
        const key = keyFn(item);
        if (!acc[key])
            acc[key] = [];
        acc[key].push(item);
        return acc;
    }, {});
}
/**
 * Convert number or Decimal to Decimal, preserving precision
 */
function toDecimal(value) {
    return typeof value === 'number' ? new client_1.Prisma.Decimal(value) : value;
}
/**
 * Safely convert Decimal to number for presentation boundaries only
 * WARNING: This causes precision loss - use only at presentation layer
 */
function toNumberSafe(value) {
    return typeof value === 'number' ? value : value.toNumber();
}
/**
 * Add two decimal or number values, returning Decimal for precision
 */
function addDecimal(a, b) {
    return toDecimal(a).add(toDecimal(b));
}
/**
 * Subtract two decimal or number values, returning Decimal for precision
 */
function subtractDecimal(a, b) {
    return toDecimal(a).sub(toDecimal(b));
}
/**
 * Multiply two decimal or number values, returning Decimal for precision
 */
function multiplyDecimal(a, b) {
    return toDecimal(a).mul(toDecimal(b));
}
/**
 * Divide two decimal or number values, returning Decimal for precision
 */
function divideDecimal(a, b) {
    return toDecimal(a).div(toDecimal(b));
}
/**
 * Compare two decimal or number values with precision
 * Returns: -1 if a < b, 0 if a === b, 1 if a > b
 */
function compareDecimal(a, b) {
    const decimalA = toDecimal(a);
    const decimalB = toDecimal(b);
    return decimalA.cmp(decimalB);
}
