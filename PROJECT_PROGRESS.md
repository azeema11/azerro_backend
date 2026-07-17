# Azerro Backend — Project Status

## Overview

**Azerro** is a personal finance management platform with AI-powered assistance. The backend is production-ready with all core features implemented, tested, and optimized.

## Technology Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM (Decimal precision, database-level constraints)
- **Caching**: Redis (ioredis) with resilient wrappers
- **AI**: Google ADK with Gemini 2.5 Flash
- **Testing**: Vitest (fully mocked — no test database required)
- **Deployment**: Docker Compose, GitHub Actions CI/CD

## Feature Status

| Feature | Status | Endpoints |
|---------|--------|-----------|
| Authentication (JWT + bcrypt) | Complete | 2 |
| User Profile & Preferences | Complete | 2 |
| Bank Accounts (multi-currency) | Complete | 4 |
| Transactions (income/expense) | Complete | 4 |
| Investment Holdings (stocks, crypto, metals) | Complete | 5 |
| Financial Goals (with conflict detection) | Complete | 7 |
| Planned Events (with completion workflow) | Complete | 6 |
| Budget Management (with performance analysis) | Complete | 5 |
| Reports & Analytics (8 report endpoints) | Complete | 8 |
| Currency System (current + historical rates) | Complete | — |
| Background Jobs (prices, rates, maintenance) | Complete | — |
| Broker Integration (INDMoney OAuth 2.1 + PKCE) | Complete | 10 |
| User Memory & Preferences | Complete | — |
| AI Multi-Agent Assistant (Azerro, Friday, Jarvis) | Complete | 1 |
| Docker & CI/CD Deployment | Complete | — |
| **Total** | **All Complete** | **54** |

## Architecture Highlights

- **Service Layer**: All controllers delegate to typed service functions
- **Structured Errors**: `ValidationError`, `NotFoundError`, `withPrismaErrorHandling`
- **Decimal Precision**: All monetary values use PostgreSQL `DECIMAL` types
- **Database Constraints**: Positivity checks, format validation, business logic at DB level
- **Resilient Caching**: All Redis ops use safe wrappers; failures degrade to DB
- **Multi-Agent AI**: Coordinator (Azerro) → Finance (Friday) + Investment (Jarvis)
- **OAuth 2.1 + PKCE**: Broker integration with auto token refresh
- **Full Test Coverage**: All tests run mocked (no Docker services needed)

## Database Schema (14 tables)

User, Assistant, UserAssistant, Holding, HoldingHistory, Transaction, BankAccount, PlannedEvent, Budget, Goal, CurrencyRate, CurrencyRateHistory, ChatMessage, UserMemory

Key optimizations:
- `DECIMAL(15,2)` for monetary amounts
- `DECIMAL(18,8)` for exchange rates
- `DECIMAL(20,8)` for crypto quantities
- `VarChar` with appropriate lengths (3 for currency codes, 100 for names, etc.)
- Composite unique constraints
- Automated monthly maintenance (VACUUM, REINDEX, ANALYZE)

## What's Not Implemented

- Bank account synchronization (Plaid, Yodlee)
- Push notifications / budget alerts
- Credit score tracking
- Ollama provider (prepared but not wired)
- Additional broker integrations (Zerodha, Groww)
