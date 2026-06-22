# AI Module

This module provides an AI-powered unified finance assistant built on **Google ADK (Agent Development Kit)**. The assistant handles all financial queries, analysis, and actions through a single conversational endpoint.

## Architecture

The module uses a **tool-based agent architecture** where a single LLM assistant is equipped with data retrieval tools and action tools. The assistant decides which tools to call based on the user's natural language message — no intent routing or specialized endpoints needed.

```
src/ai/
├── adk/
│   ├── assistant/
│   │   └── finance.assistant.ts   # LLM assistant definition + system prompt
│   ├── tools/
│   │   ├── data_tools.ts          # Read-only tools (transactions, goals, budgets, events, profile, reports)
│   │   └── action_tools.ts        # Write tools (create transaction/goal/budget/planned event, update goal)
│   ├── runner.ts                  # Session management, execution loop, chat persistence
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

### Data Tools (read-only)

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

### Action Tools (write, require user confirmation)

| Tool | Description |
|------|-------------|
| `create_transaction` | Create a new income/expense transaction |
| `create_goal` | Create a new savings goal |
| `update_goal` | Update a goal's target amount, date, saved progress, or completion status |
| `create_budget` | Create or update a budget for a category/period |
| `create_planned_event` | Create a new planned financial event |
| `update_planned_event` | Update a planned financial event's name, estimated cost, target date, saved progress, or completion status |

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
