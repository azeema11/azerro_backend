import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRouter from './routes/auth.route';
import { authMiddleware } from './middlewares/auth.middleware';
import bankAccountRouter from './routes/bank_account.route';
import transactionRouter from './routes/transaction.route';
import holdingRouter from './routes/holding.route';
import settingsRouter from './routes/settings.route';
import goalRouter from './routes/goal.route';
import userRouter from './routes/user.route';
import prisma from './utils/db';
import { scheduleCurrencyRateRefresh } from './jobs/refresh_currency_rates.job';
import { ensureCurrencyRatesExist } from './services/currency_rates.service';
import { scheduleHoldingRefresh } from './jobs/refresh_holdings.job';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});

app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// Ensure currency rates exist on startup
ensureCurrencyRatesExist();
scheduleHoldingRefresh();
scheduleCurrencyRateRefresh();

app.use('/auth', authRouter);
app.use('/user', authMiddleware, userRouter);
app.use('/bank-accounts', authMiddleware, bankAccountRouter);
app.use('/transactions', authMiddleware, transactionRouter);
app.use('/holdings', authMiddleware, holdingRouter);
app.use('/settings', authMiddleware, settingsRouter);
app.use('/goals', authMiddleware, goalRouter);

app.use('*', (req: Request, res: Response) => {
    res.status(404).json({ error: `Route ${req.originalUrl} not found` });
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('Global error:', err);
    res.status(err.statusCode || 500).json({
        error: err.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
});

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
