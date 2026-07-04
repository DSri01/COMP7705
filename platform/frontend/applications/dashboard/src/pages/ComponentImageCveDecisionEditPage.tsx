import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import BackToComponentBar from "../components/BackToComponentBar";
import {
  getImageCveById,
  updateImageCveDecision,
  type UpdateImageCveDecisionInput,
  type ValidatedImageCveDetail,
} from "../api/imageCvesApi";
import { getApiErrorMessage } from "../utils/apiError";
import ExpiryUnixInput from "../components/ExpiryUnixInput";
import PageHelpPanel from "../components/PageHelpPanel";
import { pageHelpMarkdown } from "../help/pageHelpMarkdown";

type DecisionStatus = "under_investigation" | "not_affected" | "affected";
type NotAffectedJustification =
  | "component_not_present"
  | "vulnerable_code_not_present"
  | "vulnerable_code_not_in_execute_path"
  | "vulnerable_code_cannot_be_controlled_by_adversary"
  | "inline_mitigations_already_exist";

export default function ComponentImageCveDecisionEditPage() {
  const { projectId, componentId, imageCveId } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<ValidatedImageCveDetail | null>(null);
  const [status, setStatus] = useState<DecisionStatus>("under_investigation");
  const [justification, setJustification] = useState<NotAffectedJustification>("component_not_present");
  const [impactStatement, setImpactStatement] = useState("");
  const [actionStatement, setActionStatement] = useState("");
  const [statusNotes, setStatusNotes] = useState("");
  const [expiryTimeUnixSeconds, setExpiryTimeUnixSeconds] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!projectId || !componentId || !imageCveId) {
    return <div className="panel text-[var(--status-critical)]">Invalid route.</div>;
  }

  const detailPath = `/projects/${projectId}/components/${componentId}/image-cves/${imageCveId}`;

  useEffect(() => {
    let cancelled = false;
    getImageCveById(projectId, componentId, imageCveId)
      .then((response) => {
        if (cancelled) {
          return;
        }
        setDetail(response);
        if (response.decision.status === "under_investigation") {
          setStatus("under_investigation");
          return;
        }
        if (response.decision.status === "not_affected") {
          setStatus("not_affected");
          setJustification(response.decision.justification as NotAffectedJustification);
          setImpactStatement(response.decision.impact_statement);
          setStatusNotes(response.decision.status_notes);
          setExpiryTimeUnixSeconds(response.decision.expiryTimeUnixSeconds);
          return;
        }
        setStatus("affected");
        setActionStatement(response.decision.action_statement);
        setStatusNotes(response.decision.status_notes);
        setExpiryTimeUnixSeconds(response.decision.expiryTimeUnixSeconds);
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
  }, [projectId, componentId, imageCveId]);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    let payload: UpdateImageCveDecisionInput;
    if (status === "under_investigation") {
      payload = { status };
    } else if (status === "not_affected") {
      payload = {
        status,
        justification,
        impact_statement: impactStatement,
        status_notes: statusNotes,
        expiryTimeUnixSeconds,
      };
    } else {
      payload = {
        status,
        action_statement: actionStatement,
        status_notes: statusNotes,
        expiryTimeUnixSeconds,
      };
    }

    setSaving(true);
    setError(null);
    updateImageCveDecision(projectId, componentId, imageCveId, payload)
      .then(() => navigate(detailPath))
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setSaving(false));
  };

  if (loading) {
    return <div className="panel text-[var(--text-secondary)]">Loading decision editor…</div>;
  }

  if (error || !detail) {
    return <div className="panel text-[var(--status-critical)]">Error: {error ?? "Not found"}</div>;
  }

  return (
    <section className="flex flex-col gap-6">
      <PageHelpPanel markdown={pageHelpMarkdown.componentImageCveDecision} />
      <BackToComponentBar projectId={projectId} componentId={componentId}>
        <Link className="neon-link text-sm" to={detailPath}>
          Back to image-CVE detail
        </Link>
      </BackToComponentBar>

      <form className="panel space-y-4" onSubmit={onSubmit}>
        <p className="text-xs uppercase tracking-[0.25em] text-[var(--accent-magenta)]">Update decision</p>
        <p className="text-sm text-[var(--text-secondary)]">CVE: {detail.cveId}</p>

        <div>
          <label className="mb-1 block text-sm text-[var(--text-secondary)]" htmlFor="status">
            Status
          </label>
          <select
            id="status"
            className="neon-input"
            value={status}
            onChange={(e) => setStatus(e.target.value as DecisionStatus)}
          >
            <option value="under_investigation">under_investigation</option>
            <option value="not_affected">not_affected</option>
            <option value="affected">affected</option>
          </select>
        </div>

        {status === "not_affected" ? (
          <>
            <div>
              <label className="mb-1 block text-sm text-[var(--text-secondary)]" htmlFor="justification">
                Justification
              </label>
              <select
                id="justification"
                className="neon-input"
                value={justification}
                onChange={(e) => setJustification(e.target.value as NotAffectedJustification)}
              >
                <option value="component_not_present">component_not_present</option>
                <option value="vulnerable_code_not_present">vulnerable_code_not_present</option>
                <option value="vulnerable_code_not_in_execute_path">vulnerable_code_not_in_execute_path</option>
                <option value="vulnerable_code_cannot_be_controlled_by_adversary">
                  vulnerable_code_cannot_be_controlled_by_adversary
                </option>
                <option value="inline_mitigations_already_exist">inline_mitigations_already_exist</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-[var(--text-secondary)]" htmlFor="impact">
                Impact statement
              </label>
              <textarea
                id="impact"
                className="neon-input min-h-28 resize-y"
                value={impactStatement}
                onChange={(e) => setImpactStatement(e.target.value)}
              />
            </div>
          </>
        ) : null}

        {status === "affected" ? (
          <div>
            <label className="mb-1 block text-sm text-[var(--text-secondary)]" htmlFor="actionStatement">
              Action statement
            </label>
            <textarea
              id="actionStatement"
              className="neon-input min-h-28 resize-y"
              value={actionStatement}
              onChange={(e) => setActionStatement(e.target.value)}
            />
          </div>
        ) : null}

        {status !== "under_investigation" ? (
          <>
            <div>
              <label className="mb-1 block text-sm text-[var(--text-secondary)]" htmlFor="statusNotes">
                Status notes
              </label>
              <textarea
                id="statusNotes"
                className="neon-input min-h-24 resize-y"
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
              />
            </div>
            <ExpiryUnixInput
              id="expiry"
              label="Expiry time"
              value={expiryTimeUnixSeconds}
              onChange={setExpiryTimeUnixSeconds}
              required
            />
          </>
        ) : null}

        {error ? <div className="text-sm text-[var(--status-critical)]">Error: {error}</div> : null}
        <button className="neon-button" type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save decision"}
        </button>
      </form>
    </section>
  );
}

