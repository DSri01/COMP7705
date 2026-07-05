# Condition B — Scenario 2: Suppressed Package (cross-spawn)
## App: shopify-price-tracker | Guided MCP | Run 4

---

## MCP Security Context Gathered

- **CVE-2024-21538 (cross-spawn):** `not_affected`, justification `vulnerable_code_not_in_execute_path`, EPSS 0.00069
- Agent noted: current Dockerfile does NOT architecturally guarantee cross-spawn exclusion
- Switching to Alpine eliminates hundreds of Debian OS-level CVEs

---

## Proposed Changes

Same multi-stage Dockerfile as Condition A, but with explicit security justifications tied to MCP findings:

- Multi-stage build provides **architectural assurance** for cross-spawn exclusion (not just `--omit=dev`)
- Alpine runtime eliminates Debian OS-level CVE surface
- `npm install && npm prune --omit=dev` ensures native modules compile, then strips dev packages
- Selective COPY (src, db, package*.json only)

---

## Key Difference from Condition A

Condition B explicitly referenced CVE-2024-21538's `not_affected` decision and used it to justify the multi-stage approach as providing defense-in-depth beyond the platform's triage rationale.
