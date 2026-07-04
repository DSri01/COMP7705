# Agent threads HTTP API

Routes (Nest path; dashboard proxy adds `/api` prefix):

- `POST /agents/:agentId/threads` → `{ threadId }`
- `GET /agents/:agentId/threads` → `{ threads: [{ threadId, createdAt }] }` (newest first)
- `GET /agents/:agentId/threads/:threadId/messages`
- `POST /agents/:agentId/threads/:threadId/messages` → idempotent turns via `newMessageIndex`
- `GET /agents/:agentId/threads/:threadId/messages/export` → markdown

Wiring: `AppModule.forDataSource` imports `AgentsModule.forAgentsAsync()` + `ThreadsModule`; registry is built via DI in the agents module factory.
