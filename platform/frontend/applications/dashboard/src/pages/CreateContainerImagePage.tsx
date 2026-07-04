import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import BackToComponentBar from "../components/BackToComponentBar";
import { createContainerImagePlaceholder } from "../api/containerImagesApi";
import PageHelpPanel from "../components/PageHelpPanel";
import { pageHelpMarkdown } from "../help/pageHelpMarkdown";

export default function CreateContainerImagePage() {
  const { projectId, componentId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!projectId || !componentId) {
    return <div className="panel text-[var(--status-critical)]">Project or component ID missing.</div>;
  }

  const base = `/projects/${projectId}/components/${componentId}`;

  const handleCreate = () => {
    setLoading(true);
    setError(null);
    createContainerImagePlaceholder(projectId, componentId)
      .then((created) => {
        navigate(`${base}/images/${created.id}`);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to create image placeholder");
      })
      .finally(() => setLoading(false));
  };

  if (loading) {
    return <div className="panel text-[var(--text-secondary)]">Creating image placeholder…</div>;
  }

  if (error) {
    return (
      <section className="flex flex-col gap-6">
        <BackToComponentBar projectId={projectId} componentId={componentId} />
        <div className="panel text-[var(--status-critical)]">Error: {error}</div>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <PageHelpPanel markdown={pageHelpMarkdown.createContainerImage} />
      <BackToComponentBar projectId={projectId} componentId={componentId} />
      <div className="panel space-y-3">
        <p className="text-xs uppercase tracking-[0.25em] text-[var(--accent-magenta)]">Container image</p>
        <h2 className="text-2xl font-semibold">Create new image</h2>
        <p className="text-sm text-[var(--text-secondary)]">
          This creates a new placeholder in the chain with status <strong className="text-[var(--text-primary)]">awaiting upload</strong>.
          You can upload a <strong className="text-[var(--text-primary)]">.tar</strong> file afterward (one upload per placeholder).
        </p>
        <button className="neon-button" type="button" onClick={handleCreate}>
          Create placeholder
        </button>
      </div>
    </section>
  );
}
