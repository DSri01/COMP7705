# Component hub

Main view for one component’s **current image** and **image-CVEs**.

## Image chain

- Each component has a **sequence of container images**; the **newest is current** (what you see here).
- **New image** copies CVEs from the previous image so you can triage **before** upload.
- Prior decisions are **carried forward for review** on the new image; confirm or update them on each CVE row.
- Upload a **`.tar` once** per image slot (from **Image details** or the upload page after **New image**), then **scan** from this page.
- Scan **adds** findings from the image; carried-forward CVEs stay until you triage them.

## Image-CVE sources

| Source | Meaning |
|--------|---------|
| **From scan** | Found in the container scan. |
| **From chain** | Carried from the previous image; review the decision. |
| **Manual** | Added by an operator. |

**Severity** comes from the global CVE record, not the scan alone.

## Decision state (State column)

| State | Meaning |
|--------|---------|
| **Under investigation (Fresh)** | No prior decision context on this image. |
| **Under investigation (Carry forward)** | Copied from the previous image — confirm or reject on the image-CVE detail page. |
| **Under investigation (Expired)** | A prior decision expired; triage again. |
| **Not affected** / **Affected** | Resolved VEX stance for this image. |

## On this page

- **Stats charts** — doughnuts summarizing active CVEs by decision (under investigation / not affected / affected) and severity.
- **Container images** — **All images** opens history; current image shows **file** and **scan** badges:
  - File: awaiting upload → uploading → **ready** (or failed).
  - Scan: scanning, scan OK, or container not uploaded.
- **New image** — next slot in the chain (CVEs copy forward).
- **Scan current image** — needs file status **ready**.
- **Add or import CVEs** — link one CVE id or import a JSON list.
- **Export VEX** — OpenVEX for the **current** image (disabled CVEs omitted).
- **Update Component** — edit description; expand/minimize component **description** in the profile section.
- **Active CVEs** table — columns **CVE**, **severity**, **source**, **state**, **expiry** (when a resolved decision expires); **CVE** links open global CVE detail (new tab); **View** opens **image-CVE detail** (decision, advice, disable).
- **Disabled CVEs** — suppressed rows still on this image; open **View** to re-enable or review.
