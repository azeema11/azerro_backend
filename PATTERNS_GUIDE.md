# Azerro Backend - Code Patterns & Best Practices Guide

## 📋 Overview

This document outlines the standardized patterns and best practices implemented across the Azerro backend codebase. All modules follow these consistent patterns to ensure maintainability, type safety, and code quality.

## 🏗️ Architecture Layers

### 1. **Route Layer** (`src/routes/`)
**Responsibility**: Define API endpoints and HTTP routing
**Pattern**: Standard REST conventions

```typescript
import { Router } from 'express';
import { getGoals, createGoal, updateGoal, deleteGoal } from '../controllers/goal.controller';

const router = Router();

// Standard ordering: GET → POST → PUT → DELETE
router.get('/', getGoals);
router.get('/:id', getGoalById);
router.post('/', createGoal);
router.put('/:id', updateGoal);
router.delete('/:id', deleteGoal);

export default router;
```

### 2. **Controller Layer** (`src/controllers/`)
**Responsibility**: Handle HTTP requests/responses, extract data, delegate to services
**Pattern**: Consistent authorization, typed input creation, service delegation

```typescript
import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { asyncHandler } from '../utils/async_handler';
import { CreateGoalInput, GoalUpdateData } from '../types/service_types';
import { createGoal as createGoalService } from '../services/goal.service';

export const createGoal = asyncHandler(async (req: AuthRequest, res: Response) => {
    // 1. Authorization check
    if (!req.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // 2. Extract and structure data
    const { name, description, targetAmount, savedAmount, targetDate } = req.body;

    // 3. Create typed input object
    const goalInput: CreateGoalInput = {
        name,
        targetAmount,
        targetDate,
        description,
        savedAmount
    };

    // 4. Delegate to service
    const goal = await createGoalService(req.userId, goalInput);

    // 5. Return response
    res.status(201).json(goal);
});
```

### 3. **Service Layer** (`src/services/`)
**Responsibility**: Business logic, validation, database operations
**Pattern**: Typed inputs, structured error handling, business validation

```typescript
import prisma from '../utils/db';
import { withPrismaErrorHandling, ValidationError } from '../utils/prisma_errors';
import { CreateGoalInput } from '../types/service_types';

export const createGoal = async (
    userId: string,
    data: CreateGoalInput
) => {
    // 1. Business logic validation
    if (!data.name?.trim()) {
        throw new ValidationError(
            'Goal name is required',
            'Goal',
            undefined,
            { field: 'name', validationType: 'business' }
        );
    }

    if (!data.targetAmount || data.targetAmount <= 0) {
        throw new ValidationError(
            'Target amount must be greater than 0',
            'Goal',
            undefined,
            { field: 'targetAmount', validationType: 'business' }
        );
    }

    // 2. Database operation with error handling
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

### 4. **Type Layer** (`src/types/service_types.ts`)
**Responsibility**: Define data contracts between layers
**Pattern**: Separate interfaces for create/update operations

```typescript
// Create Input Types
export interface CreateGoalInput {
    name: string;
    targetAmount: number;
    targetDate: string;
    description?: string;
    savedAmount?: number;
}

// Update Data Types  
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

## 🔧 Standardized Patterns

### **Pattern 1: Controller Structure**
Every controller follows this exact pattern:

```typescript
export const controllerFunction = asyncHandler(async (req: AuthRequest, res: Response) => {
    // 1. Authorization check
    if (!req.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // 2. Extract parameters (if needed)
    const { id } = req.params;

    // 3. Extract and structure request body
    const { field1, field2, field3 } = req.body;

    // 4. Create typed input object
    const inputData: CreateSomethingInput = {
        field1,
        field2,
        field3
    };

    // 5. Call service with typed data
    const result = await serviceFunction(req.userId, inputData);

    // 6. Return appropriate response
    res.status(201).json(result); // 201 for create, 200 for update/get, 204 for delete
});
```

### **Pattern 2: Service Structure**
Every service follows this exact pattern:

