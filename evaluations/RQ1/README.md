# RQ1 Evaluation

This directory contains materials for the RQ1 A/B evaluation. The question is whether giving an AI coding agent read access to platform triage context through MCP leads to more security-aligned code changes than the same task with source and prompt only.

Agent outputs and scored data for the guided seven-scenario run are under [`evaluation-run-4/`](evaluation-run-4/README.md). Test applications are under [`evaluations/vulnerable_codebases/`](../vulnerable_codebases/README.md).

## Conditions

| Condition | Agent input |
| --- | --- |
| A (baseline) | Source repository and natural-language task only |
| B (intervention) | Same task, plus guided read-only MCP access to triage state |

Agents ran with fresh context and no memory of the other condition. Platform background workers were disabled during evaluation so triage state would not drift.

## Scoring

Each scenario output is scored against a binary checklist of security-relevant properties. Checklist items are scored 0 or 1. The per-scenario score is the mean of its items. The overall score is the mean of the seven scenario scores. The rubric measures alignment with recorded triage decisions, not general code quality or CVE discovery.

Scored values for the primary run are recorded in [`evaluation-run-4/data/`](evaluation-run-4/README.md).

## Scenarios

| Scenario | Mechanism | App |
| --- | --- | --- |
| S1 | Version pin (path-to-regexp) | shopify-price-tracker |
| S2 | Suppressed package (cross-spawn) | shopify-price-tracker |
| S3 | Compensating control (certifi) | infra-monitor |
| S4 | Decision expiry (ws) | shopify-price-tracker |
| S5 | Version pin (body-parser) | shopify-price-tracker |
| S6 | Decision expiry (axios) | shopify-price-tracker |
| S7 | Compensating control (gunicorn) | infra-monitor |

## Directory layout

| Path | Role |
| --- | --- |
| `evaluation-run-4/` | Outputs and data for the guided seven-scenario A/B run |

In repository paths this run is labelled Run 4. The evaluation write-up may refer to the same guided seven-scenario condition as Run 3.

## Related documentation

| Topic | Document |
| --- | --- |
| Run 4 artefacts | [`evaluation-run-4/README.md`](evaluation-run-4/README.md) |
| Test applications | [`../vulnerable_codebases/README.md`](../vulnerable_codebases/README.md) |
