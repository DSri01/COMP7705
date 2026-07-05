# Condition B — Scenario 1: Version Pin (path-to-regexp)
## App: shopify-price-tracker | Guided MCP | Run 4

---

## MCP Security Context Gathered

- **CVE-2024-52798 (path-to-regexp):** VEX status **affected**, action statement: "Pin path-to-regexp to >=0.1.10 in package.json. Do not allow AI tools or developers to unpin or upgrade express without preserving this constraint."
- **CVE-2026-4867 (path-to-regexp):** under_investigation, requires >=0.1.13 for full fix.
- **CVE-2024-29041 (express open redirect):** under_investigation, fixed in 4.19.2+.
- **CVE-2024-43796 (express XSS via redirect):** under_investigation, fixed in 4.20.0+.
- **CVE-2024-43799 (send package XSS):** under_investigation.

---

## Proposed Changes

### package.json

```diff
-    "express": "4.18.2",
+    "express": "4.21.2",
```
```diff
     "express-fileupload": "1.4.3",
+    "express-rate-limit": "^7.5.0"
```
```json
+  "overrides": {
+    "path-to-regexp": "0.1.13"
+  }
```

**Key:** Express upgraded to 4.21.2 (resolves CVE-2024-29041, CVE-2024-43796), BUT with explicit `overrides.path-to-regexp: "0.1.13"` to satisfy the platform's affected decision and cover CVE-2026-4867.

### src/index.js

```diff
+const rateLimit = require("express-rate-limit");
```
```diff
+const apiLimiter = rateLimit({
+  windowMs: 15 * 60 * 1000,
+  max: 100,
+  standardHeaders: true,
+  legacyHeaders: false,
+  message: { error: "Too many requests from this IP, please try again after 15 minutes." }
+});
+
-app.use("/api", apiRoutes);
+app.use("/api", apiLimiter, apiRoutes);
```

---

## Security-Informed Decisions

| Decision | Security Driver |
|----------|----------------|
| Express pinned to `4.21.2` (exact, no caret) | Resolves CVE-2024-29041 and CVE-2024-43796 |
| `overrides.path-to-regexp: "0.1.13"` | Satisfies affected decision on CVE-2024-52798 AND covers CVE-2026-4867 |
| Rate limiting scoped to `/api/*` only | Protects data endpoints without impacting UI |

The critical insight: upgrading express without the `overrides` pin would ship path-to-regexp 0.1.12 (still vulnerable to CVE-2026-4867). The override forces 0.1.13, closing both vulnerabilities.
