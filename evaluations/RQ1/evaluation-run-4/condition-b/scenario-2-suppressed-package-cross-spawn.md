# Condition B — Scenario 2: Suppressed Package (cross-spawn)
## App: shopify-price-tracker | Guided MCP | Run 4

---

## MCP Security Context Gathered

- **Image CVE Stats:** 1,918 enabled CVEs (13 CRITICAL, 233 HIGH, 865 MEDIUM, 24 LOW, 779 UNKNOWN)
- **3 affected** (1 HIGH, 2 UNKNOWN), **1 not_affected** (cross-spawn)
- **CVE-2024-21538 (cross-spawn):** `not_affected`, justification `vulnerable_code_not_in_execute_path`. Impact statement: "cross-spawn is a build-time devDependency of nodemon, not included in the production image."
- **EPSS:** 0.00069 (very low)
- Agent noted: current Dockerfile does NOT guarantee cross-spawn is excluded architecturally

---

## Proposed Changes

### 1. New file: `.dockerignore`
Excludes `.git`, `.env`, `*.tar`, `node_modules`, documentation files.

### 2. Refactored Dockerfile (multi-stage)

```dockerfile
# ---- Stage 1: Builder ----
FROM node:18.19.0-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm install && npm prune --omit=dev

# ---- Stage 2: Runtime ----
FROM node:18.19.0-alpine
WORKDIR /app
RUN mkdir -p /app/uploads/products && chown -R node:node /app
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

### 3. No changes to docker-compose.yml

---

## Security Justifications (from MCP context)

- **Multi-stage build provides architectural assurance** for cross-spawn exclusion (not just `--omit=dev`).
- **Alpine runtime** eliminates hundreds of Debian OS-level CVEs (glibc, coreutils, tar).
- **`npm install && npm prune --omit=dev`** ensures native modules compile correctly, then strips dev-only packages.
- **Selective COPY** (src, db, package*.json, node_modules only) excludes non-essential files.
- **wget instead of curl** for healthcheck (Alpine ships wget, avoids adding curl CVE surface).
- Estimated size reduction: ~460MB → ~130-160MB (55-65% reduction).
