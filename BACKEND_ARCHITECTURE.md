# Azerro Backend - Architecture & Flow Logic Documentation

## 🏗️ System Architecture Overview

The Azerro backend follows a **layered architecture pattern** with clear separation of concerns, built using Node.js, Express.js, TypeScript, and PostgreSQL with Prisma ORM.

### Architecture Layers

```
┌─────────────────────────────────────────────────────┐
│                   Client Layer                      │
│            (Web/Mobile Applications)                │
└─────────────────────────────────────────────────────┘
                            │
                   HTTP/HTTPS Requests
                            │
┌─────────────────────────────────────────────────────┐
│                 API Gateway Layer                   │
│              (Express.js Router)                    │
│         • CORS • JSON Parsing • Routes             │
└─────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────┐
│               Middleware Layer                      │
│           • Authentication (JWT)                    │
│           • Error Handling                          │
│           • Request Validation                      │
└─────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────┐
│                Controller Layer                     │
│        • Request/Response Handling                  │
│        • Input Validation                           │
│        • HTTP Status Code Management                │
│        • Authorization Checks                       │
└─────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────┐
│                Service Layer                        │
│         • Business Logic                            │
│         • Database Operations                       │
│         • External API Integration                  │
│         • Currency Conversion                       │
│         • Price Updates                             │
│         • Error Handling                            │
└─────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────┐
│                Data Access Layer                    │
│              (Prisma ORM)                           │
│         • Database Operations                       │
│         • Query Optimization                        │
│         • Transaction Management                    │
└─────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────┐
│                Database Layer                       │
│               (PostgreSQL)                          │
│         • Data Persistence                          │
│         • Relationships                             │
│         • Constraints                               │
└─────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
src/
├── controllers/          # Request handlers and response logic (HTTP layer)
├── services/            # Business logic and database operations
├── routes/              # API endpoint definitions
├── middlewares/         # Request processing middleware
├── utils/               # Utility functions and helpers (async_handler, currency, date, utils, etc.)
├── jobs/                # Background job definitions
└── scripts/             # Database seeding and maintenance
```

## 🔄 Request Flow Architecture

### 1. Authentication Flow
```mermaid
sequenceDiagram
    participant Client
    participant Express
    participant AuthController
    participant AuthService
    participant Database
    participant JWT

    Client->>Express: POST /auth/signup or /auth/login
    Express->>AuthController: Route to auth handler
    AuthController->>AuthService: Call authentication service
    AuthService->>Database: Check user credentials
    Database-->>AuthService: User data
    AuthService->>JWT: Generate token
    JWT-->>AuthService: Signed token
    AuthService-->>AuthController: Return result
    AuthController-->>Client: Return token + userId
```

### 2. Protected Resource Flow
```mermaid
sequenceDiagram
    participant Client
    participant Express
    participant AuthMiddleware
    participant Controller
    participant Service
    participant Database

    Client->>Express: Request with Bearer token
    Express->>AuthMiddleware: Validate JWT token
    AuthMiddleware->>Controller: Add userId to request
    Controller->>Service: Business logic with parameters
    Service->>Database: Data operations
    Database-->>Service: Results
    Service-->>Controller: Processed data
    Controller-->>Client: JSON response with status code
```

## 🔧 Core Components

### 1. Server Configuration (`src/index.ts`)
**Purpose**: Application bootstrap and configuration

**Key Features**:
- Express server setup with CORS and JSON parsing
- Route registration with authentication middleware
- Global error handling
- Graceful shutdown handling
- Background job initialization

**Startup Sequence**:
1. Load environment variables
2. Configure Express middleware
3. Initialize currency rates
4. Schedule background jobs
5. Register API routes
6. Start server on specified port

### 2. Service Layer Architecture ✨ **NEW**

#### Service Layer Pattern
The application now implements a comprehensive service layer that separates business logic from HTTP handling:

```typescript
// Service layer handles all business logic and database operations
export const createTransaction = async (
  userId: string,
  amount: number,
  currency: string,
  category: Category,
  date: string,
  type?: TransactionType,
  description?: string,
  bankAccountId?: string
) => {
  try {
    // Validation logic
    if (!amount || !currency || !category || !date) {
      throw new Error('Amount, currency, category, and date are required');
    }

    // Database operation
    const txn = await prisma.transaction.create({
      data: { /* ... */ }
    });

    return txn;
  } catch (err) {
    console.error('Failed to create transaction:', err);
    throw err;
  }
};
```

