# Condition A — Scenario 1: Version Pin (path-to-regexp)
## App: shopify-price-tracker | No MCP | Run 4

---

## Summary of Proposed Changes

Two files to modify:

1. **`package.json`** -- Update `express` from `4.18.2` to `^4.21.0` and add `express-rate-limit` at `^7.5.0`.
2. **`src/index.js`** -- Import and configure rate limiter, apply to `/api` mount point.

---

## Change 1: `package.json`

```diff
-    "express": "4.18.2",
+    "express": "^4.21.0",
```
```diff
     "express-fileupload": "1.4.3",
+    "express-rate-limit": "^7.5.0"
```

---

## Change 2: `src/index.js`

```diff
 const { Pool } = require("pg");
+const rateLimit = require("express-rate-limit");
```

```diff
 const pool = new Pool({ connectionString: process.env.DATABASE_URL });
+
+// Rate limiter for API routes
+const apiLimiter = rateLimit({
+  windowMs: 15 * 60 * 1000,
+  max: 100,
+  standardHeaders: true,
+  legacyHeaders: false,
+  message: {
+    error: "Too many requests from this IP, please try again after 15 minutes."
+  }
+});
```

```diff
-app.use("/api", apiRoutes);
+app.use("/api", apiLimiter, apiRoutes);
```

---

## Key Design Decisions

- Rate limiter applied at `/api` mount point only — dashboard, products, alerts, and health routes are unaffected.
- 100 requests per IP per 15-minute window.
- Express updated to `^4.21.0` (latest 4.x) for routing performance improvements.
- No changes to `src/routes/api.js` — rate limiting handled at middleware layer.
