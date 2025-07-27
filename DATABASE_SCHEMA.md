# Azerro Backend - Database Schema Documentation

## Overview
This document describes the database schema for the Azerro personal finance management platform. The system is built using **PostgreSQL** as the primary database with **Prisma** as the ORM.

## Entity Relationship Diagram
The database consists of 10 main entities with the following relationships:

```
User (1) ──── (Many) UserAssistant ──── (Many) Assistant
User (1) ──── (Many) Holding
User (1) ──── (Many) Transaction
User (1) ──── (Many) BankAccount ──── (Many) Transaction
User (1) ──── (Many) PlannedEvent
User (1) ──── (Many) Budget
User (1) ──── (Many) Goal
CurrencyRate (standalone)
```

## Database Tables

### 1. User
**Purpose**: Core user account information and preferences

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique user identifier |
| name | String | NOT NULL | User's full name |
| email | String | UNIQUE, NOT NULL | User's email address |
| passwordHash | String | NOT NULL | Hashed password for authentication |
| createdAt | DateTime | DEFAULT: now() | Account creation timestamp |
| monthlyIncome | Float | NULLABLE | User's monthly income |
| baseCurrency | String | DEFAULT: "INR" | User's preferred reporting currency |

### 2. Assistant
**Purpose**: Available assistant modules in the platform

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique assistant identifier |
| name | String | UNIQUE, NOT NULL | Assistant module name (e.g., "finance") |
| displayName | String | NOT NULL | Human-readable name (e.g., "Personal Finance") |
| description | String | NULLABLE | Assistant description |
| createdAt | DateTime | DEFAULT: now() | Creation timestamp |

### 3. UserAssistant
**Purpose**: Junction table for user-assistant relationships

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique relationship identifier |
| userId | UUID | FOREIGN KEY | Reference to User |
| assistantId | UUID | FOREIGN KEY | Reference to Assistant |
| activatedAt | DateTime | DEFAULT: now() | Activation timestamp |
| settings | JSON | NULLABLE | User-specific assistant settings |

**Unique Constraint**: (userId, assistantId)

### 4. Holding
**Purpose**: User's investment holdings across different platforms

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique holding identifier |
| userId | UUID | FOREIGN KEY | Reference to User |
| platform | String | NOT NULL | Trading platform (e.g., "Zerodha", "Binance") |
| ticker | String | NOT NULL | Asset ticker symbol (e.g., "INFY.NS", "BTC") |
| assetType | AssetType | NOT NULL | Type of asset (STOCK, CRYPTO, METAL) |
| name | String | NOT NULL | Human-readable asset name |
| quantity | Float | NOT NULL | Number of units held |
| avgCost | Float | NOT NULL | Average cost per unit in holding currency |
| holdingCurrency | String | NOT NULL | Currency of the holding (e.g., "INR", "USD") |
| lastPrice | Float | DEFAULT: 0 | Latest price per unit |
| lastChecked | DateTime | AUTO UPDATE | Last price update timestamp |
| convertedValue | Float | DEFAULT: 0 | Total value in user's base currency |

### 5. Transaction
**Purpose**: Financial transactions made by users

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique transaction identifier |
| userId | UUID | FOREIGN KEY | Reference to User |
| amount | Float | NOT NULL | Transaction amount |
| currency | String | NOT NULL | Transaction currency |
| category | Category | NOT NULL | Transaction category (enum) |
| type | TransactionType | NOT NULL, DEFAULT: EXPENSE | Transaction type (INCOME/EXPENSE) |
| description | String | NULLABLE | Transaction description |
| date | DateTime | NOT NULL | Transaction date |
| bankAccountId | UUID | FOREIGN KEY, NULLABLE | Associated bank account |

### 6. BankAccount
**Purpose**: User's bank accounts and financial accounts

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique account identifier |
| userId | UUID | FOREIGN KEY | Reference to User |
| name | String | NOT NULL | Account name/nickname |
| type | AccountType | NOT NULL | Account type (SAVINGS, CURRENT, CREDIT_CARD, CASH) |
| balance | Float | NOT NULL | Current account balance |
| currency | String | NOT NULL | Account currency |
| createdAt | DateTime | DEFAULT: now() | Account creation timestamp |

### 7. PlannedEvent
**Purpose**: Future financial goals and planned expenses

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique event identifier |
| userId | UUID | FOREIGN KEY | Reference to User |
| name | String | NOT NULL | Event name (e.g., "Goa Trip") |
| targetDate | DateTime | NOT NULL | Target date for the event |
| estimatedCost | Float | NOT NULL | Estimated total cost |
| savedSoFar | Float | DEFAULT: 0 | Amount saved towards the event |
| createdAt | DateTime | DEFAULT: now() | Creation timestamp |

### 8. Budget
**Purpose**: User-defined spending budgets by category

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique budget identifier |
| userId | UUID | FOREIGN KEY | Reference to User |
| category | Category | NOT NULL | Budget category (enum) |
| amount | Float | NOT NULL | Budget amount for the period |
| period | Periodicity | NOT NULL | Budget period (WEEKLY, MONTHLY, ANNUAL) |
| createdAt | DateTime | DEFAULT: now() | Creation timestamp |

