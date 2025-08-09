import { Prisma } from '@prisma/client';

/**
 * HTTP-aware domain error with status code and semantic information
 */
export class DomainError extends Error {
    public readonly statusCode: number;
    public readonly resource: string;
    public readonly cause?: Error;

    constructor(
        message: string,
        statusCode: number,
        resource: string,
        cause?: Error
    ) {
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

/**
 * Specialized error for resource not found scenarios
 */
export class NotFoundError extends DomainError {
    constructor(resource: string, cause?: Error) {
        super(
            `${resource} not found or access denied`,
            404,
            resource,
            cause
        );
        this.name = 'NotFoundError';
    }
}

/**
 * Specialized error for validation failures
 * Enhanced to work with Zod and other validation scenarios
 */
export class ValidationError extends DomainError {
    public readonly field?: string;
    public readonly validationType?: 'schema' | 'business' | 'database';
    public readonly zodIssues?: any[]; // Zod issues if applicable

    constructor(
        message: string,
        resource: string,
        cause?: Error,
        options?: {
            field?: string;
            validationType?: 'schema' | 'business' | 'database';
            zodIssues?: any[];
        }
    ) {
        super(message, 400, resource, cause);
        this.name = 'ValidationError';
        this.field = options?.field;
        this.validationType = options?.validationType || 'business';
        this.zodIssues = options?.zodIssues;
    }
}

/**
 * Specialized error for authorization failures
 */
export class ForbiddenError extends DomainError {
    constructor(resource: string, cause?: Error) {
        super(
            `Access denied to ${resource}`,
            403,
            resource,
            cause
        );
        this.name = 'ForbiddenError';
    }
}

/**
 * Specialized error for conflict scenarios (e.g., duplicate resources)
 */
export class ConflictError extends DomainError {
    constructor(message: string, resource: string, cause?: Error) {
        super(message, 409, resource, cause);
        this.name = 'ConflictError';
    }
}

/**
 * Type guard to check if an error is a Prisma error
 */
export function isPrismaError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
    return error instanceof Prisma.PrismaClientKnownRequestError;
}

/**
 * Type utility for sync or async operations
 */
export type Awaitable<T> = T | Promise<T>;

/**
 * Comprehensive Prisma error handler that maps common Prisma errors to domain errors
 */
export function handlePrismaError(error: unknown, resourceName: string): never {
    if (isPrismaError(error)) {
        switch (error.code) {
            case 'P2025':
                throw new NotFoundError(resourceName, error);
            case 'P2002':
                throw new ConflictError(
                    `${resourceName} already exists with the provided unique field(s)`,
                    resourceName,
                    error
                );
            case 'P2003':
                throw new ValidationError(
                    `Foreign key constraint failed on ${resourceName}`,
                    resourceName,
                    error
                );
            case 'P2004':
                throw new ValidationError(
                    `Constraint failed on ${resourceName}`,
                    resourceName,
                    error
                );
            case 'P2014':
                throw new ValidationError(
                    `Invalid relation data for ${resourceName}`,
                    resourceName,
                    error
                );
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
export function handleNotFoundError(error: unknown, resourceName: string): never {
    if (isPrismaError(error) && error.code === 'P2025') {
        throw new NotFoundError(resourceName, error);
    }
    throw error;
}

/**
 * Enhanced wrapper for operations that may result in "not found" errors
 * Supports both synchronous and asynchronous operations
 */
export async function withNotFoundHandling<T>(
    operation: () => Awaitable<T>,
    resourceName: string
): Promise<T> {
    try {
        const result = operation();
        return await result; // Handles both sync and async results
    } catch (error) {
        handleNotFoundError(error, resourceName);
    }
}

/**
 * Enhanced wrapper for operations with comprehensive Prisma error handling
 * Supports both synchronous and asynchronous operations
 */
export async function withPrismaErrorHandling<T>(
    operation: () => Awaitable<T>,
    resourceName: string
): Promise<T> {
    try {
        const result = operation();
        return await result; // Handles both sync and async results
    } catch (error) {
        handlePrismaError(error, resourceName);
    }
}

/**
 * Type guard to check if an error is a domain error
 */
export function isDomainError(error: unknown): error is DomainError {
    return error instanceof DomainError;
}

/**
 * Utility for extracting HTTP status code from any error
 */
export function getHttpStatusCode(error: unknown): number {
    if (isDomainError(error)) {
        return error.statusCode;
    }
    return 500; // Internal Server Error for unknown errors
}

/**
 * Convert Zod error to ValidationError
 * Maps Zod validation failures to our domain error system
 */
export function fromZodError(zodError: any, resource: string): ValidationError {
    const issues = zodError.issues || [];
    const firstIssue = issues[0];

    // Create user-friendly message
    const message = firstIssue
        ? `${firstIssue.path.join('.')} ${firstIssue.message}`.toLowerCase()
        : 'Invalid input data';

    return new ValidationError(
        message,
        resource,
        zodError,
        {
            field: firstIssue?.path.join('.'),
            validationType: 'schema',
            zodIssues: issues
        }
    );
}

/**
 * Safe validation wrapper that converts Zod errors to ValidationError
 */
export function validateWithZod<T>(
    schema: any, // z.ZodSchema<T>
    data: unknown,
    resource: string
): T {
    try {
        return schema.parse(data);
    } catch (error: any) {
        if (error?.name === 'ZodError') {
            throw fromZodError(error, resource);
        }
        throw error;
    }
}