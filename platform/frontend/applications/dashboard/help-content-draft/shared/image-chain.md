# Image chain

- Each component has a **sequence of container images**; the **newest is current**.
- **New image** copies CVEs from the previous image so you can triage **before** upload.
- Prior decisions are **carried forward for review** on the new image; confirm or update them there.
- Upload a **`.tar` once** per image, then **scan**.
- Scan **adds** findings from the image; carried-forward CVEs may remain until you triage them.
