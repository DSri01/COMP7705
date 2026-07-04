import { Link, useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import { CveResearchDocumentsService } from "../api/generated";
import { getApiErrorMessage } from "../utils/apiError";
import { CopyIdButton } from "../components/CopyIdButton";
import PageHelpPanel from "../components/PageHelpPanel";
import { pageHelpMarkdown } from "../help/pageHelpMarkdown";

export default function CreateCveResearchDocumentPage() {
  const { cveId: cveIdParam } = useParams();
  const cveId = cveIdParam ? decodeURIComponent(cveIdParam) : "";
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const encoded = encodeURIComponent(cveId);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!cveId) {
      return;
    }
    setError(null);
    setLoading(true);
    const formData = new FormData(e.target as HTMLFormElement);
    const title = (formData.get("title") as string).trim();
    const content = (formData.get("content") as string).trim();
    CveResearchDocumentsService.cveResearchDocumentsControllerCreate(cveId, { title, content })
      .then(() => {
        navigate(`/cves/${encoded}/research-documents`);
      })
      .catch((err) => {
        setError(getApiErrorMessage(err));
      })
      .finally(() => setLoading(false));
  };

  if (!cveId) {
    return <div className="panel text-[var(--status-critical)]">Invalid CVE route.</div>;
  }

  if (loading) {
    return <div className="panel text-[var(--text-secondary)]">Saving document…</div>;
  }

  return (
    <section className="space-y-4">
      <PageHelpPanel markdown={pageHelpMarkdown.createCveResearchDocument} />
      <div className="flex flex-wrap gap-3">
        <Link className="neon-button text-sm" to={`/cves/${encoded}/research-documents`}>
          Cancel
        </Link>
      </div>

      <div className="panel">
        <p className="text-xs uppercase tracking-[0.25em] text-[var(--accent-cyan)]">User upload</p>
        <h2 className="mt-2 text-2xl font-semibold">New research document</h2>
        <p className="mt-2 inline-flex flex-wrap items-center gap-2 font-mono text-sm text-[var(--text-secondary)]">
          {cveId}
          <CopyIdButton value={cveId} idKind="CVE ID" />
        </p>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">Stored as source user_upload.</p>
      </div>

      {error ? <div className="panel text-[var(--status-critical)]">Error: {error}</div> : null}

      <form className="panel space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="mb-1 block text-sm text-[var(--text-secondary)]" htmlFor="title">
            Title
          </label>
          <input className="neon-input" id="title" name="title" type="text" required maxLength={512} />
        </div>
        <div>
          <label className="mb-1 block text-sm text-[var(--text-secondary)]" htmlFor="content">
            Content
          </label>
          <textarea
            className="neon-input min-h-40 resize-y"
            id="content"
            name="content"
            placeholder="Notes, markdown, or pasted text…"
            required
          />
        </div>
        <button className="neon-button" type="submit">
          Create document
        </button>
      </form>
    </section>
  );
}
