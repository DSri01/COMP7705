import agentChatMarkdown from "../../help-content-draft/pages/agent-chat.md?raw";
import componentImageCveAdviceMarkdown from "../../help-content-draft/pages/component-image-cve-advice.md?raw";
import componentImageCveDecisionMarkdown from "../../help-content-draft/pages/component-image-cve-decision.md?raw";
import componentImageCveDetailMarkdown from "../../help-content-draft/pages/component-image-cve-detail.md?raw";
import componentImageCveDisableMarkdown from "../../help-content-draft/pages/component-image-cve-disable.md?raw";
import componentImageCveEnableMarkdown from "../../help-content-draft/pages/component-image-cve-enable.md?raw";
import componentImageCvesAddMarkdown from "../../help-content-draft/pages/component-image-cves-add.md?raw";
import componentImageCvesDisabledMarkdown from "../../help-content-draft/pages/component-image-cves-disabled.md?raw";
import componentsDetailsMarkdown from "../../help-content-draft/pages/components-details.md?raw";
import containerImageDetailsMarkdown from "../../help-content-draft/pages/container-image-details.md?raw";
import containerImagesListMarkdown from "../../help-content-draft/pages/container-images-list.md?raw";
import createComponentMarkdown from "../../help-content-draft/pages/create-component.md?raw";
import createContainerImageMarkdown from "../../help-content-draft/pages/create-container-image.md?raw";
import createCveMarkdown from "../../help-content-draft/pages/create-cve.md?raw";
import createCveResearchDocumentMarkdown from "../../help-content-draft/pages/create-cve-research-document.md?raw";
import createProjectMarkdown from "../../help-content-draft/pages/create-project.md?raw";
import cveDetailMarkdown from "../../help-content-draft/pages/cve-detail.md?raw";
import cveResearchDocumentDetailMarkdown from "../../help-content-draft/pages/cve-research-document-detail.md?raw";
import cveResearchDocumentsListMarkdown from "../../help-content-draft/pages/cve-research-documents-list.md?raw";
import cveResearchSummaryUpdateMarkdown from "../../help-content-draft/pages/cve-research-summary-update.md?raw";
import cvesMarkdown from "../../help-content-draft/pages/cves.md?raw";
import deleteCveResearchDocumentMarkdown from "../../help-content-draft/pages/delete-cve-research-document.md?raw";
import homeMarkdown from "../../help-content-draft/pages/home.md?raw";
import projectDetailsMarkdown from "../../help-content-draft/pages/project-details.md?raw";
import projectsMarkdown from "../../help-content-draft/pages/projects.md?raw";
import updateComponentMarkdown from "../../help-content-draft/pages/update-component.md?raw";
import updateCveResearchDocumentMarkdown from "../../help-content-draft/pages/update-cve-research-document.md?raw";
import updateProjectMarkdown from "../../help-content-draft/pages/update-project.md?raw";
import uploadContainerImageMarkdown from "../../help-content-draft/pages/upload-container-image.md?raw";

export const pageHelpMarkdown = {
  home: homeMarkdown,
  projects: projectsMarkdown,
  projectDetails: projectDetailsMarkdown,
  createProject: createProjectMarkdown,
  updateProject: updateProjectMarkdown,
  componentsDetails: componentsDetailsMarkdown,
  createComponent: createComponentMarkdown,
  updateComponent: updateComponentMarkdown,
  createContainerImage: createContainerImageMarkdown,
  uploadContainerImage: uploadContainerImageMarkdown,
  containerImagesList: containerImagesListMarkdown,
  containerImageDetails: containerImageDetailsMarkdown,
  cves: cvesMarkdown,
  createCve: createCveMarkdown,
  cveDetail: cveDetailMarkdown,
  cveResearchDocumentsList: cveResearchDocumentsListMarkdown,
  cveResearchDocumentDetail: cveResearchDocumentDetailMarkdown,
  createCveResearchDocument: createCveResearchDocumentMarkdown,
  updateCveResearchDocument: updateCveResearchDocumentMarkdown,
  deleteCveResearchDocument: deleteCveResearchDocumentMarkdown,
  cveResearchSummaryUpdate: cveResearchSummaryUpdateMarkdown,
  componentImageCveDetail: componentImageCveDetailMarkdown,
  componentImageCvesAdd: componentImageCvesAddMarkdown,
  componentImageCvesDisabled: componentImageCvesDisabledMarkdown,
  componentImageCveDisable: componentImageCveDisableMarkdown,
  componentImageCveEnable: componentImageCveEnableMarkdown,
  componentImageCveDecision: componentImageCveDecisionMarkdown,
  componentImageCveAdvice: componentImageCveAdviceMarkdown,
  agentChat: agentChatMarkdown,
} as const;
