# Vulnerable Codebases

This directory contains intentionally vulnerable test applications used in project evaluations. Source trees for each application are stored here. Matching container image archives (`.tar`) are distributed separately for upload into the platform. **Do not deploy or expose these applications to a network.**

## Applications and evaluation use

| Source directory | Container archive | RQ1 scenarios | Usability study |
| --- | --- | --- | --- |
| `shopify-price-tracker/` | `shopify-price-tracker.tar` | S1, S2, S4, S5, S6 | - |
| `infra-monitor/` | `infra-monitor-eval.tar` | S3, S7 | - |
| `vuln-target-small/` | `health-monitor-eval.tar` | - | Yes |

### RQ1 A/B experiment

The RQ1 evaluation used `shopify-price-tracker` and `infra-monitor` across seven scenarios (S1–S7). Agents in both conditions received the source repository for the target application. Triage state was prepared in the platform against the container image archives. Scenario designs, scoring, and Run 4 outputs are described in [`evaluations/RQ1/`](../RQ1/README.md) and [`evaluations/RQ1/evaluation-run-4/`](../RQ1/evaluation-run-4/README.md).

### Dashboard triage usability study

The usability study used `vuln-target-small/` and `health-monitor-eval.tar`. Participants had access to both the source and the container image archive.

## Container image archives

Pre-built `.tar` archives are available in a shared OneDrive folder:

[https://connecthkuhk-my.sharepoint.com/:f:/g/personal/pplamk3_connect_hku_hk/IgCWcBcCcqZVSKlBQCarIUx2AX4B-2CHEWH_TIsImq2Ad7g?e=KUPUej](https://connecthkuhk-my.sharepoint.com/:f:/g/personal/pplamk3_connect_hku_hk/IgCWcBcCcqZVSKlBQCarIUx2AX4B-2CHEWH_TIsImq2Ad7g?e=KUPUej)

Each archive corresponds to a source directory in the table above.

## Related documentation

| Topic | Document |
| --- | --- |
| RQ1 evaluation materials | [`evaluations/RQ1/README.md`](../RQ1/README.md) |
| Run 4 results and agent outputs | [`evaluations/RQ1/evaluation-run-4/`](../RQ1/evaluation-run-4/README.md) |
| Shopify Price Tracker (local development) | [`shopify-price-tracker/README.md`](shopify-price-tracker/README.md) |
| Infra Monitor (local development) | [`infra-monitor/README.md`](infra-monitor/README.md) |