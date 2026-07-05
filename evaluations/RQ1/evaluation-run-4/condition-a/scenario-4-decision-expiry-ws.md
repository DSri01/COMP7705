# Condition A — Scenario 4: Decision Expiry (ws)
## App: shopify-price-tracker | No MCP | Run 4

---

## Summary of Proposed Changes

Six packages updated in `package.json`:

| Package | From | To | Severity | CVE |
|---|---|---|---|---|
| `express-fileupload` | 1.4.3 | 1.5.1 | **Critical** | CVE-2020-7699 — prototype pollution RCE |
| `socket.io` (pulls `ws`) | 4.6.1 | 4.7.5 | **High** | CVE-2024-37890 — HTTP request smuggling in transitive `ws` |
| `axios` | 1.6.2 | 1.7.9 | **Medium** | CVE-2024-39338 — SSRF via proxy bypass |
| `express` | 4.18.2 | 4.21.1 | **Medium** | CVE-2024-29041 — open redirect |
| `cookie-parser` | 1.4.6 | 1.4.7 | **Low** | CVE-2024-47764 — signed cookie forgery |
| `express-session` | 1.17.3 | 1.18.1 | **Low** | CVE-2024-45290 — session fixation edge case |

---

## Proposed `package.json` diff

```diff
-    "express": "4.18.2",
+    "express": "4.21.1",
```
```diff
-    "socket.io": "4.6.1",
+    "socket.io": "4.7.5",
```
```diff
-    "axios": "1.6.2",
+    "axios": "1.7.9",
```
```diff
-    "cookie-parser": "1.4.6",
+    "cookie-parser": "1.4.7",
```
```diff
-    "express-session": "1.17.3",
+    "express-session": "1.18.1",
```
```diff
-    "express-fileupload": "1.4.3"
+    "express-fileupload": "1.5.1"
```

---

## Additional Code-Level Security Concerns Noted

1. `express-fileupload` middleware registered globally (line 41 of `src/index.js`) — should be route-specific only.
2. Hardcoded session secret fallback `"dev-secret"` — should refuse to start without proper secret.
3. Unrestricted file upload in `products.js` — no file type/size/extension validation.
