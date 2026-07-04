import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ComponentsService,
  ProjectsService,
  type ComponentResponseDto,
  type ImageCveStatsByVexStatusDto,
  type ProjectResponseDto,
} from "../api/generated";
import { formatTime, parseUnixSeconds } from "../utils/time";
import { CopyIdButton } from "../components/CopyIdButton";
import ImageCveStatsDoughnutGroup from "../components/ImageCveStatsDoughnutGroup";

export default function ComponentsPage() {
  const { projectId } = useParams();
  const [project, setProject] = useState<ProjectResponseDto | null>(null);
  const [components, setComponents] = useState<ComponentResponseDto[]>([]);
  const [statsByComponentId, setStatsByComponentId] = useState<Record<string, ImageCveStatsByVexStatusDto | null>>({});
  const [statsLoadingByComponentId, setStatsLoadingByComponentId] = useState<Record<string, boolean>>({});
  const [statsErrorByComponentId, setStatsErrorByComponentId] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) {
      setError("Project ID not found.");
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all([
      ProjectsService.projectsControllerGetById(projectId),
      ComponentsService.componentsControllerList(projectId),
    ])
      .then(([projectResponse, componentsResponse]) => {
        setProject(projectResponse);
        setComponents(componentsResponse);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "An unknown error occurred");
      })
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => {
    if (!projectId || components.length === 0) {
      setStatsByComponentId({});
      setStatsLoadingByComponentId({});
      setStatsErrorByComponentId({});
      return;
    }

    let active = true;

    const loadingMap: Record<string, boolean> = {};
    components.forEach((component) => {
      loadingMap[component.id] = true;
    });
    setStatsLoadingByComponentId(loadingMap);

    Promise.all(
      components.map(async (component) => {
        try {
          const response = await ComponentsService.componentsControllerGetStats(projectId, component.id);
          return {
            id: component.id,
            stats: response.byVexStatus,
            error: null,
          };
        } catch (err) {
          return {
            id: component.id,
            stats: null,
            error: err instanceof Error ? err.message : "Unable to load stats.",
          };
        }
      }),
    ).then((results) => {
      if (!active) {
        return;
      }

      const nextStats: Record<string, ImageCveStatsByVexStatusDto | null> = {};
      const nextErrors: Record<string, string | null> = {};
      const nextLoading: Record<string, boolean> = {};

      results.forEach((result) => {
        nextStats[result.id] = result.stats;
        nextErrors[result.id] = result.error;
        nextLoading[result.id] = false;
      });

      setStatsByComponentId(nextStats);
      setStatsErrorByComponentId(nextErrors);
      setStatsLoadingByComponentId(nextLoading);
    });

    return () => {
      active = false;
    };
  }, [projectId, components]);

  if (loading) {
    return <div className="panel text-[var(--text-secondary)]">Syncing component inventory...</div>;
  }

  if (error) {
    return <div className="panel text-[var(--status-critical)]">Error: {error}</div>;
  }

  if (!projectId || !project) {
    return <div className="panel text-[var(--text-secondary)]">Project not found.</div>;
  }

  return (
    <section className="space-y-4">
      <div className="panel flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-[var(--accent-cyan)]">Asset Registry</p>
          <h2 className="text-2xl font-semibold">Components</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Project: <span className="text-[var(--text-primary)]">{project.name}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link className="neon-link text-sm" to={`/projects/${projectId}`}>Back to Project</Link>
          <Link className="neon-button text-sm" to={`/projects/${projectId}/components/new`}>Create Component</Link>
        </div>
      </div>

      <div className="grid gap-3">
        {components.length === 0 ? (
          <div className="panel text-[var(--text-secondary)]">No components registered for this project.</div>
        ) : (
          components.map((component) => (
            <article className="panel space-y-4" key={component.id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">{component.name}</h3>
                  <p className="mt-1 inline-flex flex-wrap items-center gap-2 font-mono text-xs text-[var(--text-muted)]">
                    {component.id}
                    <CopyIdButton value={component.id} idKind="component ID" />
                  </p>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">{component.description}</p>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    Last updated: {formatTime(parseUnixSeconds(component.updatedAtUnixSeconds))}
                  </p>
                </div>
                <Link className="neon-link whitespace-nowrap pt-1 text-sm font-medium" to={`/projects/${projectId}/components/${component.id}`}>
                  Inspect Component &rarr;
                </Link>
              </div>
              <ImageCveStatsDoughnutGroup
                stats={statsByComponentId[component.id] ?? null}
                loading={statsLoadingByComponentId[component.id] ?? false}
                error={statsErrorByComponentId[component.id] ?? null}
              />
            </article>
          ))
        )}
      </div>
    </section>
  );
}