# Agent CLIs

Interactive LangGraph REPLs for platform agents. Each agent has a directory under `cli/agents/<agent>/`:

- **`index.ts`** — entry orchestration only (`loadConfiguration`, build graph, REPL). Not unit-tested; run via `npm run cli:<agent>`.
- **Other modules** (e.g. `parse-args.ts`) — testable logic; tests mirror paths under `__tests__/cli/agents/<agent>/`.

Shared helpers: `cli/agents/utils/` (`stream-agent-turn`, `run-interactive-agent-cli`).

| Script | Entry |
|--------|--------|
| `npm run cli:platform-assistant` | `platform-assistant/index.ts` |
| `npm run cli:summary-generation` | `summary-generation/index.ts` |
| `npm run cli:advice-generation` | `advice-generation/index.ts` |

`platform-assistant` requires PostgreSQL (same DB env as the server), always uses `PLATFORM_CONTEXT_CONFIG`,
and supports `--context-debug` plus an optional first message.

Platform job CLIs (NVD, container scan, etc.) stay at `src/cli/` root.

**Agent REST TUI:** `../agent-tui/` — `npm run cli:agent-tui` (HTTP thread client; see `agent-tui/README.md`).
