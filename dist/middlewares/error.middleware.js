"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalErrorHandler = globalErrorHandler;
exports.notFoundHandler = notFoundHandler;
exports.validationErrorHandler = validationErrorHandler;
exports.corsErrorHandler = corsErrorHandler;
const prisma_errors_1 = require("../utils/prisma_errors");
/**
 * Sanitizes request body by removing or masking sensitive fields
 * to prevent logging of PII, passwords, tokens, etc.
 */
function sanitizeRequestBody(body) {
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
        }
        else if (value && typeof value === 'object' && !Array.isArray(value)) {
            sanitized[key] = sanitizeRequestBody(value);
        }
        else if (Array.isArray(value)) {
            sanitized[key] = value.map(item => typeof item === 'object' ? sanitizeRequestBody(item) : item);
        }
    }
    return sanitized;
}
/**
 * Global error handling middleware for Express
 * Handles domain errors, Prisma errors, and unexpected errors with structured responses
 */
function globalErrorHandler(err, req, res, next) {
    // Enhanced logging with request context
    const logData = {
        error: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        body: sanitizeRequestBody(req.body),
        timestamp: new Date().toISOString()
    };
    // Only include userId in development environment to avoid logging PII in production
    if (process.env.NODE_ENV === 'development') {
        logData.userId = req.userId;
    }
    console.error('Global error:', logData);
    // Handle our domain errors with rich context
    if ((0, prisma_errors_1.isDomainError)(err)) {
        const response = {
            error: err.name,
            message: err.message,
            statusCode: err.statusCode,
            resource: err.resource,
            timestamp: new Date().toISOString()
        };
        // Add validation-specific details for ValidationError
        if (err instanceof prisma_errors_1.ValidationError) {
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
                prismaCode: err.cause?.code,
                originalMessage: err.cause.message,
            };
        }
        res.status(err.statusCode).json(response);
        return;
    }
    // Handle standard HTTP errors (e.g., from other middleware)
    if (err.statusCode || err.status) {
        const statusCode = err.statusCode || err.status;
        const response = {
            error: err.name || 'HttpError',
            message: err.message || 'An error occurred',
            statusCode,
            timestamp: new Date().toISOString()
        };
        res.status(statusCode).json(response);
        return;
    }
    // Handle unexpected errors
    const response = {
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
        response.stack = err.stack;
    }
    res.status(500).json(response);
}
/**
 * 404 handler for undefined routes
 * Must be placed before the global error handler
 */
function notFoundHandler(req, res, next) {
    const response = {
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
function validationErrorHandler(err, req, res, next) {
    // Handle express-validator errors
    if (err.array && typeof err.array === 'function') {
        const errors = err.array();
        const response = {
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
        const response = {
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
function corsErrorHandler(err, req, res, next) {
    if (err.message && err.message.includes('CORS')) {
        const response = {
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
