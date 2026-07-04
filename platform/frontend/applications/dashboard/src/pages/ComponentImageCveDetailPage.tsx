import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ComponentsService, ProjectsService, type ComponentResponseDto, type ProjectResponseDto } from "../api/generated";
import {
  getImageCveById,
  refreshImageCveDecisionExpiry,
  type ValidatedImageCveDetail,
  type ValidatedVexStateKind,
} from "../api/imageCvesApi";
import BackToComponentBar from "../components/BackToComponentBar";
import SeverityBadge from "../components/SeverityBadge";
import ImageCveSourceBadge from "../components/ImageCveSourceBadge";
import ImageCveDisableBadge from "../components/ImageCveDisableBadge";
import ImageCveStateBadge from "../components/ImageCveStateBadge";
import ImageCveJustificationBadge from "../components/ImageCveJustificationBadge";
import { DescriptionMarkdownPanel } from "../components/markdown/DescriptionMarkdownPanel";
import { formatTime, parseUnixSeconds } from "../utils/time";
import PageHelpPanel from "../components/PageHelpPanel";
import { pageHelpMarkdown } from "../help/pageHelpMarkdown";

function formatDecisionContextType(value: "fresh" | "carry_forward" | "expired"): string {
  const map = {
    fresh: "Fresh investigation",
    carry_forward: "Carry-forward from prior image",
    expired: "Expired prior decision",
  } as const;
  return map[value];
}

function getVexStateKind(detail: ValidatedImageCveDetail): ValidatedVexStateKind {
  if (detail.decision.status === "not_affected") {
    return "not_affected";
  }
  if (detail.decision.status === "affected") {
    return "affected";
  }
  if (detail.decision.additionalData.type === "fresh") {
    return "under_investigation_fresh";
  }
  if (detail.decision.additionalData.type === "expired") {
    return "under_investigation_expired";
  }
  return "under_investigation_carry_forward";
}

function getStateExplainer(detail: ValidatedImageCveDetail): string {
    if (detail.disableState.state === "disabled") {
        return "Marked as disabled by the user, suppressing the CVE.";
    }
    if (detail.decision.status === "not_affected") {
        return "Marked not affected with a formal justification until the expiry timestamp.";
    }
    if (detail.decision.status === "affected") {
        return "Marked affected with mitigation/action notes until the expiry timestamp.";
    }
    if (detail.decision.additionalData.type === "fresh") {
        return "Fresh investigation state with no inherited prior decision context.";
    }
    if (detail.decision.additionalData.type === "expired") {
        return "A prior resolved decision expired and was reset to under investigation.";
    }
    return "Copied from an older image in the chain and waiting for explicit reuse or rejection.";
}

function getResolvedStateKind(status: "not_affected" | "affected"): ValidatedVexStateKind {
  return status === "not_affected" ? "not_affected" : "affected";
}

function ExpandableTextValue({ label, value }: { label: string; value: string }) {
  const [expanded, setExpanded] = useState(false);
  const normalized = value || "";
  const preview = normalized ? `${normalized.slice(0, 5)}...` : "—";

  return (
    <div className="md:col-span-2 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <dt className="font-semibold text-[var(--accent-cyan)]">{label}</dt>
        <button className="neon-button text-xs" type="button" onClick={() => setExpanded((prev) => !prev)}>
          {expanded ? `Minimize ${label}` : `Maximize ${label}`}
        </button>
      </div>
      {expanded ? (
        <textarea className="neon-input min-h-24 resize-y" readOnly value={normalized || "—"} />
      ) : (
        <dd className="text-[var(--text-secondary)]">{preview}</dd>
      )}
    </div>
  );
}

function renderDecisionSnapshot(snapshot: {
  status: "not_affected" | "affected";
  status_notes: string;
  expiryTimeUnixSeconds: string;
  justification?: string;
  impact_statement?: string;
  action_statement?: string;
}) {
  return (
    <dl className="grid gap-2 text-sm md:grid-cols-2">
      <div>
        <dt className="font-semibold text-[var(--accent-cyan)]">Status</dt>
        <dd>
          <ImageCveStateBadge vexStateKind={getResolvedStateKind(snapshot.status)} />
        </dd>
      </div>
      <div>
        <dt className="font-semibold text-[var(--accent-cyan)]">Expires at</dt>
        <dd className="text-[var(--text-secondary)]">
          {formatTime(parseUnixSeconds(snapshot.expiryTimeUnixSeconds))}
        </dd>
      </div>
      {"justification" in snapshot && snapshot.justification !== undefined ? (
        <div>
          <dt className="font-semibold text-[var(--accent-cyan)]">Justification</dt>
          <dd>
            <ImageCveJustificationBadge justification={snapshot.justification} />
          </dd>
        </div>
      ) : null}
      {"impact_statement" in snapshot && snapshot.impact_statement !== undefined ? (
        <ExpandableTextValue label="Impact statement" value={snapshot.impact_statement} />
      ) : null}
      {"action_statement" in snapshot && snapshot.action_statement !== undefined ? (
        <ExpandableTextValue label="Action statement" value={snapshot.action_statement} />
      ) : null}
      <ExpandableTextValue label="Status notes" value={snapshot.status_notes} />
    </dl>
  );
}