#### Service Files Overview
- **`auth.service.ts`** - User authentication and registration
- **`bank_account.service.ts`** - Bank account CRUD operations
- **`budget.service.ts`** - Budget management operations
- **`goal.service.ts`** - Financial goals management
- **`holding.service.ts`** - Investment holdings with price fetching
- **`planned_event.service.ts`** - Planned events and future expense management ✨ **NEW**
- **`transaction.service.ts`** - Transaction management
- **`user.service.ts`** - User profile and preferences
- **`report.service.ts`** - Analytics and reporting
- **`currency_rates.service.ts`** - Currency conversion
- **`price.service.ts`** - Asset price management

#### Controller Pattern ✨ **UPDATED**
Controllers now focus solely on HTTP concerns and delegate all business logic to services:

```typescript
export const createTransaction = asyncHandler(async (req: AuthRequest, res: Response) => {
  // Authorization check
  if (!req.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Extract parameters
  const { amount, currency, category, type, description, date, bankAccountId } = req.body;

  // Delegate to service
  const txn = await createTransactionService(
    req.userId,
    amount,
    currency,
    category,
    date,
    type,
    description,
    bankAccountId
  );

  // Return response with proper status code
  res.status(201).json(txn);
});
```

### 3. Authentication System

#### JWT-Based Authentication
- **Token Generation**: 7-day expiry tokens
- **Password Security**: bcrypt hashing with salt rounds
- **Middleware Protection**: Request-level user identification

#### Authentication Middleware (`src/middlewares/auth.middleware.ts`)
```typescript
// Extends Request interface with userId
interface AuthRequest extends Request {
  userId?: string;
}

// Validates Bearer tokens and extracts user ID
export const authMiddleware = (req, res, next) => {
  // Extract and verify JWT token
  // Add userId to request object
}
```

### 4. Error Handling Strategy

#### Async Handler Pattern (`src/utils/async_handler.ts`)
```typescript
// Wraps async functions to catch Promise rejections
export const asyncHandler = (fn: AsyncFunction) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
```

#### Service Layer Error Handling ✨ **NEW**
All services implement consistent error handling:
```typescript
export const serviceFunction = async (params) => {
  try {
    // Business logic
    return result;
  } catch (err) {
    console.error('Failed to perform operation:', err);
    throw err; // Re-throw for controller handling
  }
};
```

#### Global Error Handler
- Development: Full stack traces
- Production: Clean error messages
- Centralized error logging

### 5. Database Architecture

#### Prisma ORM Integration (`src/utils/db.ts`)
- Single Prisma client instance
- Connection pooling
- Type-safe database operations
- Automatic query optimization

#### Database Patterns
- **UUID Primary Keys**: Enhanced security and distribution
- **Soft Relationships**: Nullable foreign keys for data integrity
- **Automatic Timestamps**: Creation and update tracking
- **Multi-Currency Support**: Flexible currency handling

#### Utility Functions
- **AsyncHandler**: Consistent error handling wrapper (`src/utils/async_handler.ts`)
- **Currency Conversion**: Database-cached currency conversion (`src/utils/currency.ts`)
- **Date Calculations**: Precise date math, timeline analysis, and frequency detection (`src/utils/date.ts`)
  - `daysBetween()` - Calculate days between two dates
  - `monthsBetween()` - Calculate months between two dates  
  - `weeksBetween()` - Calculate weeks between two dates
  - `dateDifference()` - Comprehensive date difference analysis
  - `formatDateDifference()` - Human-readable date formatting
  - `detectFrequency()` - Detect transaction frequency patterns
  - `getPeriodDates()` - **NEW**: Get start/end dates for budget periods ✨
- **Array Utilities**: Generic groupBy function for data aggregation (`src/utils/utils.ts`)
- **Database Connection**: Prisma client management (`src/utils/db.ts`)
- **Cryptographic**: SHA-256 hashing utilities (`src/utils/sha_256.ts`)

## 🔌 API Endpoints Structure

### Authentication Routes (`/auth`)
```
POST /auth/signup     - User registration
POST /auth/login      - User authentication
```

