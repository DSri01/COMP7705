import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import BackToComponentBar from "../components/BackToComponentBar";
import FileStatusBadge from "../components/FileStatusBadge";
import {
  getContainerImageById,
  isTarFileName,
  uploadContainerImageTar,
} from "../api/containerImagesApi";
import PageHelpPanel from "../components/PageHelpPanel";
import { pageHelpMarkdown } from "../help/pageHelpMarkdown";

export default function UploadContainerImagePage() {
  const { projectId, componentId, imageId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileStatus, setFileStatus] = useState<
    "awaiting_upload" | "uploading" | "ready" | "failed" | null
  >(null);

  useEffect(() => {
    if (!projectId || !componentId || !imageId) {
      setError("Missing route parameters.");
      setLoading(false);
      return;
    }
    setLoading(true);
    getContainerImageById(projectId, componentId, imageId)
      .then((img) => {
        setFileStatus(img.fileStatus);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load image");
      })
      .finally(() => setLoading(false));
  }, [projectId, componentId, imageId]);

  const base = `/projects/${projectId}/components/${componentId}`;
  const detailPath = `${base}/images/${imageId}`;

  if (!projectId || !componentId || !imageId) {
    return <div className="panel text-[var(--status-critical)]">Invalid route.</div>;
  }

  if (loading) {
    return <div className="panel text-[var(--text-secondary)]">Loading…</div>;
  }

  if (error) {
    return (
      <section className="flex flex-col gap-6">
        <BackToComponentBar projectId={projectId} componentId={componentId} />
        <div className="panel text-[var(--status-critical)]">Error: {error}</div>
      </section>
    );
  }

  const canUpload = fileStatus === "awaiting_upload";

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.elements.namedItem("file") as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      setError("Choose a file.");
      return;
    }
    if (!isTarFileName(file)) {
      setError("Only .tar files are supported.");
      return;
    }
    setSubmitting(true);
    setError(null);
    uploadContainerImageTar(projectId, componentId, imageId, file)
      .then(() => {
        navigate(detailPath);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Upload failed");
      })
      .finally(() => setSubmitting(false));
  };

  if (!canUpload && fileStatus) {
    return (
      <section className="flex flex-col gap-6">
        <PageHelpPanel markdown={pageHelpMarkdown.uploadContainerImage} />
        <BackToComponentBar projectId={projectId} componentId={componentId} />

        <div className="panel space-y-4">
          <p className="text-xs uppercase tracking-[0.25em] text-[var(--accent-magenta)]">Upload</p>
          <h2 className="text-xl font-semibold">Upload not available</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Upload is only allowed while the stored file is <strong className="text-[var(--text-primary)]">awaiting upload</strong>.
            For failed or completed images, create a new image placeholder from the component page.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-[var(--text-secondary)]">Current state:</span>
            <FileStatusBadge status={fileStatus} />
          </div>
          <Link className="neon-link text-sm" to={detailPath}>
            View image details →
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <PageHelpPanel markdown={pageHelpMarkdown.uploadContainerImage} />
      <BackToComponentBar projectId={projectId} componentId={componentId} />

      <div className="panel space-y-2">
        <p className="text-xs uppercase tracking-[0.25em] text-[var(--accent-cyan)]">Upload</p>
        <h2 className="text-2xl font-semibold">Upload container image (.tar)</h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Only <strong className="text-[var(--text-primary)]">.tar</strong> archives are accepted. The server rejects other extensions.
        </p>
      </div>

      <form className="panel space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="mb-1 block text-sm text-[var(--text-secondary)]" htmlFor="file">
            Tar archive
          </label>
          <input
            id="file"
            name="file"
            type="file"
            accept=".tar,application/x-tar"
            className="neon-input w-full max-w-md"
            required
          />
        </div>
        {error && <p className="text-sm text-[var(--status-critical)]">{error}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <button className="neon-button" type="submit" disabled={submitting}>
            {submitting ? "Uploading…" : "Upload"}
          </button>
          <Link className="neon-link text-sm" to={detailPath}>
            View image details
          </Link>
        </div>
      </form>
    </section>
  );
}
