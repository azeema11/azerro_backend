# AI Module

This module provides AI-powered features for the application, including transaction Q&A, goal conflict resolution, and budget advice.

## Architecture & Future Extraction

This module is designed to be potentially extracted into a separate microservice. Currently, it follows a **Shared Database** pattern where it directly accesses the main application's database.

### Integration Points
The module is integrated into the main app via:
- `src/index.ts`: Imports and uses `src/ai/routes/ai.route.ts`.

It **does not** import business logic from `src/services/`. It only relies on data access (Prisma) and general utilities.

### Dependencies to Migrate

If you decide to extract this `src/ai` folder into a separate repository/microservice, you must ensure the following dependencies are handled:

1.  **Database Access (Prisma)**
    -   The module imports `prisma` from `../../utils/db`.
    -   **Action:** The new service will need its own Prisma Client installation and a copy of the `schema.prisma` (specifically the `User`, `Transaction`, `Goal`, `PlannedEvent`, and `Budget` models).

2.  **Utilities**
    -   The module imports helper functions from `../../utils/` (e.g., `toNumberSafe`, `withPrismaErrorHandling`, `extractJsonFromText`).
    -   **Action:** Copy the relevant utility functions to the new service or package them as a shared library.

3.  **Authentication Middleware**
    -   Controllers use `AuthRequest` from `../../middlewares/auth.middleware`.
    -   **Action:** The new service will need a way to identify the user (e.g., accepting a `userId` in the request body or validating a JWT token if exposed directly).

4.  **Environment Variables**
    -   `GEMINI_API_KEY`: For Google Gemini integration.
    -   `OLLAMA_MODEL_ENDPOINT`: For local Ollama fallback.
    -   **Action:** Ensure these are configured in the new service's environment.

### Extraction Steps

1.  Create a new Node.js/TypeScript project.
2.  Copy the contents of `src/ai/` into the new project's source folder.
3.  Install necessary dependencies (`express`, `prisma`, `@google/generative-ai`, etc.).
4.  Copy `src/utils/db.ts` and `src/utils/utils.ts` (or relevant parts) to the new project.
5.  Set up the `schema.prisma` file in the new project to match the main application's database schema.
6.  Update imports in the copied files to point to the local versions of utilities and Prisma.
7.  Update the `controllers` to read `userId` from the request body or headers, rather than relying on the Express `req.user` object from the main app's middleware (unless you duplicate the middleware).
