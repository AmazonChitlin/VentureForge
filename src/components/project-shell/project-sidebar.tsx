import Link from "next/link";

import { DeleteProjectButton } from "@/components/project-shell/delete-project-button";
import { workspaceModuleCatalog } from "@/lib/project-workspace/catalog";
import type { WorkspaceModuleKey } from "@/lib/project-workspace/types";

export function ProjectSidebar({
  projectId,
  projectName,
  active,
  completed = [],
}: {
  projectId: string;
  projectName?: string;
  active?: WorkspaceModuleKey | "overview" | "traceability";
  completed?: WorkspaceModuleKey[];
}) {
  const completedSet = new Set(completed);
  return (
    <aside className="vf-workspace-sidebar">
      <Link className="vf-wordmark" href="/dashboard">VentureForge</Link>
      <div>
        <small>Current project</small>
        <strong>{projectName ?? "Business workspace"}</strong>
        <small>Use the step-by-step Builder for the simplest path.</small>
      </div>
      <nav>
        <Link className={active === "overview" ? "is-active" : ""} href={`/project/${projectId}/overview`}>Overview</Link>
        <Link className="vf-builder-link" href={`/project/${projectId}/builder`}>Step-by-step Builder</Link>
        <details className="vf-workspace-tools" open={active !== "overview"}>
          <summary>Detailed workspace tools</summary>
          <Link className={active === "traceability" ? "is-active" : ""} href={`/project/${projectId}/traceability`}>How answers are used</Link>
          {workspaceModuleCatalog.map((item) => (
            <Link
              className={active === item.key ? "is-active" : ""}
              href={`/project/${projectId}/${item.route}`}
              key={item.key}
            >
              <span className={completedSet.has(item.key) ? "is-complete" : ""}>
                {completedSet.has(item.key) ? "✓" : "·"}
              </span>
              {item.shortTitle}
            </Link>
          ))}
        </details>
      </nav>
      <footer>
        <Link href="/resources">Resource library</Link>
        <Link href="/settings/plugins">Plugin settings</Link>
        <DeleteProjectButton projectId={projectId} />
      </footer>
    </aside>
  );
}
