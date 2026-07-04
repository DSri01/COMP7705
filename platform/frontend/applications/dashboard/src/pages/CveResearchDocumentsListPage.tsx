import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CveResearchDocumentsService, type CveResearchDocumentResponseDto } from "../api/generated";
import { formatTime, parseUnixSeconds } from "../utils/time";
import { getApiErrorMessage } from "../utils/apiError";
import { CopyIdButton } from "../components/CopyIdButton";
import CveResearchDocumentSourceBadge from "../components/CveResearchDocumentSourceBadge";
import PageHelpPanel from "../components/PageHelpPanel";
import { pageHelpMarkdown } from "../help/pageHelpMarkdown";

export default function CveResearchDocumentsListPage() {
  const { cveId: cveIdParam } = useParams();
  const cveId = cveIdParam ? decodeURIComponent(cveIdParam) : "";
  const [docs, setDocs] = useState<CveResearchDocumentResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await Promise.resolve();
      if (cancelled) {
        return;
      }
      if (!cveId) {
        setError("CVE id missing.");
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const rows = await CveResearchDocumentsService.cveResearchDocumentsControllerList(cveId);
        if (!cancelled) {
          setDocs(rows);
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
  }, [cveId]);

  if (loading) {
    return <div className="panel text-[var(--text-secondary)]">Loading documents…</div>;
  }

  if (error) {
    return (
      <section className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Link className="neon-button text-sm" to={`/cves/${encodeURIComponent(cveId)}`}>
            Back to CVE
          </Link>
          <Link className="neon-link text-sm" to="/cves">
            All CVEs
          </Link>
        </div>
        <div className="panel text-[var(--status-critical)]">Error: {error}</div>
      </section>
    );
  }

  const encoded = encodeURIComponent(cveId);

  return (
    <section className="space-y-4">
      <PageHelpPanel markdown={pageHelpMarkdown.cveResearchDocumentsList} />
      <div className="flex flex-wrap items-center gap-3">
        <Link className="neon-button text-sm" to={`/cves/${encoded}`}>
          Back to CVE
        </Link>
        <Link className="neon-link text-sm" to="/cves">
          All CVEs
        </Link>
      </div>

      <div className="panel flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-[var(--accent-cyan)]">Research</p>
          <h2 className="flex flex-wrap items-center gap-2 font-mono text-2xl font-semibold">
            <span>Documents ·</span>
            <span className="inline-flex flex-wrap items-center gap-2">
              {cveId}
              <CopyIdButton value={cveId} idKind="CVE ID" />
            </span>
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">Notes, uploads, and fetched API payloads.</p>
        </div>
        <Link className="neon-button text-sm" to={`/cves/${encoded}/research-documents/new`}>
          New document
        </Link>
      </div>

      <div className="grid gap-3">
        {docs.length === 0 ? (
          <div className="panel text-[var(--text-secondary)]">No research documents yet.</div>
        ) : (
          docs.map((doc) => (
            <article className="panel flex flex-col gap-2 md:flex-row md:items-center md:justify-between" key={doc.id}>
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">{doc.title}</h3>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
                  <CveResearchDocumentSourceBadge source={doc.source} />
                  <span>{formatTime(parseUnixSeconds(doc.createdAtUnixSeconds))}</span>
                </p>
              </div>
              <Link className="neon-link text-sm font-medium" to={`/cves/${encoded}/research-documents/${doc.id}`}>
                Open &rarr;
              </Link>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
