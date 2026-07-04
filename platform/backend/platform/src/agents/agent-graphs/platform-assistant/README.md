# Platform assistant

LangGraph orchestrator for `platform-assistant`. HTTP mounting: `src/agents/manifest.ts` and
`src/server/agents/adapters/`.

## Graph wiring

- **`PLATFORM_CONTEXT_CONFIG`** — context budgets (`lib/context/config.ts`)
- **`createContextAwareToolActorNode`** — bounded tool window; in-node retry when the model omits `tool_calls`
- **`createContextTools`** — context library tools
- **Domain tools** — merged in `definition.ts` from `tool-registry/` (db, web, subagents, writes)

## Prompts

`prompts.ts` — orchestrator system prompt (tool-call contract, examples, generate-then-save flow).

## CLI

```bash
npm run cli:platform-assistant
```

PostgreSQL required (same DB env as the server). Flags: `--context-debug`, optional first message arg.
