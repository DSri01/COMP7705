import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { IntelHighlightsSection } from "../components/IntelHighlightsSection";
import { getCveById, refreshCveIntel, type ValidatedCveResponse } from "../api/cvesApi";
import { formatTime, parseUnixSeconds } from "../utils/time";
import { getApiErrorMessage } from "../utils/apiError";
import { severityBadgeClass, severityLabel } from "../utils/cveSeverity";
import { CopyIdButton } from "../components/CopyIdButton";
import { DescriptionMarkdownPanel } from "../components/markdown/DescriptionMarkdownPanel";
import PageHelpPanel from "../components/PageHelpPanel";
import { pageHelpMarkdown } from "../help/pageHelpMarkdown";

export default function CveDetailPage() {
  const { cveId: cveIdParam } = useParams();
  const cveId = cveIdParam ? decodeURIComponent(cveIdParam) : "";
  const [cve, setCve] = useState<ValidatedCveResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);

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
      setError(null);
      try {
        const row = await getCveById(cveId);
        if (!cancelled) {
          setCve(row);
        }
      } catch (err) {
        if (!cancelled) {
          setError(getApiErrorMessage(err));
          setCve(null);
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

  const handleRefreshIntel = () => {
    if (!cveId) {
      return;
    }
    setRefreshError(null);
    setRefreshing(true);
    refreshCveIntel(cveId)
      .then(setCve)
      .catch((err) => {
        setRefreshError(getApiErrorMessage(err));
      })
      .finally(() => setRefreshing(false));
  };

  if (loading) {
    return <div className="panel text-[var(--text-secondary)]">Loading CVE…</div>;
  }

  if (error || !cve) {
    return (
      <section className="space-y-4">
        <Link className="neon-button text-sm" to="/cves">
          Back to CVEs
        </Link>
        <div className="panel text-[var(--status-critical)]">Error: {error ?? "CVE not found."}</div>
      </section>
    );
  }

  const highlights = cve.intelHighlights ?? null;
  const minimizedSummary = cve.researchSummary ? `${cve.researchSummary.slice(0, 5)}...` : "—";

  return (
    <section className="space-y-4">
      <PageHelpPanel markdown={pageHelpMarkdown.cveDetail} />
      <div className="flex flex-wrap items-center gap-3">
        <Link className="neon-button text-sm" to="/cves">
          Back to CVEs
        </Link>
        <Link className="neon-button text-sm" to={`/cves/${encodeURIComponent(cve.cveId)}/research-documents`}>
          Research documents
        </Link>
      </div>

      <div className="panel space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-medium tracking-wide text-[var(--accent-magenta)] normal-case">CVE</p>
            <div className="mt-2 flex flex-wrap items-end gap-2">
              <h2 className="font-mono text-2xl font-semibold text-[var(--text-primary)]">{cve.cveId}</h2>
              <CopyIdButton value={cve.cveId} idKind="CVE ID" className="mb-1" />
            </div>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Intel last attempt: {formatTime(parseUnixSeconds(cve.intelLastAttemptAtUnixSeconds))} · Intel updated:{" "}
              {formatTime(parseUnixSeconds(cve.intelUpdatedAtUnixSeconds))}
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 md:items-end">
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${severityBadgeClass(cve.severity)}`}
            >
              {severityLabel(cve.severity)}
            </span>
            <button
              className="neon-button text-sm"
              type="button"
              disabled={refreshing}
              onClick={handleRefreshIntel}
            >
              {refreshing ? "Refreshing…" : "Update intel"}
            </button>
          </div>
        </div>
        {refreshError ? <p className="text-sm text-[var(--status-critical)]">{refreshError}</p> : null}
      </div>

      <div className="panel space-y-4">
        <p className="text-xs font-medium tracking-wide text-[var(--accent-magenta)] normal-case">Intel highlights</p>
        <IntelHighlightsSection highlights={highlights} />
      </div>

      <div className="panel space-y-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-medium tracking-wide text-[var(--accent-magenta)] normal-case">
            Research summary
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Link className="neon-button text-xs" to={`/cves/${encodeURIComponent(cve.cveId)}/research-summary`}>
              Update summary
            </Link>
            <button
              className="neon-button text-xs"
              type="button"
              onClick={() => setIsSummaryExpanded((prev) => !prev)}
            >
              {isSummaryExpanded ? "Minimize Summary" : "Maximize Summary"}
            </button>
          </div>
        </div>
        {isSummaryExpanded ? (
          <DescriptionMarkdownPanel content={cve.researchSummary} />
        ) : (
          <p className="whitespace-pre-wrap text-sm text-[var(--text-secondary)]">{minimizedSummary}</p>
        )}
      </div>
    </section>
  );
}
