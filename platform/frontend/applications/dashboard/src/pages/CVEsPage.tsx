import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listCves, type ValidatedCveResponse } from "../api/cvesApi";
import { OpenCveForm } from "../components/OpenCveForm";
import { getCveListIntelSummary } from "../utils/cveIntelLabel";
import { formatTime, parseUnixSeconds } from "../utils/time";
import { getApiErrorMessage } from "../utils/apiError";
import { severityBadgeClass, severityLabel } from "../utils/cveSeverity";
import { CopyIdButton } from "../components/CopyIdButton";
import PageHelpPanel from "../components/PageHelpPanel";
import { pageHelpMarkdown } from "../help/pageHelpMarkdown";

const PAGE_SIZE = 50;

function CveListPager({
  pageIndex,
  rangeStart,
  rangeEnd,
  hasPrevious,
  hasNext,
  loading,
  onPrevious,
  onNext,
  borderClass,
}: {
  pageIndex: number;
  rangeStart: number;
  rangeEnd: number;
  hasPrevious: boolean;
  hasNext: boolean;
  loading: boolean;
  onPrevious: () => void;
  onNext: () => void;
  borderClass: string;
}) {
  return (
    <div className={`flex flex-wrap items-center justify-between gap-2 ${borderClass}`}>
      <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-3">
        <p className="text-xs text-[var(--text-muted)]">
          Showing {rangeStart}–{rangeEnd}
          {hasNext ? " (more on next page)" : null}
        </p>
        <span className="text-xs text-[var(--text-muted)]">Page {pageIndex + 1}</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="rounded border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--text-secondary)] hover:border-[var(--accent-cyan)]/50 hover:text-[var(--text-primary)] disabled:opacity-40"
          disabled={!hasPrevious || loading}
          onClick={onPrevious}
        >
          Previous
        </button>
        <button
          type="button"
          className="rounded border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--text-secondary)] hover:border-[var(--accent-cyan)]/50 hover:text-[var(--text-primary)] disabled:opacity-40"
          disabled={!hasNext || loading}
          onClick={onNext}
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default function CVEsPage() {
  const [cves, setCves] = useState<ValidatedCveResponse[]>([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const rows = await listCves(offset, PAGE_SIZE);
        if (!cancelled) {
          setCves(rows);
        }
      } catch (err) {
        if (!cancelled) {
          setError(getApiErrorMessage(err));
          setCves([]);
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
  }, [offset]);

  const pageIndex = Math.floor(offset / PAGE_SIZE);
  const hasPrevious = offset > 0;
  const hasNext = cves.length === PAGE_SIZE;
  const rangeStart = cves.length === 0 ? 0 : offset + 1;
  const rangeEnd = offset + cves.length;
  const showPager = hasPrevious || hasNext;
  const goPrevious = () => setOffset((o) => Math.max(0, o - PAGE_SIZE));
  const goNext = () => setOffset((o) => o + PAGE_SIZE);

  if (loading && offset === 0 && cves.length === 0 && !error) {
    return <div className="panel text-[var(--text-secondary)]">Loading CVE registry…</div>;
  }

  if (error && offset === 0 && cves.length === 0) {
    return <div className="panel text-[var(--status-critical)]">Error: {error}</div>;
  }

  return (
    <section className="space-y-4">
      <PageHelpPanel markdown={pageHelpMarkdown.cves} />
      <div className="panel flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-[var(--accent-cyan)]">Vulnerability Feed</p>
          <h2 className="text-2xl font-semibold">CVEs</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Browse registered CVEs by page, or open a CVE by id.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link className="neon-link text-sm" to="/">
            Home
          </Link>
          <Link className="neon-button text-sm" to="/cves/new">
            Create CVE
          </Link>
        </div>
      </div>

      <div className="panel">
        <OpenCveForm />
      </div>

      {error ? <div className="panel text-[var(--status-critical)]">Error: {error}</div> : null}

      <div className="panel space-y-4 overflow-x-auto">
        {loading ? (
          <p className="text-[var(--text-secondary)]">Loading…</p>
        ) : cves.length === 0 && offset === 0 ? (
          <p className="text-[var(--text-secondary)]">No CVEs registered yet.</p>
        ) : cves.length === 0 ? (
          <p className="text-[var(--text-secondary)]">No CVEs on this page.</p>
        ) : (
          <>
            {showPager ? (
              <CveListPager
                pageIndex={pageIndex}
                rangeStart={rangeStart}
                rangeEnd={rangeEnd}
                hasPrevious={hasPrevious}
                hasNext={hasNext}
                loading={loading}
                onPrevious={goPrevious}
                onNext={goNext}
                borderClass="border-b border-[var(--border)]/60 pb-4"
              />
            ) : (
              <p className="text-xs text-[var(--text-muted)]">
                Showing {rangeStart}–{rangeEnd}
              </p>
            )}
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-[var(--border)] text-[var(--text-muted)]">
                <tr>
                  <th className="pb-3 font-medium">CVE</th>
                  <th className="pb-3 font-medium">Severity</th>
                  <th className="pb-3 font-medium">Summary</th>
                  <th className="pb-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {cves.map((cve) => (
                  <tr className="border-b border-[var(--border)]/60" key={cve.cveId}>
                    <td className="py-3 font-mono font-medium text-[var(--text-primary)]">
                      <span className="inline-flex flex-wrap items-center gap-2">
                        {cve.cveId}
                        <CopyIdButton value={cve.cveId} idKind="CVE ID" />
                      </span>
                    </td>
                    <td className="py-3">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${severityBadgeClass(cve.severity)}`}
                      >
                        {severityLabel(cve.severity)}
                      </span>
                    </td>
                    <td
                      className="max-w-[min(28rem,45vw)] py-3 text-[var(--text-secondary)]"
                      title={`Intel updated: ${formatTime(parseUnixSeconds(cve.intelUpdatedAtUnixSeconds))}`}
                    >
                      <span className="line-clamp-2 text-left leading-snug">{getCveListIntelSummary(cve)}</span>
                    </td>
                    <td className="py-3 text-right">
                      <Link className="neon-link text-sm font-medium" to={`/cves/${encodeURIComponent(cve.cveId)}`}>
                        View &rarr;
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {showPager ? (
              <CveListPager
                pageIndex={pageIndex}
                rangeStart={rangeStart}
                rangeEnd={rangeEnd}
                hasPrevious={hasPrevious}
                hasNext={hasNext}
                loading={loading}
                onPrevious={goPrevious}
                onNext={goNext}
                borderClass="border-t border-[var(--border)]/60 pt-4"
              />
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
