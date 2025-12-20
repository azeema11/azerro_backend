"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_route_1 = __importDefault(require("./routes/auth.route"));
const auth_middleware_1 = require("./middlewares/auth.middleware");
const bank_account_route_1 = __importDefault(require("./routes/bank_account.route"));
const transaction_route_1 = __importDefault(require("./routes/transaction.route"));
const holding_route_1 = __importDefault(require("./routes/holding.route"));
const goal_route_1 = __importDefault(require("./routes/goal.route"));
const user_route_1 = __importDefault(require("./routes/user.route"));
const db_1 = __importDefault(require("./utils/db"));
const refresh_currency_rates_job_1 = require("./jobs/refresh_currency_rates.job");
const currency_rates_service_1 = require("./services/currency_rates.service");
const refresh_holdings_job_1 = require("./jobs/refresh_holdings.job");
const database_maintenance_job_1 = require("./jobs/database_maintenance.job");
const report_routes_1 = __importDefault(require("./routes/report.routes"));
const budget_route_1 = __importDefault(require("./routes/budget.route"));
const planned_event_route_1 = __importDefault(require("./routes/planned_event.route"));
const ai_route_1 = __importDefault(require("./ai/routes/ai.route"));
const error_middleware_1 = require("./middlewares/error.middleware");
dotenv_1.default.config();
const app = (0, express_1.default)();
// 1. CORS setup (must be first for preflight requests)
app.use((0, cors_1.default)());
// 2. CORS error handling (immediately after CORS setup)
app.use(error_middleware_1.corsErrorHandler);
// 3. Body parsing and other general middleware
app.use(express_1.default.json());
// 4. Request logging (for development/debugging)
if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
        console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
        next();
    });
}
// 5. Security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});
// 6. Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});
// 7. API Routes
app.use('/auth', auth_route_1.default);
app.use('/user', auth_middleware_1.authMiddleware, user_route_1.default);
app.use('/bank-accounts', auth_middleware_1.authMiddleware, bank_account_route_1.default);
app.use('/transactions', auth_middleware_1.authMiddleware, transaction_route_1.default);
app.use('/holdings', auth_middleware_1.authMiddleware, holding_route_1.default);
app.use('/goals', auth_middleware_1.authMiddleware, goal_route_1.default);
app.use("/reports", auth_middleware_1.authMiddleware, report_routes_1.default);
app.use("/budgets", auth_middleware_1.authMiddleware, budget_route_1.default);
app.use("/planned-events", auth_middleware_1.authMiddleware, planned_event_route_1.default);
app.use("/ai", auth_middleware_1.authMiddleware, ai_route_1.default);
// 8. Final error handling middleware (order is important!)
app.use('*', error_middleware_1.notFoundHandler); // Handle 404 errors for undefined routes
app.use(error_middleware_1.validationErrorHandler); // Handle validation library errors (express-validator, Joi)
app.use(error_middleware_1.globalErrorHandler); // Global error handler (must be last)
// 9. Start server (after all middleware and routes are defined)
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
// 10. Initialize background services
(async () => {
    try {
        await (0, currency_rates_service_1.ensureCurrencyRatesExist)();
        (0, refresh_holdings_job_1.scheduleHoldingRefresh)();
        (0, refresh_currency_rates_job_1.scheduleCurrencyRateRefresh)();
        (0, database_maintenance_job_1.scheduleDatabaseMaintenance)();
        console.log('✅ Background services initialized');
    }
    catch (error) {
        console.error('❌ Failed to initialize background services:', error);
    }
})();
// 👇 Graceful shutdown for ts-node-dev and nodemon
async function shutdown(signal) {
    console.log(`📦 Received ${signal}. Closing server and Prisma...`);
    await db_1.default.$disconnect();
    server.close(() => {
        console.log('✅ Server closed.');
        process.exit(0);
    });
}
['SIGINT', 'SIGTERM', 'SIGUSR2'].forEach(signal => {
    process.once(signal, () => shutdown(signal));
});