```typescript
export const serviceFunction = async (
    userId: string,
    data: CreateSomethingInput
) => {
    // 1. Input validation with structured errors
    if (!data.requiredField) {
        throw new ValidationError(
            'Field is required',
            'ResourceName',
            undefined,
            { field: 'requiredField', validationType: 'business' }
        );
    }

    // 2. Business logic validation
    if (data.amount && data.amount <= 0) {
        throw new ValidationError(
            'Amount must be greater than 0',
            'ResourceName',
            undefined,
            { field: 'amount', validationType: 'business' }
        );
    }

    // 3. Database operation with error handling
    return withPrismaErrorHandling(async () => {
        return await prisma.resource.create({
            data: {
                userId,
                ...data
            },
        });
    }, 'ResourceName');
};
```

### **Pattern 3: Route Structure**
Every route file follows this exact pattern:

```typescript
import { Router } from 'express';
import { 
    getResources, 
    getResourceById,
    createResource, 
    updateResource, 
    deleteResource 
} from '../controllers/resource.controller';

const router = Router();

// GET routes first
router.get('/', getResources);
router.get('/:id', getResourceById);

// POST routes second
router.post('/', createResource);

// PUT routes third
router.put('/:id', updateResource);

// DELETE routes last
router.delete('/:id', deleteResource);

export default router;
```

### **Pattern 4: Decimal Type Handling** ✨ **NEW**
Consistent patterns for handling Decimal types in financial calculations:

```typescript
import { Prisma } from '@prisma/client';
import { toNumber, addDecimal, multiplyDecimal, subtractDecimal, divideDecimal, compareDecimal } from '../utils/utils';

// Service pattern for handling Decimal inputs
export const calculateGoalProgress = async (goalId: string, userId: string) => {
    const goal = await prisma.goal.findUnique({
        where: { id_userId: { id: goalId, userId } }
    });

    if (!goal) {
        throw new Error('Goal not found');
    }

    // Convert Decimal to number for calculations
    const savedAmount = toNumber(goal.savedAmount);
    const targetAmount = toNumber(goal.targetAmount);
    
    // Perform calculation
    const progress = Math.min(100, (savedAmount / targetAmount) * 100);
    
    return { progress };
};

// Currency conversion with Decimal support
export const convertAmount = async (
    amount: number | Prisma.Decimal,
    fromCurrency: string,
    toCurrency: string
) => {
    // Handle both number and Decimal inputs
    const numericAmount = typeof amount === 'number' ? amount : amount.toNumber();
    
    // Use conversion utilities that handle Decimal types
    return await convertCurrencyFromDB(numericAmount, fromCurrency, toCurrency);
};

// Arithmetic operations with Decimal types
export const calculateBudgetVariance = (
    budgetAmount: number | Prisma.Decimal,
    actualSpent: number | Prisma.Decimal
) => {
    // Use utility functions for safe arithmetic
    const variance = subtractDecimal(budgetAmount, actualSpent);
    const percentageUsed = divideDecimal(actualSpent, budgetAmount) * 100;
    
    return {
        variance,
        percentageUsed,
        isOverBudget: compareDecimal(actualSpent, budgetAmount) > 0
    };
};
```

### **Pattern 5: Error Handling**
Consistent error handling across all services:

```typescript
// For operations that might not find records
return withNotFoundHandling(async () => {
    return await prisma.resource.update({
        where: { id_userId: { id, userId } },
        data: updateData
    });
}, 'Resource');

// For operations that create/read collections
return withPrismaErrorHandling(async () => {
    return await prisma.resource.create({
        data: createData
    });
}, 'Resource');

// For business logic validation
throw new ValidationError(
    'Human-readable error message',
    'ResourceName',
    undefined,
    { field: 'fieldName', validationType: 'business' }
);
```

## 📁 File Organization Standards

### **Directory Structure**
```
src/
├── controllers/         # HTTP request handlers
├── services/           # Business logic and database operations
├── routes/             # API endpoint definitions
├── middlewares/        # Request processing middleware
├── types/              # TypeScript interfaces
├── utils/              # Utility functions
├── jobs/               # Background jobs
└── scripts/            # Database seeding and maintenance
```

