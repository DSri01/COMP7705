# `llm-connectors`

LangChain chat model factories for agent graphs. Callers pass `model` and credentials; see
`src/agents/utils/create-llm.ts` for how the app wires these.

| File | Exports |
|------|---------|
| `open-router.ts` | `SupportedModels`, `createOpenRouterConnector(model, apiKey)` — OpenAI-compatible client with OpenRouter `baseURL` |
| `custom-ollama.ts` | `SupportedModels`, `createChatOllamaConnector(model, baseUrl, apiKey, format?)` |
