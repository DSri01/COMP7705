# `tool-registry`

LangChain tools for platform agent graphs. Each tool lives in its own file with **JSDoc** on exported
symbols (developer docs) and a `description` on the tool definition (model-facing). Import directly
from tool paths; there is no barrel re-export.

| Subdirectory | Role |
|--------------|------|
| `general/` | Stateless helpers (`convert-unix-time`, …) |
| `subagents/` | Wrappers around compiled task agent graphs |
| `db/read/` | Adapters over [platform-read-tools](../../platform-read-tools/README.md) |
| `db/write/` | Adapters over `platform-write-tools/` |
| `db/context.ts` | `db/context.PlatformDbToolContext` for read/write factories |
| `web/` | `web_search`, `web_fetch_url_markdown` |
| `ssvc/` | CISA SSVC lookup tools |

Which graph attaches which tools is defined in each agent's `definition.ts`.