### **Naming Conventions**
- **Files**: `snake_case.ts` (e.g., `bank_account.controller.ts`)
- **Functions**: `camelCase` (e.g., `createGoal`, `getUserProfile`)
- **Interfaces**: `PascalCase` (e.g., `CreateGoalInput`, `GoalUpdateData`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `JWT_SECRET`)

### **Import Patterns**
```typescript
// External libraries first
import { Router } from 'express';
import { Prisma } from '@prisma/client';

// Internal utilities
import { asyncHandler } from '../utils/async_handler';
import { AuthRequest } from '../middlewares/auth.middleware';

// Types
import { CreateGoalInput } from '../types/service_types';

// Services
import { createGoal as createGoalService } from '../services/goal.service';
```

## 🚀 Implementation Benefits

### **Type Safety**
- All data flows through typed interfaces
- Compile-time error detection
- Enhanced IDE support and autocomplete

### **Consistency**
- Predictable code structure across all modules
- Uniform error handling and validation
- Standardized response formats

### **Maintainability**
- Clear separation of concerns
- Easy to locate and modify functionality
- Consistent patterns reduce cognitive load

### **Testability**
- Services can be tested independently
- Clear input/output contracts
- Mocked dependencies are straightforward

### **Scalability**
- Modular architecture supports growth
- Easy to add new endpoints following existing patterns
- Reusable service functions

## 🔢 Decimal Type Best Practices ✨ **NEW**

### **Working with Financial Data**
Always use proper Decimal handling for financial calculations:

```typescript
// ✅ GOOD: Use utility functions
import { toNumber, addDecimal, compareDecimal } from '../utils/utils';

const totalAmount = addDecimal(amount1, amount2);
const isPositive = compareDecimal(amount, 0) > 0;

// ❌ BAD: Direct arithmetic operations
const total = amount1 + amount2; // Type error with Decimal
const isPositive = amount > 0;   // Type error with Decimal
```

### **Type Definitions for Decimal Fields**
When defining service interfaces, specify both number and Decimal support:

```typescript
// ✅ GOOD: Support both types
export interface CreateTransactionInput {
    amount: number | Decimal;
    currency: string;
}

// Currency conversion functions
export async function convertCurrencyFromDB(
    value: number | Decimal,  // Accept both types
    from: string,
    to: string
): Promise<number> {  // Always return number for calculations
    // Implementation handles both input types
}
```

### **Database Operations with Decimal**
When working with Prisma and Decimal fields:

```typescript
// ✅ GOOD: Convert Decimal to number for business logic
const transaction = await prisma.transaction.findUnique({...});
const amount = toNumber(transaction.amount);

// Perform calculations with numbers
const fee = amount * 0.02;
const total = amount + fee;

// ✅ GOOD: Accept Decimal in service parameters
export const updateTransactionAmount = async (
    transactionId: string,
    newAmount: number | Decimal
) => {
    return await prisma.transaction.update({
        where: { id: transactionId },
        data: { 
            amount: newAmount  // Prisma handles conversion
        }
    });
};
```

## ✅ Quality Checklist

When implementing new features, ensure:

- [ ] **Routes**: Follow GET → POST → PUT → DELETE ordering
- [ ] **Controllers**: Include authorization check, create typed objects, delegate to services
- [ ] **Services**: Use typed inputs, structured validation, error handling wrappers
- [ ] **Types**: Define separate Create/Update interfaces
- [ ] **Errors**: Use `ValidationError` for business logic, `withPrismaErrorHandling` for DB ops
- [ ] **Decimal Types**: Use utility functions for arithmetic, accept both number and Decimal in services ✨ **NEW**
- [ ] **Financial Calculations**: Convert Decimal to number for math operations, return numbers for business logic ✨ **NEW**
- [ ] **Currency Conversion**: Use enhanced conversion functions that support Decimal inputs ✨ **NEW**
- [ ] **Naming**: Follow established conventions
- [ ] **Imports**: Organize in standard order

This guide ensures that all code follows the same high-quality patterns established throughout the Azerro backend codebase, including proper handling of the new Decimal types for financial precision.
