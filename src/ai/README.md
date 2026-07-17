# AI Module

AI-powered finance assistant built on **Google ADK (Agent Development Kit)**. Provides a unified conversational endpoint that handles financial queries, analysis, and actions through a multi-agent coordinator architecture.

## Architecture

A hierarchical system where a main coordinator delegates specialized tasks to dedicated sub-assistants:

1. **Azerro (Coordinator)** — Analyzes user messages and routes to Friday or Jarvis.
2. **Friday (Finance Specialist)** — Transactions, budgets, bank accounts, reports, goals, planned events.
3. **Jarvis (Investment Advisor)** — Holdings analysis, market research, advice, personalized via user memory.

```
User → POST /ai/assistant → runAssistant()
  → InMemoryRunner (Azerro)
    → ask_friday → InMemoryRunner (Friday)
    → ask_jarvis → InMemoryRunner (Jarvis)
  → persistChatHistory() → PostgreSQL
```



## File Structure

```
src/ai/
├── adk/
│   ├── assistants/
│   │   ├── azerro.assistant.ts      # Coordinator agent
│   │   ├── finance.assistant.ts     # Friday
│   │   └── investment.assistant.ts  # Jarvis
│   ├── tools/
│   │   ├── coordinator_tools.ts     # ask_friday, ask_jarvis
│   │   ├── data_tools.ts           # Read-only tools
│   │   ├── action_tools.ts         # Write tools (require confirmation)
│   │   ├── market_tools.ts         # INDMoney MCP integration
│   │   └── memory_tools.ts         # User preference storage
│   ├── runner.ts                    # Session management, execution loop, persistence
│   └── model_config.ts             # LLM provider configuration
├── controllers/                     # Tool handlers with Redis caching
├── services/                        # AI-specific services (MCP client, chat, user memory)
├── routes/ai.route.ts              # Route definition
└── tests/integration/              # Fully mocked integration tests
```



## Endpoint


| Method | Path            | Description                     |
| ------ | --------------- | ------------------------------- |
| POST   | `/ai/assistant` | Unified conversational endpoint |




### Request

```json
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

When a write action executes (after user confirmation):

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



## Tools



### Coordinator Tools (Azerro only)


| Tool         | Description                           |
| ------------ | ------------------------------------- |
| `ask_friday` | Delegate finance queries to Friday    |
| `ask_jarvis` | Delegate investment queries to Jarvis |




### Data Tools (read-only)


| Tool                   | Description                                                         |
| ---------------------- | ------------------------------------------------------------------- |
| `get_transactions`     | Fetch transactions with filters (category, type, date range, limit) |
| `get_goals`            | Fetch savings goals (active or all)                                 |
| `get_budgets`          | Fetch budgets by category                                           |
| `get_planned_events`   | Fetch planned financial events                                      |
| `get_user_profile`     | Fetch user's name, base currency, monthly income                    |
| `get_report`           | Generate reports with multi-currency conversion                     |
| `get_holdings`         | Fetch investment holdings                                           |
| `get_holdings_history` | Fetch historical holding value changes                              |
| `get_bank_accounts`    | Fetch bank accounts and balances                                    |




### Action Tools (write, require user confirmation)


| Tool                   | Description                                           |
| ---------------------- | ----------------------------------------------------- |
| `create_transaction`   | Create a new income/expense transaction               |
| `create_goal`          | Create a new savings goal                             |
| `update_goal`          | Update a goal's target, date, progress, or completion |
| `create_budget`        | Create or update a budget                             |
| `create_planned_event` | Create a planned financial event                      |
| `update_planned_event` | Update a planned event                                |




### Market Tools (Jarvis only, via INDMoney MCP)


| Tool                            | Description                                   |
| ------------------------------- | --------------------------------------------- |
| `search_market_instrument`      | Search stocks/funds by name or symbol         |
| `get_market_instrument_details` | Live price, P/E, PEG, analyst consensus, news |




### Memory Tools (Jarvis only)


| Tool               | Description                                           |
| ------------------ | ----------------------------------------------------- |
| `get_user_memory`  | Retrieve stored preferences, risk profiles, wishlists |
| `save_user_memory` | Save or update a preference or wishlist               |




## Action Proposal Flow

1. User asks to create/update something
2. Assistant proposes the action with specific values
3. User confirms
4. Assistant executes the tool and reports the result

Write actions are never executed without explicit user confirmation.

## Provider Configuration


| Variable         | Description           | Default                            |
| ---------------- | --------------------- | ---------------------------------- |
| `AI_PROVIDER`    | `gemini` or `ollama`  | `gemini`                           |
| `AI_MODEL`       | Model name            | `gemini-2.5-flash` / `llama3.1:8b` |
| `GEMINI_API_KEY` | Google Gemini API key | Required for Gemini                |


Ollama support is prepared in `model_config.ts` but not yet wired.

## Session Persistence

- Conversations stored in `ChatMessage` table with `sessionId` grouping
- On server restart, recent history (last 20 messages) is loaded from PostgreSQL into the ADK in-memory session
- Tool calls and executed actions stored as JSON metadata



## Response Caching

Data tools use Redis caching via `withCache()`:


| Tool                 | Cache Key Pattern           | TTL    |
| -------------------- | --------------------------- | ------ |
| `get_transactions`   | `adk:txn:{userId}:...`      | 5 min  |
| `get_goals`          | `adk:goals:{userId}:...`    | 3 min  |
| `get_budgets`        | `adk:budgets:{userId}:...`  | 3 min  |
| `get_planned_events` | `adk:events:{userId}:...`   | 3 min  |
| `get_user_profile`   | `adk:profile:{userId}`      | 10 min |
| `get_report`         | Delegated to report service | 10 min |


Action tools invalidate related caches after successful writes.

## Rate Limiting

- 30 requests per 60-second window
- Atomic Redis counter via `safeIncrWithTTL()` (Lua script)
- Fails open when Redis is unavailable



## Dependencies

- `@google/adk` — LlmAgent, FunctionTool, InMemoryRunner
- `@google/genai` — Content helpers (createUserContent, createModelContent)
- `zod` — Tool parameter schemas
- `@modelcontextprotocol/sdk` — MCP client for INDMoney market data

