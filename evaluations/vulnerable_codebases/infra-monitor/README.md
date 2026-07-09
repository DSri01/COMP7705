# Infra Monitor

Internal infrastructure monitoring service that tracks the health of backend services. Built as a Python/FastAPI application with a Redis-backed check history and Prometheus metrics export.

Deployed on an isolated Docker Compose internal network — no ports are exposed externally. The monitoring dashboard is only accessible via SSH tunnel or VPN.

## Features

- **TCP Port Checks** — Periodic health checks for database, cache, and internal API endpoints
- **HTTP Endpoint Checks** — Verify HTTP services return healthy status codes
- **Redis Check History** — Last 1000 check results stored in Redis for trend analysis
- **Prometheus Metrics** — Request latency, check counts, and service gauge exported at `/metrics`
- **Alert Webhooks** — POST notifications to a webhook URL when services go down
- **Auto-refresh Dashboard** — Dark-themed status page that reloads every 30 seconds

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Runtime | Python 3.11 |
| Framework | FastAPI + Uvicorn (via Gunicorn) |
| Cache/History | Redis 7.2 |
| Metrics | Prometheus client |
| HTTP Client | httpx |
| Templates | Jinja2 |

## Quick Start

```bash
# Start all services (monitor, redis, prometheus)
docker compose up --build

# Or run locally
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The monitor has no externally exposed ports by default. Access it via:
- `docker compose exec monitor curl http://localhost:8000` (from within the network)
- Or add a port mapping: `ports: ["8000:8000"]` to the monitor service

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | / | Dashboard UI |
| GET | /health | Health check |
| GET | /metrics | Prometheus metrics |
| GET | /api/status | Current service status (JSON) |
| GET | /api/history | Check history |
| GET | /api/stats | Latency statistics |
| GET | /checks | List all checks |
| POST | /checks | Run a manual check |
| GET | /alerts | List alert rules |
| POST | /alerts | Create alert rule |

## Configuration

Environment variables (see `.env.example`):

```
REDIS_URL=redis://redis:6379/0
INTERNAL_SERVICES=postgres:5432,redis:6379,prometheus:9090
CHECK_INTERVAL=60
ALERT_WEBHOOK_URL=http://localhost:8080/webhook
```

## Network Architecture

```
┌─────────────────────────────────────┐
│         internal network            │
│  (no external access)               │
│                                     │
│  ┌─────────┐  ┌───────┐  ┌────────┐│
│  │ monitor  │  │ redis │  │promethe││
│  │ :8000   │──│ :6379 │  │ :9090  ││
│  └─────────┘  └───────┘  └────────┘│
└─────────────────────────────────────┘
```

All services run on an `internal: true` Docker network. No outbound traffic is permitted. This isolation is a deliberate security decision — the monitor only needs to reach internal services.

## Recent Changes

- **v1.2.0** — Added Prometheus metrics export
- **v1.1.0** — Alert webhook notifications
- **v1.0.0** — Initial release with TCP/HTTP checks and Redis history
