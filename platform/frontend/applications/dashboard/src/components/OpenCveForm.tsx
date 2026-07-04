import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { normalizeCanonicalCveId } from "../api/cvesApi";

export function OpenCveForm() {
  const navigate = useNavigate();
  const [cveIdInput, setCveIdInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const cveId = normalizeCanonicalCveId(cveIdInput);
    if (!cveId) {
      setError("Enter a canonical CVE id (e.g. CVE-2021-44228).");
      return;
    }
    navigate(`/cves/${encodeURIComponent(cveId)}`);
  };

  return (
    <form onSubmit={handleSubmit}>
      <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]" htmlFor="open-cve-id">
        Open CVE
      </label>
      <div className="flex max-w-md items-stretch gap-2">
        <input
          id="open-cve-id"
          className="neon-input min-w-0 flex-1 font-mono text-sm"
          type="text"
          autoComplete="off"
          placeholder="CVE-2021-44228"
          value={cveIdInput}
          onChange={(e) => {
            setCveIdInput(e.target.value);
            if (error) {
              setError(null);
            }
          }}
        />
        <button className="neon-button shrink-0 text-sm" type="submit">
          Open
        </button>
      </div>
      {error ? <p className="mt-1 text-xs text-[var(--status-critical)]">{error}</p> : null}
    </form>
  );
}
