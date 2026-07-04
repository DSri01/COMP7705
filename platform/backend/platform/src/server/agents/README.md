# HTTP agents (`/agents/:agentId/threads`)

| Path | Role |
|------|------|
| `threaded-agent.ts` | Port implemented by graph adapters |
| `agent-registry.ts` | `agentId` → adapter map; built from `src/agents/manifest.ts` |
| `agents.module.ts` | Nest DI: `AGENT_REGISTRY` |
| `agent-id-api-param.ts` | Swagger `agentId` enum from manifest |
| `adapters/` | Per-agent `ThreadedAgent` wrappers (LangGraph → HTTP) |

Which agents are mounted is defined only in **`src/agents/manifest.ts`** (`AGENT_IDS` + `buildPlatformAgentRegistry`). The registry is built in **`AgentsModule.forAgentsAsync`** after Nest injects platform services (required for DB tools).

Task agents and CLI-only graphs are not listed in the manifest.
