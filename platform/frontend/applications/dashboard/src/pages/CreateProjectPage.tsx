import { Link, useNavigate } from "react-router-dom";
import { ProjectsService } from "../api/generated";
import { useState } from "react";
import PageHelpPanel from "../components/PageHelpPanel";
import { pageHelpMarkdown } from "../help/pageHelpMarkdown";

export default function CreateProject() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.target as HTMLFormElement);
        const name = formData.get('name') as string;
        const description = formData.get('description') as string;
        ProjectsService.projectsControllerCreate({ name, description })
            .then(() => {
                navigate('/projects');
            })
            .catch((err) => {
                setError(err instanceof Error ? err.message : 'An unknown error occurred');
            })
            .finally(() => setLoading(false));
    };
  if (loading) {
    return <div className="panel text-[var(--text-secondary)]">Provisioning project...</div>;
  }
  if (error) {
    return <div className="panel text-[var(--status-critical)]">Error: {error}</div>;
  }

  return (
    <section className="space-y-4">
      <PageHelpPanel markdown={pageHelpMarkdown.createProject} />
      <div className="panel">
        <p className="text-xs uppercase tracking-[0.25em] text-[var(--accent-cyan)]">Onboarding</p>
        <h2 className="mt-2 text-2xl font-semibold">Create Project</h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Register a new project to start tracking vulnerability exposure.
        </p>
      </div>

      <form className="panel space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="mb-1 block text-sm text-[var(--text-secondary)]" htmlFor="name">Project Name</label>
          <input className="neon-input" id="name" type="text" name="name" placeholder="e.g. edge-proxy" required />
        </div>

        <div>
          <label className="mb-1 block text-sm text-[var(--text-secondary)]" htmlFor="description">Description</label>
          <textarea
            className="neon-input min-h-28 resize-y"
            id="description"
            name="description"
            placeholder="Provide context for the project..."
            required
          />
        </div>

        <div className="flex items-center gap-3">
          <button className="neon-button" type="submit">Create Project</button>
          <Link className="neon-link text-sm" to="/projects">Cancel</Link>
        </div>
      </form>
    </section>
  );
}