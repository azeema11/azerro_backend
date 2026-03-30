import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export const validate = (schema: ZodSchema) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const parsed = await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
            });

            // Re-assign validated properties back to the request object
            // This ensures default values and transforms from Zod are applied
            const safeParsed = parsed as any;
            if (safeParsed.body) req.body = safeParsed.body;
            if (safeParsed.query) req.query = safeParsed.query;
            if (safeParsed.params) req.params = safeParsed.params;

            next();
        } catch (error) {
            if (error instanceof ZodError) {
                return res.status(400).json({
                    error: "Validation failed",
                    details: error.issues
                });
            }
            next(error);
        }
    };
};
