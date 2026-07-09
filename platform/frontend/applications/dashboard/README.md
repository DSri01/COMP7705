# Platform Dashboard

This directory contains the Platform Dashboard, a React single-page application for container vulnerability triage and management. The application is built with Vite and TypeScript. REST and agent requests are sent to the platform backend under the `/api` path prefix. For normal use, the application is served through the platform Docker Compose stack at `http://localhost:12080`. This document describes local development and API client generation. Image build and reverse proxy routing are described in [`platform/frontend/README.md`](../../README.md) and [`platform/frontend/reverseProxy/README.md`](../../reverseProxy/README.md).

## Service identifiers

| Item | Value |
| --- | --- |
| Compose service name | `dashboard` |
| Docker image | `comp7705platformfrontend:latest` |
| Production URL (compose) | `http://localhost:12080` |
| Vite dev server URL | `http://localhost:5173` |
| Browser API prefix | `/api` |

When the full stack runs through compose, the dashboard container publishes host port **12080**. The backend is not exposed on a host port directly. API traffic is forwarded through the nginx reverse proxy in the dashboard service.

## Prerequisites

Node.js **v22.22.1** is recommended and matches the Node version in the frontend Docker build (`frontend/docker/DockerFile`). Dependencies are installed with `npm ci` in this directory.

For `npm run dev`, a reachable backend is required at the URL given in `vite.server.env`. For `npm run api:generate`, the OpenAPI document must be reachable at the URL used by that script (by default through compose on port 12080). Stack startup is described in [`platform/README.md`](../../../README.md). Backend configuration for host-side development is described in [`platform/backend/platform/README.md`](../../../backend/platform/README.md).

On Windows 11, Windows Subsystem for Linux (WSL) was used during project development when shell tools such as `curl` are needed.

## API routing

All generated API calls use a relative base path of `/api`. This is set in `src/main.tsx`:

```typescript
OpenAPI.BASE = '/api';
```

Generated service paths are backend-relative (for example `/projects`). The browser therefore requests `/api/projects`.

### Production and compose

In the production image, nginx serves the built SPA and forwards `/api/` to the backend. The routing rules are given in [`platform/frontend/reverseProxy/README.md`](../../reverseProxy/README.md).

### Vite development

During `npm run dev`, the Vite dev server listens on port 5173. Requests under `/api` are proxied to `DEV_SERVER` from `vite.server.env`. The `/api` prefix is removed before the request is forwarded. Proxy timeouts are disabled so large container image uploads (`.tar`) are not aborted mid-stream.

## Development configuration

`vite.config.ts` loads `vite.server.env` at startup. The proxy target is taken from `DEV_SERVER`, with a fallback of `http://localhost:9080` if the variable is unset.

The committed default in `vite.server.env` is:

```
DEV_SERVER=http://localhost:12080/api
```

### Profile A. Full stack (default)

The compose stack is running. Vite proxies API traffic through the dashboard nginx on port 12080. This profile most closely matches production routing.

### Profile B. Backend on the host only

The backend is running with `npm run dev` in `platform/backend/platform/` (PostgreSQL and other dependencies per the backend README). Set in `vite.server.env`:

```
DEV_SERVER=http://localhost:9080
```

Vite forwards stripped paths directly to the backend on port 9080. The nginx layer is not used.

## Host-side development

From `platform/frontend/applications/dashboard/`:

```bash
npm ci
npm run dev
```

The dev server is available at `http://localhost:5173`. Ensure `vite.server.env` matches the backend or stack that is running.

Swagger UI is not served by Vite. When the backend is reachable on the host, Swagger is available at `http://localhost:9080/api-docs`. When only compose is running, OpenAPI JSON is available at `http://localhost:12080/api/api-docs-json` through the reverse proxy.

## npm scripts

All scripts are defined in [`package.json`](package.json) in this directory. Commands are run from `platform/frontend/applications/dashboard/`.

| Script | Purpose |
| --- | --- |
| `npm run dev` | The Vite dev server is started on port 5173. API requests under `/api` are proxied using `DEV_SERVER` from `vite.server.env`. |
| `npm run build` | TypeScript project references are checked with `tsc -b`. A production bundle is written to `dist/`. This command is run in the frontend Docker image build. |
| `npm run lint` | ESLint is run over application TypeScript and TSX sources. |
| `npm run preview` | The built `dist/` output is served locally (default port 4173). The dev API proxy is not enabled. Backend calls are not forwarded. |
| `npm run api:generate` | OpenAPI JSON is downloaded from the running stack and `src/api/generated/` is regenerated. Requires `curl` and a reachable OpenAPI document. |

### Regenerating the API client

`npm run api:generate` runs:

```bash
curl -L http://localhost:12080/api/api-docs-json -o openapi.json
openapi --input openapi.json --output src/api/generated --client fetch --useUnionTypes
```

The compose stack must be running with the backend and dashboard proxy available on port 12080. The `openapi` CLI is provided by the devDependency `openapi-typescript-codegen`. A temporary `openapi.json` file is written in this directory.

Only `src/api/generated/` is overwritten. Hand-written modules under `src/api/` (for example `cvesApi.ts`, `containerImagesApi.ts`, and `imageCvesApi.ts`) and schemas under `src/api/schemas/` are maintained manually. After regeneration, wrappers should be checked if DTOs or routes changed. `OpenAPI.BASE` in `src/main.tsx` is not modified by codegen.

To fetch the spec from a backend running on the host without compose, the curl URL in the script must be changed to `http://localhost:9080/api-docs-json`.

### Typical workflows

| Goal | Commands |
| --- | --- |
| Day-to-day UI development | `npm run dev` |
| Typecheck and bundle (same as Docker build step) | `npm run build` |
| Lint only | `npm run lint` |
| After backend API changes | Start stack, then `npm run api:generate`, then review wrappers and run `npm run build` |
| Inspect static assets only | `npm run build`, then `npm run preview` |

## Production image and compose

The dashboard is not built from this directory alone. Docker Compose builds from `frontend/` using `frontend/docker/DockerFile`. The builder stage runs `npm run build` on dashboard sources. The runtime stage copies `dist/` into nginx and applies `reverseProxy/nginx.conf`.

Compose expects image name `comp7705platformfrontend:latest` and publishes port **12080**. Build commands and image tags are described in [`platform/frontend/README.md`](../../README.md). nginx location blocks and MCP proxy behaviour are described in [`platform/frontend/reverseProxy/README.md`](../../reverseProxy/README.md).

## Source layout

| Path | Role |
| --- | --- |
| `src/main.tsx` | Application entry. Sets `OpenAPI.BASE = '/api'`. |
| `src/api/generated/` | OpenAPI-generated client. Must not be edited by hand. |
| `src/api/*.ts` | Validated wrappers around generated services. |
| `src/api/schemas/` | Zod schemas aligned with backend payloads. |
| `src/pages/` | Route pages. |
| `src/components/` | Shared UI components. |
| `src/index.css` | Global styles and theme CSS variables. |
| `vite.config.ts` | Vite plugins, dev server port, and API proxy. |
| `vite.server.env` | Dev proxy target (committed). |
| `index.html` | SPA shell. |

The HTTP-mounted platform assistant agent is consumed through generated `AgentsService` (`platform-assistant`).
