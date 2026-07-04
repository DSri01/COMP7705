import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import BackToComponentBar from "../components/BackToComponentBar";
import FileStatusBadge from "../components/FileStatusBadge";
import ScanStatusBadge from "../components/ScanStatusBadge";
import { ComponentsService, ProjectsService, type ComponentResponseDto, type ProjectResponseDto } from "../api/generated";
import {
  getContainerImageById,
  getCurrentContainerImageOrNull,
  type ValidatedContainerImage,
} from "../api/containerImagesApi";
import { formatTime, parseUnixSeconds } from "../utils/time";
import PageHelpPanel from "../components/PageHelpPanel";
import { pageHelpMarkdown } from "../help/pageHelpMarkdown";

function formatOptionalUnixSeconds(unixSeconds: string | null): string {
  if (unixSeconds === null || unixSeconds === "0") {
    return "—";
  }
  return formatTime(parseUnixSeconds(unixSeconds));
}

export default function ContainerImageDetailsPage() {
  const { projectId, componentId, imageId } = useParams();
  const [image, setImage] = useState<ValidatedContainerImage | null>(null);
  const [currentImage, setCurrentImage] = useState<ValidatedContainerImage | null>(null);
  const [component, setComponent] = useState<ComponentResponseDto | null>(null);
  const [project, setProject] = useState<ProjectResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId || !componentId || !imageId) {
      setError("Missing route parameters.");
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      getContainerImageById(projectId, componentId, imageId),
      getCurrentContainerImageOrNull(projectId, componentId),
      ComponentsService.componentsControllerGetById(projectId, componentId),
      ProjectsService.projectsControllerGetById(projectId),
    ])
      .then(([imageResponse, currentImageResponse, componentResponse, projectResponse]) => {
        setImage(imageResponse);
        setCurrentImage(currentImageResponse);
        setComponent(componentResponse);
        setProject(projectResponse);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load image");
      })
      .finally(() => setLoading(false));
  }, [projectId, componentId, imageId]);

  const base = `/projects/${projectId}/components/${componentId}`;
  const imageBase = `${base}/images/${imageId}`;

  if (!projectId || !componentId || !imageId) {
    return <div className="panel text-[var(--status-critical)]">Invalid route.</div>;
  }

  if (loading) {
    return <div className="panel text-[var(--text-secondary)]">Loading image…</div>;
  }

  if (error || !image || !component || !project) {
    return <div className="panel text-[var(--status-critical)]">Error: {error ?? "Not found"}</div>;
  }

  return (
    <section className="flex flex-col gap-6">
      <PageHelpPanel markdown={pageHelpMarkdown.containerImageDetails} />
      <BackToComponentBar projectId={projectId} componentId={componentId}>
        {image.fileStatus === "awaiting_upload" && (
          <Link className="neon-button inline-flex text-sm" to={`${imageBase}/upload`}>
            Upload .tar
          </Link>
        )}
      </BackToComponentBar>

      <div className="panel space-y-3">
        <p className="text-xs uppercase tracking-[0.25em] text-[var(--accent-magenta)]">Container image</p>
        <dl className="grid gap-2 text-sm md:grid-cols-2">
          <div>
            <dt className="font-semibold text-[var(--accent-cyan)]">Project</dt>
            <dd className="text-[var(--text-primary)]">{project.name}</dd>
          </div>
          <div>
            <dt className="font-semibold text-[var(--accent-cyan)]">Component</dt>
            <dd className="text-[var(--text-primary)]">{component.name}</dd>
          </div>
        </dl>
        <div className="flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-3">
          <h2 className="text-2xl font-semibold">Chain #{image.chainIndex}</h2>
          <FileStatusBadge status={image.fileStatus} />
          <ScanStatusBadge code={image.scanResultCode} />
        </div>
        <dl className="grid gap-3 text-sm md:grid-cols-2">
          <div>
            <dt className="font-semibold text-[var(--accent-cyan)]">Image ID</dt>
            <dd className="font-mono text-[var(--text-primary)]">{image.id}</dd>
          </div>
          <div>
            <dt className="font-semibold text-[var(--accent-cyan)]">Stored file ID</dt>
            <dd className="font-mono text-[var(--text-primary)]">{image.storedFileId}</dd>
          </div>
          <div>
            <dt className="font-semibold text-[var(--accent-cyan)]">Extension</dt>
            <dd className="font-mono text-[var(--text-primary)]">{image.fileExtension ?? "—"}</dd>
          </div>
          <div>
            <dt className="font-semibold text-[var(--accent-cyan)]">Size (bytes)</dt>
            <dd className="font-mono text-[var(--text-primary)]">{image.fileSizeBytes ?? "—"}</dd>
          </div>
          <div>
            <dt className="font-semibold text-[var(--accent-cyan)]">Upload started</dt>
            <dd className="font-mono text-[var(--text-primary)]">
              {formatOptionalUnixSeconds(image.fileUploadStartedAtUnixSeconds)}
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-[var(--accent-cyan)]">Created</dt>
            <dd className="font-mono text-[var(--text-primary)]">
              {formatTime(parseUnixSeconds(image.createdAtUnixSeconds))}
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-[var(--accent-cyan)]">Upload finished</dt>
            <dd className="font-mono text-[var(--text-primary)]">
              {formatOptionalUnixSeconds(image.uploadFinishedAtUnixSeconds)}
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-[var(--accent-cyan)]">Scan attempted</dt>
            <dd className="font-mono text-[var(--text-primary)]">
              {formatOptionalUnixSeconds(image.scanAttemptedAtUnixSeconds)}
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-[var(--accent-cyan)]">Scan finished</dt>
            <dd className="font-mono text-[var(--text-primary)]">
              {formatOptionalUnixSeconds(image.scanFinishedAtUnixSeconds)}
            </dd>
          </div>
        </dl>
        <div className="border-t border-[var(--border)] pt-3">
          {currentImage && currentImage.id === image.id ? (
            <Link
              className="neon-link text-sm"
              to={`/projects/${projectId}/components/${componentId}`}
            >
              Manage current image CVEs on component page →
            </Link>
          ) : (
            <p className="text-sm text-[var(--text-secondary)]">
              This is a historical image. Image-CVE management is available only for the current image on the component page.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
