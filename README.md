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
│   │   └── tests/          # Integration tests (fully mocked)
│   ├── controllers/        # Core HTTP handlers
│   ├── services/           # Business logic + broker integrations
│   ├── routes/             # Core API routes
│   ├── jobs/               # Background cron jobs
│   ├── middlewares/        # Auth, rate limiting, error handling
│   ├── validations/        # Zod schemas
│   ├── types/              # TypeScript interfaces
│   ├── utils/              # Shared utilities (db, redis, currency, errors)
│   ├── scripts/            # Seeding and maintenance
│   └── index.ts            # Application entry point
├── docker-compose.yml      # Production (Redis + pre-built backend image)
└── docker-compose_local.yml # Local dev (Postgres + Redis + backend from source)
```

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

### Authentication (`/auth`)
`POST /signup` · `POST /login`

### User (`/user`)
`GET /me` · `PUT /preferences`

### Bank Accounts (`/bank-accounts`)
`GET /` · `POST /` · `PUT /:id` · `DELETE /:id`

### Transactions (`/transactions`)
`GET /` · `POST /` · `PUT /:id` · `DELETE /:id`

### Holdings (`/holdings`)
`GET /` · `GET /history` · `POST /` · `PUT /:id` · `DELETE /:id`

### Goals (`/goals`)
`GET /` · `POST /` · `GET /:id` · `PUT /:id` · `DELETE /:id` · `POST /:id/contribute` · `GET /conflicts`

### Budgets (`/budgets`)
`GET /` · `GET /performance` · `POST /` · `PUT /:id` · `DELETE /:id`

### Planned Events (`/planned-events`)
`GET /` · `POST /` · `PUT /:id` · `DELETE /:id` · `PUT /complete/:id` · `PUT /reset/:id`

### Reports (`/reports`)
`GET /expenses-summary` · `GET /monthly-income-expense` · `GET /income-vs-expense` · `GET /category-breakdown` · `GET /asset-allocation` · `GET /budget-vs-actual` · `GET /goal-progress` · `GET /recurring-transactions`

### Brokers (`/brokers`)
`POST /:broker/connect` · `GET /indmoney/callback` · `GET /:broker/status` · `POST /:broker/sync` · `POST /:broker/disconnect` · `GET /:broker/search` · `GET /:broker/instrument/:symbol` · `GET /memory/all` · `POST /memory/save` · `DELETE /memory/:category/:key`

### AI (`/ai`)
`POST /assistant` — Unified conversational endpoint (rate-limited, authenticated)

---

## Background Jobs

| Job | Schedule | Purpose |
|-----|----------|---------|
| Currency Rate Refresh | Every 6 hours | Updates exchange rates from fxratesapi.com |
| Holdings Price Refresh | Every 6 hours | Updates stock/crypto/metal prices |
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
