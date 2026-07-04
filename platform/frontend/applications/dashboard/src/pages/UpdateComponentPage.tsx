import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ComponentsService, type ComponentResponseDto } from "../api/generated";
import { CopyIdButton } from "../components/CopyIdButton";
import PageHelpPanel from "../components/PageHelpPanel";
import { pageHelpMarkdown } from "../help/pageHelpMarkdown";

export default function UpdateComponentPage() {
  const { projectId, componentId } = useParams();
  const [component, setComponent] = useState<ComponentResponseDto | null>(null);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!projectId || !componentId) {
      setError("Project ID or Component ID not found.");
      setLoading(false);
      return;
    }

    setLoading(true);
    ComponentsService.componentsControllerGetById(projectId, componentId)
      .then((componentResponse) => {
        setComponent(componentResponse);
        setDescription(componentResponse.description);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "An unknown error occurred");
      })
      .finally(() => setLoading(false));
  }, [projectId, componentId]);

  if (!projectId || !componentId) {
    return <div className="panel text-[var(--status-critical)]">Project ID or Component ID not found.</div>;
  }

  if (loading) {
    return <div className="panel text-[var(--text-secondary)]">Loading component payload...</div>;
  }

  if (error) {
    return <div className="panel text-[var(--status-critical)]">Error: {error}</div>;
  }

  if (!component) {
    return <div className="panel text-[var(--text-secondary)]">Component not found.</div>;
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    ComponentsService.componentsControllerUpdate(projectId, componentId, { description })
      .then(() => {
        navigate(`/projects/${projectId}/components/${componentId}`);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "An unknown error occurred");
      })
      .finally(() => setLoading(false));
  };

  return (
    <section className="space-y-4">
      <PageHelpPanel markdown={pageHelpMarkdown.updateComponent} />
      <div className="panel">
        <p className="text-xs uppercase tracking-[0.25em] text-[var(--accent-violet)]">Configuration</p>
        <h2 className="mt-2 text-2xl font-semibold">Update Component</h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">{component.name}</p>
        <div className="mt-2 flex flex-col gap-2 font-mono text-xs text-[var(--text-muted)]">
          <p className="inline-flex flex-wrap items-center gap-2 break-all">
            <span className="text-[var(--text-secondary)]">Project:</span> {projectId}
            <CopyIdButton value={projectId} idKind="project ID" />
          </p>
          <p className="inline-flex flex-wrap items-center gap-2 break-all">
            <span className="text-[var(--text-secondary)]">Component:</span> {componentId}
            <CopyIdButton value={componentId} idKind="component ID" />
          </p>
        </div>
      </div>

      <form className="panel space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="mb-1 block text-sm text-[var(--text-secondary)]" htmlFor="description">Description</label>
          <textarea
            className="neon-input min-h-28 resize-y"
            id="description"
            name="description"
            placeholder="Update component description..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        <div className="flex items-center gap-3">
          <button className="neon-button" type="submit">Save Changes</button>
          <Link className="neon-link text-sm" to={`/projects/${projectId}/components/${componentId}`}>Back to Component</Link>
        </div>
      </form>
    </section>
  );
}