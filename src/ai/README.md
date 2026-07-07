# AI Module

This module provides an AI-powered unified finance assistant built on **Google ADK (Agent Development Kit)**. The assistant handles all financial queries, analysis, and actions through a single conversational endpoint.

## Architecture

The module uses a **Multi-Agent Coordinator Architecture** built on top of Google ADK. Instead of a single monolithic assistant, we have a hierarchical system where a main coordinator delegates specialized tasks to dedicated sub-assistants:

1. **Azerro (Main Coordinator)**: The primary entry point for all user requests. It analyzes the user's message and decides whether to delegate to **Friday** (for general finance) or **Jarvis** (for personalized investment advice).
2. **Friday (Finance Specialist)**: Equipped with tools to analyze transactions, budgets, bank accounts, and generate financial reports.
3. **Jarvis (Investment Advisor)**: Equipped with tools to analyze holdings, search market instruments, fetch live stock/fund details, and personalize advice based on user-configurable memory preferences.

```
src/ai/
├── adk/
│   ├── assistants/
│   │   ├── azerro.assistant.ts    # Main Coordinator Agent
│   │   ├── finance.assistant.ts   # Friday (Finance Specialist)
│   │   └── investment.assistant.ts # Jarvis (Investment Advisor)
│   ├── tools/
│   │   ├── coordinator_tools.ts   # Tools for Azerro to delegate (ask_friday, ask_jarvis)
│   │   ├── data_tools.ts          # Read-only tools (transactions, goals, budgets, events, profile, reports)
│   │   ├── action_tools.ts        # Write tools (create transaction/goal/budget/planned event, update goal)
│   │   ├── market_tools.ts        # Market data tools (search_market_instrument, get_market_instrument_details)
│   │   └── memory_tools.ts        # Personal preference memory tools (get_user_memory, save_user_memory)
│   ├── runner.ts                  # Session management, execution loop, and chat persistence
│   └── model_config.ts            # LLM provider configuration (Gemini / Ollama)
├── controllers/
│   └── assistant.controller.ts    # HTTP handler for POST /ai/assistant
├── routes/
│   └── ai.route.ts                # Route definition
└── tests/
    └── integration/
        └── assistant.route.test.ts
```

## Endpoint

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/ai/assistant` | POST | Unified finance assistant — handles all financial queries and actions |

### Request

```json
POST /ai/assistant
{
    "message": "How much did I spend on groceries last month?",
    "sessionId": "optional-session-id"
}
```

### Response

```json
{
    "success": true,
    "message": "You spent $342.50 on groceries last month...",
    "actions": [],
    "events": [
        { "author": "azerro_finance_assistant", "text": "...", "isFinal": true }
    ]
}
```

When the assistant executes a write action (after user confirmation), the `actions` array contains details:

```json
{
    "actions": [
        {
            "tool": "create_transaction",
            "args": { "amount": 50, "category": "GROCERY", "type": "EXPENSE" },
            "result": { "status": "success", "transactionId": "uuid" }
        }
    ]
}
```

## Capabilities

### 1. Coordinator Tools (Azerro-only)

| Tool | Description |
|------|-------------|
| `ask_friday` | Delegate general personal finance queries (transactions, budgets, bills, reports) to Friday |
| `ask_jarvis` | Delegate investment advice, portfolio analysis, and preference management queries to Jarvis |

### 2. Data Tools (read-only)

| Tool | Description |
|------|-------------|
| `get_transactions` | Fetch transactions with filters (category, type, date range, limit) |
| `get_goals` | Fetch savings goals (active or all) |
| `get_budgets` | Fetch budgets by category |
| `get_planned_events` | Fetch planned financial events |
| `get_user_profile` | Fetch user's name, base currency, monthly income |
| `get_report` | Generate reports with multi-currency conversion (budget vs actual, income vs expense, category breakdown) |
| `get_holdings` | Fetch user's investment holdings (stocks, crypto, metals) |
| `get_bank_accounts` | Fetch user's bank accounts and balances |
| `get_networth_snapshot` | Fetch user's overall net worth snapshot across all assets and liabilities from INDMoney MCP |
| `get_networth_holdings` | Fetch row-level holdings for a specific asset type (IND_STOCK, MF, US_STOCK, CRYPTO, etc.) from INDMoney MCP |

### 3. Action Tools (write, require user confirmation)

| Tool | Description |
|------|-------------|
| `create_transaction` | Create a new income/expense transaction |
| `create_goal` | Create a new savings goal |
| `update_goal` | Update a goal's target amount, date, saved progress, or completion status |
| `create_budget` | Create or update a budget for a category/period |
| `create_planned_event` | Create a new planned financial event |
| `update_planned_event` | Update a planned financial event's name, estimated cost, target date, saved progress, or completion status |

### 4. Market Data Tools (Jarvis-only)

| Tool | Description |
|------|-------------|
| `search_market_instrument` | Search for a stock or mutual fund by name/symbol to find its ticker using INDMoney's `lookup_ind_keys` tool |
| `get_market_instrument_details` | Fetch live price, valuation metrics (P/E, PEG), analyst consensus, target prices, and news using INDMoney's `get_indian_stocks_details` or `get_us_stocks_details` tools |

### 5. Memory & Preference Tools (Jarvis-only)

| Tool | Description |
|------|-------------|
| `get_user_memory` | Retrieve stored user preferences, risk profiles, or wishlists/favourites |
| `save_user_memory` | Save or update a personal preference, risk profile, or wishlist/favourites memory |

### Action Proposal Flow

Write actions follow a confirmation pattern:
1. User asks to create/update something
2. Assistant proposes the action with specific values
3. User confirms ("yes", "go ahead")
4. Assistant executes the tool and reports the result

The assistant **never** executes a write action without explicit user confirmation.

## AI Provider Configuration

The module supports two AI providers via environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `AI_PROVIDER` | `gemini` or `ollama` | `gemini` |
| `AI_MODEL` | Model name | `gemini-2.5-flash` (Gemini) / `llama3.1:8b` (Ollama) |
| `GEMINI_API_KEY` | Google Gemini API key | Required for Gemini |
| `OLLAMA_BASE_URL` | Ollama server URL | `http://localhost:11434` |