### Protected Routes (Require JWT)
```
GET  /user/me                    - Get user profile
PUT  /user/preferences           - Update user settings

GET  /bank-accounts              - List user accounts
POST /bank-accounts              - Create new account
PUT  /bank-accounts/:id          - Update account
DELETE /bank-accounts/:id        - Delete account

GET  /transactions               - List transactions (with optional type filtering)
POST /transactions               - Create transaction (with type classification)
PUT  /transactions/:id           - Update transaction
DELETE /transactions/:id         - Delete transaction

GET  /holdings                   - List investment holdings
POST /holdings                   - Add new holding
PUT  /holdings/:id              - Update holding
DELETE /holdings/:id            - Delete holding

GET  /goals                      - List financial goals
POST /goals                      - Create new goal
GET  /goals/conflicts           - Check goal conflicts
GET  /goals/:id                 - Get specific goal
POST /goals/:id/contribute      - Add money to goal
PUT  /goals/:id                 - Update goal
DELETE /goals/:id               - Delete goal

GET  /planned-events            - List planned events
POST /planned-events            - Create planned event
PUT  /planned-events/:id        - Update planned event
DELETE /planned-events/:id      - Delete planned event
PUT  /planned-events/complete/:id - Mark event as complete (creates transaction)
PUT  /planned-events/reset/:id  - Undo completion (removes transaction)

### Budget Management Routes (`/budgets`) ✨ **NEW**
```
POST /budgets                    - Create budget
GET  /budgets                    - List user budgets  
PUT  /budgets/:id                - Update budget
DELETE /budgets/:id              - Delete budget
GET  /budgets/performance        - Get budget vs actual performance
```

### Reports Routes (`/reports`)
```
GET  /reports/expenses-summary      - Generate expense summary reports with date filtering
GET  /reports/monthly-income-expense - Monthly income vs expense comparison trends
GET  /reports/category-breakdown    - Category-wise spending breakdown analysis
GET  /reports/asset-allocation      - Investment portfolio allocation analysis with flexible grouping (?groupBy=assetType|platform|ticker)
GET  /reports/budget-vs-actual      - Budget vs actual spending comparison
GET  /reports/goal-progress         - Financial goals progress tracking
GET  /reports/recurring-transactions - Detect recurring transaction patterns with frequency analysis
```

### Settings Routes (`/settings`)
```
PUT  /settings/preferences      - Update user preferences
```

## 🔄 Business Logic Flow

### 1. Service Layer Integration Flow ✨ **NEW**
```mermaid
graph TD
    A[HTTP Request] --> B[Controller]
    B --> C{Auth Check}
    C -->|Valid| D[Extract Parameters]
    C -->|Invalid| E[Return 401]
    D --> F[Call Service Function]
    F --> G[Service Validation]
    G --> H[Database Operation]
    H --> I[Return Result]
    I --> J[Controller Response]
    J --> K[HTTP Response with Status Code]
```

### 2. Holdings Management Flow
```mermaid
graph TD
    A[Create Holding] --> B[Holdings Service]
    B --> C[Fetch Current Price]
    C --> D[Convert to Base Currency]
    D --> E[Store in Database]
    E --> F[Background Job Updates]
    F --> G[Price Refresh Every 6 Hours]
    G --> H[Update Converted Values]
```

**Implementation Details**:
1. **Price Fetching**: Real-time price lookup during creation
2. **Multi-Platform Support**: Zerodha, Binance, etc.
3. **Asset Types**: Stocks (Finnhub), Crypto (CoinGecko), Metals (metals.live)
4. **Currency Conversion**: Automatic conversion to user's base currency

### 3. Planned Events Management Flow ✨ **NEW**
```mermaid
graph TD
    A[Create Planned Event] --> B[Planned Event Service]
    B --> C[Fetch User Base Currency]
    C --> D[Store Event with Defaults]
    D --> E[Event Completion Flow]
    E --> F[Create Associated Transaction]
    F --> G[Mark Event as Completed]
    G --> H[Link Transaction to Event]
    
    I[Undo Completion] --> J[Find Completed Event]
    J --> K[Delete Associated Transaction]
    K --> L[Reset Event Status]
