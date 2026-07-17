# Azerro Backend — Code Patterns & Best Practices

Standardized patterns used across the codebase for consistency, type safety, and maintainability.

## Architecture Layers

### Route Layer (`src/routes/`)

Standard REST conventions with consistent ordering:

```typescript
import { Router } from 'express';
import { getGoals, createGoal, updateGoal, deleteGoal } from '../controllers/goal.controller';

const router = Router();

router.get('/', getGoals);
router.get('/:id', getGoalById);
router.post('/', createGoal);
router.put('/:id', updateGoal);
router.delete('/:id', deleteGoal);

export default router;
```

### Controller Layer (`src/controllers/`)

Handle HTTP requests, extract data, delegate to services:

```typescript
export const createGoal = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name, description, targetAmount, savedAmount, targetDate } = req.body;
    const goalInput: CreateGoalInput = { name, targetAmount, targetDate, description, savedAmount };

    const goal = await createGoalService(req.userId, goalInput);
    res.status(201).json(goal);
});
```

### Service Layer (`src/services/`)

Business logic, validation, and database operations:

```typescript
export const createGoal = async (userId: string, data: CreateGoalInput) => {
    if (!data.name?.trim()) {
        throw new ValidationError('Goal name is required', 'Goal', undefined,
            { field: 'name', validationType: 'business' });
    }

    if (!data.targetAmount || data.targetAmount <= 0) {
        throw new ValidationError('Target amount must be greater than 0', 'Goal', undefined,
            { field: 'targetAmount', validationType: 'business' });
    }

    return withPrismaErrorHandling(async () => {
        return await prisma.goal.create({
            data: {
                userId,
                name: data.name.trim(),
                targetAmount: data.targetAmount,
                targetDate: data.targetDate ? new Date(data.targetDate) : new Date(),
                description: data.description?.trim(),
                savedAmount: data.savedAmount || 0,
            },
        });
    }, 'Goal');
};
```

### Type Layer (`src/types/service_types.ts`)

Separate interfaces for create and update operations:

```typescript
export interface CreateGoalInput {
    name: string;
    targetAmount: number;
    targetDate: string;
    description?: string;
    savedAmount?: number;
}

export interface GoalUpdateData {
    name?: string;
    description?: string;
    targetAmount?: number;
    savedAmount?: number;
    currency?: string;
    targetDate?: Date;
    completed?: boolean;
}
```

## Key Patterns

### Async Handler (`src/utils/async_handler.ts`)

Wraps all async controller functions to catch Promise rejections and forward them to Express error middleware:

```typescript
import { Request, Response, NextFunction } from 'express';

type AsyncFunction = (req: Request, res: Response, next: NextFunction) => Promise<any>;

export const asyncHandler = (fn: AsyncFunction) => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
```

Every controller function is wrapped with `asyncHandler` — no manual try-catch blocks in controllers.

### Error Middleware Stack (`src/middlewares/error.middleware.ts`)

Four middleware functions registered at specific points in `src/index.ts`:

```typescript
// Early (before routes) — catches CORS errors on any request
app.use(corsErrorHandler);

// After all routes — error handling chain (order matters!)
app.use('*', notFoundHandler);    // 404 for undefined routes
app.use(validationErrorHandler);  // express-validator / Joi errors
app.use(globalErrorHandler);      // Domain errors, Prisma errors, unexpected errors (must be last)
```

The `globalErrorHandler`:
- Logs sanitized request body (sensitive fields like `password`, `token`, `apiKey` replaced with `[REDACTED]`)
- Handles `isDomainError()` instances (`ValidationError`, `NotFoundError`) with structured responses
- Includes `details` (field, validationType, prismaCode) in error response
- In development: includes stack trace and userId in logs
- In production: clean error messages, no PII in logs

All error responses follow a consistent format:

```typescript
interface ErrorResponse {
    error: string;       // Error type name
    message: string;     // Human-readable message
    statusCode: number;  // HTTP status code
    resource?: string;   // Affected resource name
    timestamp: string;   // ISO timestamp
    details?: object;    // Additional context (field, validationType, etc.)
}
```

### Decimal Type Handling

Financial calculations use Prisma Decimal types with utility functions:

```typescript
import { toNumberSafe, addDecimal, subtractDecimal, compareDecimal } from '../utils/utils';

const savedAmount = toNumberSafe(goal.savedAmount);
const targetAmount = toNumberSafe(goal.targetAmount);
const progress = Math.min(100, (savedAmount / targetAmount) * 100);
```

Rules:
- Convert `Decimal` to `number` via `toNumberSafe()` before arithmetic
- Use `addDecimal()`, `subtractDecimal()`, `multiplyDecimal()`, `divideDecimal()` for Decimal-to-Decimal ops
- Use `compareDecimal()` for safe comparisons
- Prisma handles number-to-Decimal conversion on writes

