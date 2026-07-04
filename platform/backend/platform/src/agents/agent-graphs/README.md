# `agent-graphs`

LangGraph LLM agent graphs. Pass `contextManager: AgentContextManager | null` at build time —
non-null merges context tools and uses the context-aware tool actor; `null` skips the context
library for debugging (domain tools only).

| Graph | Notes |
|-------|--------|
| `platform-assistant/` | Conversational orchestrator (HTTP); CVE/platform workflows |
| `summary-generation-agent/` | Internal task agent — CVE research summary |
| `advice-generation-agent/` | Internal task agent — image-CVE advice (CISA SSVC) |