### 9. Goal
**Purpose**: Financial goals and savings targets

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique goal identifier |
| userId | UUID | FOREIGN KEY | Reference to User |
| name | String | NOT NULL | Goal name |
| description | String | NULLABLE | Goal description |
| targetAmount | Float | NOT NULL | Target amount to save |
| savedAmount | Float | DEFAULT: 0 | Amount saved towards goal |
| currency | String | NOT NULL | Goal currency |
| targetDate | DateTime | NOT NULL | Target completion date |
| createdAt | DateTime | DEFAULT: now() | Creation timestamp |
| updatedAt | DateTime | AUTO UPDATE | Last update timestamp |
| completed | Boolean | DEFAULT: false | Goal completion status |

### 10. CurrencyRate
**Purpose**: Exchange rates for currency conversion

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique rate identifier |
| base | String | NOT NULL | Base currency code |
| target | String | NOT NULL | Target currency code |
| rate | Float | NOT NULL | Exchange rate |
| updatedAt | DateTime | AUTO UPDATE | Last update timestamp |

**Unique Constraint**: (base, target)

## Enums

### Category
Transaction and budget categories:
- `GROCERY`
- `UTILITIES`
- `TRANSPORTATION`
- `CLOTHING`
- `ENTERTAINMENT`
- `RENT`
- `HEALTHCARE`
- `OTHER`

### AssetType
Types of investment assets:
- `STOCK` - Equity stocks
- `CRYPTO` - Cryptocurrencies
- `METAL` - Precious metals

### AccountType
Types of financial accounts:
- `SAVINGS` - Savings account
- `CURRENT` - Current/checking account
- `CREDIT_CARD` - Credit card account
- `CASH` - Cash on hand

### Periodicity
Budget and recurring periods:
- `WEEKLY` - Weekly period
- `MONTHLY` - Monthly period
- `ANNUAL` - Annual period

### TransactionType
Types of financial transactions:
- `INCOME` - Money coming in (salary, dividends, gifts, etc.)
- `EXPENSE` - Money going out (purchases, bills, transfers, etc.)

## Key Relationships

1. **User-Centric Design**: All primary entities are linked to the User table
2. **Multi-Currency Support**: Holdings and transactions support different currencies with conversion to user's base currency
3. **Flexible Asset Management**: Holdings support multiple platforms and asset types
4. **Transaction Tracking**: Transactions can be linked to specific bank accounts
5. **Goal-Oriented Finance**: Both goals and planned events help users save for specific targets
6. **Modular Assistants**: Plugin-style assistant system for different features

## Database Features

- **UUID Primary Keys**: All entities use UUID for better distribution and security
- **Soft Relationships**: Some foreign keys are nullable to maintain data integrity
- **Automatic Timestamps**: Created/updated timestamps for audit trails
- **Currency Flexibility**: Multi-currency support with automatic conversion
- **Extensible Design**: JSON settings field for future customizations

## Migration History

The database has evolved through several migrations:
1. **Initial Schema** (20250614080043): Core tables and relationships
2. **Holdings Enhancement** (20250614093831): Added platform and currency fields
3. **Base Currency** (20250614101152): Moved base currency to user level
4. **Currency Rates** (20250614102421): Added currency conversion support
5. **Goals System** (20250614105420): Added financial goals
6. **User Enhancements** (20250614112314-20250614113100): Added user fields and names
7. **Holdings Names** (20250614154131): Added human-readable names to holdings
8. **Transaction Types** (20250724091715): Added TransactionType enum and type field for income/expense classification

This schema supports a comprehensive personal finance management system with multi-currency support, investment tracking, budgeting, goal setting, and financial reporting capabilities.

## 🆕 Recent Schema Enhancements

### Transaction Type Classification (v1.1)
- **New Enum**: `TransactionType` with INCOME and EXPENSE values
- **Enhanced Transaction Model**: Added `type` field with EXPENSE default
- **Backward Compatibility**: All existing transactions automatically classified as EXPENSE
- **Migration Applied**: 20250724091715_add_transaction_type

### Financial Analytics Foundation
- **Category Grouping**: Enhanced for expense summary and category breakdown reporting
- **Date Range Queries**: Optimized for time-based financial analysis with accurate date calculations
- **Type-Based Filtering**: Enables income vs expense separation for comprehensive insights
- **Aggregation Support**: Database-level calculations for reporting efficiency across all report types
- **Goal Timeline Analysis**: Consistent time calculations with logical overdue handling and realistic planning
- **Portfolio Analytics**: Asset allocation calculations with multi-currency support
- **Budget Variance Analysis**: Database support for budget vs actual spending comparisons
- **Progress Tracking**: Goal completion percentages and timeline analysis capabilities
- **Pattern Detection**: Transaction pattern recognition for recurring payment identification
- **Frequency Analysis**: Automatic classification of transaction recurrence (weekly, monthly, quarterly, etc.)

### Data Integrity Features
- **Automatic Timestamps**: All entities track creation and modification times
- **UUID Primary Keys**: Enhanced security and distribution across all tables
- **Referential Integrity**: Proper foreign key relationships with cascade handling
- **Default Values**: Sensible defaults for optional fields to ensure data consistency 