# Container Scanner and File System Scanner

This directory contains the prototype implementation of the container scanner and the file system scanner. Go 1.26.0 was used for the development container and Docker builds (`go.mod` declares Go 1.25.0). Both components invoke [Trivy](https://trivy.dev/) to produce vulnerability findings.

The container scanner exposes an HTTP service. A container image archive (`.tar`) is scanned when the archive is present under a configured directory on the local file system. The file system scanner is a command-line program. An input directory that contains source code is scanned, and CVE identifiers are extracted from the Trivy report.

For normal platform use, the scanners are built and started through the platform stack ([`platform/dev.docker-compose.yml`](../../dev.docker-compose.yml)). Manual development of this package is not required to run the dashboard or the backend.

## Entry points

| Program | Path | Role |
| --- | --- | --- |
| Container scanner (HTTP) | `cmd/scanner` | Listens for scan requests. Container image archives under `IMAGE_TAR_DIRECTORY_PATH` are scanned. JSON reports are written under `JSON_OUTPUT_DIRECTORY_PATH`. Configuration is loaded from `.env`. |
| File System Scanner CLI | `cmd/fs-scanner` | Performs a one-shot filesystem scan. Usage: `fs-scanner <input-directory-path> <output-directory-path>`. Outputs `scan.fs.json` and `vulnerabilities.json`. |

Other commands under `cmd/` (for example `hello-cli` and `run-command`) are auxiliary utilities for development and testing.

## Running with the platform

When the platform stack is started from [`platform/dev.docker-compose.yml`](../../dev.docker-compose.yml), both scanner images are built by Docker Compose. The container scanner service is started on host port **8080**. The file system scanner image is built as well. Compose starts an `fs-scanner` container that runs `true` and exits. It is not a long-running service.

Compose mounts the same host directory `backend/platform/fs` into two services. The container-scanner service receives it at `/fs`. The backend service receives it at `/app/fs`. That directory holds uploaded container image archives and scan output.

The backend calls the scanner at `POST /container/tar/json/scan`. The full URL is set in `backend/platform/.env` as `CONTAINER_SCANNER_URL` (for example `http://container-scanner:8080/container/tar/json/scan` inside compose, or `http://localhost:8080/container/tar/json/scan` when the backend runs on the host). See [`backend/platform/README.md`](../platform/README.md).

## Development workflow

Scanner development is performed in an isolated Go container. Production-style Docker images are built on the host with separate scripts. These two steps are intentionally separate. Image build scripts call the host Docker daemon and are not run inside the development container.

### Prerequisites

Docker is required on the host. Bash scripts are used throughout this directory. On Windows 11, Windows Subsystem for Linux (WSL) was used during project development.

### Step 1. Open the development container

From `platform/backend/container-scanner/`:

```bash
./scripts/open-in-container.sh
```

A `golang:1.26.0-alpine3.23` container is started. The repository is mounted at `/workspace`. `scripts/workspace/install-tools.sh` installs bash, curl, git, and mockgen. `scripts/workspace/initialize.sh` runs `go mod tidy`, `go mod verify`, and `go generate ./...`. An interactive shell is then opened.

Inside the container, tests and local builds are run as usual:

```bash
go test ./...
go build -o scanner cmd/scanner/main.go
go build -o fs-scanner cmd/fs-scanner/main.go
```

Alternatively, `./scripts/run-all-tests.sh` runs `go test -cover ./...`.

### Step 2. Build Docker images on the host

After leaving the development container, the deployable images are built from the host (outside the Go dev shell). Run these commands from `platform/backend/container-scanner/`:

```bash
./scripts/build-container-image.sh
./scripts/build-fs-scanner-container-image.sh
```

These commands produce `comp7705containerscanner:latest` and `comp7705fsscanner:latest`. An optional version tag may be passed as the first argument. A custom image name and tag may be passed as two arguments.

Built images may be smoke-tested locally (also from `platform/backend/container-scanner/`):

```bash
./scripts/run-latest-container.sh
./scripts/run-latest-fs-scanner.sh
```

`run-latest-container.sh` publishes port 8080 and mounts `__testResources__/container-images` at `/fs`. `run-latest-fs-scanner.sh` mounts the repository at `/code-directory`. Scan output is written under `.scans/` in this directory (default output path from `docker/fs.DockerFile`).

## Scripts reference

| Script | Where to run | Purpose |
| --- | --- | --- |
| `scripts/open-in-container.sh` | Host | Starts the isolated Go development container. |
| `scripts/build-container-image.sh` | Host | Builds the container scanner Docker image. |
| `scripts/build-fs-scanner-container-image.sh` | Host | Builds the file system scanner Docker image. |
| `scripts/run-latest-container.sh` | Host | Runs the container scanner image locally. |
| `scripts/run-latest-fs-scanner.sh` | Host | Runs the file system scanner image locally. |
| `scripts/run-all-tests.sh` | Dev container or host with Go | Runs `go test -cover ./...`. |
| `scripts/build-all.sh` | Dev container or host with Go | Cross-compiles binaries into `bin/`. |
| `scripts/initialize-test-resources.sh` | Host | Prepares test container image fixtures. |

Scripts under `scripts/experimental/` are not part of the documented workflow.

## Configuration

The container scanner loads `.env` at startup (see `cmd/scanner/doc.go`). The committed defaults are:

```
PORT=8080
IMAGE_TAR_DIRECTORY_PATH=/fs
JSON_OUTPUT_DIRECTORY_PATH=/fs
```

This file is copied into the runtime image by `docker/DockerFile`. The file system scanner takes input and output directory paths as command-line arguments (see `cmd/fs-scanner/doc.go`). Default paths for the FS scanner image are set in `docker/fs.DockerFile`.

## Known issues

The Trivy scanner is invoked through `execCommand`. User-supplied values are passed as arguments. Path traversal is not fully sanitised. This behaviour is a known limitation. It is not planned to be remediated, because this component serves the academic project only and is not intended for production deployment. Requests are assumed to come from trusted users.
