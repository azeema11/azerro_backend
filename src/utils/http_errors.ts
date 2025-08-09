/**
 * Standard error response format for all API endpoints
 * Used by the global error handler middleware
 */
export interface ErrorResponse {
    error: string;
    message: string;
    statusCode: number;
    resource?: string;
    timestamp: string;
    details?: {
        // Prisma error details
        prismaCode?: string;
        originalMessage?: string;

        // Validation error details
        field?: string;
        validationType?: string;
        zodIssues?: any[];

        // Request validation library errors
        validationErrors?: any[];
        joiDetails?: any[];

        // CORS error details
        origin?: string;
        method?: string;

        // Allow additional properties for extensibility
        [key: string]: any;
    };
}