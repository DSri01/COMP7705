import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import BackToComponentBar from "../components/BackToComponentBar";
import FileStatusBadge from "../components/FileStatusBadge";
import { listContainerImages, type ValidatedContainerImage } from "../api/containerImagesApi";
import PageHelpPanel from "../components/PageHelpPanel";
import { pageHelpMarkdown } from "../help/pageHelpMarkdown";

export default function ContainerImagesListPage() {
  const { projectId, componentId } = useParams();
  const [images, setImages] = useState<ValidatedContainerImage[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId || !componentId) {
      setError("Project or component ID missing.");
      setLoading(false);
      return;
    }
    setLoading(true);
    listContainerImages(projectId, componentId)
      .then(setImages)
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load images");
      })
      .finally(() => setLoading(false));
  }, [projectId, componentId]);

  const base = `/projects/${projectId}/components/${componentId}`;
  const imagesBase = `${base}/images`;

  if (!projectId || !componentId) {
    return <div className="panel text-[var(--status-critical)]">Invalid route.</div>;
  }

  if (loading) {
    return <div className="panel text-[var(--text-secondary)]">Loading container images…</div>;
  }

  if (error) {
    return <div className="panel text-[var(--status-critical)]">Error: {error}</div>;
  }

  return (
    <section className="flex flex-col gap-6">
      <PageHelpPanel markdown={pageHelpMarkdown.containerImagesList} />
      <BackToComponentBar projectId={projectId} componentId={componentId} />

      <div className="panel">
        <p className="text-xs uppercase tracking-[0.25em] text-[var(--accent-magenta)]">Container images</p>
        <h2 className="mt-2 text-2xl font-semibold">All images</h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Newest first (chain index). Each row links to image details.
        </p>
      </div>

      <div className="panel overflow-x-auto">
        {images && images.length === 0 ? (
          <p className="text-[var(--text-secondary)]">No images yet. Create one from the component page.</p>
        ) : (
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-[var(--border)] text-[var(--text-muted)]">
              <tr>
                <th className="pb-3 font-medium">Chain</th>
                <th className="pb-3 font-medium">Image ID</th>
                <th className="pb-3 font-medium">File status</th>
                <th className="pb-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {images?.map((img) => (
                <tr key={img.id} className="border-b border-[var(--border)]/60">
                  <td className="py-3 font-mono">{img.chainIndex}</td>
                  <td className="py-3 font-mono text-xs">{img.id}</td>
                  <td className="py-3">
                    <FileStatusBadge status={img.fileStatus} />
                  </td>
                  <td className="py-3">
                    <Link className="neon-link text-sm" to={`${imagesBase}/${img.id}`}>
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
