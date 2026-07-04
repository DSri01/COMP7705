import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ComponentsService,
  ProjectsService,
  type ComponentResponseDto,
  type ImageCveStatsByVexStatusDto,
  type ProjectResponseDto,
} from "../api/generated";
import { getCurrentContainerImageOrNull, type ValidatedContainerImage } from "../api/containerImagesApi";
import { listImageCves, type ValidatedImageCveListItem } from "../api/imageCvesApi";
import FileStatusBadge from "../components/FileStatusBadge";
import ScanStatusBadge from "../components/ScanStatusBadge";
import SeverityBadge from "../components/SeverityBadge";
import ImageCveSourceBadge from "../components/ImageCveSourceBadge";
// import ImageCveDisableBadge from "../components/ImageCveDisableBadge";
import ImageCveStateBadge from "../components/ImageCveStateBadge";
import { formatTime, parseUnixSeconds, waitMs } from "../utils/time";
import { CopyIdButton } from "../components/CopyIdButton";
import { DescriptionMarkdownPanel } from "../components/markdown/DescriptionMarkdownPanel";
import { getApiErrorMessage } from "../utils/apiError";
import ImageCveStatsDoughnutGroup from "../components/ImageCveStatsDoughnutGroup";
import PageHelpPanel from "../components/PageHelpPanel";
import { pageHelpMarkdown } from "../help/pageHelpMarkdown";

/**
 * Delay before refetching the current image after a scan is triggered.
 */
const SCAN_STATUS_REFETCH_DELAY_MS = 2000;

