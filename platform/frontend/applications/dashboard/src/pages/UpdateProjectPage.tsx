import { Link, useNavigate, useParams } from "react-router-dom"
import { ProjectsService, type ProjectResponseDto } from "../api/generated";
import { useState } from "react";
import { useEffect } from "react";
import { CopyIdButton } from "../components/CopyIdButton";
import PageHelpPanel from "../components/PageHelpPanel";
import { pageHelpMarkdown } from "../help/pageHelpMarkdown";

export default function UpdateProject() {
  const { id } = useParams();
  const [project, setProject] = useState<ProjectResponseDto | null>(null);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  if (!id) {
    return <div>Project ID not found</div>;
  }

  useEffect(() => {
    setLoading(true);
    ProjectsService.projectsControllerGetById(id)
      .then((project) => {
        setProject(project);
        setDescription(project.description);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "An unknown error occurred");
      })
      .finally(() => setLoading(false));
    }, [id]);

  if (loading) {
    return <div className="panel text-[var(--text-secondary)]">Loading project payload...</div>;
  }

  if (error) {
    return <div className="panel text-[var(--status-critical)]">Error: {error}</div>;
  }

  if (!project) {
    return <div className="panel text-[var(--text-secondary)]">Project not found.</div>;
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    ProjectsService.projectsControllerUpdate(id, { description })
      .then(() => {
        navigate(`/projects/${id}`);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      })
      .finally(() => setLoading(false));
  };

  return (
    <section className="space-y-4">
      <PageHelpPanel markdown={pageHelpMarkdown.updateProject} />
      <div className="panel">
        <p className="text-xs uppercase tracking-[0.25em] text-[var(--accent-violet)]">Configuration</p>
        <h2 className="mt-2 text-2xl font-semibold">Update Project</h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">{project.name}</p>
        <p className="mt-2 inline-flex flex-wrap items-center gap-2 font-mono text-xs text-[var(--text-muted)]">
          {id}
          <CopyIdButton value={id} idKind="project ID" />
        </p>
      </div>

      <form className="panel space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="mb-1 block text-sm text-[var(--text-secondary)]" htmlFor="description">Description</label>
          <textarea
            className="neon-input min-h-28 resize-y"
            id="description"
            name="description"
            placeholder="Update project description..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>
        <div className="flex items-center gap-3">
          <button className="neon-button" type="submit">Save Changes</button>
          <Link className="neon-link text-sm" to={`/projects/${id}`}>Back to Project</Link>
        </div>
      </form>
    </section>
  );
}