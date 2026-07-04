import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CveResearchDocumentsService, type CveResearchDocumentResponseDto } from "../api/generated";
import { formatTime, parseUnixSeconds } from "../utils/time";
import { getApiErrorMessage } from "../utils/apiError";
import { CopyIdButton } from "../components/CopyIdButton";
import CveResearchDocumentSourceBadge from "../components/CveResearchDocumentSourceBadge";
import { SafeMarkdown } from "../components/markdown/SafeMarkdown";
import { prepareResearchDocumentContent } from "../utils/prepareResearchDocumentContent";
import PageHelpPanel from "../components/PageHelpPanel";
import { pageHelpMarkdown } from "../help/pageHelpMarkdown";

export default function CveResearchDocumentDetailPage() {
  const { cveId: cveIdParam, documentId } = useParams();
  const cveId = cveIdParam ? decodeURIComponent(cveIdParam) : "";
  const [doc, setDoc] = useState<CveResearchDocumentResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          setDoc(row);
        }
      } catch (err) {
        if (!cancelled) {
          setError(getApiErrorMessage(err));
          setDoc(null);
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

  const encoded = encodeURIComponent(cveId);

  if (loading) {
    return <div className="panel text-[var(--text-secondary)]">Loading document…</div>;
  }

  if (error || !doc) {
    return (
      <section className="space-y-4">
        <Link className="neon-button text-sm" to={`/cves/${encoded}/research-documents`}>
          Back to documents
        </Link>
        <div className="panel text-[var(--status-critical)]">Error: {error ?? "Not found."}</div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <PageHelpPanel markdown={pageHelpMarkdown.cveResearchDocumentDetail} />
      <div className="flex flex-wrap items-center gap-3">
        <Link className="neon-button text-sm" to={`/cves/${encoded}/research-documents`}>
          Back to list
        </Link>
        <Link className="neon-button text-sm" to={`/cves/${encoded}/research-documents/${doc.id}/edit`}>
          Edit
        </Link>
        <Link
          className="neon-button border-[var(--status-critical)]/50 text-sm text-[var(--status-critical)]"
          to={`/cves/${encoded}/research-documents/${doc.id}/delete`}
        >
          Delete
        </Link>
      </div>

      <div className="panel space-y-3">
        <p className="text-xs uppercase tracking-[0.25em] text-[var(--accent-magenta)]">Research document</p>
        <h2 className="text-2xl font-semibold text-[var(--text-primary)]">{doc.title}</h2>
        <dl className="grid gap-2 text-sm md:grid-cols-2">
          <div>
            <dt className="font-semibold text-[var(--accent-cyan)]">CVE</dt>
            <dd className="font-mono text-[var(--text-primary)]">
              <span className="inline-flex flex-wrap items-center gap-2 break-all">
                {doc.cveId}
                <CopyIdButton value={doc.cveId} idKind="CVE ID" />
              </span>
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-[var(--accent-cyan)]">Source</dt>
            <dd><CveResearchDocumentSourceBadge source={doc.source} /></dd>
          </div>
          <div>
            <dt className="font-semibold text-[var(--accent-cyan)]">Id</dt>
            <dd className="font-mono text-xs text-[var(--text-primary)]">{doc.id}</dd>
          </div>
          <div>
            <dt className="font-semibold text-[var(--accent-cyan)]">Created</dt>
            <dd className="text-[var(--text-primary)]">{formatTime(parseUnixSeconds(doc.createdAtUnixSeconds))}</dd>
          </div>
        </dl>
      </div>

      <div className="panel space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-cyan)]">Content</h3>
        <div className="max-h-[32rem] overflow-auto">
          <SafeMarkdown content={prepareResearchDocumentContent(doc.content)} />
        </div>
      </div>
    </section>
  );
}
