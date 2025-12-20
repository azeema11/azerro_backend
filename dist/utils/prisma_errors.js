"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConflictError = exports.ForbiddenError = exports.ValidationError = exports.NotFoundError = exports.DomainError = void 0;
exports.isPrismaError = isPrismaError;
exports.handlePrismaError = handlePrismaError;
exports.handleNotFoundError = handleNotFoundError;
exports.withNotFoundHandling = withNotFoundHandling;
exports.withPrismaErrorHandling = withPrismaErrorHandling;
exports.isDomainError = isDomainError;
exports.getHttpStatusCode = getHttpStatusCode;
exports.fromZodError = fromZodError;
exports.validateWithZod = validateWithZod;
const client_1 = require("@prisma/client");
/**
 * HTTP-aware domain error with status code and semantic information
 */
class DomainError extends Error {
    constructor(message, statusCode, resource, cause) {
        super(message);
        this.name = 'DomainError';
        this.statusCode = statusCode;
        this.resource = resource;
        this.cause = cause;
        // Preserve stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, DomainError);
        }
    }
}
exports.DomainError = DomainError;
/**
 * Specialized error for resource not found scenarios
 */
class NotFoundError extends DomainError {
    constructor(resource, cause) {
        super(`${resource} not found or access denied`, 404, resource, cause);
        this.name = 'NotFoundError';
    }
}
exports.NotFoundError = NotFoundError;
/**
 * Specialized error for validation failures
 * Enhanced to work with Zod and other validation scenarios
 */
class ValidationError extends DomainError {
    constructor(message, resource, cause, options) {
        super(message, 400, resource, cause);
        this.name = 'ValidationError';
        this.field = options?.field;
        this.validationType = options?.validationType || 'business';
        this.zodIssues = options?.zodIssues;
    }
}
exports.ValidationError = ValidationError;
/**
 * Specialized error for authorization failures
 */
class ForbiddenError extends DomainError {
    constructor(resource, cause) {
        super(`Access denied to ${resource}`, 403, resource, cause);
        this.name = 'ForbiddenError';
    }
}
exports.ForbiddenError = ForbiddenError;
/**
 * Specialized error for conflict scenarios (e.g., duplicate resources)
 */
class ConflictError extends DomainError {
    constructor(message, resource, cause) {
        super(message, 409, resource, cause);
        this.name = 'ConflictError';
    }
}
exports.ConflictError = ConflictError;
/**
 * Type guard to check if an error is a Prisma error
 */
function isPrismaError(error) {
    return error instanceof client_1.Prisma.PrismaClientKnownRequestError;
}
/**
 * Comprehensive Prisma error handler that maps common Prisma errors to domain errors
 */
function handlePrismaError(error, resourceName) {
    if (isPrismaError(error)) {
        switch (error.code) {
            case 'P2025':
                throw new NotFoundError(resourceName, error);
            case 'P2002':
                throw new ConflictError(`${resourceName} already exists with the provided unique field(s)`, resourceName, error);
            case 'P2003':
                throw new ValidationError(`Foreign key constraint failed on ${resourceName}`, resourceName, error);
            case 'P2004':
                throw new ValidationError(`Constraint failed on ${resourceName}`, resourceName, error);
            case 'P2014':
                throw new ValidationError(`Invalid relation data for ${resourceName}`, resourceName, error);
            default:
                // Re-throw Prisma errors that don't have specific mappings
                throw error;
        }
    }
    throw error;
}
/**
 * Centralized handler for "not found or access denied" errors
 * Maps Prisma P2025 errors to semantic NotFoundError with preserved stack
 */
function handleNotFoundError(error, resourceName) {
    if (isPrismaError(error) && error.code === 'P2025') {
        throw new NotFoundError(resourceName, error);
    }
    throw error;
}
/**
 * Enhanced wrapper for operations that may result in "not found" errors
 * Supports both synchronous and asynchronous operations
 */
async function withNotFoundHandling(operation, resourceName) {
    try {
        const result = operation();
        return await result; // Handles both sync and async results
    }
    catch (error) {
        handleNotFoundError(error, resourceName);
    }
}
/**
 * Enhanced wrapper for operations with comprehensive Prisma error handling
 * Supports both synchronous and asynchronous operations
 */
async function withPrismaErrorHandling(operation, resourceName) {
    try {
        const result = operation();
        return await result; // Handles both sync and async results
    }
    catch (error) {
        handlePrismaError(error, resourceName);
    }
}
/**
 * Type guard to check if an error is a domain error
 */
function isDomainError(error) {
    return error instanceof DomainError;
}
/**
 * Utility for extracting HTTP status code from any error
 */
function getHttpStatusCode(error) {
    if (isDomainError(error)) {
        return error.statusCode;
    }
    return 500; // Internal Server Error for unknown errors
}
/**
 * Convert Zod error to ValidationError
 * Maps Zod validation failures to our domain error system
 */
function fromZodError(zodError, resource) {
    const issues = zodError.issues || [];
    const firstIssue = issues[0];
    // Create user-friendly message
    const message = firstIssue
        ? `${firstIssue.path.join('.')} ${firstIssue.message}`.toLowerCase()
        : 'Invalid input data';
    return new ValidationError(message, resource, zodError, {
        field: firstIssue?.path.join('.'),
        validationType: 'schema',
        zodIssues: issues
    });
}
/**
 * Safe validation wrapper that converts Zod errors to ValidationError
 */
function validateWithZod(schema, // z.ZodSchema<T>
data, resource) {
    try {
        return schema.parse(data);
    }
    catch (error) {
        if (error?.name === 'ZodError') {
            throw fromZodError(error, resource);
        }
        throw error;
    }
}
