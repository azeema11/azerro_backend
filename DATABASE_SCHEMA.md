# Azerro Backend — Database Schema

PostgreSQL database managed with Prisma ORM (14 tables). All monetary values use `DECIMAL` types for precision; string fields use `VarChar` with length constraints for validation or `Text` for unbounded content.

## Entity Relationships

```
User (1) ──── (Many) UserAssistant ──── (Many) Assistant
User (1) ──── (Many) Holding
User (1) ──── (Many) HoldingHistory
User (1) ──── (Many) Transaction
User (1) ──── (Many) BankAccount ──── (Many) Transaction
User (1) ──── (Many) PlannedEvent
User (1) ──── (Many) Budget
User (1) ──── (Many) Goal
User (1) ──── (Many) ChatMessage
User (1) ──── (Many) UserMemory
CurrencyRate (standalone)
CurrencyRateHistory (standalone)
```

## Tables

### User

| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | PK |
| name | VarChar(100) | NOT NULL |
| email | VarChar(255) | UNIQUE, NOT NULL, email format |
| passwordHash | VarChar(255) | NOT NULL |
| createdAt | DateTime | DEFAULT now() |
| monthlyIncome | Decimal(15,2) | NULLABLE, >= 0 |
| baseCurrency | VarChar(3) | DEFAULT "INR", currency format |

### Holding

| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | PK |
| userId | UUID | FK → User |
| platform | VarChar(50) | NOT NULL |
| ticker | VarChar(50) | NOT NULL |
| assetType | AssetType | NOT NULL |
| name | VarChar(255) | NOT NULL |
| quantity | Decimal(20,8) | NOT NULL |
| avgCost | Decimal(15,4) | NOT NULL |
| holdingCurrency | VarChar(3) | NOT NULL |
| lastPrice | Decimal(15,4) | DEFAULT 0 |
| lastChecked | DateTime | AUTO UPDATE |
| convertedValue | Decimal(15,2) | DEFAULT 0 |

**Unique**: (id, userId)
**Indexes**: (userId), (userId, assetType), (ticker), (platform)

### HoldingHistory

| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | PK |
| userId | UUID | FK → User (CASCADE) |
| holdingId | String | NOT NULL |
| platform | VarChar(50) | NOT NULL |
| ticker | VarChar(50) | NOT NULL |
| assetType | AssetType | NOT NULL |
| name | VarChar(255) | NOT NULL |
| quantity | Decimal(20,8) | NOT NULL |
| avgCost | Decimal(15,4) | NOT NULL |
| holdingCurrency | VarChar(3) | NOT NULL |
| lastPrice | Decimal(15,4) | NOT NULL |
| convertedValue | Decimal(15,2) | NOT NULL |
| recordedAt | DateTime | DEFAULT now() |

**Indexes**: (userId), (userId, recordedAt), (holdingId), (ticker), (assetType)

### Transaction

| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | PK |
| userId | UUID | FK → User |
| amount | Decimal(15,2) | NOT NULL |
| currency | VarChar(3) | NOT NULL |
| category | Category | NOT NULL |
| type | TransactionType | NOT NULL, DEFAULT EXPENSE |
| description | VarChar(500) | NULLABLE |
| date | DateTime | NOT NULL |
| bankAccountId | UUID | FK → BankAccount, NULLABLE |

**Unique**: (id, userId)
**Indexes**: (userId, type), (userId, date), (userId, category), (date)

### BankAccount

| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | PK |
| userId | UUID | FK → User |
| name | VarChar(100) | NOT NULL |
| type | AccountType | NOT NULL |
| balance | Decimal(15,2) | NOT NULL |
| currency | VarChar(3) | NOT NULL |
| createdAt | DateTime | DEFAULT now() |

**Unique**: (id, userId)
**Indexes**: (userId), (userId, type)

### Goal

| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | PK |
| userId | UUID | FK → User |
| name | VarChar(200) | NOT NULL |
| description | VarChar(1000) | NULLABLE |
| targetAmount | Decimal(15,2) | NOT NULL |
| savedAmount | Decimal(15,2) | DEFAULT 0 |
| currency | VarChar(3) | NOT NULL |
| targetDate | DateTime | NOT NULL |
| createdAt | DateTime | DEFAULT now() |
| updatedAt | DateTime | AUTO UPDATE |
| completed | Boolean | DEFAULT false |

**Unique**: (id, userId)
**Indexes**: (userId), (userId, completed), (userId, targetDate), (targetDate)

### Budget

| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | PK |
| userId | UUID | FK → User |
| category | Category | NOT NULL |
| amount | Decimal(15,2) | NOT NULL |
| period | Periodicity | NOT NULL |
| createdAt | DateTime | DEFAULT now() |

**Unique**: (id, userId)
**Indexes**: (userId), (userId, category), (userId, period)

### PlannedEvent

| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | PK |
| userId | UUID | FK → User |
| name | VarChar(200) | NOT NULL |
| targetDate | DateTime | NOT NULL |
| estimatedCost | Decimal(15,2) | NOT NULL |
| savedSoFar | Decimal(15,2) | DEFAULT 0 |
| currency | VarChar(3) | NOT NULL |
| category | Category | NOT NULL |
| recurrence | Periodicity | DEFAULT ONE_TIME |
| completed | Boolean | DEFAULT false |
| completedTxId | String | FK → Transaction, UNIQUE, NULLABLE |
| createdAt | DateTime | DEFAULT now() |

**Unique**: (id, userId)
**Indexes**: (userId, completed), (userId, targetDate), (userId, category), (targetDate)

### CurrencyRate

| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | PK |
| base | VarChar(3) | NOT NULL |
| target | VarChar(3) | NOT NULL |
| rate | Decimal(18,8) | NOT NULL |
| updatedAt | DateTime | AUTO UPDATE |

**Unique**: (base, target)

### CurrencyRateHistory

| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | PK |
| base | VarChar(3) | NOT NULL |
| target | VarChar(3) | NOT NULL |
| rate | Decimal(18,8) | NOT NULL |
| rateDate | DateTime | NOT NULL |
| createdAt | DateTime | DEFAULT now() |

**Unique**: (base, target, rateDate)
**Indexes**: (base, target), (rateDate)

### ChatMessage

| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | PK |
| userId | UUID | FK → User (CASCADE) |
| role | VarChar(10) | NOT NULL ("user" or "ai") |
| content | Text | NOT NULL |
| intent | VarChar(50) | NULLABLE |
| sessionId | VarChar(100) | NULLABLE |
| toolCalls | JSON | NULLABLE |
| actions | JSON | NULLABLE |
| metadata | JSON | NULLABLE |
| createdAt | DateTime | DEFAULT now() |

**Indexes**: (userId, createdAt), (userId, sessionId)

### UserMemory

| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | PK |
| userId | UUID | FK → User (CASCADE) |
| category | VarChar(50) | NOT NULL |
| key | VarChar(100) | NOT NULL |
| value | JSON | NOT NULL |
| description | VarChar(500) | NULLABLE |
| createdAt | DateTime | DEFAULT now() |
| updatedAt | DateTime | AUTO UPDATE |

**Unique**: (userId, category, key)
**Indexes**: (userId), (userId, category)

### Assistant

| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | PK |
| name | VarChar(50) | UNIQUE, NOT NULL |
| displayName | VarChar(100) | NOT NULL |
| description | VarChar(500) | NULLABLE |
| createdAt | DateTime | DEFAULT now() |

### UserAssistant

| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | PK |
| userId | UUID | FK → User |
| assistantId | UUID | FK → Assistant |
| activatedAt | DateTime | DEFAULT now() |
| settings | JSON | NULLABLE |

**Unique**: (userId, assistantId)

## Enums

### Category
`GROCERY` · `UTILITIES` · `TRANSPORTATION` · `CLOTHING` · `ENTERTAINMENT` · `RENT` · `HEALTHCARE` · `OTHER`

### AssetType
`STOCK` · `CRYPTO` · `METAL` · `LIQUID`

### AccountType
`SAVINGS` · `CURRENT` · `CREDIT_CARD` · `CASH`

### Periodicity
`DAILY` · `WEEKLY` · `MONTHLY` · `QUARTERLY` · `HALF_YEARLY` · `YEARLY` · `ONE_TIME`

### TransactionType
`INCOME` · `EXPENSE`

## Database Constraints

- **Positivity**: All monetary values enforced as positive (>0) or non-negative (>=0) at DB level
- **Currency format**: 3-letter uppercase validated with regex `^[A-Z]{3}$`
- **Email validation**: Enforced at database level
- **Business logic**: Target dates must be in future; same-currency rate pairs must equal 1.0
- **Credit card**: Balance can be negative; other account types must be non-negative

## Optimization Summary

The schema has been comprehensively optimized for a financial application:

| Optimization | Details |
|---|---|
| Float → Decimal | Eliminates floating-point rounding errors in monetary calculations |
| String → VarChar/Text | VarChar length constraints enforce input validation; Text used for unbounded content (e.g. ChatMessage.content) |
| Index consolidation | Redundant single-column indexes removed; compound indexes cover all query patterns |
| Database constraints | Business rules enforced at DB level (positivity, format, logic) |
| Atomic operations | Currency rate updates use `prisma.$transaction` instead of `Promise.all` |
| Automated maintenance | Monthly VACUUM FULL + REINDEX + ANALYZE (1st of month, 2AM UTC) via `src/jobs/database_maintenance.job.ts` |

**Precision tiers**:
- `DECIMAL(18,8)` — Exchange rates (prevents rounding in multi-step conversions)
- `DECIMAL(15,2)` — Monetary amounts (transactions, balances, goals, budgets)
- `DECIMAL(20,8)` — Investment quantities (crypto fractional shares)
- `DECIMAL(15,4)` — Asset prices (stock/crypto market prices)

**Index strategy**: Single compound unique indexes (e.g., `CurrencyRateHistory_base_target_rateDate_key`) cover multiple query patterns without redundant single-column indexes.

## Migration History

1. `20250809054235` — Initial schema with all core tables
2. `20250809065218` — PlannedEvent completion tracking (`completedTxId`)
3. `20250809135652` — Referential integrity and indexes
4. `20250809142129` — Compound unique constraints
5. `20250810045220` — CurrencyRateHistory table
6. `20250810054011` — Schema optimization (Float → Decimal, String → VarChar)
7. `20250810054012` — Data integrity constraints
8. `20250810054013` — Remaining constraints
9. `20250810060001` — Optimize database size
10. `20250810070001` — Consolidate redundant indexes
11. `20251027111512` — Goals naming fix
12. `20260330095117` — ChatMessage table
13. `20260616114137` — Agent session columns (sessionId, toolCalls, actions, metadata on ChatMessage)
14. `20260701094509` — UserMemory table
15. `20260716061203` — HoldingHistory table
16. `20260716075307` — Widen ticker (→ VarChar(50)) and name (→ VarChar(255)) columns
17. `20260716080054` — Add LIQUID asset type
18. `20260716080434` — Allow zero avgCost on holdings
19. `20260716080550` — Allow zero quantity on holdings
