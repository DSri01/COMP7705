# `web`

Internal library for HTTPS fetch and HTML→markdown conversion.

## Layout

| Path | Role |
|------|------|
| `fetcher/` | HTTPS GET, User-Agent, 30s timeout (`https://` only) |
| `parser/` | HTML→markdown (`node-html-markdown`), title + metadata block |
| `fetch-and-parse.ts` | Orchestrator (fetch → parse; no DB) |
| `search/` | Pluggable search providers; factory: `search/create-web-search-provider.ts` |

Robots.txt is not implemented.

## CLI smoke tests

```bash
npm run cli:web-fetch -- https://example.com
npm run cli:web-search -- "log4j vulnerability"
```

`cli:web-fetch` prints title + markdown to stdout. `cli:web-search` uses app configuration
(see `configuration/schema.ts` for web search provider settings) and prints `{ ok, hits }` JSON.

Agent-facing tools that call this library: `tool-registry/web/`.
