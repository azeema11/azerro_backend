# Azerro Backend

Azerro is a modern, AI-powered personal finance and investment management platform. This repository contains the backend service, built with **Node.js**, **TypeScript**, **Express.js**, **Prisma (PostgreSQL)**, **Redis**, and the **Google Agent Development Kit (ADK)**.

The backend acts as a unified engine that handles traditional financial tracking (transactions, budgets, goals, bank accounts, reports) alongside a sophisticated, SEBI-aligned multi-agent AI assistant that integrates with external brokers via the **Model Context Protocol (MCP)**.

---

## 🚀 Key Features

### 1. Core Personal Finance Engine
* **Bank Accounts & Transactions**: Track accounts, balances, and categorize income/expenses.
* **Budgets & Savings Goals**: Create category-specific budgets and track progress toward savings targets.
* **Planned Financial Events**: Schedule and manage upcoming financial events (e.g., bills, subscriptions, planned income).
* **Multi-Currency Financial Reports**: Generate budget vs. actual, income vs. expense, and category breakdowns with automatic real-time currency conversion.

### 2. Broker Integration (INDMoney)
* **OAuth 2.1 with PKCE**: Secure, production-grade connection flow to INDMoney.
* **Holdings Sync**: Automatically pulls row-level holdings (stocks, mutual funds, crypto, metals) from the broker and maps them to the local PostgreSQL database.
* **PKCE State Expiry**: Secure, self-cleaning temporary PKCE state management to prevent token/session leaks.

### 3. AI-Powered Assistant (Google ADK)
* **Multi-Agent Coordinator Architecture**:
  * **Azerro (Main Coordinator)**: The primary conversational entry point. It analyzes user queries and delegates tasks to specialized sub-assistants.
  * **Friday (Finance Specialist)**: Equipped with tools to analyze transactions, budgets, bank accounts, and generate reports.
  * **Jarvis (Investment Advisor)**: Specialized in portfolio analysis, market research, and SEBI-aligned investment advice.
* **Personalized Memory**: Stored user preferences (risk tolerance, sector preferences, maximum P/E, maximum PEG, wishlists, and favorites) are dynamically loaded to customize Jarvis's recommendations.
* **Tool Calling & Action Proposals**: Secure write-action flow that proposes updates (e.g., "Create a transaction for $50") and executes them only after explicit user confirmation.

*For more detailed information about the AI Module, Agent Architecture, and ADK configuration, check out the dedicated [AI Module README](src/ai/README.md).*

### 4. Model Context Protocol (MCP) Integration
* Deep integration with the INDMoney MCP server to fetch real-time stock and mutual fund details, analyst consensus, target prices, and portfolio net-worth snapshots.

---

## 🛠️ Tech Stack

* **Runtime & Language**: Node.js, TypeScript (ESM/CommonJS hybrid)
* **Web Framework**: Express.js
* **Database & ORM**: PostgreSQL, Prisma ORM
* **Caching & Rate Limiting**: Redis, `ioredis`
* **AI Framework**: Google ADK (Agent Development Kit), `@google/genai` (Gemini 2.5)
* **Integration Protocols**: Model Context Protocol (MCP) SDK
* **Testing**: Vitest, Supertest
* **Process Management**: `ts-node-dev`, Docker Compose

---

## 📁 Project Structure

```
/
├── .github/workflows/      # CI/CD deployment workflows
├── mcps/                   # MCP server configurations and tool descriptors
├── prisma/                 # Prisma schema and migrations
│   └── schema.prisma       # Database schema definition
├── src/
│   ├── ai/                 # AI Module (Google ADK) — [Detailed AI README](src/ai/README.md)
│   │   ├── adk/
│   │   │   ├── assistants/ # Coordinator, Finance, and Investment agents
│   │   │   ├── tools/      # Tool definitions (data, action, market, memory)
│   │   │   └── runner.ts   # Session management, execution loop, and persistence
│   │   ├── controllers/    # HTTP handlers for AI endpoints
│   │   ├── routes/         # AI routing
│   │   └── services/       # AI-specific services (MCP client, user memory)
│   ├── controllers/        # Core controllers (auth, transaction, holding, etc.)
│   ├── jobs/               # Background cron jobs (holding refresh, currency rates)
│   ├── middlewares/        # Express middlewares (auth, rate limiting, error handling)
│   ├── routes/             # Core API routes
│   ├── scripts/            # Database seeding, maintenance, and probe scripts
│   ├── services/           # Core business logic (brokers, currency, reports)
│   ├── utils/              # Shared utilities (db, redis, currency, errors)
│   └── index.ts            # Application entry point
├── vitest.config.ts        # Testing configuration
└── docker-compose_local.yml # Local Docker services (PostgreSQL, Redis)
```

