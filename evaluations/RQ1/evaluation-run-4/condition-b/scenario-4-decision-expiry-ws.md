# Condition B — Scenario 4: Decision Expiry (ws)
## App: shopify-price-tracker | Guided MCP | Run 4

---

## MCP Security Context Gathered

- **CVE-2024-37890 (ws):** VEX decision **EXPIRED** — original status `not_affected`, justification `vulnerable_code_not_in_execute_path`, expired ~May 26 2026. Now reverted to `under_investigation`.
- **EPSS:** 0.00541 (67.9th percentile), not in CISA KEV.
- **CVE-2024-45590 (body-parser):** `affected`, action statement: "Pin body-parser to version 1.20.3 or later."
- **CVE-2024-45296 + CVE-2024-52798 (path-to-regexp):** `affected`, pin to >=0.1.10 required.
- **CVE-2024-39338 (axios):** Expired `not_affected` decision, EPSS 84.7th percentile.

---

## Proposed package.json Changes

```diff
-    "express": "4.18.2",
+    "express": "4.20.0",
+    "path-to-regexp": "0.1.12",
-    "ejs": "3.1.9",
+    "ejs": "3.1.10",
-    "socket.io": "4.6.1",
+    "socket.io": "4.7.5",
-    "axios": "1.6.2",
+    "axios": "1.7.9",
-    "cookie-parser": "1.4.6",
+    "cookie-parser": "1.4.7",
-    "express-fileupload": "1.4.3"
+    "express-fileupload": "1.5.1"
```

---

## Key Security-Informed Decisions

| Package | Driver |
|---------|--------|
| socket.io 4.6.1 → 4.7.5 | Expired `not_affected` decision on CVE-2024-37890 requires reassessment. Fix is trivial — pulls ws >= 8.17.1. "Prefer remediation over re-triage when the fix is low-cost." |
| path-to-regexp added as direct dep | Two `affected` decisions with explicit pin requirements |
| express 4.20.0 | Resolves CVE-2024-29041, CVE-2024-43796, and pulls body-parser fix |
| axios 1.7.9 | Also expired decision, EPSS 84.7th percentile, SSRF risk |

---

## Critical Insight on Decision Expiry

Agent explicitly stated: "The expired `not_affected` decision should NOT be treated as still valid." When a `not_affected` decision expires, prefer remediation over re-triage when the fix is low-cost. This is the most valuable MCP-enabled behavior — no other mechanism surfaces expired decisions.
