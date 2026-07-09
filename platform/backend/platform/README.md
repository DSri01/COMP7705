# Platform Backend

This directory contains the monolith platform service for container vulnerability management. The service is implemented with NestJS and TypeScript. A REST API, background workers, LangGraph agents, and a read-only MCP server are provided. Platform state is stored in PostgreSQL. Container image archives and scan artifacts are stored on the local file system under `fs/`.

For normal use, this service is started as part of the platform Docker Compose stack. Stack-level instructions are given in [`platform/README.md`](../../README.md). This document describes configuration, host-side development, image build, and command-line tools for the backend package only.

## Service identifiers

| Item | Value |
| --- | --- |
| Docker image | `comp7705platformbackend:latest` |
| Compose service name | `backend` |
| Container name | `comp7705-platform-backend` |
| Default HTTP port | `9080` (`SERVER_PORT`) |
| Swagger UI (direct access) | `/api-docs` on the backend port |
| MCP endpoint (direct access) | `/mcp` on the backend port |

When the full stack runs through compose, the dashboard reverse proxy forwards API and MCP traffic to this service. Direct host access to port 9080 is not published by compose.

## Prerequisites

Node.js **v22.22.1** is required for compilation and matches the Node version in `docker/DockerFile`. Dependencies are installed with `npm ci` in this directory.

Docker is required to build the production image with `scripts/build-container-image.sh`. Bash is used for that script. On Windows 11, Windows Subsystem for Linux (WSL) was used during project development.

For host-side runs (`npm run dev` or CLI scripts), PostgreSQL must be reachable at the host and port given in the active environment file. The container scanner must be reachable at `CONTAINER_SCANNER_URL` when scan features or the container rescan worker are used. How those dependencies are started is described in [`platform/README.md`](../../README.md) and [`backend/container-scanner/README.md`](../container-scanner/README.md).

## Environment files

Two environment files are used in this package.

| File | Committed | Used by | Purpose |
| --- | --- | --- | --- |
| `.dev.env` | Yes | `npm run dev` and most `cli:*` scripts via `dotenv-cli` | Safe defaults for host-side development. Agent variables are not included. |
| `.env` | No (gitignored) | Mounted by compose at `/app/.env`. Also loaded by `index.ts` and several CLI entry points. | Required for the backend container. Must include agent keys and secrets. |

At startup, `src/index.ts` loads `.env` with `dotenv`. For `npm run dev`, `dotenv-cli` injects `.dev.env` first. Dotenv does not override variables that are already set. Overlapping keys therefore keep values from `.dev.env`. Keys present only in `.env` (for example agent API keys) are still applied.

`loadConfiguration()` in `src/configuration/definition.ts` validates all required variables before the server starts. The same validation runs in CLI entry points that call `loadConfiguration()`. The resolved file storage directory must exist and must be a directory.

### Creating `.env` for compose

A file at `backend/platform/.env` is required when the backend runs in Docker. Compose mounts it at `/app/.env`. A practical approach is to copy `.dev.env` to `.env`, adjust network-specific values, and add agent variables. See the configuration reference and recommended profiles below.

## Configuration reference

Configuration is defined in [`src/configuration/definition.ts`](src/configuration/definition.ts). Valid values are enforced with Zod schemas in [`src/configuration/schema.ts`](src/configuration/schema.ts).

### Database

| Variable | Required | Meaning | In compose network | On host (`.dev.env`) |
| --- | --- | --- | --- | --- |
| `DB_HOST` | Yes | PostgreSQL host | `db` | `localhost` |
| `DB_PORT` | Yes | PostgreSQL port | `5432` | `65432` |
| `DB_USERNAME` | Yes | Database user | `postgres` | `postgres` |
| `DB_PASSWORD` | Yes | Database password | `postgres` | `postgres` |
| `DB_DATABASE` | Yes | Database name | `comp7705` | `comp7705` |

The schema is applied automatically on startup through TypeORM (`synchronize: true`).

### File storage