---

## ⚙️ Environment Variables

Create a `.env` file in the root directory based on `.env.example`:

```bash
# Database & Redis
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public
REDIS_URL=redis://redis_host:redis_port

# Server Configuration
PORT=3000
NODE_ENV="development"
JWT_SECRET=your_jwt_secret_here
API_BASE_URL=base_url

# AI Configuration
AI_PROVIDER=your_ai_provider
AI_MODEL=your_ai_model
GEMINI_API_KEY=gemini_api_key
OLLAMA_BASE_URL=your_ollama_base_url

# INDMoney Broker Configuration
INDMONEY_AUTH_URL=https://mcp.indmoney.com/authorize
INDMONEY_TOKEN_URL=https://mcp.indmoney.com/token
INDMONEY_MCP_URL=https://mcp.indmoney.com/mcp
INDMONEY_CLIENT_ID=your_indmoney_client_id_here
INDMONEY_CLIENT_SECRET=your_indmoney_client_secret_here
```

---

## 🚀 Getting Started

### 1. Start Local Infrastructure
The easiest way to start PostgreSQL and Redis is using Docker Compose:
```bash
npm run dev:with_docker
```
This command starts the local Docker containers and launches the Express server in development mode with hot-reloading.

Alternatively, if you already have PostgreSQL and Redis running locally:
```bash
npm run dev
```

### 2. Database Setup & Seeding
Generate the Prisma client and run database migrations:
```bash
npx prisma migrate dev
npx prisma generate
```

Seed the database with default currency rates and baseline configurations:
```bash
npm run seed
```

(Optional) Populate dummy transactions, bank accounts, and budgets for testing:
```bash
npm run populate
```

---

## 📡 API Endpoints

### Core Routes
* **Authentication (`/auth`)**: `POST /register`, `POST /login`, `POST /logout` (Rate-limited)
* **User Profile (`/user`)**: `GET /profile`, `PUT /profile`
* **Bank Accounts (`/bank-accounts`)**: `GET /`, `POST /`, `DELETE /:id`
* **Transactions (`/transactions`)**: `GET /`, `POST /`, `PUT /:id`, `DELETE /:id`
* **Savings Goals (`/goals`)**: `GET /`, `POST /`, `PUT /:id`
* **Budgets (`/budgets`)**: `GET /`, `POST /`
* **Planned Events (`/planned-events`)**: `GET /`, `POST /`, `PUT /:id`
* **Reports (`/reports`)**: `GET /budget-vs-actual`, `GET /income-vs-expense`, `GET /category-breakdown`

### Broker & AI Routes
* **Broker Connection (`/brokers`)**:
  * `POST /indmoney/connect` — Initiates OAuth 2.1 PKCE flow or connects with a direct token.
  * `GET /indmoney/callback` — Handles OAuth callback and exchanges code for tokens.
  * `POST /indmoney/sync` — Manually triggers a portfolio holdings sync.
  * `GET /indmoney/status` — Checks broker connection status.
* **AI Assistant (`/ai`)**:
  * `POST /assistant` — Unified conversational endpoint. Send financial queries or commands to Azerro. (Rate-limited, requires authentication).

---

## 🕒 Background Jobs

The backend runs several scheduled background tasks (using `node-cron`):
1. **Holding Refresh Job**: Periodically syncs real-time holdings from connected brokers for all active users.
2. **Currency Rate Refresh Job**: Periodically fetches and updates multi-currency exchange rates.
3. **Database Maintenance Job**: Runs lightweight database optimizations (vacuum, reindexing) to ensure peak performance.

---

## 🧪 Running Tests

We use **Vitest** for unit and integration testing.

* **Run all tests**:
  ```bash
  npm run test
  ```
* **Run AI module tests**:
  ```bash
  npm run test:ai
  ```
* **Run core backend tests**:
  ```bash
  npm run test:main
  ```
* **Run with coverage**:
  ```bash
  npm run test:coverage
  ```

---

## 📄 License

This project is licensed under the **ISC License** - see the [LICENSE](LICENSE) file for details.
