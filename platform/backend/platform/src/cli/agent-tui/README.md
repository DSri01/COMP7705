# Agent REST TUI

Interactive client for platform agent thread HTTP endpoints. Talks to
`…/agents/:agentId/threads` under a configurable base URL.

| Module | Role |
|--------|------|
| `index.ts` | Entry orchestration only (`parse-args`, run loop). Not unit-tested. |
| `parse-args.ts` | CLI flags (`--base-url`, `--help`) |
| `parse-command.ts` | TUI line parser |
| `api-client.ts` | Fetch wrapper for thread REST |
| `run-agent-tui.ts` | Read-eval-print loop |
| `session.ts`, `help.ts`, `supported-agents.ts` | TUI state and help |

Tests mirror paths under `__tests__/cli/agent-tui/`.

```bash
npm run cli:agent-tui
npm run cli:agent-tui -- --base-url http://localhost:12080/api/agents
```

Default base URL: `http://localhost:12080/api/agents`. Use `SET-BASE-URL` at the `agent>` prompt
to change it without restarting. Direct Nest (no `/api` reverse proxy) typically needs
`http://localhost:<SERVER_PORT>/agents`.
