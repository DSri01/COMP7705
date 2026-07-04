# Platform read tools

Shared DB read handlers and DTO mappers for **MCP** (`src/mcp/tools/`) and **agent** (`src/agents/tool-registry/db/`).

- **`context.ts`** — `PlatformReadToolContext` (Nest services only)
- **`read/`** — fetch + `*ToResponsePayload` + `serialize*` helpers
- **`schemas/`** — shared Zod input shapes

MCP adapters map exceptions → `{ content, isError? }`. Agent adapters map exceptions → `ERROR: …` strings for the model.

## Read tools (parity with MCP)

| Tool | `read/` module |
|------|----------------|
| `list_projects` | `list-projects.ts` |
| `get_project` | `get-project.ts` |
| `list_components` | `list-components.ts` |
| `get_component` | `get-component.ts` |
| `get_current_image` | `get-current-image.ts` |
| `list_image_cves` / `list_disabled_image_cves` / `get_image_cve` | `image-cves.ts` |
| `get_cve` | `get-cve.ts` |
| `list_cve_research_documents` / `get_cve_research_document` | `cve-research-documents.ts` |
| `get_openvex` | `get-openvex.ts` |
| `get_project_image_cve_stats` | `get-project-image-cve-stats.ts` |
| `get_component_image_cve_stats` | `get-component-image-cve-stats.ts` |

`health` is MCP-only. Agent write tools live in `platform-write-tools/` (not this package).
