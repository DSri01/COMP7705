# Condition A — Scenario 7: Compensating Control (gunicorn)
## App: infra-monitor | No MCP | Run 4

---

## Summary of All Proposed Changes

**Files to create (3):**
1. `nginx/nginx.conf` — SSL termination and reverse proxy config
2. `nginx/generate-certs.sh` — Self-signed cert generation script
3. `nginx/Dockerfile` — nginx service Dockerfile

**Files to modify (1):**
1. `docker-compose.yml` — Add nginx service with `proxy` network

---

## Architecture

```
External clients
       |
       | HTTPS :443
       v
   [nginx container]          <-- proxy network
       |
       | HTTP monitor:8000
       v
   [monitor container]        <-- proxy + internal networks
       |
       v
   [redis]  [prometheus]      <-- internal network only
```

---

## docker-compose.yml diff

```diff
 services:
+  nginx:
+    build: ./nginx
+    ports:
+      - "443:443"
+      - "80:80"
+    depends_on:
+      monitor:
+        condition: service_started
+    networks:
+      - proxy
+    restart: unless-stopped
+
   monitor:
     ...
     networks:
       - internal
+      - proxy

 networks:
   internal:
     driver: bridge
     internal: true
+  proxy:
+    driver: bridge
```

---

## Key Design Decisions

- nginx on a separate `proxy` network (NOT internal), with ports 443 and 80 exposed to host.
- monitor sits on both `proxy` and `internal` networks.
- redis and prometheus remain on `internal` only (not externally reachable).
- Self-signed cert generated at Docker build time (365 days, RSA 2048).
- `/metrics` endpoint blocked at nginx level (returns 403).
- WebSocket upgrade headers included for forward compatibility.