export default function ComponentsDetailsPage() {
  const { projectId, componentId } = useParams();
  const [component, setComponent] = useState<ComponentResponseDto | null>(null);
  const [project, setProject] = useState<ProjectResponseDto | null>(null);
  const [currentImage, setCurrentImage] = useState<ValidatedContainerImage | null>(null);
  const [imageCves, setImageCves] = useState<ValidatedImageCveListItem[]>([]);
  const [stats, setStats] = useState<ImageCveStatsByVexStatusDto | null>(null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [exportingVex, setExportingVex] = useState(false);
  const [triggeringScan, setTriggeringScan] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId || !componentId) {
      setError("Project ID or Component ID not found.");
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all([
      ComponentsService.componentsControllerGetById(projectId, componentId),
      ProjectsService.projectsControllerGetById(projectId),
      getCurrentContainerImageOrNull(projectId, componentId),
      ComponentsService.componentsControllerGetStats(projectId, componentId),
    ])
      .then(async ([componentResponse, projectResponse, imageResponse, statsResponse]) => {
        setComponent(componentResponse);
        setProject(projectResponse);
        setCurrentImage(imageResponse);
        setStats(statsResponse.byVexStatus);
        if (imageResponse) {
          const imageCveResponse = await listImageCves(projectId, componentId);
          setImageCves(imageCveResponse.imageCves);
          return;
        }
        setImageCves([]);
      })
      .catch((err) => {
        setError(getApiErrorMessage(err));
      })
      .finally(() => setLoading(false));
  }, [projectId, componentId]);

  if (loading) {
    return <div className="panel text-[var(--text-secondary)]">Fetching component telemetry...</div>;
  }

  if (error) {
    return <div className="panel text-[var(--status-critical)]">Error: {error}</div>;
  }

  if (!component || !projectId || !componentId || !project) {
    return <div className="panel text-[var(--text-secondary)]">Component not found.</div>;
  }

  const minimizedDescription = `${component.description.slice(0, 5)}...`;
  const imagesBase = `/projects/${projectId}/components/${componentId}/images`;
  const imageCveBase = `/projects/${projectId}/components/${componentId}/image-cves`;
  const enabledImageCves = imageCves
    .filter((row) => row.disableState.state === "enabled")
    .sort((a, b) => {
      const aUnderInvestigation = a.vexStatus === "under_investigation" ? 0 : 1;
      const bUnderInvestigation = b.vexStatus === "under_investigation" ? 0 : 1;
      if (aUnderInvestigation !== bUnderInvestigation) {
        return aUnderInvestigation - bUnderInvestigation;
      }
      const aExpired = a.vexStateKind === "under_investigation_expired" ? 0 : 1;
      const bExpired = b.vexStateKind === "under_investigation_expired" ? 0 : 1;
      if (aExpired !== bExpired) {
        return aExpired - bExpired;
      }
      if (a.expiryTimeUnixSeconds && b.expiryTimeUnixSeconds) {
        return Number(a.expiryTimeUnixSeconds) - Number(b.expiryTimeUnixSeconds);
      }
      if (a.expiryTimeUnixSeconds) {
        return -1;
      }
      if (b.expiryTimeUnixSeconds) {
        return 1;
      }
      return a.cveId.localeCompare(b.cveId);
    });
  const disabledImageCves = imageCves
    .filter((row) => row.disableState.state === "disabled")
    .sort((a, b) => a.cveId.localeCompare(b.cveId));

  const formatOptionalUnixSeconds = (unixSeconds: string | null): string => {
    if (unixSeconds === null || unixSeconds === "0") {
      return "—";
    }
    return formatTime(parseUnixSeconds(unixSeconds));
  };

  const exportVex = () => {
    setExportingVex(true);
    ComponentsService.componentsControllerExportVex(projectId, componentId)
      .then((document) => {
        const json = JSON.stringify(document, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank", "noopener,noreferrer");
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      })
      .catch((err) => {
        setError(getApiErrorMessage(err));
      })
      .finally(() => {
        setExportingVex(false);
      });
  };

  const triggerScan = () => {
    if (!projectId || !componentId || !currentImage) {
      return;
    }
    setTriggeringScan(true);
    setScanFeedback(null);
    ComponentsService.componentsControllerTriggerScan(projectId, componentId)
      .then(async (result) => {
        if (result?.status === "container_not_uploaded") {
          setScanFeedback("Container .tar is not uploaded and ready yet.");
        } else {
          setScanFeedback("Scan triggered.");
          await waitMs(SCAN_STATUS_REFETCH_DELAY_MS);
        }
        return getCurrentContainerImageOrNull(projectId, componentId);
      })
      .then((nextCurrentImage) => {
        setCurrentImage(nextCurrentImage);
      })
      .catch((err) => {
        setError(getApiErrorMessage(err));
      })
      .finally(() => {
        setTriggeringScan(false);
      });
  };

  return (
    <section className="space-y-4">
      <PageHelpPanel markdown={pageHelpMarkdown.componentsDetails} />
      <div className="flex items-center gap-3">
        <Link className="neon-button text-sm" to={`/projects/${projectId}`}>Back to Project</Link>
      </div>

      <div className="panel">
        <p className="text-xs uppercase tracking-[0.25em] text-[var(--accent-magenta)]">Component Metadata</p>
        <dl className="grid gap-3 text-sm md:grid-cols-2">
          <div>
            <dt className="font-semibold text-[var(--accent-cyan)]">Component ID</dt>
            <dd className="font-mono text-[var(--text-primary)]">
              <span className="inline-flex flex-wrap items-center gap-2 break-all">
                {component.id}
                <CopyIdButton value={component.id} idKind="component ID" />
              </span>
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-[var(--accent-cyan)]">Project ID</dt>
            <dd className="font-mono text-[var(--text-primary)]">
              <span className="inline-flex flex-wrap items-center gap-2 break-all">
                {component.projectId}
                <CopyIdButton value={component.projectId} idKind="project ID" />
              </span>
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-[var(--accent-cyan)]">Project Name</dt>
            <dd className="text-[var(--text-primary)]">{project.name}</dd>
          </div>
          <div>
            <dt className="font-semibold text-[var(--accent-cyan)]">Last Updated</dt>
            <dd className="font-mono text-[var(--text-primary)]">
              {formatTime(parseUnixSeconds(component.updatedAtUnixSeconds))}
            </dd>
          </div>
        </dl>
      </div>

      <div className="panel space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[var(--accent-magenta)]">Component Profile</p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-cyan)]">Component Name</p>
            <h2 className="mt-2 text-2xl font-semibold">{component.name}</h2>
          </div>
          <Link className="neon-button text-sm" to={`/projects/${projectId}/components/${componentId}/update`}>Update Component</Link>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-cyan)]">Description</h3>
            <button
              className="neon-button text-xs"
              type="button"
              onClick={() => setIsDescriptionExpanded((prev) => !prev)}
            >
              {isDescriptionExpanded ? "Minimize Description" : "Maximize Description"}
            </button>
          </div>
          {isDescriptionExpanded ? (
            <DescriptionMarkdownPanel content={component.description} />
          ) : (
            <p className="text-[var(--text-secondary)]">{minimizedDescription}</p>
          )}
        </div>
      </div>

      <div className="panel space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[var(--accent-magenta)]">Container images</p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Current image is the latest in the chain. Create a new placeholder to upload another .tar.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className="neon-button text-sm" to={imagesBase}>All images</Link>
            <Link className="neon-button text-sm" to={`${imagesBase}/new`}>New image</Link>
          </div>
        </div>

        {currentImage === null ? (
          <p className="text-sm text-[var(--text-secondary)]">
            No container image yet. Use <strong className="text-[var(--text-primary)]">New image</strong> to add a placeholder, then upload a .tar.
          </p>
        ) : (
          <div className="space-y-3 rounded-lg border border-[var(--border)] p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-cyan)]">Current image</span>
              <FileStatusBadge status={currentImage.fileStatus} />
              <ScanStatusBadge code={currentImage.scanResultCode} />
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--accent-cyan)]">Image ID</p>
              <p className="font-mono text-sm text-[var(--text-primary)]">
                {currentImage.id}
                <CopyIdButton value={currentImage.id} idKind="image ID" />
              </p>
            </div>
            <div className="grid gap-3 text-sm md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold text-[var(--accent-cyan)]">Scan attempted</p>
                <p className="font-mono text-sm text-[var(--text-primary)]">
                  {formatOptionalUnixSeconds(currentImage.scanAttemptedAtUnixSeconds)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-[var(--accent-cyan)]">Scan finished</p>
                <p className="font-mono text-sm text-[var(--text-primary)]">
                  {formatOptionalUnixSeconds(currentImage.scanFinishedAtUnixSeconds)}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link className="neon-link text-sm" to={`${imagesBase}/${currentImage.id}`}>
                Image details →
              </Link>
            </div>
          </div>
        )}
      </div>

      <ImageCveStatsDoughnutGroup stats={stats} />

      <div className="panel space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[var(--accent-magenta)]">Current image-CVEs</p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Severity is from global CVE intel. Decision/disable state is from image-CVE data.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="neon-button text-sm"
              type="button"
              disabled={triggeringScan || currentImage === null}
              onClick={triggerScan}
            >
              {triggeringScan ? "Scanning…" : "Scan current image"}
            </button>
            <Link className="neon-button text-sm" to={`${imageCveBase}/add`}>
              Add or import CVEs
            </Link>
            <button className="neon-button text-sm" type="button" disabled={exportingVex} onClick={exportVex}>
              {exportingVex ? "Exporting…" : "Export VEX"}
            </button>
          </div>
        </div>
        {scanFeedback && <p className="text-sm text-[var(--text-secondary)]">{scanFeedback}</p>}

        {currentImage === null ? (
          <p className="text-sm text-[var(--text-secondary)]">
            No current image. Create/upload an image before managing image-CVEs.
          </p>
        ) : imageCves.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">No CVEs linked to the current image.</p>
        ) : (
          <div className="space-y-5">
            <div>
              <p className="mb-2 text-xs font-semibold tracking-[0.2em] text-[var(--accent-cyan)]">
                Active CVEs
              </p>
              {enabledImageCves.length === 0 ? (
                <p className="text-sm text-[var(--text-secondary)]">No active CVEs (all linked CVEs are disabled).</p>
              ) : (
                <table className="w-full min-w-[880px] text-left text-sm">
                  <thead className="border-b border-[var(--border)] text-[var(--text-muted)]">
                    <tr>
                      <th className="pb-3 font-medium">CVE</th>
                      <th className="pb-3 font-medium">Severity</th>
                      <th className="pb-3 font-medium">Source</th>
                      <th className="pb-3 font-medium">State</th>
                      <th className="pb-3 font-medium">Expiry</th>
                      <th className="pb-3 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enabledImageCves.map((row) => (
                      <tr key={row.imageCveId} className="border-b border-[var(--border)]/60">
                        <td className="py-3">
                          <a
                            className="neon-link font-mono text-sm"
                            href={`/cves/${encodeURIComponent(row.cveId)}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {row.cveId}
                          </a>
                        </td>
                        <td className="py-3">
                          <SeverityBadge severity={row.severity} />
                        </td>
                        <td className="py-3">
                          <ImageCveSourceBadge source={row.source} />
                        </td>
                        <td className="py-3">
                          <ImageCveStateBadge vexStateKind={row.vexStateKind} />
                        </td>
                        <td className="py-3 font-mono text-xs text-[var(--text-secondary)]">
                          {row.expiryTimeUnixSeconds
                            ? formatTime(parseUnixSeconds(row.expiryTimeUnixSeconds))
                            : "—"}
                        </td>
                        <td className="py-3">
                          <Link className="neon-link text-sm" to={`${imageCveBase}/${row.imageCveId}`}>
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <hr className="border-t border-[var(--border)]/60" />
            <div>
              <p className="mb-2 text-xs font-semibold tracking-[0.2em] text-[var(--accent-cyan)]">
                Disabled CVEs
              </p>
              {disabledImageCves.length === 0 ? (
                <p className="text-sm text-[var(--text-secondary)]">No disabled CVEs.</p>
              ) : (
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-b border-[var(--border)] text-[var(--text-muted)]">
                    <tr>
                      <th className="pb-3 font-medium">CVE</th>
                      <th className="pb-3 font-medium">Severity</th>
                      <th className="pb-3 font-medium">Source</th>
                      <th className="pb-3 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {disabledImageCves.map((row) => (
                      <tr key={row.imageCveId} className="border-b border-[var(--border)]/60">
                        <td className="py-3">
                          <a
                            className="neon-link font-mono text-sm"
                            href={`/cves/${encodeURIComponent(row.cveId)}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {row.cveId}
                          </a>
                        </td>
                        <td className="py-3">
                          <SeverityBadge severity={row.severity} />
                        </td>
                        <td className="py-3">
                          <ImageCveSourceBadge source={row.source} />
                        </td>
                        {/* <td className="py-3">
                          <ImageCveDisableBadge disableState={row.disableState} />
                        </td> */}
                        <td className="py-3">
                          <Link className="neon-link text-sm" to={`${imageCveBase}/${row.imageCveId}`}>
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
