import { Link, Navigate, Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage'
import ProjectsPage from './pages/ProjectsPage'
import CVEsPage from './pages/CVEsPage'
import CreateCvePage from './pages/CreateCvePage'
import CveDetailPage from './pages/CveDetailPage'
import CveResearchDocumentsListPage from './pages/CveResearchDocumentsListPage'
import CreateCveResearchDocumentPage from './pages/CreateCveResearchDocumentPage'
import CveResearchDocumentDetailPage from './pages/CveResearchDocumentDetailPage'
import UpdateCveResearchDocumentPage from './pages/UpdateCveResearchDocumentPage'
import DeleteCveResearchDocumentPage from './pages/DeleteCveResearchDocumentPage'
import CveResearchSummaryUpdatePage from './pages/CveResearchSummaryUpdatePage'
import ProjectDetailsPage from './pages/ProjectDetailsPage'
import CreateProjectPage from './pages/CreateProjectPage'
import UpdateProjectPage from './pages/UpdateProjectPage'
import ComponentsDetailsPage from './pages/ComponentsDetailsPage'
import CreateComponentPage from './pages/CreateComponentPage'
import UpdateComponentPage from './pages/UpdateComponentPage'
import ContainerImagesListPage from './pages/ContainerImagesListPage'
import ContainerImageDetailsPage from './pages/ContainerImageDetailsPage'
import CreateContainerImagePage from './pages/CreateContainerImagePage'
import UploadContainerImagePage from './pages/UploadContainerImagePage'
import ComponentImageCvesAddPage from './pages/ComponentImageCvesAddPage'
import ComponentImageCvesDisabledPage from './pages/ComponentImageCvesDisabledPage'
import ComponentImageCveDetailPage from './pages/ComponentImageCveDetailPage'
import ComponentImageCveDisablePage from './pages/ComponentImageCveDisablePage'
import ComponentImageCveEnablePage from './pages/ComponentImageCveEnablePage'
import ComponentImageCveDecisionEditPage from './pages/ComponentImageCveDecisionEditPage'
import ComponentImageCveDecisionReusePage from './pages/ComponentImageCveDecisionReusePage'
import ComponentImageCveDecisionRejectPage from './pages/ComponentImageCveDecisionRejectPage'
import ComponentImageCveAdvicePage from './pages/ComponentImageCveAdvicePage'
import AgentChatPage from './pages/AgentChatPage'

function App() {
  return (
    <div className="mx-auto min-h-screen w-full max-w-6xl px-4 py-6 md:px-8">
      <header className="panel mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--accent-cyan)]">Platform Security</p>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)] md:text-3xl">Container CVE Management System</h1>
        </div>
        <nav className="flex flex-wrap items-center gap-3 text-sm">
          <Link className="neon-link rounded-md border border-[var(--border)] px-3 py-1.5" to="/">Home</Link>
          <Link className="neon-link rounded-md border border-[var(--border)] px-3 py-1.5" to="/projects">Projects</Link>
          <Link className="neon-link rounded-md border border-[var(--border)] px-3 py-1.5" to="/cves">CVEs</Link>
          <Link className="neon-link rounded-md border border-[var(--border)] px-3 py-1.5" to="/agents/platform-assistant">
            Platform Agent
          </Link>
        </nav>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/agents" element={<Navigate to="/agents/platform-assistant" replace />} />
          <Route path="/agents/:agentId" element={<AgentChatPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:id" element={<ProjectDetailsPage />} />
          <Route path="/projects/new" element={<CreateProjectPage />} />
          <Route path="/projects/:id/update" element={<UpdateProjectPage />} />
          <Route path="/cves/new" element={<CreateCvePage />} />
          <Route
            path="/cves/:cveId/research-documents/new"
            element={<CreateCveResearchDocumentPage />}
          />
          <Route
            path="/cves/:cveId/research-documents/:documentId/edit"
            element={<UpdateCveResearchDocumentPage />}
          />
          <Route
            path="/cves/:cveId/research-documents/:documentId/delete"
            element={<DeleteCveResearchDocumentPage />}
          />
          <Route
            path="/cves/:cveId/research-documents/:documentId"
            element={<CveResearchDocumentDetailPage />}
          />
          <Route
            path="/cves/:cveId/research-documents"
            element={<CveResearchDocumentsListPage />}
          />
          <Route path="/cves/:cveId/research-summary" element={<CveResearchSummaryUpdatePage />} />
          <Route path="/cves/:cveId" element={<CveDetailPage />} />
          <Route path="/cves" element={<CVEsPage />} />
          <Route path="/projects/:projectId/components/new" element={<CreateComponentPage />} />
          <Route path="/projects/:projectId/components/:componentId/images/new" element={<CreateContainerImagePage />} />
          <Route path="/projects/:projectId/components/:componentId/images/:imageId/upload" element={<UploadContainerImagePage />} />
          <Route path="/projects/:projectId/components/:componentId/images/:imageId" element={<ContainerImageDetailsPage />} />
          <Route path="/projects/:projectId/components/:componentId/images" element={<ContainerImagesListPage />} />
          <Route path="/projects/:projectId/components/:componentId/image-cves/add" element={<ComponentImageCvesAddPage />} />
          <Route path="/projects/:projectId/components/:componentId/image-cves/disabled" element={<ComponentImageCvesDisabledPage />} />
          <Route path="/projects/:projectId/components/:componentId/image-cves/:imageCveId" element={<ComponentImageCveDetailPage />} />
          <Route path="/projects/:projectId/components/:componentId/image-cves/:imageCveId/disable" element={<ComponentImageCveDisablePage />} />
          <Route path="/projects/:projectId/components/:componentId/image-cves/:imageCveId/enable" element={<ComponentImageCveEnablePage />} />
          <Route path="/projects/:projectId/components/:componentId/image-cves/:imageCveId/decision/edit" element={<ComponentImageCveDecisionEditPage />} />
          <Route path="/projects/:projectId/components/:componentId/image-cves/:imageCveId/decision/reuse" element={<ComponentImageCveDecisionReusePage />} />
          <Route path="/projects/:projectId/components/:componentId/image-cves/:imageCveId/decision/reject" element={<ComponentImageCveDecisionRejectPage />} />
          <Route path="/projects/:projectId/components/:componentId/image-cves/:imageCveId/advice" element={<ComponentImageCveAdvicePage />} />
          <Route path="/projects/:projectId/components/:componentId" element={<ComponentsDetailsPage />} />
          <Route path="/projects/:projectId/components/:componentId/update" element={<UpdateComponentPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App
