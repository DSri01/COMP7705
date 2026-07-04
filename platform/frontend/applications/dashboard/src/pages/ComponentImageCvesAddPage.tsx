import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import BackToComponentBar from "../components/BackToComponentBar";
import { parseFsScannerExport } from "../api/schemas/fs_scanner_export_schema";
import {
  createCvesForImport,
  linkImageCves,
  normalizeAndDedupeCveIds,
} from "../api/imageCvesApi";
import { getApiErrorMessage } from "../utils/apiError";
import PageHelpPanel from "../components/PageHelpPanel";
import { pageHelpMarkdown } from "../help/pageHelpMarkdown";

function importSummaryMessage(
  createdCount: number,
  existsCount: number,
  linkedCount: number,
  failedLines: string[],
): string {
  const lines = [
    `Import finished.`,
    `Created CVEs: ${createdCount}`,
    `Already existing CVEs: ${existsCount}`,
    `Linked to current image: ${linkedCount}`,
  ];
  if (failedLines.length > 0) {
    lines.push("Failed CVEs:");
    lines.push(...failedLines);
  }
  return lines.join("\n");
}

export default function ComponentImageCvesAddPage() {
  const { projectId, componentId } = useParams();
  const navigate = useNavigate();
  const [singleCveId, setSingleCveId] = useState("");
  const [importPayload, setImportPayload] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!projectId || !componentId) {
    return <div className="panel text-[var(--status-critical)]">Invalid route.</div>;
  }

  const componentPath = `/projects/${projectId}/components/${componentId}`;

  const handleSingleAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const deduped = normalizeAndDedupeCveIds([singleCveId]);
    if (deduped.length === 0) {
      setBusy(false);
      setError("Enter a canonical CVE id (e.g. CVE-2021-44228).");
      return;
    }

    createCvesForImport(deduped)
      .then(async (createResult) => {
        const linkable = [...createResult.created, ...createResult.alreadyExists];
        if (linkable.length > 0) {
          await linkImageCves(projectId, componentId, linkable);
        }
        if (createResult.failed.length > 0) {
          const failedLines = createResult.failed.map((f) => `${f.cveId}: ${f.reason}`);
          window.alert(importSummaryMessage(
            createResult.created.length,
            createResult.alreadyExists.length,
            linkable.length,
            failedLines,
          ));
        }
        navigate(componentPath);
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setBusy(false));
  };

  const handleImport = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setError(null);

    let scanner;
    try {
      const parsedJson: unknown = JSON.parse(importPayload);
      scanner = parseFsScannerExport(parsedJson);
    } catch (err) {
      setBusy(false);
      setError(getApiErrorMessage(err));
      return;
    }

    const deduped = normalizeAndDedupeCveIds(scanner.VulnerabilityIDs);
    if (deduped.length === 0) {
      setBusy(false);
      setError("No canonical CVE ids found in import payload.");
      return;
    }

    createCvesForImport(deduped)
      .then(async (createResult) => {
        const linkable = [...createResult.created, ...createResult.alreadyExists];
        let linkedCount = 0;
        if (linkable.length > 0) {
          await linkImageCves(projectId, componentId, linkable);
          linkedCount = linkable.length;
        }
        const failedLines = createResult.failed.map((f) => `${f.cveId}: ${f.reason}`);
        window.alert(importSummaryMessage(
          createResult.created.length,
          createResult.alreadyExists.length,
          linkedCount,
          failedLines,
        ));
        navigate(componentPath);
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setBusy(false));
  };

  const onImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      setImportPayload(text);
    };
    reader.readAsText(file);
  };

  return (
    <section className="flex flex-col gap-6">
      <PageHelpPanel markdown={pageHelpMarkdown.componentImageCvesAdd} />
      <BackToComponentBar projectId={projectId} componentId={componentId}>
        <Link className="neon-link text-sm" to={componentPath}>
          Back to component
        </Link>
      </BackToComponentBar>

      {error ? <div className="panel text-[var(--status-critical)]">Error: {error}</div> : null}

      <form className="panel space-y-4" onSubmit={handleSingleAdd}>
        <p className="text-xs uppercase tracking-[0.25em] text-[var(--accent-magenta)]">Add single CVE</p>
        <input
          className="neon-input font-mono"
          value={singleCveId}
          onChange={(e) => setSingleCveId(e.target.value)}
          placeholder="CVE-2021-44228"
          pattern="CVE-[0-9]{4}-[0-9]{4,}"
          required
        />
        <button className="neon-button" type="submit" disabled={busy}>
          {busy ? "Processing…" : "Create + link"}
        </button>
      </form>

      <form className="panel space-y-4" onSubmit={handleImport}>
        <p className="text-xs uppercase tracking-[0.25em] text-[var(--accent-magenta)]">Import scanner JSON</p>
        <p className="text-sm text-[var(--text-secondary)]">
          Expected shape: {`{"VulnerabilityIDs":["CVE-..."]}`}
        </p>
        <input className="neon-input" type="file" accept="application/json,.json" onChange={onImportFileChange} />
        <textarea
          className="neon-input min-h-48 resize-y font-mono text-xs"
          value={importPayload}
          onChange={(e) => setImportPayload(e.target.value)}
          placeholder='{"VulnerabilityIDs":["CVE-2021-44228"]}'
          required
        />
        <button className="neon-button" type="submit" disabled={busy}>
          {busy ? "Processing…" : "Import + link"}
        </button>
      </form>
    </section>
  );
}

