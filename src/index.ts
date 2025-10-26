import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRouter from './routes/auth.route';
import { authMiddleware } from './middlewares/auth.middleware';
import bankAccountRouter from './routes/bank_account.route';
import transactionRouter from './routes/transaction.route';
import holdingRouter from './routes/holding.route';

import goalRouter from './routes/goal.route';
import userRouter from './routes/user.route';
import prisma from './utils/db';
import { scheduleCurrencyRateRefresh } from './jobs/refresh_currency_rates.job';
import { ensureCurrencyRatesExist } from './services/currency_rates.service';
import { scheduleHoldingRefresh } from './jobs/refresh_holdings.job';
import { scheduleDatabaseMaintenance } from './jobs/database_maintenance.job';
import reportsRouter from './routes/report.routes';
import budgetRouter from './routes/budget.route';
import plannedEventRouter from './routes/planned_event.route';
import aiRouter from './routes/ai.route';
import {
    globalErrorHandler,
    notFoundHandler,
    validationErrorHandler,
    corsErrorHandler
} from './middlewares/error.middleware';

dotenv.config();

const app = express();

// 1. CORS setup (must be first for preflight requests)
app.use(cors());

// 2. CORS error handling (immediately after CORS setup)
app.use(corsErrorHandler);

// 3. Body parsing and other general middleware
app.use(express.json());

// 4. Request logging (for development/debugging)
if (process.env.NODE_ENV !== 'production') {
    app.use((req: Request, res: Response, next) => {
        console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
        next();
    });
}

// 5. Security headers
app.use((req: Request, res: Response, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

// 6. Health check endpoint
app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// 7. API Routes
app.use('/auth', authRouter);
app.use('/user', authMiddleware, userRouter);
app.use('/bank-accounts', authMiddleware, bankAccountRouter);
app.use('/transactions', authMiddleware, transactionRouter);
app.use('/holdings', authMiddleware, holdingRouter);
app.use('/goals', authMiddleware, goalRouter);
app.use("/reports", authMiddleware, reportsRouter);
app.use("/budgets", authMiddleware, budgetRouter);
app.use("/planned-events", authMiddleware, plannedEventRouter);
app.use("/ai", authMiddleware, aiRouter);

// 8. Final error handling middleware (order is important!)
app.use('*', notFoundHandler);       // Handle 404 errors for undefined routes
app.use(validationErrorHandler);     // Handle validation library errors (express-validator, Joi)
app.use(globalErrorHandler);         // Global error handler (must be last)

// 9. Start server (after all middleware and routes are defined)
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});

// 10. Initialize background services
(async () => {
    try {
        await ensureCurrencyRatesExist();
        scheduleHoldingRefresh();
        scheduleCurrencyRateRefresh();
        scheduleDatabaseMaintenance();
        console.log('✅ Background services initialized');
    } catch (error) {
        console.error('❌ Failed to initialize background services:', error);
    }
})();

// 👇 Graceful shutdown for ts-node-dev and nodemon
async function shutdown(signal: string) {
    console.log(`📦 Received ${signal}. Closing server and Prisma...`);
    await prisma.$disconnect();
    server.close(() => {
        console.log('✅ Server closed.');
        process.exit(0);
    });
}

['SIGINT', 'SIGTERM', 'SIGUSR2'].forEach(signal => {
    process.once(signal, () => shutdown(signal));
});