```

**Planned Events Features**:
1. **Event Creation**: Plan future expenses with target dates and estimated costs
2. **Currency Support**: Automatic default to user's base currency
3. **Category Integration**: Uses transaction categories for expense tracking
4. **Recurrence Support**: One-time or recurring events
5. **Completion Workflow**: Converts planned events to actual transactions
6. **Undo Capability**: Reverse completion and remove associated transactions
7. **User Isolation**: All events filtered by userId for security

### 4. Budget Management Flow ✨ **NEW**
```mermaid
graph TD
    A[Create Budget] --> B[Budget Service]
    B --> C[Validate Category & Period]
    C --> D[Store Budget]
    D --> E[Budget Performance Analysis]
    E --> F[Get Period Dates]
    F --> G[Query Transactions]
    G --> H[Currency Conversion]
    H --> I[Compare vs Budget]
    I --> J[Return Analysis]
```

**Budget Management Features**:
1. **Budget Creation**: Set spending limits by category and period
2. **Period Support**: WEEKLY, MONTHLY, QUARTERLY, HALF_YEARLY, YEARLY
3. **Performance Analysis**: Compare actual spending vs budgeted amounts
4. **Multi-Currency**: Automatic conversion to user's base currency
5. **Real-time Tracking**: Integration with transaction data

### 4. Currency Conversion Flow
```mermaid
graph TD
    A[Currency Request] --> B{Same Currency?}
    B -->|Yes| C[Return Original Value]
    B -->|No| D[Lookup Exchange Rate]
    D --> E{Rate Found?}
    E -->|Yes| F[Calculate Conversion]
    E -->|No| G[Throw Error]
    F --> H[Return Converted Value]
```

**Implementation**: Database-cached exchange rates with fallback handling

### 5. Goal Conflict Detection Flow
```mermaid
graph TD
    A[Check Goal Conflicts] --> B[Goal Service]
    B --> C[Get Active Goals]
    C --> D[Calculate Monthly Requirements]
    D --> E[Compare with Monthly Income]
    E --> F{Over Budget?}
    F -->|Yes| G[Return Conflict Details]
    F -->|No| H[Return No Conflicts]
