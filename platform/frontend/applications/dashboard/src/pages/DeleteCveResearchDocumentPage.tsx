import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CveResearchDocumentsService } from "../api/generated";
import { getApiErrorMessage } from "../utils/apiError";
import { CopyIdButton } from "../components/CopyIdButton";
import PageHelpPanel from "../components/PageHelpPanel";
import { pageHelpMarkdown } from "../help/pageHelpMarkdown";

export default function DeleteCveResearchDocumentPage() {
  const { cveId: cveIdParam, documentId } = useParams();
  const cveId = cveIdParam ? decodeURIComponent(cveIdParam) : "";
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const encoded = encodeURIComponent(cveId);

  const handleConfirm = () => {
    if (!cveId || !documentId) {
      return;
    }
    setError(null);
    setLoading(true);
    CveResearchDocumentsService.cveResearchDocumentsControllerDelete(cveId, documentId)
      .then(() => {
        navigate(`/cves/${encoded}/research-documents`);
      })
      .catch((err) => {
        setError(getApiErrorMessage(err));
      })
      .finally(() => setLoading(false));
  };

  if (!cveId || !documentId) {
    return <div className="panel text-[var(--status-critical)]">Invalid route.</div>;
  }

  return (
    <section className="space-y-4">
      <PageHelpPanel markdown={pageHelpMarkdown.deleteCveResearchDocument} />
      <Link className="neon-button text-sm" to={`/cves/${encoded}/research-documents/${documentId}`}>
        Cancel
      </Link>

      <div className="panel space-y-3 border-[var(--status-critical)]/40">
        <p className="text-xs uppercase tracking-[0.25em] text-[var(--status-critical)]">Delete</p>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">Remove this research document?</h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Document <span className="font-mono text-xs">{documentId}</span> for{" "}
          <span className="inline-flex flex-wrap items-center gap-1.5 font-mono">
            {cveId}
            <CopyIdButton value={cveId} idKind="CVE ID" />
          </span>{" "}
          will be permanently deleted.
        </p>
        {error ? <p className="text-sm text-[var(--status-critical)]">{error}</p> : null}
        <div className="flex flex-wrap gap-3">
          <button
            className="neon-button border-[var(--status-critical)]/60 text-[var(--status-critical)]"
            type="button"
            disabled={loading}
            onClick={handleConfirm}
          >
            {loading ? "Deleting…" : "Confirm delete"}
          </button>
        </div>
      </div>
    </section>
  );
}
