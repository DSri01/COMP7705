import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { IntelHighlightsColumn } from "../api/schemas/intelligence_highlights_schema";
import { severityBadgeClass, severityLabel } from "../utils/cveSeverity";
import type { CveSeverity } from "../utils/cveSeverity";

const CPE_PAGE_SIZE = 5;

/** NVD API field keys → readable labels (avoid raw camelCase in UI). */
const CISA_ON_NVD_FIELD_LABELS = {
  cisaExploitAdd: "Exploit added",
  cisaActionDue: "Action due",
  cisaRequiredAction: "Required action",
  cisaVulnerabilityName: "Vulnerability name",
} as const satisfies Record<
  "cisaExploitAdd" | "cisaActionDue" | "cisaRequiredAction" | "cisaVulnerabilityName",
  string
>;

/** Shared style for metadata field names — no `uppercase` (font + tracking already feel loud). */
const fieldNameClass =
  "text-xs font-medium tracking-normal text-[var(--text-muted)] normal-case";

const sectionHeadingClass =
  "text-xs font-semibold tracking-wide text-[var(--accent-cyan)] normal-case";

type NvdHighlight = NonNullable<IntelHighlightsColumn["nvd"]>;
type CpeMatch = NvdHighlight["cpeMatches"][number];
type EpssHighlight = NonNullable<IntelHighlightsColumn["epss"]>;
type KevHighlight = NonNullable<IntelHighlightsColumn["kev"]>;

function isCveSeverity(s: string): s is CveSeverity {
  return s === "CRITICAL" || s === "HIGH" || s === "MEDIUM" || s === "LOW" || s === "UNKNOWN";
}

const cweChipClass =
  "inline-flex min-w-0 items-center justify-center rounded border border-[var(--border)]/80 bg-[var(--text-primary)]/[0.02] px-2 py-1 font-mono text-xs text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-cyan)]/50 hover:text-[var(--text-primary)]";

/** `CWE-917` → `https://cwe.mitre.org/data/definitions/917.html` */
function mitreCweDefinitionUrl(cweId: string): string | null {
  const m = /^CWE-(\d+)$/i.exec(cweId.trim());
  return m ? `https://cwe.mitre.org/data/definitions/${m[1]}.html` : null;
}