```

## ⚙️ Background Jobs Architecture

### Job Scheduling System
**Framework**: `node-cron` for cron-based scheduling
**Schedule**: Every 6 hours (`0 */6 * * *`)

### 1. Currency Rate Refresh Job
**Purpose**: Update exchange rates from external APIs

**Flow**:
1. Fetch rates from fxratesapi.com
2. Upsert rates in database
3. Fallback to hardcoded rates on failure
4. Log operation status

### 2. Holdings Price Refresh Job
**Purpose**: Update investment holding prices

**Flow**:
1. Group holdings by asset type
2. Batch API calls by type:
   - **Stocks**: Finnhub API
   - **Crypto**: CoinGecko API  
   - **Metals**: metals.live API
3. Convert prices to user base currencies
4. Update database with new prices and values

**Optimization**: Single query with joins to avoid N+1 problems

## 🔐 Security Implementation

### 1. Authentication Security
- **JWT Tokens**: Signed with secret key, 7-day expiry
- **Password Hashing**: bcrypt with automatic salt generation
- **Token Validation**: Middleware-level verification

### 2. Authorization Patterns ✨ **ENHANCED**
- **User Isolation**: All resources filtered by `userId`
- **Controller-Level Checks**: Explicit authorization validation in each controller
- **Request Validation**: Input sanitization and type checking
- **Error Handling**: No sensitive data leakage

### 3. Database Security
- **Parameterized Queries**: Prisma prevents SQL injection
- **Connection Pooling**: Managed connection limits
- **Environment Variables**: Sensitive data externalized

## 🔄 Data Flow Patterns

### 1. Service Layer Pattern ✨ **NEW**
```typescript
// Controllers delegate to services
export const createTransaction = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { amount, currency, category, type, description, date, bankAccountId } = req.body;

  const txn = await createTransactionService(
    req.userId,
    amount,
    currency,
    category,
    date,
    type,
    description,
    bankAccountId
  );
  res.status(201).json(txn);
});
```

### 2. Service Implementation Pattern ✨ **NEW**
```typescript
// Services handle business logic and database operations
export const createTransaction = async (
  userId: string,
  amount: number,
  currency: string,
  category: Category,
  date: string,
  type?: TransactionType,
  description?: string,
  bankAccountId?: string
) => {
  try {
    if (!amount || !currency || !category || !date) {
      throw new Error('Amount, currency, category, and date are required');
    }

    const txn = await prisma.transaction.create({
      data: {
        userId,
        amount,
        currency,
        category,
        type: type || TransactionType.EXPENSE,
        description,
        date: new Date(date),
        bankAccountId,
      },
    });

    return txn;
  } catch (err) {
    console.error('Failed to create transaction:', err);
    throw err;
  }
};
```

### 3. External API Integration Pattern
```typescript
// Resilient external API calls in services
async function fetchCurrentPrice(ticker: string, assetType: string) {
  try {
    // API-specific logic
    return price;
  } catch (error) {
    console.warn(`Failed to fetch price for ${ticker}:`, error);
    return null;
  }
}
```

## 📊 Performance Optimizations

### 1. Database Optimizations
- **Single Query with Joins**: Avoid N+1 query problems
- **Selective Field Loading**: Only fetch required columns
- **Batch Operations**: Group similar operations

### 2. API Optimizations
- **Async/Await**: Non-blocking operations
- **Promise.all()**: Parallel processing where possible
- **Error Boundaries**: Graceful degradation

### 3. Memory Management
- **Connection Pooling**: Prisma manages database connections
- **Graceful Shutdown**: Clean resource cleanup
- **Process Signal Handling**: SIGINT, SIGTERM, SIGUSR2

## 🚀 Deployment Architecture

### Environment Configuration
```env
DATABASE_URL=postgresql://...
JWT_SECRET=...
FINNHUB_API_KEY=...
PORT=3000
NODE_ENV=production
```

### Production Considerations
- **Process Management**: PM2 or Docker containers
- **Database Migrations**: Automated via Prisma
- **Logging**: Structured logging for production debugging

## 🔄 Development Workflow

### Scripts
```json
{
  "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
  "build": "tsc",
  "start": "node dist/index.js",
  "prisma:migrate": "prisma migrate dev",
  "prisma:generate": "prisma generate",
  "seed": "ts-node src/scripts/seed.ts"
}
```

### Development Features
- **Hot Reload**: ts-node-dev for development
- **Type Safety**: Full TypeScript coverage
- **Database Schema**: Prisma-managed migrations
- **Seeding**: Automated test data creation

## 🆕 Recent Architecture Enhancements

### Service Layer Implementation ✨ **MAJOR UPDATE**
- **Complete Service Layer**: All controllers now use dedicated service functions
- **Business Logic Separation**: Database operations moved from controllers to services
- **Consistent Error Handling**: All services implement try-catch patterns with proper logging
- **Type Safety**: Enhanced TypeScript types from Prisma throughout services
- **Maintainability**: Clean separation of HTTP concerns from business logic

### Budget Management System ✨ **NEW**
- **Complete Budget CRUD**: Full budget creation, listing, updating, and deletion
- **Budget Performance Analysis**: Real-time budget vs actual spending comparison
- **Period Support**: WEEKLY, MONTHLY, QUARTERLY, HALF_YEARLY, YEARLY periods
- **API Integration**: 5 comprehensive budget endpoints (/budgets)
- **Service Layer**: Complete `budget.service.ts` with all operations
- **Date Utilities**: `getPeriodDates()` function for accurate period calculations
- **Multi-Currency Support**: Automatic currency conversion in budget analysis
- **Real-time Tracking**: Integration with transaction data for performance monitoring

### Authorization Enhancement ✨ **UPDATED**
- **Controller-Level Auth**: Every protected endpoint explicitly checks req.userId
- **Consistent Status Codes**: Proper HTTP status codes (200, 201, 204, 401) across all endpoints
- **Error Responses**: Standardized error message format
- **Security**: Removed use of non-null assertion operator (!) in favor of explicit checks

### Service Architecture Benefits
- **Reusability**: Services can be easily reused across different parts of the application
- **Testability**: Business logic can be unit tested independently
- **Maintainability**: Changes to business logic don't affect HTTP handling
- **Consistency**: Standardized error handling and validation patterns

This architecture provides a robust, scalable foundation for the Azerro personal finance platform with clear separation of concerns, comprehensive error handling, efficient data processing patterns, and a modern service layer architecture. 