### Redis Caching

```typescript
import { withCache, safeDel } from '../utils/redis';

// Cache-aside pattern (preferred for JSON data)
return withCache(`report:expense:${userId}:${startKey}:${endKey}`, 600, async () => {
    const data = await prisma.transaction.findMany({ ... });
    return processedResult;
});

// Cache invalidation after successful DB write
const budget = await prisma.budget.create({ data: { ... } });
await safeDel(`budget:performance:${userId}`);
return budget;
```

Rules:
- Use `withCache` for the common get-or-compute pattern
- Never import `redisClient` directly in services — always use safe wrappers
- Invalidate cache **after** DB success, never before
- Only cache non-empty, validated data

### AI Tools (Google ADK)

Tools are defined in `src/ai/adk/tools/` using `FunctionTool` with Zod parameter schemas. They delegate to handler functions in `src/ai/controllers/`, which manage caching and call `src/ai/services/`.

**Tool → Controller → Service** separation:

```typescript
// src/ai/adk/tools/data_tools.ts
function getUserId(ctx?: Context): string {
    const userId = ctx?.state.get<string>("userId");
    if (!userId) throw new Error("userId not found in session state");
    return userId;
}

export const getTransactionsTool = new FunctionTool({
    name: "get_transactions",
    description: "Fetches the user's transactions with optional filters.",
    parameters: z.object({
        category: z.enum(CATEGORIES).optional(),
        type: z.enum(TRANSACTION_TYPES).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        limit: z.number().optional(),
    }),
    execute: async (input, ctx) => {
        const userId = getUserId(ctx);
        return await handleGetTransactions(userId, input);
    },
});
```

```typescript
// src/ai/controllers/transaction.controller.ts
export async function handleGetTransactions(userId: string, input: { ... }) {
    const cacheKeySuffix = `${input.category || "all"}:${input.type || "all"}:...`;
    return withCache(`adk:txn:${userId}:${cacheKeySuffix}`, 300, async () => {
        const transactions = await getTransactions(userId, { ... });
        return transactions.map(t => ({ id: t.id, amount: toNumberSafe(t.amount), ... }));
    });
}
```

Action tools follow the same delegation but invalidate caches after writes:

```typescript
// src/ai/controllers/transaction.controller.ts
export async function handleCreateTransaction(userId: string, input: { ... }) {
    const txn = await createTransaction(userId, { ... });
    await safeDel(`adk:txn:${userId}:all:all::50`);
    return { status: "success", transactionId: txn.id };
}
```

The `userId` is injected into ADK session state when the session is created in `runner.ts`:

```typescript
state: { "userId": userId, "sessionId": sid }
```

### Error Handling

```typescript
// Not-found scenarios
return withNotFoundHandling(async () => {
    return await prisma.resource.update({
        where: { id_userId: { id, userId } },
        data: updateData
    });
}, 'Resource');

// Create/read operations
return withPrismaErrorHandling(async () => {
    return await prisma.resource.create({ data: createData });
}, 'Resource');

// Business logic validation
throw new ValidationError('Human-readable message', 'ResourceName', undefined,
    { field: 'fieldName', validationType: 'business' });
```

## Naming Conventions

| Category | Convention | Example |
|----------|-----------|---------|
| Files | `snake_case.ts` | `bank_account.controller.ts` |
| Functions | `camelCase` | `createGoal`, `getUserProfile` |
| Interfaces | `PascalCase` | `CreateGoalInput`, `GoalUpdateData` |
| Constants | `UPPER_SNAKE_CASE` | `JWT_SECRET` |

## Import Order

```typescript
// 1. External libraries
import { Router } from 'express';
import { Prisma } from '@prisma/client';

// 2. Internal utilities
import { asyncHandler } from '../utils/async_handler';
import { AuthRequest } from '../middlewares/auth.middleware';
import { withCache, safeDel } from '../utils/redis';

// 3. Types
import { CreateGoalInput } from '../types/service_types';

// 4. Services
import { createGoal as createGoalService } from '../services/goal.service';
```

## Quality Checklist

When implementing new features:

- [ ] Routes: GET → POST → PUT → DELETE ordering
- [ ] Controllers: Auth check, typed input object, service delegation, proper status code
- [ ] Services: Typed inputs, `ValidationError` for business rules, `withPrismaErrorHandling` for DB
- [ ] Types: Separate `CreateInput` and `UpdateData` interfaces
- [ ] Decimal: Use utility functions for arithmetic, accept both `number` and `Decimal`
- [ ] Redis: Use `withCache` for reads; `safeDel` after writes; never import `redisClient` directly
- [ ] AI Tools: `FunctionTool` + Zod schemas; wrap reads in `withCache`; invalidate after writes
- [ ] Naming: Follow established conventions
- [ ] Imports: Organize in standard order
