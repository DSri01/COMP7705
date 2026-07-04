import { Link } from "react-router-dom";
import PageHelpPanel from "../components/PageHelpPanel";
import { pageHelpMarkdown } from "../help/pageHelpMarkdown";

export default function HomePage() {
  return (
    <section className="space-y-6">
      <PageHelpPanel markdown={pageHelpMarkdown.home} />

      <div className="panel">
        <p className="text-xs uppercase tracking-[0.25em] text-[var(--accent-magenta)]">Mission Control</p>
        <h2 className="mt-2 text-2xl font-semibold">Security Operations Dashboard</h2>
        <p className="mt-3 max-w-3xl text-[var(--text-secondary)]">
          Monitor projects, prioritize vulnerabilities, and keep exposure windows short with the platform.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <article className="panel">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Projects</h3>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Manage tracked repositories, metadata, and remediation ownership.
          </p>
          <Link className="neon-button mt-4 inline-block" to="/projects">
            Open Projects
          </Link>
        </article>

        <article className="panel">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">CVE Intelligence</h3>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Review severity trends and drill into critical findings across environments.
          </p>
          <Link className="neon-button mt-4 inline-block" to="/cves">
            View CVEs
          </Link>
        </article>

        <article className="panel md:col-span-2">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Platform Agent</h3>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Threaded chat for CVE research, image-CVE advice, web lookups, and platform triage workflows.
          </p>
          <Link className="neon-button mt-4 inline-block font-mono" to="/agents/platform-assistant">
            Open Platform Agent
          </Link>
        </article>
      </div>
    </section>
  );
}
