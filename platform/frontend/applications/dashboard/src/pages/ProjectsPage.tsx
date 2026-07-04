import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ProjectsService,
  type ImageCveStatsByVexStatusDto,
  type ProjectResponseDto,
} from "../api/generated";
import { formatTime, parseUnixSeconds } from "../utils/time";
import { CopyIdButton } from "../components/CopyIdButton";
import ImageCveStatsDoughnutGroup from "../components/ImageCveStatsDoughnutGroup";
import PageHelpPanel from "../components/PageHelpPanel";
import { pageHelpMarkdown } from "../help/pageHelpMarkdown";

export default function ProjectsPage() {

    const [projects, setProjects] = useState<ProjectResponseDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statsByProjectId, setStatsByProjectId] = useState<Record<string, ImageCveStatsByVexStatusDto | null>>({});
    const [statsLoadingByProjectId, setStatsLoadingByProjectId] = useState<Record<string, boolean>>({});
    const [statsErrorByProjectId, setStatsErrorByProjectId] = useState<Record<string, string | null>>({});

    useEffect(() => {
        setLoading(true);
        ProjectsService.projectsControllerList()
            .then(setProjects)
            .catch((err) => {
                setError(err instanceof Error ? err.message : 'An unknown error occurred');
            })
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
      if (projects.length === 0) {
        setStatsByProjectId({});
        setStatsLoadingByProjectId({});
        setStatsErrorByProjectId({});
        return;
      }

      let active = true;

      const loadingMap: Record<string, boolean> = {};
      projects.forEach((project) => {
        loadingMap[project.id] = true;
      });
      setStatsLoadingByProjectId(loadingMap);

      Promise.all(
        projects.map(async (project) => {
          try {
            const response = await ProjectsService.projectsControllerGetStats(project.id);
            return {
              id: project.id,
              stats: response.byVexStatus,
              error: null,
            };
          } catch (err) {
            return {
              id: project.id,
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

        setStatsByProjectId(nextStats);
        setStatsErrorByProjectId(nextErrors);
        setStatsLoadingByProjectId(nextLoading);
      });

      return () => {
        active = false;
      };
    }, [projects]);

  if (loading) {
    return <div className="panel text-[var(--text-secondary)]">Syncing project inventory...</div>;
  }

  if (error) {
    return <div className="panel text-[var(--status-critical)]">Error: {error}</div>;
  }

  return (
    <section className="space-y-4">
      <PageHelpPanel markdown={pageHelpMarkdown.projects} />
      <div className="panel flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-[var(--accent-cyan)]">Asset Registry</p>
          <h2 className="text-2xl font-semibold">Projects</h2>
          <p className="text-sm text-[var(--text-secondary)]">Track codebases and map vulnerabilities by ownership.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link className="neon-link text-sm" to="/">Home</Link>
          <Link className="neon-button text-sm" to="/projects/new">Create Project</Link>
        </div>
      </div>

      {/* <div className="panel space-y-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--accent-violet)]">Preview</p>
          <h3 className="text-lg font-semibold">Dummy stats with all severities</h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Demo block to validate chart slices and center totals before relying on API data.
          </p>
        </div>
        <ImageCveStatsDoughnutGroup stats={DUMMY_STATS_ALL_SEVERITIES} />
      </div> */}

      <div className="grid gap-3">
        {projects.length === 0 ? (
          <div className="panel text-[var(--text-secondary)]">No projects onboarded yet.</div>
        ) : (
          projects.map((project) => (
            <article className="panel space-y-4" key={project.id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">{project.name}</h3>
                  <p className="mt-1 inline-flex flex-wrap items-center gap-2 font-mono text-xs text-[var(--text-muted)]">
                    {project.id}
                    <CopyIdButton value={project.id} idKind="project ID" />
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    Last updated: {formatTime(parseUnixSeconds(project.updatedAtUnixSeconds))}
                  </p>
                </div>
                <Link className="neon-link whitespace-nowrap pt-1 text-sm font-medium" to={`/projects/${project.id}`}>
                  Inspect Project &rarr;
                </Link>
              </div>
              <ImageCveStatsDoughnutGroup
                stats={statsByProjectId[project.id] ?? null}
                loading={statsLoadingByProjectId[project.id] ?? false}
                error={statsErrorByProjectId[project.id] ?? null}
              />
            </article>
          ))
        )}
      </div>
    </section>
  );
}