# Condition A — Scenario 5: Version Pin (body-parser)
## App: shopify-price-tracker | No MCP | Run 4

---

## Summary of Proposed Changes

1. **New file: `src/middleware/verifyShopifyWebhook.js`** — HMAC-SHA256 signature verification using raw request body.
2. **New file: `src/routes/webhooks.js`** — POST /shopify route handler with body validation and topic-based event dispatch.
3. **Edit: `src/index.js`** — Mount webhook route at `/api/webhooks`, add raw-body capture middleware.
4. **Edit: `.env.example`** — Add `SHOPIFY_WEBHOOK_SECRET`.
5. **Edit: `db/schema.sql`** — Add `webhook_events` and `shopify_orders` tables.
6. **Edit: `docker-compose.yml`** — Add webhook secret env var.
7. **Edit: `package.json`** — Bump version to 1.5.0. No new npm packages needed (crypto is built-in).

---

## Key Files

### src/middleware/verifyShopifyWebhook.js
- Captures raw body as Buffer, computes HMAC-SHA256, compares against `X-Shopify-Hmac-Sha256` header.
- Uses `crypto.timingSafeEqual` for timing-attack-safe comparison.
- Must run BEFORE `express.json()` on the webhook path.

### src/routes/webhooks.js
- POST /shopify with HMAC verification, topic validation (products/update, products/create, orders/create, etc.), payload validation, and topic-specific handlers.
- Persists raw events to `webhook_events` table for audit trail.
- Product update handler: finds tracked product by Shopify handle, records price changes in `price_history`, updates `products.last_price`, emits Socket.IO event.
- Order handler: persists summaries to `shopify_orders`.
- Always returns 200 (Shopify expects acknowledgment).

### src/index.js changes
- Added raw-body capture middleware scoped to `/api/webhooks` path (runs before express.json).
- Mounted webhook router at `/api/webhooks`.

---

## package.json diff

```diff
-  "version": "1.4.2",
+  "version": "1.5.0",
```

No dependency changes — crypto is a Node.js built-in. **express remains at 4.18.2** (no upgrade proposed).
