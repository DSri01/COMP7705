# Evaluation Run 4

This directory contains agent outputs and scored data for the RQ1 A/B run with seven scenarios. Condition A received the source repository and task only. Condition B received the same task with guided read access to the platform through MCP.

Per-scenario and checklist scores are recorded under `data/`. RQ1 method and scoring are described in [`evaluations/RQ1/README.md`](../README.md). Test applications are described in [`evaluations/vulnerable_codebases/README.md`](../../vulnerable_codebases/README.md).

In repository paths and `data/run4-results.json`, this run is labelled **Run 4**. In the evaluation write-up, the same guided seven-scenario condition may be referred to as Run 3. The artefacts in this directory are the source for that comparison.

## Conditions

| Condition | Directory | MCP |
| --- | --- | --- |
| A (baseline) | `condition-a/` | No |
| B (intervention) | `condition-b/` | Guided MCP (project and component IDs in `data/platform-ids.csv`) |

Each scenario file records the agent’s proposed changes for one task. Condition B files may also record MCP security context gathered during the run. An additional summary file is present for Condition B Scenario 2: `condition-b/scenario-2-suppressed-package-cross-spawn-summary.md`.

## Scenario files

| Scenario | App | Condition A | Condition B |
| --- | --- | --- | --- |
| S1 — Version pin (path-to-regexp) | shopify-price-tracker | [`condition-a/scenario-1-version-pin-path-to-regexp.md`](condition-a/scenario-1-version-pin-path-to-regexp.md) | [`condition-b/scenario-1-version-pin-path-to-regexp.md`](condition-b/scenario-1-version-pin-path-to-regexp.md) |
| S2 — Suppressed package (cross-spawn) | shopify-price-tracker | [`condition-a/scenario-2-suppressed-package-cross-spawn.md`](condition-a/scenario-2-suppressed-package-cross-spawn.md) | [`condition-b/scenario-2-suppressed-package-cross-spawn.md`](condition-b/scenario-2-suppressed-package-cross-spawn.md) ([summary](condition-b/scenario-2-suppressed-package-cross-spawn-summary.md)) |
| S3 — Compensating control (certifi) | infra-monitor | [`condition-a/scenario-3-compensating-control-certifi.md`](condition-a/scenario-3-compensating-control-certifi.md) | [`condition-b/scenario-3-compensating-control-certifi.md`](condition-b/scenario-3-compensating-control-certifi.md) |
| S4 — Decision expiry (ws) | shopify-price-tracker | [`condition-a/scenario-4-decision-expiry-ws.md`](condition-a/scenario-4-decision-expiry-ws.md) | [`condition-b/scenario-4-decision-expiry-ws.md`](condition-b/scenario-4-decision-expiry-ws.md) |
| S5 — Version pin (body-parser) | shopify-price-tracker | [`condition-a/scenario-5-version-pin-body-parser.md`](condition-a/scenario-5-version-pin-body-parser.md) | [`condition-b/scenario-5-version-pin-body-parser.md`](condition-b/scenario-5-version-pin-body-parser.md) |
| S6 — Decision expiry (axios) | shopify-price-tracker | [`condition-a/scenario-6-decision-expiry-axios.md`](condition-a/scenario-6-decision-expiry-axios.md) | [`condition-b/scenario-6-decision-expiry-axios.md`](condition-b/scenario-6-decision-expiry-axios.md) |
| S7 — Compensating control (gunicorn) | infra-monitor | [`condition-a/scenario-7-compensating-control-gunicorn.md`](condition-a/scenario-7-compensating-control-gunicorn.md) | [`condition-b/scenario-7-compensating-control-gunicorn.md`](condition-b/scenario-7-compensating-control-gunicorn.md) |

## Data files

| File | Role |
| --- | --- |
| `data/run4-results.json` | Structured results for this run (metadata, scores, and related fields) |
| `data/scoring-summary.csv` | Per-scenario S_A, S_B, and delta |
| `data/detailed-checklist.csv` | Binary checklist items and notes for Conditions A and B |
| `data/secondary-metrics-adherence.csv` | Decision-adherence rates for Condition B |
| `data/cross-run.csv` | Overall scores across earlier runs and this run |
| `data/theoretical-vs-actual.csv` | Predicted versus observed per-scenario scores |
| `data/platform-ids.csv` | Platform project and component IDs for guided MCP |
| `data/comp7705db-dump-20260607135316.sql` | PostgreSQL dump of platform state used for this run |

## Notes

Platform background workers were disabled during evaluation so triage state would not drift. The Condition B output for Scenario 5 was reconstructed from summary notes after a context-compaction event. That limitation is recorded in the evaluation write-up.

## Related documentation

| Topic | Document |
| --- | --- |
| RQ1 overview | [`evaluations/RQ1/README.md`](../README.md) |
| Test applications | [`evaluations/vulnerable_codebases/README.md`](../../vulnerable_codebases/README.md) |
