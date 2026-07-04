import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getCveById, updateCveResearchSummary } from "../api/cvesApi";
import { getApiErrorMessage } from "../utils/apiError";
import PageHelpPanel from "../components/PageHelpPanel";
import { pageHelpMarkdown } from "../help/pageHelpMarkdown";

export default function CveResearchSummaryUpdatePage() {
  const { cveId: cveIdParam } = useParams();
  const cveId = cveIdParam ? decodeURIComponent(cveIdParam) : "";
  const navigate = useNavigate();
  const [researchSummary, setResearchSummary] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!cveId) {
    return <div className="panel text-[var(--status-critical)]">Invalid route.</div>;
  }

  const detailPath = `/cves/${encodeURIComponent(cveId)}`;

  useEffect(() => {
    let cancelled = false;
    getCveById(cveId)
      .then((detail) => {
        if (!cancelled) {
          setResearchSummary(detail.researchSummary);
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
  }, [cveId]);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    updateCveResearchSummary(cveId, researchSummary)
      .then(() => navigate(detailPath))
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setSaving(false));
  };

  if (loading) {
    return <div className="panel text-[var(--text-secondary)]">Loading summary editor…</div>;
  }

  return (
    <section className="space-y-4">
      <PageHelpPanel markdown={pageHelpMarkdown.cveResearchSummaryUpdate} />
      <div className="flex items-center gap-3">
        <Link className="neon-button text-sm" to={detailPath}>
          Back to CVE detail
        </Link>
      </div>

      <form className="panel space-y-4" onSubmit={onSubmit}>
        <p className="text-xs uppercase tracking-[0.25em] text-[var(--accent-magenta)]">
          Update research summary
        </p>
        <textarea
          className="neon-input min-h-40 resize-y"
          value={researchSummary}
          onChange={(e) => setResearchSummary(e.target.value)}
        />
        {error ? <div className="text-sm text-[var(--status-critical)]">Error: {error}</div> : null}
        <button className="neon-button" type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save summary"}
        </button>
      </form>
    </section>
  );
}
