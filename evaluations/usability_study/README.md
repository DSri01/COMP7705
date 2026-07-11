# Usability Study

This directory contains materials for the dashboard triage usability study. The study
measured whether security and DevOps practitioners can operate the platform’s CVE triage
workflow with acceptable ease and confidence. It evaluates the dashboard only. It does not
exercise the MCP server or AI coding tools.

Participant responses are recorded in [`response-data.md`](response-data.md). The
application used in the study is described in
[`evaluations/vulnerable_codebases/`](../vulnerable_codebases/README.md).

## Procedure

Each session used a fixed sequence of four triage tasks on the dashboard, followed by a
self-administered questionnaire. The facilitator recorded task outcomes and times. All
participants used the same dashboard build.

## Instruments

The questionnaire covers a facilitator task log, the ten-item SUS, six platform-specific
Likert items (P1–P6), and three open-ended questions. Responses are in
[`response-data.md`](response-data.md).

## Fixture

The study used `vuln-target-small/` and `health-monitor-eval.tar`. Participants had access
to both the source and the container image archive. Details are given in
[`evaluations/vulnerable_codebases/README.md`](../vulnerable_codebases/README.md).

## Directory layout

| Path | Role |
| --- | --- |
| `response-data.md` | Demographics and participant responses (Sections 1–4) |

## Related documentation

| Topic | Document |
| --- | --- |
| Response data | [`response-data.md`](response-data.md) |
| Test application and archive | [`../vulnerable_codebases/README.md`](../vulnerable_codebases/README.md) |
| RQ1 evaluation (separate track) | [`../RQ1/README.md`](../RQ1/README.md) |