| Variable | Required | Meaning | Example |
| --- | --- | --- | --- |
| `FILE_STORAGE_PATH` | Yes | JSON array of path segments joined to form the storage root | `["fs"]` |

From working directory `backend/platform/`, `["fs"]` resolves to `./fs`. In the backend container it resolves to `/app/fs`. Compose bind-mounts `./backend/platform/fs` to `/app/fs`. The directory must exist before startup. Uploaded container image archives and scan output are stored there. Contents of `fs/` are gitignored.

### Server

| Variable | Required | Meaning | Example |
| --- | --- | --- | --- |
| `SERVER_PORT` | Yes | HTTP listen port | `9080` |

### Container scanner

| Variable | Required | Meaning | In compose network | On host (`.dev.env`) |
| --- | --- | --- | --- | --- |
| `CONTAINER_SCANNER_URL` | Yes | Full URL for `POST /container/tar/json/scan` | `http://container-scanner:8080/container/tar/json/scan` | `http://localhost:8080/container/tar/json/scan` |

Scanner behaviour is described in [`backend/container-scanner/README.md`](../container-scanner/README.md).

### Background workers

Each worker is controlled with `enabled` or `disabled`. When enabled, workers poll every 60 seconds. Refresh intervals and batch sizes are fixed in `src/index.ts`.

| Variable | Worker | When enabled |
| --- | --- | --- |
| `WORKERS__STORED_FILE_UPLOAD_TIMEOUT__STATE` | Stored file upload timeout | Uploads still marked uploading after 1800 seconds are timed out. |
| `WORKERS__CISA_KEV_FETCH__STATE` | CISA KEV fetch | The CISA Known Exploited Vulnerabilities catalog is fetched when the two-day refresh interval has elapsed. |
| `WORKERS__CVE_INTEL_REFRESH__STATE` | CVE external intelligence refresh | NVD and EPSS data are refreshed for stale CVE records. Up to four records are processed per cycle. |
| `WORKERS__IMAGE_CVE_DECISION_EXPIRY_REFRESH__STATE` | Image-CVE decision expiry refresh | Stale image-CVE decision expiry records are refreshed. Up to fifty records are processed per cycle. |
| `WORKERS__CONTAINER_RESCAN__STATE` | Container rescan | Container images are rescanned through the container scanner when the two-day refresh interval has elapsed. |

### Optional secrets

| Variable | Required | Meaning |
| --- | --- | --- |
| `NVD_API_KEY` | No | API key for the NVD API. May be unset. Rate limits may apply without a key. Used by the CVE external intelligence refresh worker and by `cli:nvd-cve`. |

### Agent configuration

Agent configuration is validated at startup even when only the REST API or dashboard is used. Missing or invalid agent variables cause startup to fail.

#### LLM provider (`AGENTS_LLM_PROVIDER`)

| Value | Additional required variables | Supported models |
| --- | --- | --- |
| `openRouter` | `AGENTS_OPENROUTER_LLM_API_KEY`, `AGENTS_OPENROUTER_LLM_MODEL` | `deepseek/deepseek-v4-pro`, `tencent/hy3-preview`, `openrouter/owl-alpha`, `xiaomi/mimo-v2.5`, `qwen/qwen3.6-flash`, `deepseek/deepseek-v4-flash:free`, `moonshotai/kimi-k2.6:free`, `meta-llama/llama-3.3-70b-instruct:free` (full list in [`src/agents/llm-connectors/open-router.ts`](./src/agents/llm-connectors/open-router.ts)) |
| `ollama` | `AGENTS_OLLAMA_LLM_API_KEY`, `AGENTS_OLLAMA_LLM_MODEL`, `AGENTS_OLLAMA_LLM_BASE_URL` | `granite4:3b` |

#### Web search provider (`AGENTS_WEB_SEARCH_PROVIDER`)

Used by the platform assistant agent and by `cli:web-search`.

| Value | Additional required variables | Notes |
| --- | --- | --- |
| `mockWikipedia` | None | No external search API is called. |
| `firecrawl` | `AGENTS_FIRECRAWL_WEB_SEARCH_API_KEY`, `AGENTS_FIRECRAWL_WEB_SEARCH_MAX_RESULTS` | `AGENTS_FIRECRAWL_WEB_SEARCH_MAX_RESULTS` must be an integer from 1 to 10. |