> **Note:** Phase 1 only supports Gemini. Ollama support is prepared in `model_config.ts` but not yet wired.

## Session Persistence

- Conversations are stored in the `ChatMessage` table with `intent: "assistant"` and a `sessionId`
- On server restart, recent chat history is loaded from PostgreSQL into the ADK in-memory session
- The `sessionId` field groups messages within a conversation session
- Tool calls and executed actions are stored as JSON metadata on AI messages

## Response Caching

Data tools use Redis caching via `withCache()` from `src/utils/redis.ts`:

| Tool | Cache Key Pattern | TTL |
|------|-------------------|-----|
| `get_transactions` | `adk:txn:{userId}:...` | 5 min |
| `get_goals` | `adk:goals:{userId}:...` | 3 min |
| `get_budgets` | `adk:budgets:{userId}:...` | 3 min |
| `get_planned_events` | `adk:events:{userId}:...` | 3 min |
| `get_user_profile` | `adk:profile:{userId}` | 10 min |
| `get_report` | Delegated to `report.service.ts` caching | 10 min |

Action tools invalidate related caches after successful writes.

## Rate Limiting

AI endpoints are protected by the rate-limit middleware:
- 30 requests per 60-second window
- Uses atomic `safeIncrWithTTL()` (Redis Lua script)
- Fails open when Redis is unavailable

## Integration Points

- **Route registration**: `src/index.ts` mounts `src/ai/routes/ai.route.ts` under `/ai`
- **Auth**: All routes protected by `authMiddleware` — `userId` injected via JWT
- **Database**: Uses Prisma directly for data access (shared database pattern)
- **Reports**: `get_report` tool delegates to `src/services/report.service.ts` for multi-currency report generation

## Dependencies

- `@google/adk` — Google Agent Development Kit (LlmAgent, FunctionTool, InMemoryRunner)
- `@google/genai` — Content helpers (createUserContent, createModelContent)
- `zod` — Tool parameter schemas
- `@prisma/client` — Database access and enum types

## Future Extensions

The `src/ai/adk/assistant/` folder is structured for multiple assistants. Future assistants (e.g. `investment.assistant.ts`, `tax.assistant.ts`) can be added alongside `finance.assistant.ts` and wired to separate or shared endpoints.
