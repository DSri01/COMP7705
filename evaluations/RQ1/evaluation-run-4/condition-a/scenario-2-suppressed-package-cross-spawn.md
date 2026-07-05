# Condition A — Scenario 2: Suppressed Package (cross-spawn)
## App: shopify-price-tracker | No MCP | Run 4

---

## Summary of Proposed Changes

Three files:

1. **`Dockerfile`** — Rewrite as multi-stage build: builder stage with full slim image for compilation, runtime stage with Alpine.
2. **`.dockerignore`** (new) — Exclude unnecessary files from build context.
3. **`docker-compose.yml`** — No changes needed.

---

## Proposed Dockerfile

```dockerfile
# ---- Stage 1: Builder ----
FROM node:18.19.0-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install && npm prune --omit=dev

# ---- Stage 2: Runtime ----
FROM node:18.19.0-alpine

WORKDIR /app

RUN mkdir -p /app/uploads/products && \
    chown -R node:node /app

COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package*.json ./
COPY --chown=node:node src ./src
COPY --chown=node:node db ./db

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
    CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "src/index.js"]
```

---

## Key Design Decisions

- Builder uses `node:18.19.0-slim` (Debian-based) for native module compilation (pg, bull, ioredis, cheerio).
- `npm install && npm prune --omit=dev` ensures only production deps in node_modules.
- Runtime uses `node:18.19.0-alpine` (~50MB vs ~180MB slim).
- Selective COPY: only `src/`, `db/`, `package*.json`, `node_modules/` — no `.git`, `.env`, test files.
- Healthcheck switched from `curl` to `wget` (Alpine ships wget by default).
- Estimated size reduction: ~460MB → ~200MB (55%+ reduction).
