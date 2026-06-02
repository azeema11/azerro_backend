# AI Module

This module provides AI-powered features for the application, including transaction Q&A, goal conflict resolution, budget advice, report summarization, and predictive financial insights.

## Features

### Available AI Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/ai/assistant` | POST | Unified AI assistant for general financial advice |
| `/ai/transaction/agent` | POST | Natural language Q&A about transaction history |
| `/ai/goal/resolve` | POST | AI advice for resolving goal conflicts |
| `/ai/budget/summary` | GET | AI-generated budget analysis summary |
| `/ai/budget/chat` | POST | Interactive chat with budget advisor |
| `/ai/report/summarize` | POST | AI summaries of financial reports |
| `/ai/planned-event/impact` | GET | AI analysis of planned event financial impact |
| `/ai/predictive/insights` | GET | AI-powered predictive financial insights |

### AI Provider Configuration
The module supports two AI providers:
- **Google Gemini** (Primary): Set `GEMINI_API_KEY` in environment
- **Ollama** (Fallback): Set `OLLAMA_MODEL_ENDPOINT` for local LLM

### Response Caching
AI responses are cached in Redis using the resilient wrappers from `src/utils/redis.ts`:
- Cache key: `ai_response:{sha256(prompt)}` with a 3-hour TTL
- Only non-empty responses are cached to prevent serving blank results
- Cache lookups and writes use `safeGet`/`safeSetex` — Redis failures are logged but never break the AI flow

### Response Generation
All AI services use `generateAndParse()` from `src/ai/utils/ai_provider.ts` as a unified helper:
- Calls `generateAiResponse()` to get the raw AI text (with SHA-256 cache dedup)
- Extracts structured JSON via `extractJsonFromText()` from `json_extractor.ts`
- Applies a text-based fallback function when JSON extraction fails
- Returns `{ success, answer }` with error fallback on complete failure
- Context data (budget, transactions) is cached separately using `withCache()` from `src/utils/redis.ts`

### Rate Limiting
AI endpoints are protected by the rate-limit middleware (`src/middlewares/rate_limit.middleware.ts`):
- Uses atomic `safeIncrWithTTL()` (Redis Lua script) for reliable counting
- AI endpoints: 30 requests per 60-second window
- Auth endpoints: 10 requests per 60-second window
- Fails open when Redis is unavailable (requests are allowed through)

## Architecture & Future Extraction

This module is designed to be potentially extracted into a separate microservice. Currently, it follows a **Shared Database** pattern where it directly accesses the main application's database.

### Module Structure
```
src/ai/
├── controllers/         # HTTP request handlers
│   ├── assistant.controller.ts
│   ├── transaction.controller.ts
│   ├── goal.controller.ts
│   ├── budget.controller.ts
│   ├── report.controller.ts
│   ├── planned_event.controller.ts
│   └── predictive.controller.ts
├── services/            # AI business logic
│   ├── assistant.service.ts
│   ├── transaction.service.ts
│   ├── goal.service.ts
│   ├── budget.service.ts
│   ├── report.service.ts
│   ├── planned_event.service.ts
│   └── predictive.service.ts
├── routes/
│   └── ai.route.ts      # Route definitions
├── utils/
│   ├── ai_provider.ts   # Gemini/Ollama integration + generateAndParse helper
│   └── json_extractor.ts # JSON extraction from AI text responses
└── tests/
    ├── unit/             # Unit tests for AI services
    └── integration/      # Integration tests (fully mocked, no DB required)
```

### Integration Points
The module is integrated into the main app via:
- `src/index.ts`: Imports and uses `src/ai/routes/ai.route.ts`.
- All routes are protected by `authMiddleware` and rate-limited (30 requests/60s window).

It **does not** import business logic from `src/services/`. It only relies on data access (Prisma) and general utilities.

### Dependencies to Migrate

If you decide to extract this `src/ai` folder into a separate repository/microservice, you must ensure the following dependencies are handled:

1.  **Database Access (Prisma)**
    -   The module imports `prisma` from `../../utils/db`.
    -   **Action:** The new service will need its own Prisma Client installation and a copy of the `schema.prisma` (specifically the `User`, `Transaction`, `Goal`, `PlannedEvent`, and `Budget` models).

2.  **Utilities & Redis**
    -   The module imports helper functions from `../../utils/` (e.g., `toNumberSafe`, `withPrismaErrorHandling`).
    -   The AI provider imports `safeGet`, `safeSetex`, and `withCache` from `../../utils/redis.ts` for response and context caching.
    -   The AI provider uses `extractJsonFromText` from `./json_extractor.ts` for parsing structured responses.
    -   **Action:** Copy the relevant utility functions and the Redis wrapper to the new service, or package them as a shared library. Ensure `REDIS_URL` is configured in the new service's environment.

3.  **Authentication Middleware**
    -   Controllers use `AuthRequest` from `../../middlewares/auth.middleware`.
    -   **Action:** The new service will need a way to identify the user (e.g., accepting a `userId` in the request body or validating a JWT token if exposed directly).

4.  **Environment Variables**
    -   `GEMINI_API_KEY`: For Google Gemini integration.
    -   `OLLAMA_MODEL_ENDPOINT`: For local Ollama fallback.
    -   `REDIS_URL`: For AI response caching (defaults to `redis://redis:6379`).
    -   **Action:** Ensure these are configured in the new service's environment.

### Extraction Steps

1.  Create a new Node.js/TypeScript project.
2.  Copy the contents of `src/ai/` into the new project's source folder.
3.  Install necessary dependencies (`express`, `prisma`, `@google/generative-ai`, `ioredis`, etc.).
4.  Copy `src/utils/db.ts` and `src/utils/utils.ts` (or relevant parts) to the new project.
5.  Set up the `schema.prisma` file in the new project to match the main application's database schema.
6.  Update imports in the copied files to point to the local versions of utilities and Prisma.
7.  Update the `controllers` to read `userId` from the request body or headers, rather than relying on the Express `req.user` object from the main app's middleware (unless you duplicate the middleware).

## Usage Examples

### Unified Assistant
```json
POST /ai/assistant
{
    "message": "How can I save more money this month?"
}
```

### Transaction Agent
```json
POST /ai/transaction/agent
{
    "question": "What was my total spending last month?"
}
```

### Budget Chat
```json
POST /ai/budget/chat
{
    "message": "How can I reduce my grocery spending?",
    "history": []
}
```

### Report Summarization
```json
POST /ai/report/summarize
{
    "reportType": "budgetVsActual",
    "options": {}
}
```
