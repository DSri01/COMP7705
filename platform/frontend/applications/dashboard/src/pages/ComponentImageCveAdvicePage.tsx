import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import BackToComponentBar from "../components/BackToComponentBar";
import { getImageCveById, updateImageCveAdvice } from "../api/imageCvesApi";
import { getApiErrorMessage } from "../utils/apiError";
import { formatTime, parseUnixSeconds } from "../utils/time";
import PageHelpPanel from "../components/PageHelpPanel";
import { pageHelpMarkdown } from "../help/pageHelpMarkdown";

export default function ComponentImageCveAdvicePage() {
  const { projectId, componentId, imageCveId } = useParams();
  const navigate = useNavigate();
  const [content, setContent] = useState("");
  const [savedAtLabel, setSavedAtLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!projectId || !componentId || !imageCveId) {
    return <div className="panel text-[var(--status-critical)]">Invalid route.</div>;
  }

  const detailPath = `/projects/${projectId}/components/${componentId}/image-cves/${imageCveId}`;

  useEffect(() => {
    let cancelled = false;
    getImageCveById(projectId, componentId, imageCveId)
      .then((detail) => {
        if (cancelled) {
          return;
        }
        if (detail.advice.state === "set") {
          setContent(detail.advice.content);
          setSavedAtLabel(
            formatTime(parseUnixSeconds(detail.advice.adviceGeneratedAtUnixSeconds)),
          );
        } else {
          setSavedAtLabel(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(getApiErrorMessage(err));
        }
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

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    updateImageCveAdvice(projectId, componentId, imageCveId, content)
      .then(() => navigate(detailPath))
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setSaving(false));
  };

  if (loading) {
    return <div className="panel text-[var(--text-secondary)]">Loading advice editor…</div>;
  }

  return (
    <section className="flex flex-col gap-6">
      <PageHelpPanel markdown={pageHelpMarkdown.componentImageCveAdvice} />
      <BackToComponentBar projectId={projectId} componentId={componentId}>
        <Link className="neon-link text-sm" to={detailPath}>
          Back to image-CVE detail
        </Link>
      </BackToComponentBar>

      <form className="panel space-y-4" onSubmit={onSubmit}>
        <p className="text-xs uppercase tracking-[0.25em] text-[var(--accent-magenta)]">Update advice</p>
        {savedAtLabel ? (
          <p className="text-sm text-[var(--text-secondary)]">
            Current version saved: {savedAtLabel}. Saving overwrites content and updates the timestamp.
          </p>
        ) : null}
        <textarea
          className="neon-input min-h-40 resize-y"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
        />
        {error ? <div className="text-sm text-[var(--status-critical)]">Error: {error}</div> : null}
        <button className="neon-button" type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save advice"}
        </button>
      </form>
    </section>
  );
}