## Configuration profiles

The profiles below are starting points. Secrets must not be committed.

### Profile A. Host development with OpenRouter and mock search

Use `.dev.env` for database, workers, storage, and scanner URL. Add to a gitignored `.env` or to a local copy of `.dev.env`:

```
AGENTS_LLM_PROVIDER=openRouter
AGENTS_OPENROUTER_LLM_API_KEY=<your-key>
AGENTS_OPENROUTER_LLM_MODEL=deepseek/deepseek-v4-pro
AGENTS_WEB_SEARCH_PROVIDER=mockWikipedia
```

All workers remain `enabled`, matching the committed `.dev.env`.

### Profile B. Compose backend container

Copy `.dev.env` to `.env` and override network-specific values:

```
DB_HOST=db
DB_PORT=5432
CONTAINER_SCANNER_URL=http://container-scanner:8080/container/tar/json/scan
FILE_STORAGE_PATH=["fs"]
SERVER_PORT=9080
```

Add the agent block from Profile A. Compose reads this file from `./backend/platform/.env` and mounts it at `/app/.env`.

### Profile C. Self-hosted Ollama

```
AGENTS_LLM_PROVIDER=ollama
AGENTS_OLLAMA_LLM_MODEL=granite4:3b
AGENTS_OLLAMA_LLM_BASE_URL=http://localhost:11434
AGENTS_OLLAMA_LLM_API_KEY=<key-if-required>
AGENTS_WEB_SEARCH_PROVIDER=mockWikipedia
```

Database and scanner settings follow Profile A or B as appropriate.

### Profile D. Live web search (Firecrawl)

```
AGENTS_WEB_SEARCH_PROVIDER=firecrawl
AGENTS_FIRECRAWL_WEB_SEARCH_API_KEY=<your-key>
AGENTS_FIRECRAWL_WEB_SEARCH_MAX_RESULTS=5
```

An LLM block from Profile A or C is still required.

### Profile E. Evaluation or database replay

Workers that call external services or trigger rescans may be disabled:

```
WORKERS__CISA_KEV_FETCH__STATE=disabled
WORKERS__CVE_INTEL_REFRESH__STATE=disabled
WORKERS__CONTAINER_RESCAN__STATE=disabled
WORKERS__IMAGE_CVE_DECISION_EXPIRY_REFRESH__STATE=disabled
WORKERS__STORED_FILE_UPLOAD_TIMEOUT__STATE=enabled
```

Agent variables are still required. `mockWikipedia` avoids Firecrawl usage during replay.

### Profile F. Minimal external calls (dashboard and API only)

Same worker disables as Profile E. Use Profile A or C for agents. Set `NVD_API_KEY` when NVD API access is needed for the CVE external intelligence refresh worker or for `cli:nvd-cve`.

## Host-side development

From `backend/platform/`:

```bash
npm ci
npm run dev
```

This compiles TypeScript and starts the server with variables from `.dev.env`. The backend listens on the port given by `SERVER_PORT` (9080 by default). Swagger is available at `http://localhost:9080/api-docs`.

To run tests:

```bash
npm run test
```

To compile without starting:

```bash
npm run compile
```

## Docker image build

Production-style images are built on the host from this directory.

```bash
./scripts/build-container-image.sh
```

This produces `comp7705platformbackend:latest`. An optional version tag may be passed as the first argument. A custom image name and tag may be passed as two arguments.

The Dockerfile at `docker/DockerFile` uses a two-stage build on `node:22.22.1-alpine3.23`. The builder stage runs `npm ci`, `npm run compile`, and `npm run test`. The runtime stage installs production dependencies only, copies compiled output to `/app/dist`, exposes port **9080**, and runs `npm run start` as the `node` user. Environment variables are not baked into the image.

## Integration with compose

