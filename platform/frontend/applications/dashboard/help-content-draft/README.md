# Help content (draft)

Planning copy for per-page help panels in the dashboard user study. **Wired in the UI** via `PageHelpPanel` and `src/help/pageHelpMarkdown.ts`.

Keep copy **high level** (outcomes for participants, not backend mechanics). Shared snippets hold cross-cutting concepts; page files stay short.

## Layout

- `shared/` — short reusable concepts (image chain, intel, sources, agent latency).
- `pages/` — one markdown file per screen. Filename = kebab-case of the React page (without `Page.tsx`).

## Page index

| Help file | React page | Route (pattern) |
|-----------|------------|-----------------|
| `home.md` | HomePage | `/` |
| `projects.md` | ProjectsPage | `/projects` |
| `project-details.md` | ProjectDetailsPage | `/projects/:id` |
| `create-project.md` | CreateProjectPage | `/projects/new` |
| `update-project.md` | UpdateProjectPage | `/projects/:id/update` |
| `components-details.md` | ComponentsDetailsPage | `/projects/:projectId/components/:componentId` |
| `create-component.md` | CreateComponentPage | `/projects/:projectId/components/new` |
| `update-component.md` | UpdateComponentPage | `/projects/:projectId/components/:componentId/update` |
| `create-container-image.md` | CreateContainerImagePage | `…/images/new` |
| `upload-container-image.md` | UploadContainerImagePage | `…/images/:imageId/upload` |
| `container-images-list.md` | ContainerImagesListPage | `…/images` |
| `container-image-details.md` | ContainerImageDetailsPage | `…/images/:imageId` |
| `cves.md` | CVEsPage | `/cves` |
| `create-cve.md` | CreateCvePage | `/cves/new` |
| `cve-detail.md` | CveDetailPage | `/cves/:cveId` |
| `cve-research-documents-list.md` | CveResearchDocumentsListPage | `/cves/:cveId/research-documents` |
| `cve-research-document-detail.md` | CveResearchDocumentDetailPage | `…/research-documents/:documentId` |
| `create-cve-research-document.md` | CreateCveResearchDocumentPage | `…/research-documents/new` |
| `update-cve-research-document.md` | UpdateCveResearchDocumentPage | `…/research-documents/:documentId/edit` |
| `delete-cve-research-document.md` | DeleteCveResearchDocumentPage | `…/research-documents/:documentId/delete` |
| `cve-research-summary-update.md` | CveResearchSummaryUpdatePage | `/cves/:cveId/research-summary` |
| `component-image-cve-detail.md` | ComponentImageCveDetailPage | `…/image-cves/:imageCveId` |
| `component-image-cves-add.md` | ComponentImageCvesAddPage | `…/image-cves/add` |
| `component-image-cves-disabled.md` | ComponentImageCvesDisabledPage | `…/image-cves/disabled` |
| `component-image-cve-disable.md` | ComponentImageCveDisablePage | `…/image-cves/:imageCveId/disable` |
| `component-image-cve-enable.md` | ComponentImageCveEnablePage | `…/image-cves/:imageCveId/enable` |
| `component-image-cve-decision.md` | Decision edit / reuse / reject pages | `…/decision/*` |
| `component-image-cve-advice.md` | ComponentImageCveAdvicePage | `…/image-cves/:imageCveId/advice` |
| `agent-chat.md` | AgentChatPage | `/agents/:agentId` |

## Study priority

Prioritize help copy on: `home`, `components-details`, `upload-container-image`, `cve-detail`, `agent-chat`.
