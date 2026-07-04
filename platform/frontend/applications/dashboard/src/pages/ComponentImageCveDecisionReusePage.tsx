import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import BackToComponentBar from "../components/BackToComponentBar";
import { reuseImageCveDecision } from "../api/imageCvesApi";
import { getApiErrorMessage } from "../utils/apiError";
import ExpiryUnixInput from "../components/ExpiryUnixInput";
import PageHelpPanel from "../components/PageHelpPanel";
import { pageHelpMarkdown } from "../help/pageHelpMarkdown";

export default function ComponentImageCveDecisionReusePage() {
  const { projectId, componentId, imageCveId } = useParams();
  const navigate = useNavigate();
  const [expiryTimeUnixSeconds, setExpiryTimeUnixSeconds] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!projectId || !componentId || !imageCveId) {
    return <div className="panel text-[var(--status-critical)]">Invalid route.</div>;
  }

  const detailPath = `/projects/${projectId}/components/${componentId}/image-cves/${imageCveId}`;

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    reuseImageCveDecision(projectId, componentId, imageCveId, expiryTimeUnixSeconds)
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

      <form className="panel space-y-4" onSubmit={onSubmit}>
        <p className="text-xs uppercase tracking-[0.25em] text-[var(--accent-magenta)]">Reuse prior decision</p>
        <ExpiryUnixInput
          id="expiry"
          label="Expiry time"
          value={expiryTimeUnixSeconds}
          onChange={setExpiryTimeUnixSeconds}
          required
        />
        {error ? <div className="text-sm text-[var(--status-critical)]">Error: {error}</div> : null}
        <button className="neon-button" type="submit" disabled={saving}>
          {saving ? "Saving…" : "Reuse decision"}
        </button>
      </form>
    </section>
  );
}

