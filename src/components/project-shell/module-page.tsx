import { ProjectModuleScreen } from "@/components/project-shell/project-module-screen";
import type { WorkspaceModuleKey } from "@/lib/project-workspace/types";

export async function ModulePage({
  params,
  module,
}: {
  params: Promise<{ id: string }>;
  module: WorkspaceModuleKey;
}) {
  const { id } = await params;
  return <ProjectModuleScreen module={module} projectId={id} />;
}

