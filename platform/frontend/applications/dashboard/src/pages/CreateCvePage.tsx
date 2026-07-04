import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { ApiError } from "../api/generated";
import { createCve } from "../api/cvesApi";
import { getApiErrorMessage } from "../utils/apiError";
import PageHelpPanel from "../components/PageHelpPanel";
import { pageHelpMarkdown } from "../help/pageHelpMarkdown";

export default function CreateCvePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const formData = new FormData(e.target as HTMLFormElement);
    const cveId = (formData.get("cveId") as string).trim();
    createCve({ cveId })
      .then(() => {
        navigate("/cves");
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 409) {
          setError("This CVE is already registered.");
        } else {
          setError(getApiErrorMessage(err));
        }
      })
      .finally(() => setLoading(false));
  };

  if (loading) {
    return <div className="panel text-[var(--text-secondary)]">Creating CVE…</div>;
  }

  return (
    <section className="space-y-4">
      <PageHelpPanel markdown={pageHelpMarkdown.createCve} />
      <div className="panel">
        <p className="text-xs uppercase tracking-[0.25em] text-[var(--accent-cyan)]">Registry</p>
        <h2 className="mt-2 text-2xl font-semibold">Create CVE</h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Register a canonical CVE id (e.g. CVE-2021-44228). You can refresh intel after creation.
        </p>
      </div>

      {error ? <div className="panel text-[var(--status-critical)]">Error: {error}</div> : null}

      <form className="panel space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="mb-1 block text-sm text-[var(--text-secondary)]" htmlFor="cveId">
            CVE ID
          </label>
          <input
            className="neon-input font-mono"
            id="cveId"
            name="cveId"
            type="text"
            placeholder="CVE-2021-44228"
            required
            pattern="CVE-\d{4}-\d{4,}"
            title="Canonical CVE identifier (CVE-YYYY-nnnn+)"
          />
        </div>

        <div className="flex items-center gap-3">
          <button className="neon-button" type="submit">
            Create CVE
          </button>
          <Link className="neon-link text-sm" to="/cves">
            Cancel
          </Link>
        </div>
      </form>
    </section>
  );
}
