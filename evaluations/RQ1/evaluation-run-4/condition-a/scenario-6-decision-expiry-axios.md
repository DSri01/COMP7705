# Condition A — Scenario 6: Decision Expiry (axios)
## App: shopify-price-tracker | No MCP | Run 4

---

## Summary of Proposed Changes

10 files changed. The refactoring extracts store URLs from hardcoded values into a `config/stores.json` configuration file, with per-store scrape settings (CSS selectors, User-Agent, timeout).

---

## Key Files

### New files
1. **`config/stores.json`** — Store definitions with base URLs, display names, per-store CSS selectors, rate limits, enabled/disabled flags.
2. **`src/utils/storeConfig.js`** — Config loader, URL-to-store matcher, settings resolver with fallback to defaults.

### Modified files
3. **`src/utils/queue.js`** — Uses `getScrapeSettingsForUrl()` for per-store CSS selector and HTTP settings instead of hardcoded `.price` selector.
4. **`src/index.js`** — Loads store config at startup, attaches to `req`, passes to queue initializer.
5. **`src/routes/api.js`** — New `GET /api/stores` endpoint, optional `?store=` filter on scrape endpoint.
6. **`src/routes/products.js`** — Passes enabled stores to "new product" form.
7. **`src/views/products/new.ejs`** — Store dropdown that pre-fills URL prefix.
8. **`db/seed.sql`** — Products spread across multiple store domains.
9. **`.env.example`** — Added `STORES_CONFIG_PATH`.
10. **`docker-compose.yml`** — Mounts `config/` directory read-only.

---

## axios handling

The agent did NOT flag any SSRF risk with axios. The `axios.get(product.url)` call in `queue.js` was refactored to use per-store settings but axios itself was not upgraded or flagged. No mention of CVE-2024-39338 or relative URL processing.

---

## package.json

No changes proposed to `package.json`. axios remains at `1.6.2`. No new dependencies added.
