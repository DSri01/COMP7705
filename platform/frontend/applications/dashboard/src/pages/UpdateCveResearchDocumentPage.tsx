import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CveResearchDocumentsService, type CveResearchDocumentResponseDto } from "../api/generated";
import { getApiErrorMessage } from "../utils/apiError";
import { CopyIdButton } from "../components/CopyIdButton";
import PageHelpPanel from "../components/PageHelpPanel";
import { pageHelpMarkdown } from "../help/pageHelpMarkdown";

export default function UpdateCveResearchDocumentPage() {
  const { cveId: cveIdParam, documentId } = useParams();
  const cveId = cveIdParam ? decodeURIComponent(cveIdParam) : "";
  const navigate = useNavigate();
  const [initial, setInitial] = useState<CveResearchDocumentResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const encoded = encodeURIComponent(cveId);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await Promise.resolve();
      if (cancelled) {
        return;
      }
      if (!cveId || !documentId) {
        setError("Missing route parameters.");
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const row = await CveResearchDocumentsService.cveResearchDocumentsControllerGetById(cveId, documentId);
        if (!cancelled) {
          setInitial(row);
        }
      } catch (err) {
        if (!cancelled) {
          setError(getApiErrorMessage(err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cveId, documentId]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!cveId || !documentId) {
      return;
    }
    const formData = new FormData(e.target as HTMLFormElement);
    const title = (formData.get("title") as string).trim();
    const content = (formData.get("content") as string).trim();
    const body: { title?: string; content?: string } = {};
    if (title !== initial?.title) {
      body.title = title;
    }
    if (content !== initial?.content) {
      body.content = content;
    }
    if (Object.keys(body).length === 0) {
      setError("Change at least one field.");
      return;
    }
    setError(null);
    setSaving(true);
    CveResearchDocumentsService.cveResearchDocumentsControllerUpdate(cveId, documentId, body)
      .then(() => {
        navigate(`/cves/${encoded}/research-documents/${documentId}`);
      })
      .catch((err) => {
        setError(getApiErrorMessage(err));
      })
      .finally(() => setSaving(false));
  };

  if (loading) {
    return <div className="panel text-[var(--text-secondary)]">Loading document…</div>;
  }

  if (error && !initial) {
    return (
      <section className="space-y-4">
        <Link className="neon-button text-sm" to={`/cves/${encoded}/research-documents`}>
          Back to list
        </Link>
        <div className="panel text-[var(--status-critical)]">Error: {error}</div>
      </section>
    );
  }

  if (!initial) {
    return null;
  }

  if (saving) {
    return <div className="panel text-[var(--text-secondary)]">Saving…</div>;
  }

  return (
    <section className="space-y-4">
      <PageHelpPanel markdown={pageHelpMarkdown.updateCveResearchDocument} />
      <div className="flex flex-wrap gap-3">
        <Link className="neon-button text-sm" to={`/cves/${encoded}/research-documents/${documentId}`}>
          Cancel
        </Link>
      </div>

      <div className="panel">
        <p className="text-xs uppercase tracking-[0.25em] text-[var(--accent-cyan)]">Edit</p>
        <h2 className="mt-2 text-2xl font-semibold">Update document</h2>
        <p className="mt-2 inline-flex flex-wrap items-center gap-2 font-mono text-sm text-[var(--text-secondary)]">
          {initial.cveId}
          <CopyIdButton value={initial.cveId} idKind="CVE ID" />
        </p>
        <p className="mt-1 font-mono text-sm text-[var(--text-secondary)]">{initial.title}</p>
      </div>

      {error ? <div className="panel text-[var(--status-critical)]">Error: {error}</div> : null}

      <form className="panel space-y-4" key={initial.id} onSubmit={handleSubmit}>
        <div>
          <label className="mb-1 block text-sm text-[var(--text-secondary)]" htmlFor="title">
            Title
          </label>
          <input
            className="neon-input"
            id="title"
            name="title"
            type="text"
            required
            maxLength={512}
            defaultValue={initial.title}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-[var(--text-secondary)]" htmlFor="content">
            Content
          </label>
          <textarea
            className="neon-input min-h-40 resize-y"
            id="content"
            name="content"
            required
            defaultValue={initial.content}
          />
        </div>
        <button className="neon-button" type="submit">
          Save changes
        </button>
      </form>
    </section>
  );
}