When [`platform/dev.docker-compose.yml`](../../dev.docker-compose.yml) defines the backend service, it builds from this directory (`context: backend/platform`, `dockerfile: docker/DockerFile`). It expects:

- Image name `comp7705platformbackend:latest`
- Bind mount `./backend/platform/fs` → `/app/fs`
- Bind mount `./backend/platform/.env` → `/app/.env`

Instructions for building and starting the full stack are given in [`platform/README.md`](../../README.md).

## npm scripts

All scripts are defined in [`package.json`](package.json) in this directory.

Several CLI scripts call `loadConfiguration()` and require the same variables as the server, including agent settings and an existing `fs/` directory. These are `cli:nvd-cve`, `cli:container-scan`, `cli:web-search`, and the agent REPL scripts (`cli:platform-assistant`, `cli:summary-generation`, `cli:advice-generation`). `cli:epss-cve` and `cli:web-fetch` do not load full platform configuration. `cli:agent-tui` talks to a running backend over HTTP and does not call `loadConfiguration()`.

| Script | Purpose |
| --- | --- |
| `npm run dev` | TypeScript is compiled. The server is started with `.dev.env`. |
| `npm run start` | `dist/index.js` is run. Environment must already be set or present in `.env`. |
| `npm run compile` | Test sources are typechecked. The project is compiled with `tsc`. |
| `npm run test` | Full typecheck and Jest suite are run. |
| `npm run typecheck:src` | Application sources are typechecked. |
| `npm run typecheck:test` | Test sources are typechecked. |
| `npm run typecheck:all` | Both source and test typechecks are run. |
| `npm run cli:nvd-cve` | NVD record for one CVE ID is fetched and printed. Usage: `nvd-cve <cveId>`. |
| `npm run cli:epss-cve` | EPSS record for one CVE ID is fetched and printed. Usage: `epss-cve <cveId>`. |
| `npm run cli:container-scan` | A container image archive in file storage is scanned. Usage: `run-container-scan <container-file-name>`. |
| `npm run cli:platform-assistant` | Platform assistant agent is run as an interactive REPL. |
| `npm run cli:summary-generation` | Summary generation agent is run as an interactive REPL. |
| `npm run cli:advice-generation` | Advice generation agent is run as an interactive REPL. |
| `npm run cli:agent-tui` | Agent threads are exercised through an HTTP terminal UI against a running backend. |
| `npm run cli:web-fetch` | A HTTPS URL is fetched and converted to text. No `.dev.env` is loaded. |
| `npm run cli:web-search` | A query is sent through the configured web search provider. |

Further detail on agent CLIs is given in [`src/cli/agents/README.md`](src/cli/agents/README.md). The agent TUI is described in [`src/cli/agent-tui/README.md`](src/cli/agent-tui/README.md).

## Scripts reference

| Script | Where to run | Purpose |
| --- | --- | --- |
| `scripts/build-container-image.sh` | Host (WSL) | Builds `comp7705platformbackend:latest` from `docker/DockerFile`. |

## MCP endpoint

A read-only MCP server is registered at `/mcp`. When the backend is reachable on the host at port 9080, the endpoint is:

```
http://localhost:9080/mcp
```

When the full stack runs through compose, the dashboard proxy exposes the same server under `/api/mcp` on port 12080. MCP tools provide read-only access to projects, components, container images, CVE records, and research documents. Mutation tools are not exposed.

## Source layout

| Path | Role |
| --- | --- |
| `src/index.ts` | Application entry point. Workers and MCP are started here. |
| `src/server/` | NestJS REST API modules |
| `src/workers/` | Background polling workers |
| `src/agents/` | LangGraph agent graphs, LLM connectors, tool registry |
| `src/mcp/` | MCP server and read-only tools |
| `src/db/` | TypeORM entity definitions and data source |
| `src/apiClients/` | Clients for NVD, EPSS, CISA KEV, and the container scanner |
| `src/cli/` | Command-line entry points |
| `src/configuration/` | Environment loading and validation |
| `fs/` | Runtime file storage for container image archives and scan output |
| `docker/` | Production Dockerfile |
| `scripts/` | Host-side Docker image build |
