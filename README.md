# Azerro Backend

A personal finance and investment management platform powered by a multi-agent AI assistant. Built with **Node.js**, **TypeScript**, **Express.js**, **Prisma (PostgreSQL)**, **Redis**, and the **Google Agent Development Kit (ADK)**.

---

## Key Features

### Core Finance Engine
- **Bank Accounts & Transactions** — Track accounts, balances, and categorize income/expenses across multiple currencies.
- **Budgets & Savings Goals** — Create category-specific budgets and track progress toward savings targets with conflict detection.
- **Planned Financial Events** — Schedule upcoming bills, subscriptions, and planned income with completion workflows.
- **Multi-Currency Reports** — Budget vs. actual, income vs. expense, category breakdowns, asset allocation, recurring transaction detection — all with automatic currency conversion.

### Broker Integration (INDMoney)
- **OAuth 2.1 with PKCE** — Secure connection flow with dynamic client registration (RFC 7591).
- **Holdings Sync** — Pulls row-level holdings (stocks, mutual funds, crypto, metals) and maps them to the local database.
- **Auto Token Refresh** — Seamless background sync with automatic credential renewal.

### AI Assistant (Google ADK)
- **Multi-Agent Coordinator** — Azerro (coordinator) delegates to Friday (finance) and Jarvis (investments).
- **21 Tools** — 9 data tools (read-only), 6 action tools (write with confirmation), 2 coordinator tools, 2 market tools, 2 memory tools.
- **Personalized Memory** — Stored preferences (risk tolerance, sector prefs, wishlists) customize recommendations.
- **MCP Integration** — Real-time market data via INDMoney's MCP server.

See the dedicated [AI Module README](src/ai/README.md) for detailed architecture and tool documentation.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js, TypeScript |
| Web Framework | Express.js |
| Database | PostgreSQL, Prisma ORM |
| Caching & Rate Limiting | Redis (ioredis) |
| AI Framework | Google ADK, Gemini 2.5 |
| Input Validation | Zod 4 |
| Integration Protocols | Model Context Protocol (MCP) SDK |
| Testing | Vitest, Supertest |
| Process Management | ts-node-dev, Docker Compose |

---

## Project Structure

```
├── prisma/                 # Schema and migrations
├── src/
│   ├── ai/                 # AI Module (Google ADK)
│   │   ├── adk/
│   │   │   ├── assistants/ # Azerro, Friday, Jarvis agents
│   │   │   ├── tools/      # Tool definitions (data, action, market, memory, coordinator)
│   │   │   ├── runner.ts   # Session management and execution loop
│   │   │   └── model_config.ts
│   │   ├── controllers/    # AI tool handlers with Redis caching
│   │   ├── services/       # AI-specific services (MCP client, user memory, chat)
│   │   ├── routes/         # AI routing
│   │   ├── validations/    # AI-specific Zod schemas
│   │   └── tests/          # Integration tests (fully mocked)
│   ├── controllers/        # Core HTTP handlers
│   ├── services/           # Business logic + broker integrations
│   ├── routes/             # Core API routes
│   ├── jobs/               # Background cron jobs
│   ├── middlewares/        # Auth, validation, rate limiting, error handling
│   ├── validations/        # Zod schemas for all route inputs
│   ├── types/              # TypeScript interfaces
│   ├── utils/              # Shared utilities (db, redis, currency, errors)
│   ├── scripts/            # Seeding and maintenance
│   └── index.ts            # Application entry point
├── docker-compose.yml      # Production (Redis + pre-built backend image)
└── docker-compose_local.yml # Local dev (Postgres + Redis + backend from source)
```

---

## Architecture

### Request Flow

```
Client → Express → CORS → Body Parser → Security Headers
  → Rate Limiter (Redis) → Auth Middleware (JWT)
  → Zod Validation Middleware → Controller → Service → Prisma/Redis
  → Global Error Handler → Response
```

### Validation Strategy

All request inputs are validated at the route level using **Zod schemas** via a centralized `validate()` middleware. Each route file wires the appropriate schema for `body`, `query`, and `params` validation. The validated and transformed values are re-assigned to `req.body`, `req.query`, and `req.params`, ensuring downstream code receives correctly typed data.

Schemas are organized per domain in `src/validations/`:

| File | Covers |
|------|--------|
| `auth.schema.ts` | Registration, login |
| `transaction.schema.ts` | CRUD + list filtering |
| `holding.schema.ts` | CRUD + list/history filtering |
| `goal.schema.ts` | CRUD + contribute |
| `budget.schema.ts` | CRUD |
| `planned_event.schema.ts` | CRUD + complete/reset |
| `bank_account.schema.ts` | CRUD |
| `report.schema.ts` | Date ranges, periodic reports, asset allocation |
| `broker.schema.ts` | Connection, sync, search, instrument details, memory |
| `user.schema.ts` | Profile update |
| `ai.schema.ts` | Assistant message + session ID |

Services contain only **business logic validations** (e.g., "target date must be in the future", "email already in use") — field-presence and type checks are handled exclusively by Zod.

### Error Handling

