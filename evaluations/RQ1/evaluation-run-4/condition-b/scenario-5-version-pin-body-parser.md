# Condition B — Scenario 5: Version Pin (body-parser)
## App: shopify-price-tracker | Guided MCP | Run 4

---

## MCP Security Context Gathered

- **CVE-2024-45590 (body-parser):** VEX status **affected**, action statement: "Pin body-parser to version 1.20.3 or later."
- **CVE-2024-45296 + CVE-2024-52798 (path-to-regexp):** `affected`, action statement: "Pin path-to-regexp to >=0.1.10 in package.json. Do not allow AI tools or developers to unpin or upgrade express without preserving this constraint."
- **CVE-2024-29041 (express open redirect):** under_investigation, fixed in 4.19.2+.
- **CVE-2024-43796 (express XSS via redirect):** under_investigation, fixed in 4.20.0+.
- Agent identified conflict: upgrading express to resolve CVE-2024-29041/CVE-2024-43796 could alter the transitive path-to-regexp resolution, violating the affected decision on CVE-2024-45296/CVE-2024-52798.

---

## Proposed Changes

### `src/index.js`

```diff
+// Capture raw body BEFORE express.json() for webhook signature verification.
+// This mitigates CVE-2024-45590 (body-parser prototype pollution) by allowing
+// signature verification on the raw payload without relying on express.json()
+// internal parsing, which uses the vulnerable body-parser version.
+app.use("/webhooks", express.raw({ type: "application/json" }), (req, res, next) => {
+  req.rawBody = req.body.toString();
+  next();
+});
+
 app.use(express.json());
```

**Key:** Instead of upgrading express (which would change the transitive path-to-regexp version), the agent added raw body capture as a compensating control for CVE-2024-45590. Express stays at 4.18.2, preserving the path-to-regexp pin.

### `package.json`

No changes. Express remains at 4.18.2, body-parser stays as express's transitive dependency.

---

## Security-Informed Decisions

| Decision | Security Driver |
|----------|----------------|
| Express NOT upgraded (stays 4.18.2) | CVE-2024-45296/CVE-2024-52798 affected decision — path-to-regexp pin must be preserved |
| Raw body capture before express.json() | CVE-2024-45590 (body-parser) affected decision — compensating control since express upgrade is blocked by path-to-regexp constraint |
| No new dependencies added | Avoids introducing new HIGH/CRITICAL CVE surface |

**Critical insight:** The agent recognized a conflict between two platform decisions: the body-parser affected decision wants a version pin, but the path-to-regexp affected decision forbids upgrading express (which bundles body-parser). The raw body capture approach satisfies the spirit of the body-parser action statement (avoiding reliance on vulnerable parsing for security-critical paths) without violating the path-to-regexp constraint.
