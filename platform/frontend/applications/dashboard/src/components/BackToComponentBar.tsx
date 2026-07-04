import type { ReactNode } from "react";
import { Link } from "react-router-dom";

type Props = {
  projectId: string;
  componentId: string;
  label?: string;
  /** Extra controls on the same row (e.g. Upload .tar). */
  children?: ReactNode;
};

/**
 * Keeps the back control in normal flow with a bottom border so content below cannot overlap it.
 */
export default function BackToComponentBar({ projectId, componentId, label = "Back to component", children }: Props) {
  return (
    <div
      className="flex w-full flex-wrap items-center gap-3 border-b border-[var(--border)] pb-4"
      role="navigation"
      aria-label="Page navigation"
    >
      <Link
        className="neon-button inline-flex shrink-0 text-sm"
        to={`/projects/${projectId}/components/${componentId}`}
      >
        {label}
      </Link>
      {children}
    </div>
  );
}
