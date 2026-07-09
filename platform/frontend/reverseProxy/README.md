# Reverse Proxy

This directory contains the nginx reverse proxy configuration for the platform dashboard container. A single file, `nginx.conf`, defines routing for the built React application and the platform backend on one HTTP port. In the production image, the file is installed as `/etc/nginx/nginx.conf`. Stack startup is described in [`platform/README.md`](../../README.md). Frontend image build is described in [`platform/frontend/README.md`](../README.md).

## Role in the stack

The reverse proxy runs inside the **dashboard** container (`comp7705platformfrontend:latest`). It is not a separate compose service. Compose maps host port **12080** to nginx port **80** in that container.

```
Browser (host :12080)
  → nginx (dashboard container :80)
      /              → static SPA (/fs-root/dashboard)
      /api/…         → backend (comp7705-platform-backend:9080)
      /api/mcp/…     → backend /mcp/…
```

The backend is reached on the compose network at `comp7705-platform-backend:9080`. It is not published on a host port by compose. Local UI development with Vite bypasses this nginx layer. That workflow is described in [`platform/frontend/applications/dashboard/README.md`](../applications/dashboard/README.md).

## Files

| File | Role |
| --- | --- |
| `nginx.conf` | Full nginx configuration for the dashboard runtime image |

No other files are present in this directory.

## Service identifiers

| Item | Value |
| --- | --- |
| Compose service | `dashboard` |
| Docker image | `comp7705platformfrontend:latest` |
| nginx listen port (container) | `80` |
| Host port (compose) | `12080` |
| Backend upstream | `comp7705-platform-backend:9080` |

Docker embedded DNS (`127.0.0.11`) is configured with dynamic resolution (`resolve`) on the upstream server entry.

## Routing

Three `location` blocks are defined in `nginx.conf`. The MCP block uses `^~` so it takes precedence over the general `/api/` block.

| Incoming request (host `:12080`) | Handler | Backend path |
| --- | --- | --- |
| `/` and other SPA routes | Static files from `/fs-root/dashboard` | Not proxied |
| `/api/<path>` (except `/api/mcp`) | REST proxy | `/<path>` |
| `/api/mcp` and subpaths | MCP proxy | `/mcp` and subpaths |

The `/api/` prefix is removed before the request is forwarded to the backend. The dashboard SPA uses the same prefix in the browser (`OpenAPI.BASE = '/api'` in `src/main.tsx`).

### Path mapping examples

| Request on `:12080` | Backend receives |
| --- | --- |
| `GET /api/projects` | `GET /projects` |
| `GET /api/api-docs` | `GET /api-docs` |
| `GET /api/api-docs-json` | `GET /api-docs-json` |
| `GET /api/agents/platform-assistant/threads` | `GET /agents/platform-assistant/threads` |
| `GET /api/mcp` | `GET /mcp` |

Requests that omit the `/api/` prefix are not forwarded to the backend. For example, `GET /api-docs` is handled by the SPA fallback (`try_files` returns `index.html`).

## Location blocks

### MCP (`location ^~ /api/mcp`)

Traffic under `/api/mcp` is mapped to backend `/mcp`. Request and response buffering are disabled. Body size limits are removed. Connect timeout is 60 seconds. Read and send timeouts are 3600 seconds.

### REST API (`location /api/`)

All other traffic under `/api/` is forwarded to the backend root through `proxy_pass http://platform-backend/`. Body size limits are removed. Long timeouts are set so large container image uploads (`.tar`) are not rejected or cut off. Connect timeout is 60 seconds. Read and send timeouts are 3600 seconds.

### SPA (`location /`)

The built dashboard is served from `/fs-root/dashboard`. `try_files` falls back to `index.html` for client-side routing.

## URLs through compose

When the stack runs through compose, clients use host port **12080** with the paths below.

| Client | URL |
| --- | --- |
| Dashboard SPA | `http://localhost:12080/` |
| REST API | `http://localhost:12080/api/…` |
| Swagger UI | `http://localhost:12080/api/api-docs` |
| OpenAPI JSON | `http://localhost:12080/api/api-docs-json` |
| MCP | `http://localhost:12080/api/mcp` |
| Agent REST | `http://localhost:12080/api/agents/…` |

## Docker integration

`nginx.conf` is copied into the dashboard image by `frontend/docker/DockerFile`. The runtime stage uses `nginx:1.29.4-alpine3.23`. The built dashboard is copied to `/fs-root/dashboard`. The configuration is installed at `/etc/nginx/nginx.conf` as a full replacement of the default main config. `nginx -t` is run at image build time. The container exposes port **80**.

After any change to `nginx.conf`, the dashboard image must be rebuilt. Build commands are described in [`platform/frontend/README.md`](../README.md).

## Related documentation

| Topic | Document |
| --- | --- |
| Full stack startup | [`platform/README.md`](../../README.md) |
| Frontend image build | [`platform/frontend/README.md`](../README.md) |
| Vite dev (nginx bypass) | [`platform/frontend/applications/dashboard/README.md`](../applications/dashboard/README.md) |
| Backend service | [`platform/backend/platform/README.md`](../../backend/platform/README.md) |