function CweDefinitionLink({ id }: { id: string }) {
  const href = mitreCweDefinitionUrl(id);
  if (href == null) {
    return <span className={cweChipClass}>{id}</span>;
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${cweChipClass} cursor-pointer`}
      title={`Open ${id} on MITRE CWE (new tab)`}
      aria-label={`Open ${id} in MITRE CWE catalog in a new tab`}
    >
      {id}
    </a>
  );
}

function CpeMatchesPager({ matches }: { matches: CpeMatch[] }) {
  const [page, setPage] = useState(0);
  const total = matches.length;
  const totalPages = Math.max(1, Math.ceil(total / CPE_PAGE_SIZE));

  useEffect(() => {
    setPage(0);
  }, [matches]);

  useEffect(() => {
    setPage((p) => Math.min(p, Math.max(0, totalPages - 1)));
  }, [totalPages]);

  const effectivePage = Math.min(page, totalPages - 1);
  const start = effectivePage * CPE_PAGE_SIZE;
  const pageRows = useMemo(() => matches.slice(start, start + CPE_PAGE_SIZE), [matches, start]);

  if (total === 0) {
    return <p className="text-sm text-[var(--text-secondary)]">No CPE matches in this projection.</p>;
  }

  const rangeLabel = `Showing ${start + 1}–${Math.min(start + CPE_PAGE_SIZE, total)} of ${total}`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-muted)]">
        <span>Affected products (CPE)</span>
        <span>{rangeLabel}</span>
      </div>
      <div className="max-h-72 overflow-y-auto rounded-md border border-[var(--border)]/80 bg-[var(--text-primary)]/[0.02]">
        <ul className="divide-y divide-[var(--border)]/60">
          {pageRows.map((m) => (
            <li key={`${m.matchCriteriaId}-${m.criteria}`} className="px-3 py-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-normal normal-case ${
                    m.vulnerable
                      ? "border border-[var(--status-high)]/50 bg-[var(--status-high)]/15 text-[var(--status-high)]"
                      : "border border-[var(--border)] bg-[var(--text-muted)]/10 text-[var(--text-muted)]"
                  }`}
                >
                  {m.vulnerable ? "Vulnerable" : "Not vulnerable"}
                </span>
                <code className="break-all font-mono text-[11px] leading-snug text-[var(--text-primary)]">
                  {m.criteria}
                </code>
              </div>
              {(m.versionStartIncluding ??
                m.versionStartExcluding ??
                m.versionEndIncluding ??
                m.versionEndExcluding) != null ? (
                <p className="mt-1.5 text-[10px] text-[var(--text-muted)]">
                  {[
                    m.versionStartIncluding ? `start ≥ ${m.versionStartIncluding}` : null,
                    m.versionStartExcluding ? `start > ${m.versionStartExcluding}` : null,
                    m.versionEndIncluding ? `end ≤ ${m.versionEndIncluding}` : null,
                    m.versionEndExcluding ? `end < ${m.versionEndExcluding}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
      {totalPages > 1 ? (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            className="rounded border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--text-secondary)] hover:border-[var(--accent-cyan)]/50 hover:text-[var(--text-primary)] disabled:opacity-40"
            disabled={effectivePage <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Previous
          </button>
          <span className="text-xs text-[var(--text-muted)]">
            Page {effectivePage + 1} / {totalPages}
          </span>
          <button
            type="button"
            className="rounded border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--text-secondary)] hover:border-[var(--accent-cyan)]/50 hover:text-[var(--text-primary)] disabled:opacity-40"
            disabled={effectivePage >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}

function NvdPanel({ nvd }: { nvd: NvdHighlight }) {
  const cvss = nvd.primaryCvss;
  const cisa = nvd.cisaOnNvd;
  const cisaEntries: { id: keyof typeof CISA_ON_NVD_FIELD_LABELS; label: string; value: string }[] = [];
  if (cisa) {
    if (cisa.cisaExploitAdd) {
      cisaEntries.push({ id: "cisaExploitAdd", label: CISA_ON_NVD_FIELD_LABELS.cisaExploitAdd, value: cisa.cisaExploitAdd });
    }
    if (cisa.cisaActionDue) {
      cisaEntries.push({ id: "cisaActionDue", label: CISA_ON_NVD_FIELD_LABELS.cisaActionDue, value: cisa.cisaActionDue });
    }
    if (cisa.cisaRequiredAction) {
      cisaEntries.push({
        id: "cisaRequiredAction",
        label: CISA_ON_NVD_FIELD_LABELS.cisaRequiredAction,
        value: cisa.cisaRequiredAction,
      });
    }
    if (cisa.cisaVulnerabilityName) {
      cisaEntries.push({
        id: "cisaVulnerabilityName",
        label: CISA_ON_NVD_FIELD_LABELS.cisaVulnerabilityName,
        value: cisa.cisaVulnerabilityName,
      });
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h4 className={sectionHeadingClass}>Description</h4>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">{nvd.description}</p>
      </div>

      <div>
        <h4 className={sectionHeadingClass}>Primary CVSS</h4>
        {cvss == null ? (
          <p className="mt-2 text-sm text-[var(--text-secondary)]">No CVSS metric selected for display.</p>
        ) : (
          <div className="mt-2 flex flex-wrap items-start gap-3 rounded-md border border-[var(--border)]/80 bg-[var(--text-primary)]/[0.02] p-3">
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                isCveSeverity(cvss.baseSeverity) ? severityBadgeClass(cvss.baseSeverity) : severityBadgeClass("UNKNOWN")
              }`}
            >
              {isCveSeverity(cvss.baseSeverity) ? severityLabel(cvss.baseSeverity) : cvss.baseSeverity}
            </span>
            <div className="min-w-0 flex-1 space-y-1 text-sm">
              <p className="font-mono text-[var(--text-primary)]">
                CVSS {cvss.version} · <span className="text-[var(--text-secondary)]">score {cvss.baseScore}</span>
              </p>
              <p className="break-all font-mono text-xs text-[var(--text-muted)]">{cvss.vectorString}</p>
            </div>
          </div>
        )}
      </div>

      {(nvd.cweIds?.length ?? 0) > 0 ? (
        <div>
          <h4 className={sectionHeadingClass}>CWEs</h4>
          <ul className="mt-2 flex flex-wrap gap-2">
            {(nvd.cweIds ?? []).map((id) => (
              <li key={id}>
                <CweDefinitionLink id={id} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {cisaEntries.length > 0 ? (
        <div>
          <h4 className={sectionHeadingClass}>CISA (on NVD)</h4>
          <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-1">
            {cisaEntries.map((row) => (
              <div key={row.id} className="rounded border border-[var(--border)]/60 px-3 py-2">
                <dt className={fieldNameClass}>{row.label}</dt>
                <dd className="mt-1 text-[var(--text-secondary)]">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      <div>
        <h4 className={sectionHeadingClass}>Configuration (CPE)</h4>
        <div className="mt-2">
          <CpeMatchesPager matches={nvd.cpeMatches} />
        </div>
      </div>
    </div>
  );
}

function EpssPanel({ epss }: { epss: EpssHighlight }) {
  const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div className="rounded-md border border-[var(--border)]/80 bg-[var(--text-primary)]/[0.02] p-3">
        <p className={fieldNameClass}>EPSS (30d)</p>
        <p className="mt-1 font-mono text-xl font-semibold text-[var(--accent-cyan)]">{pct(epss.epss)}</p>
      </div>
      <div className="rounded-md border border-[var(--border)]/80 bg-[var(--text-primary)]/[0.02] p-3">
        <p className={fieldNameClass}>Percentile</p>
        <p className="mt-1 font-mono text-xl font-semibold text-[var(--text-primary)]">{pct(epss.percentile)}</p>
      </div>
      <div className="rounded-md border border-[var(--border)]/80 bg-[var(--text-primary)]/[0.02] p-3 sm:col-span-1">
        <p className={fieldNameClass}>Score date</p>
        <p className="mt-1 font-mono text-sm text-[var(--text-secondary)]">{epss.date ?? "—"}</p>
        <p className="mt-2 font-mono text-xs text-[var(--text-muted)]">{epss.cve}</p>
      </div>
    </div>
  );
}

function KevPanel({ kev }: { kev: KevHighlight }) {
  if (!kev.listed) {
    return (
      <p className="text-sm text-[var(--text-secondary)]">
        This CVE is <span className="font-medium text-[var(--text-primary)]">not</span> listed in the CISA Known Exploited
        Vulnerabilities catalog (in this projection).
      </p>
    );
  }

  const rows: [string, string][] = [
    ["CVE", kev.cveID],
    ["Vendor / project", kev.vendorProject],
    ["Product", kev.product],
    ["Vulnerability", kev.vulnerabilityName],
    ["Date added", kev.dateAdded],
    ["Due date", kev.dueDate],
    ["Required action", kev.requiredAction],
    ["Short description", kev.shortDescription],
  ];
  if (kev.knownRansomwareCampaignUse) {
    rows.push(["Ransomware campaign use", kev.knownRansomwareCampaignUse]);
  }

  return (
    <div className="space-y-3">
      <p className="inline-flex rounded-full border border-[var(--status-critical)]/50 bg-[var(--status-critical)]/10 px-2.5 py-1 text-xs font-semibold text-[var(--status-critical)]">
        Listed in CISA KEV
      </p>
      <dl className="grid gap-3 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-md border border-[var(--border)]/60 px-3 py-2">
            <dt className={fieldNameClass}>{label}</dt>
            <dd className="mt-1 whitespace-pre-wrap text-[var(--text-secondary)]">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function SubPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-[var(--border)]/70 bg-[var(--text-primary)]/[0.015] p-4">
      <h3 className="border-b border-[var(--border)]/50 pb-2 font-semibold text-[var(--text-primary)]">{title}</h3>
      <div className="pt-4">{children}</div>
    </div>
  );
}

export function IntelHighlightsSection({ highlights }: { highlights: IntelHighlightsColumn | null }) {
  if (highlights == null) {
    return (
      <p className="text-sm text-[var(--text-secondary)]">
        Intelligence highlights have not been loaded yet. Use <span className="font-medium text-[var(--text-primary)]">Update intel</span>{" "}
        to fetch NVD / EPSS and merge KEV.
      </p>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-1">
      <SubPanel title="NVD">
        {highlights.nvd == null ? (
          <p className="text-sm text-[var(--text-secondary)]">No NVD projection stored for this CVE.</p>
        ) : (
          <NvdPanel nvd={highlights.nvd} />
        )}
      </SubPanel>

      <SubPanel title="EPSS">
        {highlights.epss == null ? (
          <p className="text-sm text-[var(--text-secondary)]">No EPSS data stored for this CVE.</p>
        ) : (
          <EpssPanel epss={highlights.epss} />
        )}
      </SubPanel>

      <SubPanel title="CISA KEV">
        {highlights.kev == null ? (
          <p className="text-sm text-[var(--text-secondary)]">No KEV projection stored for this CVE.</p>
        ) : (
          <KevPanel kev={highlights.kev} />
        )}
      </SubPanel>
    </div>
  );
}
