import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import BackToComponentBar from "../components/BackToComponentBar";
import PageHelpPanel from "../components/PageHelpPanel";
import { pageHelpMarkdown } from "../help/pageHelpMarkdown";
import { disableImageCve, getImageCveById } from "../api/imageCvesApi";
import { getApiErrorMessage } from "../utils/apiError";

export default function ComponentImageCveDisablePage() {
  const { projectId, componentId, imageCveId } = useParams();
  const navigate = useNavigate();
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAlreadyDisabled, setIsAlreadyDisabled] = useState(false);
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
        if (detail.disableState.state === "disabled") {
          setIsAlreadyDisabled(true);
          setReason(detail.disableState.reason);
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
    disableImageCve(projectId, componentId, imageCveId, reason.trim())
      .then(() => navigate(detailPath))
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setSaving(false));
  };

  if (loading) {
    return <div className="panel text-[var(--text-secondary)]">Loading disable editor…</div>;
  }

  return (
    <section className="flex flex-col gap-6">
      <PageHelpPanel markdown={pageHelpMarkdown.componentImageCveDisable} />
      <BackToComponentBar projectId={projectId} componentId={componentId}>
        <Link className="neon-link text-sm" to={detailPath}>
          Back to image-CVE detail
        </Link>
      </BackToComponentBar>

      <form className="panel space-y-4" onSubmit={onSubmit}>
        <p className="text-xs uppercase tracking-[0.25em] text-[var(--accent-magenta)]">
          {isAlreadyDisabled ? "Update disable reason" : "Disable image-CVE"}
        </p>
        <div>
          <label className="mb-1 block text-sm text-[var(--text-secondary)]" htmlFor="reason">
            Reason
          </label>
          <textarea
            className="neon-input min-h-32 resize-y"
            id="reason"
            name="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            minLength={1}
            maxLength={2000}
          />
        </div>
        {error ? <div className="text-sm text-[var(--status-critical)]">Error: {error}</div> : null}
        <button className="neon-button" type="submit" disabled={saving}>
          {saving ? "Saving…" : isAlreadyDisabled ? "Save reason" : "Disable"}
        </button>
      </form>
    </section>
  );
}