export default function ComponentImageCveDetailPage() {
  const { projectId, componentId, imageCveId } = useParams();
  const [project, setProject] = useState<ProjectResponseDto | null>(null);
  const [component, setComponent] = useState<ComponentResponseDto | null>(null);
  const [detail, setDetail] = useState<ValidatedImageCveDetail | null>(null);
  const [isAdviceExpanded, setIsAdviceExpanded] = useState(false);
  const [isDisableReasonExpanded, setIsDisableReasonExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId || !componentId || !imageCveId) {
      setError("Missing route parameters.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    const loadDetail = async (): Promise<ValidatedImageCveDetail> => {
      try {
        return await refreshImageCveDecisionExpiry(projectId, componentId, imageCveId);
      } catch {
        return getImageCveById(projectId, componentId, imageCveId);
      }
    };

    Promise.all([
      loadDetail(),
      ProjectsService.projectsControllerGetById(projectId),
      ComponentsService.componentsControllerGetById(projectId, componentId),
    ])
      .then(([imageCveDetail, projectResponse, componentResponse]) => {
        if (cancelled) {
          return;
        }
        setDetail(imageCveDetail);
        setProject(projectResponse);
        setComponent(componentResponse);
      })
      .catch((err) => {
        if (cancelled) {
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to load image CVE detail.");
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [projectId, componentId, imageCveId]);

  const basePath = useMemo(() => {
    if (!projectId || !componentId || !imageCveId) {
      return "";
    }
    return `/projects/${projectId}/components/${componentId}/image-cves/${imageCveId}`;
  }, [projectId, componentId, imageCveId]);

  if (!projectId || !componentId || !imageCveId) {
    return <div className="panel text-[var(--status-critical)]">Invalid route.</div>;
  }

  if (loading) {
    return <div className="panel text-[var(--text-secondary)]">Loading image-CVE detail…</div>;
  }

  if (error || !detail || !project || !component) {
    return <div className="panel text-[var(--status-critical)]">Error: {error ?? "Not found"}</div>;
  }

  const vexStateKind = getVexStateKind(detail);
  const canReuseOrReject =
    detail.decision.status === "under_investigation" && detail.decision.additionalData.type !== "fresh";
  const adviceContent = detail.advice.state === "set" ? detail.advice.content : "";
  const adviceSavedAt =
    detail.advice.state === "set"
      ? formatTime(parseUnixSeconds(detail.advice.adviceGeneratedAtUnixSeconds))
      : null;
  const minimizedAdvice = adviceContent ? `${adviceContent.slice(0, 5)}...` : "No advice set.";

  return (
    <section className="flex flex-col gap-6">
      <PageHelpPanel markdown={pageHelpMarkdown.componentImageCveDetail} />
      <BackToComponentBar projectId={projectId} componentId={componentId}>
        <Link className="neon-link text-sm" to={`/projects/${projectId}/components/${componentId}`}>
          Back to current image-CVE list
        </Link>
      </BackToComponentBar>

      <div className="panel space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs uppercase tracking-[0.25em] text-[var(--accent-magenta)]">Image-CVE detail</p>
          <div className="flex flex-wrap gap-2">
            {detail.disableState.state === "enabled" ? (
              <Link className="neon-button text-sm" to={`${basePath}/disable`}>
                Disable
              </Link>
            ) : (
              <Link className="neon-button text-sm" to={`${basePath}/enable`}>
                Enable
              </Link>
            )}
          </div>
        </div>
        <dl className="grid gap-3 text-sm md:grid-cols-2">
          <div>
            <dt className="font-semibold text-[var(--accent-cyan)]">Project</dt>
            <dd>{project.name}</dd>
          </div>
          <div>
            <dt className="font-semibold text-[var(--accent-cyan)]">Component</dt>
            <dd>{component.name}</dd>
          </div>
          <div>
            <dt className="font-semibold text-[var(--accent-cyan)]">Image-CVE ID</dt>
            <dd className="font-mono">{detail.imageCveId}</dd>
          </div>
          <div>
            <dt className="font-semibold text-[var(--accent-cyan)]">CVE</dt>
            <dd>
              <a
                className="neon-link font-mono"
                href={`/cves/${encodeURIComponent(detail.cveId)}`}
                target="_blank"
                rel="noreferrer"
              >
                {detail.cveId}
              </a>
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-[var(--accent-cyan)]">Severity</dt>
            <dd><SeverityBadge severity={detail.severity} /></dd>
          </div>
          <div>
            <dt className="font-semibold text-[var(--accent-cyan)]">Source</dt>
            <dd><ImageCveSourceBadge source={detail.source} /></dd>
          </div>
          <div>
            <dt className="font-semibold text-[var(--accent-cyan)]">Disable state</dt>
            <dd><ImageCveDisableBadge disableState={detail.disableState} /></dd>
          </div>
          <div>
            <dt className="font-semibold text-[var(--accent-cyan)]">Decision recorded at</dt>
            <dd className="font-mono text-sm text-[var(--text-secondary)]">
              {formatTime(parseUnixSeconds(detail.decision.createdAtUnixSeconds))}
            </dd>
          </div>
          {detail.disableState.state === "disabled" ? (
            <div className="md:col-span-2 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <dt className="font-semibold text-[var(--accent-cyan)]">Disable reason</dt>
                <div className="flex flex-wrap items-center gap-2">
                  <Link className="neon-button text-xs" to={`${basePath}/disable`}>
                    Update disable reason
                  </Link>
                  <button
                    className="neon-button text-xs"
                    type="button"
                    onClick={() => setIsDisableReasonExpanded((prev) => !prev)}
                  >
                    {isDisableReasonExpanded ? "Minimize Disable reason" : "Maximize Disable reason"}
                  </button>
                </div>
              </div>
              {isDisableReasonExpanded ? (
                <textarea
                  className="neon-input min-h-24 resize-y"
                  readOnly
                  value={detail.disableState.reason || "—"}
                />
              ) : (
                <dd className="text-[var(--text-secondary)]">
                  {detail.disableState.reason ? `${detail.disableState.reason.slice(0, 5)}...` : "—"}
                </dd>
              )}
            </div>
          ) : null}
          {detail.decision.status !== "under_investigation" ? (
            <div>
              <dt className="font-semibold text-[var(--accent-cyan)]">Decision expiry</dt>
              <dd className="font-mono text-sm text-[var(--text-secondary)]">
                {formatTime(parseUnixSeconds(detail.decision.expiryTimeUnixSeconds))}
              </dd>
            </div>
          ) : null}
        </dl>
        <p className="text-sm text-[var(--text-secondary)] font-light">{getStateExplainer(detail)}</p>
      </div>

      <div className="panel space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs uppercase tracking-[0.25em] text-[var(--accent-magenta)]">Decision payload</p>
          <div className="flex flex-wrap gap-2">
            <Link className="neon-button text-sm" to={`${basePath}/decision/edit`}>
              Edit decision
            </Link>
            {canReuseOrReject ? (
              <>
                <Link className="neon-button text-sm" to={`${basePath}/decision/reuse`}>
                  Reuse prior decision
                </Link>
                <Link className="neon-button text-sm" to={`${basePath}/decision/reject`}>
                  Reject prior decision
                </Link>
              </>
            ) : null}
          </div>
        </div>
        {detail.decision.status === "not_affected" ? (
          renderDecisionSnapshot(detail.decision)
        ) : detail.decision.status === "affected" ? (
          renderDecisionSnapshot(detail.decision)
        ) : (
          <div className="space-y-3">
            <dl className="grid gap-2 text-sm md:grid-cols-2">
              <div>
                <dt className="font-semibold text-[var(--accent-cyan)]">Status</dt>
                <dd>
                  <ImageCveStateBadge vexStateKind={vexStateKind} />
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-[var(--accent-cyan)]">Decision context</dt>
                <dd>{formatDecisionContextType(detail.decision.additionalData.type)}</dd>
              </div>
            </dl>
            {detail.decision.additionalData.type === "carry_forward" ? (
              <div className="rounded-lg border border-[var(--border)] p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-cyan)]">
                  Prior decision snapshot
                </p>
                {renderDecisionSnapshot(detail.decision.additionalData.priorDecision)}
              </div>
            ) : null}
            {detail.decision.additionalData.type === "expired" ? (
              <div className="rounded-lg border border-[var(--border)] p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-cyan)]">
                  Expired decision snapshot
                </p>
                {renderDecisionSnapshot(detail.decision.additionalData.expiredDecision)}
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className="panel space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs uppercase tracking-[0.25em] text-[var(--accent-magenta)]">Advice</p>
          <Link className="neon-button text-sm" to={`${basePath}/advice`}>
            Edit advice
          </Link>
        </div>
        <div className="space-y-2">
          {adviceSavedAt ? (
            <p className="text-sm text-[var(--text-secondary)]">Last saved: {adviceSavedAt}</p>
          ) : null}
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-cyan)]">
              Advice Content
            </h3>
            <button
              className="neon-button text-xs"
              type="button"
              onClick={() => setIsAdviceExpanded((prev) => !prev)}
            >
              {isAdviceExpanded ? "Minimize Advice" : "Maximize Advice"}
            </button>
          </div>
          {isAdviceExpanded ? (
            adviceContent ? (
              <DescriptionMarkdownPanel content={adviceContent} />
            ) : (
              <p className="text-[var(--text-secondary)]">No advice set.</p>
            )
          ) : (
            <p className="text-[var(--text-secondary)]">{minimizedAdvice}</p>
          )}
        </div>
      </div>

    </section>
  );
}

