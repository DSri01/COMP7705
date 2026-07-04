import { useEffect, useState } from "react";
import {
  ComponentsService,
  ProjectsService,
  type ComponentResponseDto,
  type ImageCveStatsByVexStatusDto,
  type ProjectResponseDto,
} from "../api/generated";
import { Link, useParams } from "react-router-dom";
import { formatTime, parseUnixSeconds } from "../utils/time";
import { CopyIdButton } from "../components/CopyIdButton";
import ImageCveStatsDoughnutGroup from "../components/ImageCveStatsDoughnutGroup";
import { DescriptionMarkdownPanel } from "../components/markdown/DescriptionMarkdownPanel";
import PageHelpPanel from "../components/PageHelpPanel";
import { pageHelpMarkdown } from "../help/pageHelpMarkdown";

export default function ProjectDetailsPage() {
  const { id } = useParams();
  const [project, setProject] = useState<ProjectResponseDto | null>(null);
  const [components, setComponents] = useState<ComponentResponseDto[]>([]);
  const [stats, setStats] = useState<ImageCveStatsByVexStatusDto | null>(null);
  const [statsByComponentId, setStatsByComponentId] = useState<Record<string, ImageCveStatsByVexStatusDto | null>>({});
  const [statsLoadingByComponentId, setStatsLoadingByComponentId] = useState<Record<string, boolean>>({});
  const [statsErrorByComponentId, setStatsErrorByComponentId] = useState<Record<string, string | null>>({});
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

    useEffect(() => {
    if (!id) {
      setError("Project ID not found.");
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all([
      ProjectsService.projectsControllerGetById(id),
      ComponentsService.componentsControllerList(id),
      ProjectsService.projectsControllerGetStats(id),
    ])
      .then(([projectResponse, componentsResponse, statsResponse]) => {
        setProject(projectResponse);
        setComponents(componentsResponse);
        setStats(statsResponse.byVexStatus);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "An unknown error occurred");
      })
      .finally(() => setLoading(false));
    }, [id]);

  useEffect(() => {
    if (!id || components.length === 0) {
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
          const response = await ComponentsService.componentsControllerGetStats(id, component.id);
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
  }, [id, components]);

  if (loading) {
    return <div className="panel text-[var(--text-secondary)]">Fetching project telemetry...</div>;
  }

  if (error) {
    return <div className="panel text-[var(--status-critical)]">Error: {error}</div>;
  }

  if (!project) {
    return <div className="panel text-[var(--text-secondary)]">Project not found.</div>;
  }

  const minimizedDescription = `${project.description.slice(0, 5)}...`;

  return (
    <section className="space-y-4">
      <PageHelpPanel markdown={pageHelpMarkdown.projectDetails} />
      <div className="flex items-center gap-3">
        <Link className="neon-button text-sm" to="/projects">Back to Projects</Link>
      </div>

      <div className="panel">
        <p className="text-xs uppercase tracking-[0.25em] text-[var(--accent-magenta)]">Project Metadata</p>
        <dl className="grid gap-3 text-sm md:grid-cols-2">
          <div>
            <dt className="font-semibold text-[var(--accent-cyan)]">Project ID</dt>
            <dd className="font-mono text-[var(--text-primary)]">
              <span className="inline-flex flex-wrap items-center gap-2 break-all">
                {project.id}
                <CopyIdButton value={project.id} idKind="project ID" />
              </span>
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-[var(--accent-cyan)]">Last Updated</dt>
            <dd className="font-mono text-[var(--text-primary)]">
              {formatTime(parseUnixSeconds(project.updatedAtUnixSeconds))}
            </dd>
          </div>
        </dl>
      </div>

      <div className="panel space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[var(--accent-magenta)]">Project Profile</p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-cyan)]">Project Name</p>
            <h2 className="mt-2 text-2xl font-semibold">{project.name}</h2>
          </div>
          <Link className="neon-button text-sm" to={`/projects/${id}/update`}>Update Project</Link>
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
            <DescriptionMarkdownPanel content={project.description} />
          ) : (
            <p className="text-[var(--text-secondary)]">{minimizedDescription}</p>
          )}
        </div>
      </div>

      <ImageCveStatsDoughnutGroup stats={stats} />

      <div className="panel space-y-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[var(--accent-magenta)]">Asset Registry</p>
            <h3 className="text-xl font-semibold">Components</h3>
          </div>
          <Link className="neon-button text-sm" to={`/projects/${id}/components/new`}>Create Component</Link>
        </div>

        {components.length === 0 ? (
          <div className="text-[var(--text-secondary)]">No components registered for this project.</div>
        ) : (
          <div className="grid gap-3">
            {components.map((component) => (
              <article className="panel space-y-4" key={component.id}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="text-lg font-semibold text-[var(--text-primary)]">{component.name}</h4>
                    <p className="mt-1 inline-flex flex-wrap items-center gap-2 font-mono text-xs text-[var(--text-muted)]">
                      {component.id}
                      <CopyIdButton value={component.id} idKind="component ID" />
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      Last updated: {formatTime(parseUnixSeconds(component.updatedAtUnixSeconds))}
                    </p>
                  </div>
                  <Link className="neon-link whitespace-nowrap pt-1 text-sm font-medium" to={`/projects/${id}/components/${component.id}`}>
                    Inspect Component &rarr;
                  </Link>
                </div>
                <ImageCveStatsDoughnutGroup
                  stats={statsByComponentId[component.id] ?? null}
                  loading={statsLoadingByComponentId[component.id] ?? false}
                  error={statsErrorByComponentId[component.id] ?? null}
                />
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}