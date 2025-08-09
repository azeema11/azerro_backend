import { Request, Response, NextFunction } from 'express';
import { ErrorResponse } from '../utils/http_errors';
import { isDomainError, ValidationError } from '../utils/prisma_errors';

/**
 * Sanitizes request body by removing or masking sensitive fields
 * to prevent logging of PII, passwords, tokens, etc.
 */
function sanitizeRequestBody(body: any): any {
    if (!body || typeof body !== 'object') {
        return body;
    }

    const sensitiveFields = [
        'password',
        'confirmPassword',
        'oldPassword',
        'newPassword',
        'token',
        'accessToken',
        'refreshToken',
        'authorization',
        'secret',
        'apiKey',
        'privateKey',
        'ssn',
        'socialSecurityNumber',
        'creditCard',
        'cardNumber',
        'cvv',
        'pin',
        'otp'
    ];

    const sanitized = { ...body };

    // Recursively sanitize nested objects
    for (const [key, value] of Object.entries(sanitized)) {
        const lowerKey = key.toLowerCase();

        if (sensitiveFields.some(field => lowerKey.includes(field))) {
            sanitized[key] = '[REDACTED]';
        } else if (value && typeof value === 'object' && !Array.isArray(value)) {
            sanitized[key] = sanitizeRequestBody(value);
        } else if (Array.isArray(value)) {
            sanitized[key] = value.map(item =>
                typeof item === 'object' ? sanitizeRequestBody(item) : item
            );
        }
    }

    return sanitized;
}

/**
 * Global error handling middleware for Express
 * Handles domain errors, Prisma errors, and unexpected errors with structured responses
 */
export function globalErrorHandler(
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
): void {
    // Enhanced logging with request context
    const logData: any = {
        error: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        body: sanitizeRequestBody(req.body),
        timestamp: new Date().toISOString()
    };

    // Only include userId in development environment to avoid logging PII in production
    if (process.env.NODE_ENV === 'development') {
        logData.userId = (req as any).userId;
    }

    console.error('Global error:', logData);

    // Handle our domain errors with rich context
    if (isDomainError(err)) {
        const response: ErrorResponse = {
            error: err.name,
            message: err.message,
            statusCode: err.statusCode,
            resource: err.resource,
            timestamp: new Date().toISOString()
        };

        // Add validation-specific details for ValidationError
        if (err instanceof ValidationError) {
            response.details = {
                field: err.field,
                validationType: err.validationType,
                zodIssues: err.zodIssues,
            };
        }

        // Add original Prisma error details if available
        if (err.cause) {
            response.details = {
                ...(response.details ?? {}),
                prismaCode: (err.cause as any)?.code,
                originalMessage: err.cause.message,
            };
        }

        res.status(err.statusCode).json(response);
        return;
    }

    // Handle standard HTTP errors (e.g., from other middleware)
    if (err.statusCode || err.status) {
        const statusCode = err.statusCode || err.status;
        const response: ErrorResponse = {
            error: err.name || 'HttpError',
            message: err.message || 'An error occurred',
            statusCode,
            timestamp: new Date().toISOString()
        };

        res.status(statusCode).json(response);
        return;
    }

    // Handle unexpected errors
    const response: ErrorResponse = {
        error: 'InternalServerError',
        message: 'An unexpected error occurred',
        statusCode: 500,
        timestamp: new Date().toISOString()
    };

    // In development, include error details for debugging
    if (process.env.NODE_ENV === 'development') {
        response.details = {
            originalMessage: err.message || String(err),
        };
        // Include stack trace in development
        (response as any).stack = err.stack;
    }

    res.status(500).json(response);
}

/**
 * 404 handler for undefined routes
 * Must be placed before the global error handler
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction): void {
    const response: ErrorResponse = {
        error: 'NotFound',
        message: `Route ${req.method} ${req.originalUrl} not found`,
        statusCode: 404,
        timestamp: new Date().toISOString()
    };

    res.status(404).json(response);
}

/**
 * Request validation error handler for libraries like express-validator, joi, etc.
 * Place this before the global error handler to catch validation errors
 */
export function validationErrorHandler(
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
): void {
    // Handle express-validator errors
    if (err.array && typeof err.array === 'function') {
        const errors = err.array();
        const response: ErrorResponse = {
            error: 'ValidationError',
            message: 'Request validation failed',
            statusCode: 400,
            timestamp: new Date().toISOString(),
            details: {
                validationType: 'schema',
                validationErrors: errors
            }
        };

        res.status(400).json(response);
        return;
    }

    // Handle Joi validation errors
    if (err.isJoi) {
        const response: ErrorResponse = {
            error: 'ValidationError',
            message: 'Request validation failed',
            statusCode: 400,
            timestamp: new Date().toISOString(),
            details: {
                validationType: 'schema',
                joiDetails: err.details
            }
        };

        res.status(400).json(response);
        return;
    }

    // Pass to next error handler if not a validation error
    next(err);
}

/**
 * CORS error handler
 * Handles CORS-related errors with proper messaging
 */
export function corsErrorHandler(
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
): void {
    if (err.message && err.message.includes('CORS')) {
        const response: ErrorResponse = {
            error: 'CorsError',
            message: 'Cross-Origin Request Blocked',
            statusCode: 403,
            timestamp: new Date().toISOString(),
            details: {
                origin: req.headers.origin,
                method: req.method
            }
        };

        res.status(403).json(response);
        return;
    }

    // Pass to next error handler if not a CORS error
    next(err);
}
