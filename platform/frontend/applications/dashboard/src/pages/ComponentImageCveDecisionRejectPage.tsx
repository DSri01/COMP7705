import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import BackToComponentBar from "../components/BackToComponentBar";
import { rejectImageCveDecisionReuse } from "../api/imageCvesApi";
import { getApiErrorMessage } from "../utils/apiError";
import PageHelpPanel from "../components/PageHelpPanel";
import { pageHelpMarkdown } from "../help/pageHelpMarkdown";

export default function ComponentImageCveDecisionRejectPage() {
  const { projectId, componentId, imageCveId } = useParams();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!projectId || !componentId || !imageCveId) {
    return <div className="panel text-[var(--status-critical)]">Invalid route.</div>;
  }

  const detailPath = `/projects/${projectId}/components/${componentId}/image-cves/${imageCveId}`;

  const onReject = () => {
    setSaving(true);
    setError(null);
    rejectImageCveDecisionReuse(projectId, componentId, imageCveId)
      .then(() => navigate(detailPath))
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setSaving(false));
  };

  return (
    <section className="flex flex-col gap-6">
      <PageHelpPanel markdown={pageHelpMarkdown.componentImageCveDecision} />
      <BackToComponentBar projectId={projectId} componentId={componentId}>
        <Link className="neon-link text-sm" to={detailPath}>
          Back to image-CVE detail
        </Link>
      </BackToComponentBar>

      <div className="panel space-y-4">
        <p className="text-xs uppercase tracking-[0.25em] text-[var(--accent-magenta)]">Reject prior decision</p>
        <p className="text-sm text-[var(--text-secondary)]">
          This resets the row to fresh under investigation.
        </p>
        {error ? <div className="text-sm text-[var(--status-critical)]">Error: {error}</div> : null}
        <button className="neon-button" type="button" disabled={saving} onClick={onReject}>
          {saving ? "Saving…" : "Reject decision reuse"}
        </button>
      </div>
    </section>
  );
}

