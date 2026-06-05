import type { WorkspaceModuleKey, WorkspaceProject } from "@/lib/project-workspace/types";
import { ProjectSidebar } from "@/components/project-shell/project-sidebar";

export function ProjectPageShell({
  project,
  projectId,
  active,
  children,
}: {
  project?: WorkspaceProject;
  projectId: string;
  active: WorkspaceModuleKey | "overview" | "traceability";
  children: React.ReactNode;
}) {
  return (
    <main className="vf-workspace-shell">
      <ProjectSidebar
        active={active}
        completed={Object.keys(project?.outputs ?? {}) as WorkspaceModuleKey[]}
        projectId={projectId}
        projectName={project?.name}
      />
      <section className="vf-workspace-main">{children}</section>
    </main>
  );
}
