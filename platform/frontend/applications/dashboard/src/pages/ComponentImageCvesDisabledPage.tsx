import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import BackToComponentBar from "../components/BackToComponentBar";
import PageHelpPanel from "../components/PageHelpPanel";
import { pageHelpMarkdown } from "../help/pageHelpMarkdown";
import { listDisabledImageCves, type ValidatedImageCveListItem } from "../api/imageCvesApi";
import { getApiErrorMessage } from "../utils/apiError";
import SeverityBadge from "../components/SeverityBadge";
import ImageCveSourceBadge from "../components/ImageCveSourceBadge";
import ImageCveDisableBadge from "../components/ImageCveDisableBadge";

export default function ComponentImageCvesDisabledPage() {
  const { projectId, componentId } = useParams();
  const [rows, setRows] = useState<ValidatedImageCveListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId || !componentId) {
      setLoading(false);
      setError("Missing route parameters.");
      return;
    }
    let cancelled = false;
    listDisabledImageCves(projectId, componentId)
      .then((response) => {
        if (!cancelled) {
          setRows(response.imageCves);
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
  }, [projectId, componentId]);

  if (!projectId || !componentId) {
    return <div className="panel text-[var(--status-critical)]">Invalid route.</div>;
  }

  if (loading) {
    return <div className="panel text-[var(--text-secondary)]">Loading disabled CVEs…</div>;
  }

  if (error) {
    return <div className="panel text-[var(--status-critical)]">Error: {error}</div>;
  }

  return (
    <section className="flex flex-col gap-6">
      <PageHelpPanel markdown={pageHelpMarkdown.componentImageCvesDisabled} />
      <BackToComponentBar projectId={projectId} componentId={componentId} />

      <div className="panel space-y-4">
        <p className="text-xs uppercase tracking-[0.25em] text-[var(--accent-magenta)]">Disabled CVEs</p>
        {rows.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">No disabled CVEs on the current image.</p>
        ) : (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-[var(--border)] text-[var(--text-muted)]">
              <tr>
                <th className="pb-3 font-medium">CVE</th>
                <th className="pb-3 font-medium">Severity</th>
                <th className="pb-3 font-medium">Source</th>
                <th className="pb-3 font-medium">Disable</th>
                <th className="pb-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.imageCveId} className="border-b border-[var(--border)]/60">
                  <td className="py-3">
                    <a
                      className="neon-link font-mono text-sm"
                      href={`/cves/${encodeURIComponent(row.cveId)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {row.cveId}
                    </a>
                  </td>
                  <td className="py-3"><SeverityBadge severity={row.severity} /></td>
                  <td className="py-3"><ImageCveSourceBadge source={row.source} /></td>
                  <td className="py-3"><ImageCveDisableBadge disableState={row.disableState} /></td>
                  <td className="py-3">
                    <Link
                      className="neon-link text-sm"
                      to={`/projects/${projectId}/components/${componentId}/image-cves/${row.imageCveId}/enable`}
                    >
                      Enable
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

