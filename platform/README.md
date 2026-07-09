# Platform

This directory contains the COMP7705 platform implementation. A container vulnerability management dashboard, a NestJS backend, PostgreSQL, and container scanning services are provided. For normal use, the full stack is built and started with Docker Compose from this directory. This document describes stack layout, first-time setup, compose services, and npm lifecycle scripts. Backend configuration, frontend image build, and nginx routing are described in the child README files listed at the end.

## Prerequisites

Docker with Compose v2 is required. npm is used only as a script runner for commands in [`package.json`](package.json). This directory has no npm dependencies to install. On Windows 11, Windows Subsystem for Linux (WSL) was used during project development.

Before the stack is started for the first time, a backend environment file must exist at `backend/platform/.env`. Compose mounts it into the backend container at `/app/.env`. Agent variables are validated at backend startup. Startup fails if they are missing or invalid, even when only the dashboard is used. The directory `backend/platform/fs/` must exist. It holds uploaded container image archives and scan output at runtime.

Full variable reference and profile examples are given in [`backend/platform/README.md`](backend/platform/README.md).

### First-time backend configuration

Copy the committed defaults and override network-specific values for compose:

```bash
cp backend/platform/.dev.env backend/platform/.env
```

Edit `backend/platform/.env` so that at least the following values apply inside the compose network:

```
DB_HOST=db
DB_PORT=5432
CONTAINER_SCANNER_URL=http://container-scanner:8080/container/tar/json/scan
```

Add an agent configuration block. A minimal example using OpenRouter and mock web search is given as Profile A in [`backend/platform/README.md`](backend/platform/README.md). Profile B in that document lists the full compose-oriented starting point.

## Directory layout

| Path | Role |
| --- | --- |
| `dev.docker-compose.yml` | Development stack definition |
| `package.json` | Stack lifecycle and database helper scripts |
| `_dbDumps/` | Local database dumps (contents are gitignored) |
| `backend/platform/` | NestJS backend service |
| `backend/container-scanner/` | Go container scanner and file system scanner |
| `frontend/` | Dashboard SPA and nginx reverse proxy image build context |

## Compose services

The stack is defined in [`dev.docker-compose.yml`](dev.docker-compose.yml). The compose project name is `comp7705-dev-infrastructure`.

| Service | Image | Host port | Role |
| --- | --- | --- | --- |
| `db` | `postgres:17.6-alpine3.22` | `65432` → `5432` | Platform PostgreSQL database (`comp7705`) |
| `container-scanner` | `comp7705containerscanner:latest` | `8080` → `8080` | HTTP API for container image archive scans |
| `fs-scanner` | `comp7705fsscanner:latest` | (none) | Image is built. The container runs `true` and exits. |
| `backend` | `comp7705platformbackend:latest` | (none) | REST API, workers, agents, MCP (container name `comp7705-platform-backend`) |
| `dashboard` | `comp7705platformfrontend:latest` | `12080` → `80` | Built SPA and nginx reverse proxy |

The host directory `backend/platform/fs` is bind-mounted into the backend at `/app/fs`. The same directory is bind-mounted into the container scanner at `/fs`. The backend depends on a healthy `db` service and a started `container-scanner` service. The dashboard depends on the backend.

The backend HTTP port (`9080` by default) is not published on the host. API traffic is reached through the dashboard proxy on port **12080**. Routing rules are described in [`frontend/reverseProxy/README.md`](frontend/reverseProxy/README.md).

## Quick start

From `platform/`:

```bash
npm run dev:build
```

When all services are running, the dashboard is available at:

```
http://localhost:12080/
```

Swagger UI is available at `http://localhost:12080/api/api-docs`. The OpenAPI JSON document is available at `http://localhost:12080/api/api-docs-json`.

## npm scripts

All scripts are defined in [`package.json`](package.json). Stack lifecycle scripts invoke `docker compose -f dev.docker-compose.yml`. Database helper scripts use ephemeral `docker run` containers with the `postgres:17.6-alpine3.22` image.

### Stack lifecycle

| Script | Purpose |
| --- | --- |
| `npm run dev:build` | All images are built. All services are started in detached mode. |
| `npm run dev:up` | Services are started without rebuilding images. |
| `npm run dev:down` | Containers are stopped. The database volume is retained. |
| `npm run dev:clear` | Containers are stopped. The named volume `db_data` is removed. All persisted database data is deleted. |

After changes to application source or Dockerfiles, `dev:build` should be used so images are rebuilt. After changes to `backend/platform/.env` only, the backend container may be restarted without a full rebuild.

### Database helpers

These scripts connect to the compose database through host port **65432** using `host.docker.internal`. That hostname is provided by Docker Desktop on Windows, macOS, and WSL. On native Linux Docker without Docker Desktop, those DB helper scripts may need different host mapping (e.g. `host-gateway`). The compose `db` service must be running. Dump files are written under `_dbDumps/`.

| Script | Purpose |
| --- | --- |
| `npm run dev:psql-to-dev-db` | An interactive `psql` session is opened against database `comp7705`. |
| `npm run dev:db-dump` | A plain SQL dump is written to `_dbDumps/comp7705db-dump-<timestamp>.sql`. |
| `npm run dev:db-restore` | A plain SQL file from `_dbDumps/` is restored. Usage: `npm run dev:db-restore -- <filename.sql>`. |
| `npm run dev:db-dump-bin` | A custom-format dump is written to `_dbDumps/comp7705db-dump-<timestamp>.dump`. |
| `npm run dev:db-restore-bin` | A custom-format dump is restored. Usage: `npm run dev:db-restore-bin -- <filename.dump>`. |

## Host ports

| Port | Service |
| --- | --- |
| `12080` | Dashboard (SPA, proxied REST API, Swagger, MCP) |
| `8080` | Container scanner HTTP API |
| `65432` | PostgreSQL |

## Alternative development workflows

The compose stack is the primary path for running the platform. Host-side development without rebuilding the dashboard or backend images is also supported.

Backend development with `npm run dev` in `backend/platform/` is described in [`backend/platform/README.md`](backend/platform/README.md). PostgreSQL on port **65432** and the container scanner on port **8080** must be reachable from the host.

Dashboard development with Vite in `frontend/applications/dashboard/` is described in [`frontend/applications/dashboard/README.md`](frontend/applications/dashboard/README.md). The Vite dev server listens on port **5173**.

Scanner package development is described in [`backend/container-scanner/README.md`](backend/container-scanner/README.md). Manual scanner development is not required to run the dashboard or backend through compose.

## Related documentation

| Topic | Document |
| --- | --- |
| Backend configuration, host dev, and CLI tools | [`backend/platform/README.md`](backend/platform/README.md) |
| Container and file system scanners | [`backend/container-scanner/README.md`](backend/container-scanner/README.md) |
| Frontend Docker image build | [`frontend/README.md`](frontend/README.md) |
| nginx routing on port 12080 | [`frontend/reverseProxy/README.md`](frontend/reverseProxy/README.md) |
| Dashboard Vite dev and npm scripts | [`frontend/applications/dashboard/README.md`](frontend/applications/dashboard/README.md) |
