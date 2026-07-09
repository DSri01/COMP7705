# Platform Frontend

This directory contains the frontend package for the COMP7705 platform. The Platform Dashboard single-page application and the nginx reverse proxy configuration are included. Both are built into one Docker image. For normal use, that image is built and started through the platform Docker Compose stack. Stack startup is described in [`platform/README.md`](../README.md). This document describes directory layout, Docker image build, and the host build script for the frontend package only.

## Service identifiers

| Item | Value |
| --- | --- |
| Docker image | `comp7705platformfrontend:latest` |
| Compose service name | `dashboard` |
| Host URL (compose) | `http://localhost:12080` |
| Docker build context | `frontend/` |
| Dockerfile | `docker/DockerFile` |

HTTP routing inside the dashboard container is described in [`reverseProxy/README.md`](reverseProxy/README.md). Dashboard source development is described in [`applications/dashboard/README.md`](applications/dashboard/README.md).

## Directory layout

| Path | Role |
| --- | --- |
| `applications/dashboard/` | Platform Dashboard React SPA (Vite) |
| `reverseProxy/` | nginx configuration for the runtime image |
| `docker/DockerFile` | Two-stage Docker build |
| `scripts/build-container-image.sh` | Host-side image build script |

There is no `package.json` in this directory. npm scripts for the dashboard are defined in `applications/dashboard/package.json`.

## Prerequisites

Docker is required to build the production image with `scripts/build-container-image.sh`. Bash is used for that script. On Windows 11, Windows Subsystem for Linux (WSL) was used during project development.

Node.js **v22.22.1** is used in the Docker builder stage and matches the version recommended for local dashboard development. Local UI development without Docker is described in [`applications/dashboard/README.md`](applications/dashboard/README.md).

## Docker image build

The image is defined in `docker/DockerFile` as a two-stage build.

The builder stage uses `node:22.22.1-alpine3.23`. Dashboard sources are copied from `applications/dashboard/`. `npm ci` and `npm run build` are run in that stage. The output is written to `dist/`.

The runtime stage uses `nginx:1.29.4-alpine3.23`. The built SPA is copied to `/fs-root/dashboard`. `reverseProxy/nginx.conf` is installed as `/etc/nginx/nginx.conf`. The configuration is validated with `nginx -t` at build time. The container exposes port **80** and runs nginx in the foreground.

The file `applications/dashboard/vite.server.env` is copied into the builder stage with the dashboard sources. It configures the Vite dev-server proxy only. It is not used at runtime in the nginx image.

## Building the image

### Through compose

The recommended path is to build from `platform/` with Docker Compose. Instructions are given in [`platform/README.md`](../README.md).

### Standalone on the host

From `platform/frontend/`:

```bash
./scripts/build-container-image.sh
```

This produces `comp7705platformfrontend:latest`. An optional version tag may be passed as the first argument. A custom image name and tag may be passed as two arguments. The script runs `docker build --network=host -f docker/DockerFile` with build context `.` (this directory).

| Invocation | Result |
| --- | --- |
| `$0` | `comp7705platformfrontend:latest` |
| `$0 <tag>` | `comp7705platformfrontend:latest` and `comp7705platformfrontend:<tag>` |
| `$0 <name> <tag>` | `<name>:latest` and `<name>:tag` |

## Integration with compose

When [`platform/dev.docker-compose.yml`](../dev.docker-compose.yml) defines the dashboard service, it builds from this directory (`context: frontend/`, `dockerfile: docker/DockerFile`). It expects:

- Image name `comp7705platformfrontend:latest`
- Host port **12080** mapped to container port **80**
- Dependency on the backend service

nginx forwards API traffic to `comp7705-platform-backend:9080` on the compose network. Routing rules are described in [`reverseProxy/README.md`](reverseProxy/README.md).

## When to rebuild

The dashboard image must be rebuilt after changes to dashboard sources under `applications/dashboard/` or to `reverseProxy/nginx.conf`.

Local UI development with Vite does not use this image. That workflow is described in [`applications/dashboard/README.md`](applications/dashboard/README.md).

## Related documentation

| Topic | Document |
| --- | --- |
| Full stack startup | [`platform/README.md`](../README.md) |
| nginx routing and URLs on port 12080 | [`reverseProxy/README.md`](reverseProxy/README.md) |
| Dashboard Vite dev and npm scripts | [`applications/dashboard/README.md`](applications/dashboard/README.md) |
| Backend service | [`platform/backend/platform/README.md`](../backend/platform/README.md) |