A layered error handling middleware chain catches and formats all errors:

1. **Zod validation errors** → 400 with structured field-level details
2. **Domain errors** (`ValidationError`, `NotFoundError`) → appropriate HTTP codes with resource context
3. **Prisma errors** → mapped to domain errors via `withPrismaErrorHandling` / `withNotFoundHandling`
4. **CORS errors** → 403
5. **Unexpected errors** → 500 (with stack traces in development)

### Async Patterns

Performance-critical paths use batched parallel execution:

- **Currency conversion** — `batchConvertCurrency()` and `batchConvertCurrencyHistorical()` fetch all required exchange rates in a single DB query, then apply them in memory.
- **Goal conflict detection** — All goal and event amounts are batch-converted in one call instead of sequential per-item queries.
- **Asset allocation** — Holdings needing price conversion are batch-processed.
- **Report generation** — Transactions, budgets, and events are fetched in parallel via `Promise.all`.
- **Background jobs** — Metal price updates and broker syncs run concurrently with chunked concurrency limits.

---

## Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Database & Redis
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public
REDIS_URL=redis://redis_host:redis_port

# Server
PORT=3000
NODE_ENV=development
JWT_SECRET=your_jwt_secret
API_BASE_URL=http://localhost:3000

# AI
AI_PROVIDER=gemini
AI_MODEL=gemini-2.5-flash
GEMINI_API_KEY=your_gemini_api_key

# INDMoney Broker
INDMONEY_AUTH_URL=https://mcp.indmoney.com/authorize
INDMONEY_TOKEN_URL=https://mcp.indmoney.com/token
INDMONEY_MCP_URL=https://mcp.indmoney.com/mcp
INDMONEY_CLIENT_ID=your_client_id
INDMONEY_CLIENT_SECRET=your_client_secret
```

---

## Getting Started

### Start with Docker (recommended)
```bash
npm run dev:with_docker
```
Starts PostgreSQL and Redis containers, then launches the Express server with hot-reloading.

### Or with existing services
```bash
npm run dev
```

### Database setup
```bash
npx prisma migrate dev
npx prisma generate
npm run seed          # Seed default currency rates
npm run populate      # (Optional) Populate dummy data for testing
```

---

## API Endpoints

All endpoints except `/auth/*`, `/health`, and `GET /brokers/indmoney/callback` require a `Bearer` token via `Authorization` header. All request bodies, query params, and path params are validated with Zod schemas.

### Health (`/health`)
`GET /` — Server status, uptime, environment

### Authentication (`/auth`) — rate limited: 10 req / 15 min per email
`POST /signup` · `POST /login`

### User (`/user`)
`GET /me` · `PUT /preferences`

### Bank Accounts (`/bank-accounts`)
`GET /` · `POST /` · `PUT /:id` · `DELETE /:id`

### Transactions (`/transactions`)
`GET /?type=INCOME|EXPENSE` · `POST /` · `PUT /:id` · `DELETE /:id`

### Holdings (`/holdings`)
`GET /?onlyWithBalance=true` · `GET /history?limit=N` · `POST /` · `PUT /:id` · `DELETE /:id`

### Goals (`/goals`)
`GET /` · `POST /` · `GET /:id` · `PUT /:id` · `DELETE /:id` · `POST /:id/contribute` · `GET /conflicts`

### Budgets (`/budgets`)
`GET /` · `GET /performance` · `POST /` · `PUT /:id` · `DELETE /:id`

### Planned Events (`/planned-events`)
`GET /` · `POST /` · `PUT /:id` · `DELETE /:id` · `PUT /complete/:id` · `PUT /reset/:id`

### Reports (`/reports`)
`GET /expenses-summary` · `GET /monthly-income-expense` · `GET /income-vs-expense` · `GET /category-breakdown` · `GET /asset-allocation` · `GET /budget-vs-actual` · `GET /goal-progress` · `GET /recurring-transactions`

### Brokers (`/brokers`)
`POST /:broker/connect` · `GET /indmoney/callback` · `GET /:broker/status` · `POST /:broker/sync` · `POST /:broker/disconnect` · `GET /:broker/search?query=` · `GET /:broker/instrument/:symbol` · `GET /memory/all` · `POST /memory/save` · `DELETE /memory/:category/:key`

### AI (`/ai`) — rate limited: 50 req / day
`POST /assistant` — Unified conversational endpoint (authenticated, rate-limited, Zod-validated)

---

## Background Jobs

| Job | Schedule | Purpose |
|-----|----------|---------|
| Currency Rate Refresh | Every 6 hours | Updates exchange rates from fxratesapi.com |
| Holdings Price Refresh | Twice daily (12:30, 22:30) | Updates metal prices + syncs INDMoney holdings |
| Database Maintenance | Monthly (1st, 2AM UTC) | VACUUM, REINDEX, ANALYZE |

---

## Testing

All tests run fully mocked — no database, Redis, or LLM calls required.

```bash
npm run test           # All tests
npm run test:ai        # AI module tests
npm run test:main      # Core backend tests
npm run test:coverage  # With coverage report
```

---

## License

ISC
