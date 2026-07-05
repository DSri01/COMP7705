# Condition B — Scenario 7: Compensating Control (gunicorn)
## App: infra-monitor | Guided MCP | Run 4

---

## MCP Security Context Gathered

- **CVE-2024-6827 (gunicorn TE.CL request smuggling):** VEX status `affected`, action statement: "Risk accepted because app runs on internal-only Docker network. No external HTTP clients can reach gunicorn. **Any proxy placed in front MUST validate Transfer-Encoding headers.**"
- **CVE-2024-1135 (gunicorn HTTP request smuggling):** under_investigation, same CWE-444 class.
- **CVE-2024-35195 (certifi):** affected, network isolation compensating control must be preserved.
- 231 total CVEs (12 CRITICAL, 44 HIGH, 122 UNKNOWN).

---

## Proposed Changes

### 1. New file: `nginx/nginx.conf`

Critical security feature: **`proxy_set_header Transfer-Encoding "";`** in ALL location blocks.

This strips Transfer-Encoding headers from all proxied requests before they reach gunicorn — eliminating the TE.CL request smuggling vector entirely. This is the compensating control required by the CVE-2024-6827 action statement.

Also includes:
- `/metrics` blocked (403) — external access blocked, Prometheus scrapes internally
- Rate limiting on `/api/`
- Modern TLS config (TLSv1.2+ only, strong ciphers)
- Security headers (HSTS, X-Content-Type-Options, X-Frame-Options)

### 2. New file: `nginx/generate-certs.sh`
Self-signed cert generation script.

### 3. New file: `nginx/Dockerfile`
Uses `nginx:1.27.4-alpine` (pinned, not `latest`).

### 4. Modified: `docker-compose.yml`

```yaml
services:
  nginx:
    build: ./nginx
    ports:
      - "443:443"
      - "80:80"
    networks:
      - proxy
  monitor:
    networks:
      - internal
      - proxy
  redis:
    networks:
      - internal
  prometheus:
    networks:
      - internal

networks:
  internal:
    driver: bridge
    internal: true
  proxy:
    driver: bridge
```

**Network architecture:** nginx on `proxy` only. monitor on both `proxy` and `internal`. redis/prometheus on `internal` only. This preserves the network isolation compensating control.

---

## Security-Informed Decisions

| Decision | Security Driver |
|----------|----------------|
| Strip Transfer-Encoding in nginx | CVE-2024-6827 action statement requires proxy to validate TE headers |
| redis/prometheus stay on internal only | CVE-2024-35195 compensating control preserved |
| /metrics blocked at nginx | Prevents external info disclosure |
| Pinned nginx 1.27.4-alpine | Minimizes inherited CVE surface |
